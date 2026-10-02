import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { FileText, ChevronRight, Clock, ScanLine } from 'lucide-react-native';
import { Colors } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Lease } from '@/lib/types';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLeases = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('leases')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setLeases((data as Lease[]) ?? []);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadLeases();
    }, [loadLeases])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLeases();
    setRefreshing(false);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return Colors.gray[400];
    if (score >= 70) return Colors.success;
    if (score >= 40) return Colors.warning;
    return Colors.error;
  };  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.screenTitle}>History</Text>
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.amber[400]} />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.amber[400]}
            />
          }
        >
          {leases.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconWrap}>
                <FileText size={32} color={Colors.gray[500]} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No scans yet</Text>
              <Text style={styles.emptyText}>
                Your analyzed leases will appear here. Scan your first lease to get started.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/camera-capture')}
                activeOpacity={0.85}
              >
                <ScanLine size={18} color={Colors.navy[900]} strokeWidth={2} />
                <Text style={styles.emptyButtonText}>Scan a lease</Text>
              </TouchableOpacity>
            </View>
          ) : (
            leases.map((lease) => (
              <TouchableOpacity
                key={lease.id}
                style={styles.leaseItem}
                onPress={() => router.push(`/results/${lease.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.leaseIconWrap}>
                  <FileText size={18} color={Colors.gray[400]} strokeWidth={2} />
                </View>
                <View style={styles.leaseContent}>
                  <Text style={styles.leaseTitle} numberOfLines={1}>
                    {lease.title}
                  </Text>
                  <View style={styles.leaseMetaRow}>
                    <Clock size={12} color={Colors.gray[600]} strokeWidth={2} />
                    <Text style={styles.leaseDate}>{formatDate(lease.created_at)}</Text>
                    {lease.page_count !== null && lease.page_count > 0 && (
                      <Text style={styles.leasePages}>· {lease.page_count} pages</Text>
                    )}
                  </View>
                </View>
                {lease.health_score !== null && (
                  <View
                    style={[
                      styles.scoreBadge,
                      { backgroundColor: getScoreColor(lease.health_score) + '22' },
                    ]}
                  >
                    <Text
                      style={[styles.scoreText, { color: getScoreColor(lease.health_score) }]}
                    >
                      {lease.health_score}
                    </Text>
                  </View>
                )}
                <ChevronRight size={16} color={Colors.gray[600]} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy[900],
  },
  screenTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 26,
    color: Colors.white,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaseItem: {
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
  },  leaseDate: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.gray[500],
  },
  leasePages: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.gray[500],
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
  },
  scoreText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
  },
  emptyBox: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.navy[800],
    borderWidth: 1,
    borderColor: Colors.navy[700],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: Colors.white,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.gray[400],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.amber[400],
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 50,
  },
  emptyButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
    color: Colors.navy[900],
  },
});
