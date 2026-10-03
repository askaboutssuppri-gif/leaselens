import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { ChevronLeft, Copy, Check, Mail } from 'lucide-react-native';
import { Colors } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

export default function NegotiationLetterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const [letter, setLetter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [landlordName, setLandlordName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');

  async function generate() {
    if (!params.id) {
      Alert.alert('Error', 'No lease selected.');
      return;
    }
    setLoading(true);
    setLetter(null);
    try {
      // Fetch the analysis findings
      const { data: analysis, error } = await supabase
        .from('analyses')
        .select('findings')
        .eq('id', params.id)
        .single();
      if (error) throw error;

      const findings = (analysis?.findings || []).filter(
        (f: any) => f.severity === 'high' || f.severity === 'medium'
      );
      if (findings.length === 0) {
        Alert.alert('No issues found', 'This lease has no high or medium findings to negotiate.');
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke('generate-letter', {
        body: { findings, tenantName, landlordName, propertyAddress },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setLetter(data.letter);
    } catch (e: any) {
      Alert.alert('Failed', e.message || 'Could not generate the letter.');
    } finally {
      setLoading(false);
    }
  }

  async function copyLetter() {
    if (!letter) return;
    await Clipboard.setStringAsync(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Negotiation Letter</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!letter && (
          <>
            <View style={styles.infoCard}>
              <Mail size={28} color={Colors.amber[400]} />
              <Text style={styles.infoTitle}>AI-drafted email</Text>
              <Text style={styles.infoBody}>
                We'll write a polite, professional email to your landlord based on
                the issues found in this lease. Fill in the names (optional) for
                a personalized draft.
              </Text>
            </View>

            <Text style={styles.label}>Your name (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Jane Doe"
              placeholderTextColor={Colors.gray[500]}
              value={tenantName}              onChangeText={setTenantName}
            />
            <Text style={styles.label}>Landlord name (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Acme Properties"
              placeholderTextColor={Colors.gray[500]}
              value={landlordName}
              onChangeText={setLandlordName}
            />
            <Text style={styles.label}>Property address (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="123 Main St, Apt 4"
              placeholderTextColor={Colors.gray[500]}
              value={propertyAddress}
              onChangeText={setPropertyAddress}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={generate}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.navy[900]} />
              ) : (
                <Text style={styles.buttonText}>Generate letter</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {letter && (
          <>
            <View style={styles.letterCard}>
              <Text style={styles.letterText}>{letter}</Text>
            </View>
            <TouchableOpacity style={styles.button} onPress={copyLetter}>
              {copied ? (
                <Check size={18} color={Colors.navy[900]} />
              ) : (
                <Copy size={18} color={Colors.navy[900]} />
              )}
              <Text style={styles.buttonText}>{copied ? ' Copied!' : ' Copy letter'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setLetter(null)}>
              <Text style={styles.secondaryButtonText}>Generate again</Text>
            </TouchableOpacity>
            <Text style={styles.disclaimer}>
              Review before sending. This is a starting draft, not legal advice.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy[900] },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
  },
  headerTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.white },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  infoCard: {
    backgroundColor: Colors.navy[800], borderRadius: 16, padding: 20,
    alignItems: 'center', marginBottom: 20,
  },
  infoTitle: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.white, marginTop: 10, marginBottom: 6 },
  infoBody: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.gray[400], textAlign: 'center', lineHeight: 20 },
  label: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.gray[300], marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: Colors.navy[800], borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, color: Colors.white,
    borderWidth: 1, borderColor: Colors.navy[700],
  },
  button: {
    backgroundColor: Colors.amber[400], borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.navy[900] },
  secondaryButton: {
    borderWidth: 1, borderColor: Colors.navy[600], borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 10,
  },
  secondaryButtonText: { fontFamily: 'Inter-Medium', fontSize: 15, color: Colors.gray[300] },
  letterCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 18, marginTop: 4,
  },
  letterText: { fontSize: 14, lineHeight: 22, color: '#111827' },
  disclaimer: {
    fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.gray[500],
    textAlign: 'center', marginTop: 16, lineHeight: 17,
  },
