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

  const isPro = false;
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

  const reminderHeadline = (() => {
    if (!profile?.lease_end_date) return '';
    if (reminderDays === null) return `Your lease ends on ${formatDate(profile.lease_end_date)}.`;
    if (reminderDays < 0) return `Your lease ended on ${formatDate(profile.lease_end_date)}.`;
    if (reminderDays === 0) return 'Your lease ends today.';
    if (reminderDays === 1) return 'Your lease ends tomorrow.';
    return `Your lease ends in ${reminderDays} days (${formatDate(profile.lease_end_date)}).`;
  })();