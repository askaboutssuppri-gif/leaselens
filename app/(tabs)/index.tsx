import { useState, useCallback } from 'react';
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

  const reminderHeadline = (() => {                <View style={styles.leaseMetaRow}>
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
    backgroundColor: Colors.amber[400] + '22',
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
    backgroundColor: Colors.amber[400] + '18',
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
