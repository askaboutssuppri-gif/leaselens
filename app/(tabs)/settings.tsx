import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Modal,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  MapPin,
  RefreshCw,
  Shield,
  FileText,
  Trash2,
  LogOut,
  ChevronRight,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react-native';
import { Colors } from '@/lib/theme';
import { US_STATES } from '@/lib/states';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile, signOut, updateProfile, refreshProfile } = useAuth();
  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [refreshProfile])
  );

  const handleStateSelect = async (code: string) => {
    const { error } = await updateProfile({ state_code: code });
    if (error) {
      Alert.alert('Error', error);
    } else {
      setStateModalVisible(false);
    }
  };

  const handleRestorePurchases = () => {
    Alert.alert(
      'Restore purchases',
      'No active purchases were found. This feature will connect to the app store once in-app purchases are enabled.',
      [{ text: 'OK' }]
    );
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://leaselens.app/privacy').catch(() => {
      Alert.alert('Privacy Policy', 'The privacy policy page will be available at leaselens.app/privacy.');
    });
  };

  const handleTerms = () => {
    Linking.openURL('https://leaselens.app/terms').catch(() => {
      Alert.alert('Terms of Service', 'The terms of service page will be available at leaselens.app/terms.');
    });
  };

  const handleDeleteData = () => {
    setDeleteModalVisible(true);
  };

  const confirmDeleteData = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await supabase.from('findings').delete().in(
        'lease_id',
        (await supabase.from('leases').select('id').eq('user_id', user.id)).data?.map((l) => l.id) ?? []
      );
      await supabase.from('leases').delete().eq('user_id', user.id);
      await supabase.from('subscriptions').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('id', user.id);

      const { error: deleteError } = await supabase.functions.invoke('delete-user', {
        method: 'POST',
      });

      if (deleteError) {
        await signOut();
      } else {
        await signOut();
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again or contact support.');
    } finally {
      setDeleting(false);
      setDeleteModalVisible(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const selectedStateName = US_STATES.find((s) => s.code === profile?.state_code)?.name;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40 }}
    >
      <Text style={styles.screenTitle}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.emailLabel}>Signed in as</Text>
          <Text style={styles.emailValue}>{user?.email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Location</Text>
        <TouchableOpacity style={settingsRow} onPress={() => setStateModalVisible(true)} activeOpacity={0.7}>
          <View style={styles.rowLeft}>
            <View style={styles.rowIconWrap}>
              <MapPin size={18} color={Colors.amber[400]} strokeWidth={2} />
            </View>
            <View>
              <Text style={styles.rowTitle}>Your state</Text>
              <Text style={styles.rowSubtitle}>{selectedStateName ?? 'Not set'}</Text>
            </View>
          </View>
          <ChevronRight size={18} color={Colors.gray[600]} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Purchases</Text>
        <TouchableOpacity style={settingsRow} onPress={handleRestorePurchases} activeOpacity={0.7}>
          <View style={styles.rowLeft}>
            <View style={styles.rowIconWrap}>
              <RefreshCw size={18} color={Colors.amber[400]} strokeWidth={2} />
            </View>
            <Text style={styles.rowTitle}>Restore purchases</Text>
          </View>
          <ChevronRight size={18} color={Colors.gray[600]} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Legal</Text>
        <TouchableOpacity style={settingsRow} onPress={handlePrivacyPolicy} activeOpacity={0.7}>
          <View style={styles.rowLeft}>
            <View style={styles.rowIconWrap}>
              <Shield size={18} color={Colors.amber[400]} strokeWidth={2} />
            </View>
            <Text style={styles.rowTitle}>Privacy policy</Text>
          </View>
          <ChevronRight size={18} color={Colors.gray[600]} />
        </TouchableOpacity>
        <View style={styles.rowDivider} />
        <TouchableOpacity style={settingsRow} onPress={handleTerms} activeOpacity={0.7}>
          <View style={styles.rowLeft}>
            <View style={styles.rowIconWrap}>
              <FileText size={18} color={Colors.amber[400]} strokeWidth={2} />
            </View>
            <Text style={styles.rowTitle}>Terms of service</Text>
          </View>
          <ChevronRight size={18} color={Colors.gray[600]} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Data</Text>
        <TouchableOpacity style={[settingsRow, styles.dangerRow]} onPress={handleDeleteData} activeOpacity={0.7}>
          <View style={styles.rowLeft}>
            <View style={[styles.rowIconWrap, styles.dangerIconWrap]}>
              <Trash2 size={18} color={Colors.error} strokeWidth={2} />
            </View>
            <Text style={[styles.rowTitle, styles.dangerText]}>Delete my data</Text>
          </View>
          <ChevronRight size={18} color={Colors.gray[600]} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
        <LogOut size={18} color={Colors.gray[300]} strokeWidth={2} />
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>

      <View style={styles.noticeCard}>
        <AlertTriangle size={16} color={Colors.gray[500]} strokeWidth={2} />
        <Text style={styles.noticeText}>
          LeaseLens is an informational tool, not a law firm. It does not provide legal advice and is not a substitute for consultation with a licensed attorney.
        </Text>
      </View>

      <Text style={styles.versionText}>LeaseLens v1.0.0</Text>

      {/* State picker modal */}
      <Modal visible={stateModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select your state</Text>
              <TouchableOpacity onPress={() => setStateModalVisible(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <X size={22} color={Colors.gray[400]} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 24 }}>
              {US_STATES.map((state) => {
                const isSelected = profile?.state_code === state.code;
                return (
                  <TouchableOpacity
                    key={state.code}
                    style={[styles.modalStateRow, isSelected && styles.modalStateRowSelected]}
                    onPress={() => handleStateSelect(state.code)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.modalStateText, isSelected && styles.modalStateTextSelected]}
                    >
                      {state.name}
                    </Text>
                    {isSelected && <Check size={18} color={Colors.amber[400]} strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete data confirmation modal */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <View style={styles.deleteIconWrap}>
              <Trash2 size={28} color={Colors.error} strokeWidth={2} />
            </View>
            <Text style={styles.deleteTitle}>Delete all your data?</Text>
            <Text style={styles.deleteBody}>
              This permanently removes your profile, all saved leases, analysis findings, and subscription records. This action cannot be undone.
            </Text>
            <View style={styles.deleteButtons}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deleting}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={confirmDeleteData}
                disabled={deleting}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteConfirmText}>
                  {deleting ? 'Deleting…' : 'Delete forever'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const baseRow: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: Colors.navy[800],
  paddingHorizontal: 16,
  paddingVertical: 16,
  minHeight: 60,
};

const settingsRow = baseRow;

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
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  sectionLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: Colors.gray[500],
    marginBottom: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.navy[800],
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.navy[700],
  },
  emailLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.gray[400],
    marginBottom: 4,
  },
  emailValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.white,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  rowIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.amber[400] + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.white,
  },
  rowSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.gray[400],
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.navy[700],
    marginHorizontal: 16,
  },
  dangerRow: {},
  dangerIconWrap: {
    backgroundColor: Colors.error + '22',
  },
  dangerText: {
    color: Colors.error,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 24,
    backgroundColor: Colors.navy[800],
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.navy[700],
    minHeight: 54,
    marginBottom: 16,
  },
  signOutText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.gray[300],
  },
  noticeCard: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 24,
    backgroundColor: Colors.navy[800],
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.navy[700],
    marginBottom: 16,
  },
  noticeText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.gray[500],
    lineHeight: 18,
  },
  versionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.gray[600],
    textAlign: 'center',
  },
  // State picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.navy[800],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.navy[700],
  },
  modalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: Colors.white,
  },
  modalScroll: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  modalStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    minHeight: 54,
  },
  modalStateRowSelected: {
    backgroundColor: Colors.amber[400] + '15',
  },
  modalStateText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: Colors.white,
  },
  modalStateTextSelected: {
    color: Colors.amber[400],
  },
  // Delete modal
  deleteModal: {
    backgroundColor: Colors.navy[800],
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 24,
    alignItems: 'center',
  },
  deleteIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.error + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  deleteTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: Colors.white,
    marginBottom: 10,
    textAlign: 'center',
  },
  deleteBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.gray[300],
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  deleteButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteCancelButton: {
    flex: 1,
    backgroundColor: Colors.navy[700],
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  deleteCancelText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.gray[300],
  },
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: Colors.error,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  deleteConfirmText: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
    color: Colors.white,
  },
});

// Attach the base row style so StyleSheet merges correctly
Object.assign(styles, { rowLeft: styles.rowLeft });
