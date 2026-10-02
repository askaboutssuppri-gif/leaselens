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
  };

  return (
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
