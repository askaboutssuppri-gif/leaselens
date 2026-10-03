import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, GitCompare, Check } from 'lucide-react-native';
import { Colors } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface LeaseOption {
  id: string;
  file_name: string;
  created_at: string;
  summary: string;
  findings: any[];
  key_terms: any[];
}

export default function CompareScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [leases, setLeases] = useState<LeaseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => { loadLeases(); }, []);

  async function loadLeases() {
    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('id, file_name, created_at, summary, findings, key_terms')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLeases(data || []);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  const [a, b] = selected
    .map((id) => leases.find((l) => l.id === id))
    .filter(Boolean) as LeaseOption[];

  function countBySeverity(findings: any[], sev: string) {
    return findings.filter((f) => f.severity === sev).length;
  }

  function allTermLabels() {
    const labels = new Set<string>();
    [...(a?.key_terms || []), ...(b?.key_terms || [])].forEach((t: any) =>
      labels.add(t.label)
    );
    return [...labels];
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.amber[400]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Compare Leases</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <GitCompare size={26} color={Colors.amber[400]} />
          <Text style={styles.infoText}>
            Pick two leases to compare side by side. Tap to select (max 2).
          </Text>
        </View>        {leases.length < 2 && (
          <Text style={styles.empty}>
            You need at least 2 analyzed leases to compare. Scan another lease first.
          </Text>
        )}

        {leases.map((l) => {
          const isSel = selected.includes(l.id);
          const order = selected.indexOf(l.id);
          return (
            <TouchableOpacity
              key={l.id}
              style={[styles.leaseCard, isSel && styles.leaseCardSelected]}
              onPress={() => toggle(l.id)}>
              <View style={styles.leaseRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.leaseName} numberOfLines={1}>{l.file_name}</Text>
                  <Text style={styles.leaseDate}>
                    {new Date(l.created_at).toLocaleDateString()}
                  </Text>
                </View>
                {isSel && (
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderText}>{order === 0 ? 'A' : 'B'}</Text>
                  </View>
                )}
                {isSel && <Check size={20} color={Colors.amber[400]} />}
              </View>
            </TouchableOpacity>
          );
        })}

        {a && b && (
          <View style={styles.comparison}>
            <Text style={styles.sectionTitle}>Head to head</Text>

            <View style={styles.tableHeader}>
              <Text style={[styles.colA, styles.tableTitle]} numberOfLines={1}>A: {a.file_name}</Text>
              <Text style={[styles.colB, styles.tableTitle]} numberOfLines={1}>B: {b.file_name}</Text>
            </View>

            <CompareRow label="High-risk issues"
              valA={String(countBySeverity(a.findings, 'high'))}
              valB={String(countBySeverity(b.findings, 'high'))}
              better={countBySeverity(a.findings, 'high') < countBySeverity(b.findings, 'high') ? 'a'
                : countBySeverity(b.findings, 'high') < countBySeverity(a.findings, 'high') ? 'b' : null} />
            <CompareRow label="Medium-risk issues"
              valA={String(countBySeverity(a.findings, 'medium'))}
              valB={String(countBySeverity(b.findings, 'medium'))}
              better={countBySeverity(a.findings, 'medium') < countBySeverity(b.findings, 'medium') ? 'a'
                : countBySeverity(b.findings, 'medium') < countBySeverity(a.findings, 'medium') ? 'b' : null} />
            <CompareRow label="Total findings"
              valA={String(a.findings.length)}
              valB={String(b.findings.length)}
              better={a.findings.length < b.findings.length ? 'a' : b.findings.length < a.findings.length ? 'b' : null} />

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Key terms</Text>
            {allTermLabels().map((label) => {
              const va = (a.key_terms || []).find((t: any) => t.label === label)?.value || '—';
              const vb = (b.key_terms || []).find((t: any) => t.label === label)?.value || '—';
              const diff = va !== vb;
              return (
                <View key={label} style={[styles.termRow, diff && styles.termRowDiff]}>
                  <Text style={styles.termLabel}>{label}</Text>
                  <View style={styles.termVals}>
                    <Text style={[styles.termVal, styles.colA]}>{va}</Text>
                    <Text style={[styles.termVal, styles.colB]}>{vb}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function CompareRow({ label, valA, valB, better }: {
  label: string; valA: string; valB: string; better: 'a' | 'b' | null;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowVals}>
        <Text style={[styles.rowVal, styles.colA, better === 'a' && styles.better]}>{valA}</Text>
        <Text style={[styles.rowVal, styles.colB, better === 'b' && styles.better]}>{valB}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy[900] },
  center: { flex: 1, backgroundColor: Colors.navy[900], alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
  },
  headerTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.white },  content: { paddingHorizontal: 20, paddingBottom: 40 },
  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.navy[800], borderRadius: 14, padding: 14, marginBottom: 14,
  },
  infoText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.gray[300], flex: 1, lineHeight: 19 },
  empty: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.gray[500], textAlign: 'center', marginTop: 20 },
  leaseCard: {
    backgroundColor: Colors.navy[800], borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 2, borderColor: 'transparent',
  },
  leaseCardSelected: { borderColor: Colors.amber[400] },
  leaseRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  leaseName: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.white },
  leaseDate: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.gray[500], marginTop: 2 },
  orderBadge: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.amber[400],
    alignItems: 'center', justifyContent: 'center',
  },
  orderText: { fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.navy[900] },
  comparison: { marginTop: 10 },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.white, marginBottom: 12 },
  tableHeader: { flexDirection: 'row', marginBottom: 8, gap: 8 },
  tableTitle: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.amber[400] },
  colA: { flex: 1 },
  colB: { flex: 1 },
  row: { backgroundColor: Colors.navy[800], borderRadius: 10, padding: 12, marginBottom: 8 },
  rowLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.gray[400], marginBottom: 6 },
  rowVals: { flexDirection: 'row', gap: 8 },
  rowVal: { fontFamily: 'Inter-Bold', fontSize: 20, color: Colors.white },
  better: { color: Colors.green[400] },
  termRow: { backgroundColor: Colors.navy[800], borderRadius: 10, padding: 12, marginBottom: 8 },
  termRowDiff: { borderWidth: 1, borderColor: Colors.amber[400] },
  termLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.gray[400], marginBottom: 6 },
  termVals: { flexDirection: 'row', gap: 8 },
  termVal: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.white },
});
