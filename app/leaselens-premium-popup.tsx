import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { X, Crown, Zap, FileText, Mail, GitCompare, Check } from 'lucide-react-native';
import { Colors } from '@/lib/theme';

const FEATURES = [
  { icon: Zap, title: '10 scans per day', desc: 'Never hit the free limit again' },
  { icon: FileText, title: 'PDF reports', desc: 'Professional reports to download & share' },
  { icon: Mail, title: 'Negotiation letters', desc: 'AI-drafted emails to your landlord' },
  { icon: GitCompare, title: 'Compare leases', desc: 'Side-by-side comparison of two leases' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onContinue: () => void;
}

export default function PremiumPopup({ visible, onClose, onContinue }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.close} onPress={onClose} activeOpacity={0.7}>
            <X size={22} color={Colors.gray[400]} />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Crown size={36} color={Colors.navy[900]} />
          </View>

          <Text style={styles.title}>Unlock Premium</Text>
          <Text style={styles.subtitle}>
            Everything you need to never sign a bad lease again
          </Text>

          <View style={styles.features}>
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <View key={i} style={styles.feature}>
                  <View style={styles.featureIcon}>
                    <Icon size={20} color={Colors.amber[400]} />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureDesc}>{f.desc}</Text>
                  </View>
                  <Check size={18} color={Colors.success} />
                </View>
              );
            })}
          </View>

          <TouchableOpacity style={styles.continueBtn} onPress={onContinue} activeOpacity={0.8}>
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.notNow}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.navy[800],
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.navy[600],
    alignItems: 'center',
  },
  close: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
    zIndex: 1,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.amber[400],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: Colors.white,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.gray[400],
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  features: {
    width: '100%',
    gap: 10,
    marginBottom: 22,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navy[700],
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.navy[800],
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.white,
  },
  featureDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.gray[400],
    marginTop: 2,
  },
  continueBtn: {
    width: '100%',
    backgroundColor: Colors.amber[400],
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  continueText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: Colors.navy[900],
  },
  notNow: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.gray[400],
    paddingVertical: 6,
  },
});
