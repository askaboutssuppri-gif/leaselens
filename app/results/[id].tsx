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
    setExpandedFindings((prev) => {      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBack = () => {
    clearAnalyzeReport();
    router.replace('/(tabs)');
  };

  const handleHome = () => {
    clearAnalyzeReport();
    router.replace('/(tabs)');
  };

  const healthScore = report?.health_score ?? lease?.health_score ?? 0;
  const summary = report?.summary ?? lease?.summary;
  const stateNotes = report?.state_notes ?? lease?.state_notes ?? [];

  const scoreColor =
    healthScore >= 70 ? Colors.success : healthScore >= 40 ? Colors.warning : Colors.error;
  const scoreLabel =
    healthScore >= 70 ? 'Healthy lease' : healthScore >= 40 ? 'Some concerns' : 'High risk';

  const sortedFindings = [...findings].sort((a, b) => {
    const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  const terms = keyTerms ?? (report?.key_terms as KeyTerms | undefined) ?? null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not specified';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatMoney = (amount: number | null) => {
    if (amount === null) return 'Not specified';
    return `$${amount.toLocaleString('en-US')}`;
  };

  const handleSetReminder = async () => {
    if (!terms?.lease_end || savingReminder) return;
    if (profile?.lease_end_date === terms.lease_end) return;
    setSavingReminder(true);
    const { error } = await updateProfile({
      lease_end_date: terms.lease_end,
      renewal_reminder_sent: false,
    });
    setSavingReminder(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      Alert.alert(
        'Reminder set',
        `We'll remind you here as ${formatDate(terms.lease_end)} approaches so you can plan your renewal.`
      );
    }
  };

  const reminderAlreadySet = !!terms?.lease_end && profile?.lease_end_date === terms.lease_end;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.amber[400]} />}
    >
      <View style={styles.topNav}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ChevronLeft size={24} color={Colors.gray[300]} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Lease Report</Text>
        <TouchableOpacity onPress={handleHome} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <HomeIcon size={20} color={Colors.gray[300]} />
        </TouchableOpacity>
      </View>

      {/* Health score hero */}
      <View style={[styles.scoreCard, { borderColor: scoreColor + '44' }]}>
        <View style={styles.scoreLeft}>
          <View style={[styles.scoreRing, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreNumber, { color: scoreColor }]}>{healthScore}</Text>
            <Text style={[styles.scoreMax, { color: scoreColor }]}>/100</Text>
          </View>
        </View>
        <View style={styles.scoreRight}>
          <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '22' }]}>
            {healthScore >= 70 ? (
              <ShieldCheck size={14} color={scoreColor} strokeWidth={2.5} />
            ) : (
              <ShieldAlert size={14} color={scoreColor} strokeWidth={2.5} />
            )}
            <Text style={[styles.scoreBadgeText, { color: scoreColor }]}>{scoreLabel}</Text>
          </View>
          <Text style={styles.leaseTitle} numberOfLines={2}>
            {lease?.title ?? 'Lease analysis'}
          </Text>          {summary && <Text style={styles.summaryText}>{summary}</Text>}
        </View>
      </View>

      {/* Key terms */}
      {terms && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={18} color={Colors.amber[400]} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Key terms</Text>
          </View>
          <View style={styles.termsGrid}>
            <TermRow label="Monthly rent" value={formatMoney(terms.monthly_rent)} />
            <TermRow label="Deposit" value={formatMoney(terms.deposit)} />
            <TermRow label="Lease start" value={formatDate(terms.lease_start)} />
            <TermRow label="Lease end" value={formatDate(terms.lease_end)} />
            <TermRow label="Late fee" value={terms.late_fee ?? 'Not specified'} />
            <TermRow label="Notice period" value={terms.notice_period_days !== null ? `${terms.notice_period_days} days` : 'Not specified'} />
            <TermRow label="Pet policy" value={terms.pet_policy ?? 'Not specified'} />
            <TermRow label="Utilities" value={terms.utilities_included ?? 'Not specified'} />
          </View>
          {terms.lease_end ? (
            reminderAlreadySet ? (
              <View style={styles.reminderSetPill}>
                <Check size={16} color={Colors.success} strokeWidth={2.5} />
                <Text style={styles.reminderSetText}>
                  Renewal reminder set for {formatDate(terms.lease_end)}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.reminderButton}
                onPress={handleSetReminder}
                disabled={savingReminder}
                activeOpacity={0.85}
              >
                <Bell size={18} color={Colors.navy[900]} strokeWidth={2} />
                <Text style={styles.reminderButtonText}>
                  {savingReminder ? 'Setting reminder…' : 'Remind me before this lease ends'}
                </Text>
              </TouchableOpacity>
            )
          ) : null}
        </View>
      )}

      {/* Findings */}
      {sortedFindings.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ShieldAlert size={18} color={Colors.amber[400]} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Findings ({sortedFindings.length})</Text>
          </View>
          {sortedFindings.map((finding) => {
            const config = SEVERITY_CONFIG[finding.severity];
            const Icon = config.icon;
            const expanded = expandedFindings.has(finding.id);
            return (
              <TouchableOpacity
                key={finding.id}
                style={styles.findingCard}
                onPress={() => toggleFinding(finding.id)}
                activeOpacity={0.8}
              >
                <View style={styles.findingHeader}>
                  <View style={[styles.findingIconWrap, { backgroundColor: config.bg }]}>
                    <Icon size={16} color={config.color} strokeWidth={2.5} />
                  </View>
                  <View style={styles.findingHeaderText}>
                    <Text style={[styles.findingSeverity, { color: config.color }]}>
                      {config.label}
                    </Text>
                    <Text style={styles.findingCategory}>{finding.category}</Text>
                  </View>
                  <ChevronLeft
                    size={18}
                    color={Colors.gray[600]}
                    strokeWidth={2}
                    style={{ transform: [{ rotate: expanded ? '-90deg' : '0deg' }] }}
                  />
                </View>
                <Text style={styles.findingPlain}>{finding.plain_english}</Text>
                {expanded && (
                  <View style={styles.findingExpanded}>
                    <View style={styles.findingQuote}>
                      <Text style={styles.findingQuoteText}>"{finding.clause_text}"</Text>
                    </View>
                    <View style={styles.findingDetail}>
                      <Info size={14} color={Colors.gray[400]} strokeWidth={2} />
                      <View style={styles.findingDetailContent}>
                        <Text style={styles.findingDetailLabel}>Why it matters</Text>
                        <Text style={styles.findingDetailText}>{finding.why_it_matters}</Text>
                      </View>
                    </View>
                    <View style={styles.findingDetail}>
                      <Lightbulb size={14} color={Colors.amber[400]} strokeWidth={2} />
                      <View style={styles.findingDetailContent}>
                        <Text style={styles.findingDetailLabel}>Negotiation tip</Text>
                        <Text style={styles.findingDetailText}>{finding.negotiation_tip}</Text>
                      </View>                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* State notes */}
      {stateNotes.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={18} color={Colors.amber[400]} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Your state protections</Text>
          </View>
          <View style={styles.stateNotesCard}>
            {stateNotes.map((note, i) => (
              <View key={i} style={styles.stateNoteItem}>
                <View style={styles.stateNoteDot} />
                <Text style={styles.stateNoteText}>{note}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Disclaimer */}
      <View style={styles.disclaimerCard}>
        <Info size={16} color={Colors.gray[500]} strokeWidth={2} />
        <Text style={styles.disclaimerText}>
          {report?.disclaimer ??
            'LeaseLens provides general information, not legal advice. For guidance on your specific situation, consult a licensed attorney in your state.'}
        </Text>
      </View>

      <TouchableOpacity style={styles.doneButton} onPress={handleHome} activeOpacity={0.8}>
        <Text style={styles.doneButtonText}>Back to home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function TermRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.termRow}>
      <Text style={styles.termLabel}>{label}</Text>
      <Text style={styles.termValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy[900],
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  navTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: Colors.white,
  },
  scoreCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: Colors.navy[800],
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
    gap: 18,
  },
  scoreLeft: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {    flex: 1,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
  },
  scoreBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },
  leaseTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.white,
    marginBottom: 6,
  },
  summaryText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.gray[300],
    lineHeight: 21,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 17,
    color: Colors.white,
  },
  termsGrid: {
    backgroundColor: Colors.navy[800],
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.navy[700],
  },
  termRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.navy[700],
    minHeight: 48,
  },
  termLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: Colors.gray[400],
  },
  termValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.white,
    textAlign: 'right',
    flexShrink: 1,
  },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.amber[400],
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 14,
    minHeight: 52,
  },
  reminderButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
    color: Colors.navy[900],
  },
  reminderSetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.success + '18',
    borderWidth: 1,
    borderColor: Colors.success + '40',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 14,
    minHeight: 52,
    fontFamily: 'Inter-Bold',
    fontSize: 28,
  },
  scoreMax: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
  },
  scoreRight: {  },
  reminderSetText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.success,
  },
  findingCard: {
    backgroundColor: Colors.navy[800],
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.navy[700],
    marginBottom: 12,
  },
  findingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  findingIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findingHeaderText: {
    flex: 1,
  },
  findingSeverity: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    marginBottom: 2,
  },
  findingCategory: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.gray[400],
  },
  findingPlain: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.white,
    lineHeight: 22,
  },
  findingExpanded: {
    marginTop: 14,
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.navy[700],
  },
  findingQuote: {
    backgroundColor: Colors.navy[900],
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gray[600],
  },
  findingQuoteText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.gray[300],
    lineHeight: 20,
    fontStyle: 'italic',
  },
  findingDetail: {
    flexDirection: 'row',
    gap: 10,
  },
  findingDetailContent: {
    flex: 1,
  },
  findingDetailLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: Colors.gray[400],
    marginBottom: 3,
  },
  findingDetailText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.gray[200],
    lineHeight: 21,
  },
  stateNotesCard: {
    backgroundColor: Colors.amber[400] + '12',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.amber[400] + '30',
    gap: 12,
  },
  stateNoteItem: {
    flexDirection: 'row',
    gap: 10,
  },
  stateNoteDot: {
    width: 6,    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.amber[400],
    marginTop: 7,
  },
  stateNoteText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.gray[200],
    lineHeight: 21,
  },
  disclaimerCard: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 20,
    backgroundColor: Colors.navy[800],
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.navy[700],
    marginBottom: 20,
  },
  disclaimerText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.gray[500],
    lineHeight: 18,
  },
  doneButton: {
    marginHorizontal: 20,
    backgroundColor: Colors.amber[400],
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 54,
    justifyContent: 'center',
  },
  doneButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: Colors.navy[900],
  },
});
