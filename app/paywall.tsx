import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, Check, Zap, FileText, Mail, GitCompare } from 'lucide-react-native';
import { Colors } from '@/lib/theme';
import { getOfferings, purchasePackage, restorePurchases } from '@/lib/revenuecat';

const FEATURES = [
  { icon: Zap, title: '10 scans per day', desc: 'Analyze leases as often as you need' },
  { icon: FileText, title: 'PDF reports', desc: 'Download and share professional reports' },
  { icon: Mail, title: 'Negotiation letters', desc: 'AI-drafted emails to your landlord' },
  { icon: GitCompare, title: 'Compare leases', desc: 'Side-by-side comparison of two leases' },
];

export default function PaywallScreen() {
  const router = useRouter();
  const [offering, setOffering] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);

  useEffect(() => { loadOfferings(); }, []);

  async function loadOfferings() {
    const current = await getOfferings();
    setOffering(current);
    const annual = current?.availablePackages.find((p: any) =>
      p.identifier.includes('annual') || p.identifier.includes('year'));
    setSelectedPackage(annual || current?.availablePackages[0]);
    setLoading(false);
  }

  async function handlePurchase() {
    if (!selectedPackage) return;
    setPurchasing(true);
    try {
      const success = await purchasePackage(selectedPackage);
      if (success) {
        Alert.alert('Welcome to Premium!', 'You now have full access.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Purchase failed', e.message || 'Please try again.');
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    setPurchasing(true);
    try {
      const restored = await restorePurchases();
      Alert.alert(restored ? 'Restored' : 'No purchases found',
        restored ? 'Premium access restored.' : 'No active subscription found.',
        [{ text: 'OK', onPress: () => restored && router.back() }]);
    } finally {
      setPurchasing(false);
    }
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
      <TouchableOpacity style={styles.close} onPress={() => router.back()}>
        <X size={24} color={Colors.gray[300]} />
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Unlock LeaseLens Premium</Text>
        <Text style={styles.subtitle}>Get the full power of AI lease analysis</Text>
        <View style={styles.features}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <View key={i} style={styles.feature}>
                <View style={styles.iconWrap}><Icon size={22} color={Colors.amber[400]} /></View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
                <Check size={20} color={Colors.green[400]} />
              </View>
            );
          })}
        </View>
