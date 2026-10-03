import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  ScanLine,
  FileUp,
  Zap,
  Clock,
  ChevronRight,
  FileText,
  Bell,
} from 'lucide-react-native';
import { Colors, FREE_SCAN_LIMIT, MAX_PAGES } from '@/lib/theme';
import { configureRevenueCat, isPremium } from '@/lib/revenuecat';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { setScanSession } from '@/lib/scan-session';
import type { Lease } from '@/lib/types';

/** Whole days from today until the given ISO date. Null when unparseable. */
function daysUntil(iso: string): number | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86400000);
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [recentLeases, setRecentLeases] = useState<Lease[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    await refreshProfile();
    const { data } = await supabase
      .from('leases')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3);
    setRecentLeases((data as Lease[]) ?? []);
  }, [user, refreshProfile]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    (async () => {
      await configureRevenueCat(user?.id);
      setIsPro(await isPremium());
    })();
  }, [user?.id]);
  const scansRemaining = isPro
    ? 10
    : profile
      ? Math.max(0, FREE_SCAN_LIMIT - profile.free_scans_used)
      : FREE_SCAN_LIMIT;

  const reminderDays = profile?.lease_end_date ? daysUntil(profile.lease_end_date) : null;
  const reminderUrgent = reminderDays !== null && reminderDays <= 30 && reminderDays >= 0;

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const reminderHeadline = (() => {    if (!profile?.lease_end_date) return '';
    if (reminderDays === null) return `Your lease ends on ${formatDate(profile.lease_end_date)}.`;
    if (reminderDays < 0) return `Your lease ended on ${formatDate(profile.lease_end_date)}.`;
    if (reminderDays === 0) return 'Your lease ends today.';
    if (reminderDays === 1) return 'Your lease ends tomorrow.';
    return `Your lease ends in ${reminderDays} days (${formatDate(profile.lease_end_date)}).`;
  })();  const handleScanLease = () => {
    if (scansRemaining <= 0) {
      Alert.alert(
        'No scans remaining',
        'You have used all your free scans. Upgrade to Premium for 10 scans per day plus PDF reports, negotiation letters, and lease comparison.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'See plans', onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }
    router.push('/camera-capture');
  };

  const handleImportPdf = async () => {
    if (scansRemaining <= 0) {
      Alert.alert(
        'No scans remaining',
        'You have used all your free scans. Upgrade to Premium for 10 scans per day plus PDF reports, negotiation letters, and lease comparison.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'See plans', onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];

      // On web, we can't read file system the same way — redirect with file info
      if (Platform.OS === 'web') {
        Alert.alert(
          'PDF import on web',
          'PDF import is optimized for mobile. Please use the camera scanner or try on the mobile app.',
          [{ text: 'OK' }]
        );
        return;
      }

      const fileInfo = await FileSystem.getInfoAsync(file.uri);
      if (!fileInfo.exists) {
        Alert.alert('Error', 'Could not read the selected file.');
        return;
      }

      // Check page count by file size heuristic — real PDF parsing needs a library
      // For now we accept the file and let the edge function handle page extraction
      const fileName = file.name || 'Imported Lease';

      setScanSession({
        source: 'pdf',
        title: fileName.replace(/\.pdf$/i, ''),
        pageCount: 0,
        imageUris: [file.uri],
      });

      router.push('/processing');
    } catch {
      Alert.alert('Error', 'Could not import the PDF. Please try again.');
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return Colors.gray[400];
    if (score >= 70) return Colors.success;
    if (score >= 40) return Colors.warning;
    return Colors.error;
  };

  const handleLeasePress = (leaseId: string) => {
    router.push(`/results/${leaseId}`);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.amber[400]} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
      </View>
      <View style={styles.scanCard}>
        <View style={styles.scanIconWrap}>
          <ScanLine size={36} color={Colors.navy[900]} strokeWidth={2} />
        </View>
        <Text style={styles.scanTitle}>Scan a lease</Text>
        <Text style={styles.scanSubtitle}>
          Point your camera at a lease document and LeaseLens will analyze it on the spot.
        </Text>
        <TouchableOpacity
          style={[styles.scanButton, scansRemaining <= 0 && styles.scanButtonDisabled]}
          onPress={handleScanLease}          activeOpacity={0.85}
          disabled={scansRemaining <= 0}
        >
          <Text style={styles.scanButtonText}>
            {scansRemaining > 0 ? 'Start scanning' : 'No scans left'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.importRow, scansRemaining <= 0 && styles.importRowDisabled]}
        onPress={handleImportPdf}
        activeOpacity={0.7}
        disabled={scansRemaining <= 0}
      >
        <View style={styles.importIconWrap}>
          <FileUp size={22} color={Colors.amber[400]} strokeWidth={2} />
        </View>
        <View style={styles.importContent}>
          <Text style={styles.importTitle}>Import PDF</Text>
          <Text style={styles.importSubtitle}>Upload a lease file (max {MAX_PAGES} pages)</Text>
        </View>
        <ChevronRight size={20} color={Colors.gray[600]} />
      </TouchableOpacity>

      <View style={styles.counterCard}>
        <View style={styles.counterLeft}>
          <View style={styles.counterIconWrap}>
            <Zap size={20} color={Colors.amber[400]} strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.counterTitle}>{isPro ? 'Daily scans' : 'Free scans'}</Text>
            <Text style={styles.counterSub}>
              {scansRemaining} {isPro ? `of 10 today` : `of ${FREE_SCAN_LIMIT} remaining`}
            </Text>
          </View>
        </View>
        <View style={styles.counterDots}>
          {Array.from({ length: isPro ? 10 : FREE_SCAN_LIMIT }).map((_, i) => {
            const used = isPro
              ? profile ? i < profile.paid_scans_used_today : false
              : profile ? i < profile.free_scans_used : false;
            return (
              <View
                key={i}
                style={[styles.counterDot, used && styles.counterDotUsed]}
              />
            );
          })}
        </View>
      </View>

      {profile?.lease_end_date && (
        <View style={[styles.reminderCard, reminderUrgent && styles.reminderCardUrgent]}>
          <Bell size={18} color={reminderUrgent ? Colors.error : Colors.amber[400]} strokeWidth={2} />
          <View style={styles.reminderContent}>
            <Text style={styles.reminderTitle}>Lease renewal reminder</Text>
            <Text style={styles.reminderText}>
              {reminderHeadline}{' '}
              {reminderDays !== null && reminderDays >= 0
                ? 'Start planning now to negotiate better terms or explore alternatives.'
                : 'Update your reminder from your latest lease report.'}
            </Text>
          </View>
        </View>
      )}

      {recentLeases.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent leases</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/history')} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>
          {recentLeases.map((lease) => (
            <TouchableOpacity
              key={lease.id}
              style={styles.leaseItem}
              onPress={() => handleLeasePress(lease.id)}
              activeOpacity={0.7}
            >
              <View style={styles.leaseIconWrap}>
                <FileText size={18} color={Colors.gray[400]} strokeWidth={2} />
              </View>
              <View style={styles.leaseContent}>
                <Text style={styles.leaseTitle} numberOfLines={1}>
                  {lease.title}
                </Text>                <View style={styles.leaseMetaRow}>
                  <Clock size={12} color={Colors.gray[600]} strokeWidth={2} />
                  <Text style={styles.leaseDate}>{formatDate(lease.created_at)}</Text>
                </View>
              </View>
              {lease.health_score !== null && (
                <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(lease.health_score) + '22' }]}>
                  <Text style={[styles.scoreText, { color: getScoreColor(lease.health_score) }]}>
                    {lease.health_score}
                  </Text>
                </View>              )}
              <ChevronRight size={16} color={Colors.gray[600]} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.disclaimerCard}>
        <Text style={styles.disclaimerText}>
          LeaseLens provides general information, not legal advice. For guidance on your specific situation, consult a licensed attorney in your state.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy[900],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  greeting: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: Colors.white,
    marginBottom: 2,
  },
  email: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.gray[400],
  },
  scanCard: {
    marginHorizontal: 24,
    backgroundColor: Colors.navy[800],
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.navy[700],
    marginBottom: 16,
  },
  scanIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.amber[400],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  scanTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: Colors.white,
    marginBottom: 8,
  },
  scanSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.gray[300],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  scanButton: {
    backgroundColor: Colors.amber[400],
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 54,
    justifyContent: 'center',
        alignItems: 'center',
  },
  importRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    backgroundColor: Colors.navy[800],
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.navy[700],
    marginBottom: 16,    minHeight: 68,
  },
  importRowDisabled: {
    opacity: 0.5,
  },
  importIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.navy[700],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  importContent: {
    flex: 1,
  },
  importTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.white,
    marginBottom: 2,
  },
  importSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.gray[400],
  },
  counterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    backgroundColor: Colors.navy[800],
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.navy[700],
    marginBottom: 16,
    minHeight: 68,
  },
  counterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fbbf2422',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.white,
  },
  counterSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.gray[400],
  },
  counterDots: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    maxWidth: 120,
  },
  counterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.amber[400],
  },
  counterDotUsed: {
    backgroundColor: Colors.navy[600],
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {r',
  },
  scanButtonDisabled: {
    backgroundColor: Colors.navy[700],
  },
  scanButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: Colors.navy[900],
  },  importRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    backgroundColor: Colors.navy[800],
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.navy[700],
    marginBottom: 16,    minHeight: 68,
  },
  importRowDisabled: {
    opacity: 0.5,
  },
  importIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.navy[700],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  importContent: {
    flex: 1,
  },
  importTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.white,
    marginBottom: 2,
  },
  importSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.gray[400],
  },
  counterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    backgroundColor: Colors.navy[800],
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.navy[700],
    marginBottom: 16,
    minHeight: 68,
  },
  counterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fbbf2422',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.white,
  },
  counterSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.gray[400],
  },
  counterDots: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    maxWidth: 120,
  },
  counterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.amber[400],
  },
  counterDotUsed: {
    backgroundColor: Colors.navy[600],
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.gray[300],
  },
  viewAllText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.amber[400],
  },  leaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navy[800],
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.navy[700],
    marginBottom: 10,
    minHeight: 60,
  },
  leaseIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.navy[700],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  leaseContent: {
    flex: 1,
  },
  leaseTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.white,
    marginBottom: 4,
  },
  leaseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leaseDate: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.gray[500],
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scoreText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
  },
  reminderCard: {
    flexDirection: 'row',
    marginHorizontal: 24,
    backgroundColor: '#fbbf2418',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.amber[400] + '30',
    marginBottom: 16,
    gap: 12,
  },
  reminderCardUrgent: {
    backgroundColor: Colors.error + '14',
    borderColor: Colors.error + '45',
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.white,
    marginBottom: 4,
  },
  reminderText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.gray[300],
    lineHeight: 20,
  },
  disclaimerCard: {
    marginHorizontal: 24,
    backgroundColor: Colors.navy[800],
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.navy[700],
  },
  disclaimerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.gray[500],
    lineHeight: 18,
    textAlign: 'center',
  },
});
