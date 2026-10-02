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
  Bell,
} from 'lucide-react-native';
import { Colors } from '@/lib/theme';
import { US_STATES } from '@/lib/states';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

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

  const handleClearReminder = async () => {
    const { error } = await updateProfile({
      lease_end_date: null,
      renewal_reminder_sent: false,
    });
    if (error) {
      Alert.alert('Error', error);
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
