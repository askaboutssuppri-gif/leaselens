import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  ChevronLeft,
  ShieldCheck,
  ShieldAlert,
  TriangleAlert,
  CircleAlert,
  Lightbulb,
  FileText,
  MapPin,
  Info,
  Bell,
  Check,
  Home as HomeIcon,
} from 'lucide-react-native';
import { Colors } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { getAnalyzeReport, clearAnalyzeReport } from '@/lib/scan-session';
import type { Lease, Finding, KeyTerms } from '@/lib/types';
import type { AnalyzeReport } from '@/lib/scan-session';

type Severity = 'high' | 'medium' | 'low';

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; color: string; bg: string; icon: typeof ShieldAlert }
> = {
  high: { label: 'High risk', color: Colors.error, bg: Colors.error + '22', icon: ShieldAlert },
  medium: { label: 'Caution', color: Colors.warning, bg: Colors.warning + '22', icon: TriangleAlert },
  low: { label: 'Heads up', color: Colors.amber[400], bg: Colors.amber[400] + '22', icon: CircleAlert },
};

export default function ResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const { profile, updateProfile } = useAuth();
  const [lease, setLease] = useState<Lease | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [keyTerms, setKeyTerms] = useState<KeyTerms | null>(null);
  const [report, setReport] = useState<AnalyzeReport | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
  const [savingReminder, setSavingReminder] = useState(false);

  const loadData = useCallback(async () => {
    const cachedReport = getAnalyzeReport();
    if (cachedReport) {
      setReport(cachedReport);
    }

    const { data: leaseData } = await supabase
      .from('leases')
      .select('*')
      .eq('id', params.id)
      .maybeSingle();
    setLease(leaseData as Lease | null);

    const { data: findingsData } = await supabase
      .from('findings')
      .select('*')
      .eq('lease_id', params.id)
      .order('severity', { ascending: false });
    setFindings((findingsData as Finding[]) ?? []);

    const { data: termsData } = await supabase
      .from('key_terms')
      .select('*')
      .eq('lease_id', params.id)
      .maybeSingle();
    setKeyTerms(termsData as KeyTerms | null);
  }, [params.id]);

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

  const toggleFinding = (id: string) => {
    setExpandedFindings((prev) => {