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
        </View>        {offering?.availablePackages.map((pkg: any) => {
          const isSelected = selectedPackage?.identifier === pkg.identifier;
          const isAnnual = pkg.identifier.includes('annual') || pkg.identifier.includes('year');
          return (
            <TouchableOpacity
              key={pkg.identifier}
              style={[styles.package, isSelected && styles.packageSelected]}
              onPress={() => setSelectedPackage(pkg)}>
              {isAnnual && (
                <View style={styles.badge}><Text style={styles.badgeText}>BEST VALUE</Text></View>
              )}
              <View style={styles.packageRow}>
                <View>
                  <Text style={styles.packageTitle}>{isAnnual ? 'Annual' : 'Monthly'}</Text>
                  <Text style={styles.packagePrice}>{pkg.product.priceString}{isAnnual ? '/year' : '/month'}</Text>
                </View>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </View>
              <Text style={styles.savings}>
                {isAnnual ? 'Save 64% vs monthly • 7-day free trial' : '7-day free trial included'}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[styles.buyButton, purchasing && styles.buyButtonDisabled]}
          onPress={handlePurchase}
          disabled={purchasing || !selectedPackage}>
          {purchasing ? (
            <ActivityIndicator color={Colors.navy[900]} />
          ) : (
            <Text style={styles.buyButtonText}>Start 7-day free trial</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRestore} disabled={purchasing}>
          <Text style={styles.restore}>Restore purchase</Text>
        </TouchableOpacity>
        <Text style={styles.finePrint}>
          Free trial for 7 days, then {selectedPackage?.product.priceString}
          {selectedPackage?.identifier.includes('annual') ? '/year' : '/month'}.
          Cancel anytime in Google Play settings.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy[900] },
  center: { flex: 1, backgroundColor: Colors.navy[900], alignItems: 'center', justifyContent: 'center' },
  close: { position: 'absolute', top: 48, right: 20, zIndex: 10, padding: 8 },
  content: { paddingTop: 80, paddingHorizontal: 24, paddingBottom: 40 },
  title: { fontFamily: 'Inter-Bold', fontSize: 28, color: Colors.white, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 16, color: Colors.gray[400], textAlign: 'center', marginBottom: 28 },
  features: { gap: 14, marginBottom: 28 },
  feature: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.navy[800], borderRadius: 14, padding: 14, gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.navy[700], alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1 },
  featureTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.white },
  featureDesc: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.gray[400], marginTop: 2 },
  package: { backgroundColor: Colors.navy[800], borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: 'transparent' },
  packageSelected: { borderColor: Colors.amber[400], backgroundColor: Colors.navy[700] },
  badge: { position: 'absolute', top: -10, right: 16, backgroundColor: Colors.amber[400], borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontFamily: 'Inter-Bold', fontSize: 11, color: Colors.navy[900] },
  packageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packageTitle: { fontFamily: 'Inter-SemiBold', fontSize: 17, color: Colors.white },
  packagePrice: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.gray[300], marginTop: 4 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.gray[500], alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: Colors.amber[400] },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.amber[400] },
  savings: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.green[400], marginTop: 8 },
  buyButton: { backgroundColor: Colors.amber[400], borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 12 },
  buyButtonDisabled: { opacity: 0.6 },
  buyButtonText: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.navy[900] },
  restore: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.gray[400], textAlign: 'center', marginBottom: 16 },
  finePrint: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.gray[500], textAlign: 'center', lineHeight: 18 },
});
