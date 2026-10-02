import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import {
  Check,
  Loader2,
  AlertCircle,
  RotateCcw,
  X,
} from 'lucide-react-native';
import { Colors } from '@/lib/theme';
import { getScanSession, clearScanSession, setAnalyzeReport, type AnalyzeReport } from '@/lib/scan-session';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type StepStatus = 'pending' | 'active' | 'done' | 'error';

interface Step {
  key: string;
  label: string;
  status: StepStatus;
}

const PROCESSING_TIMEOUT = 90_000;

export default function ProcessingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, refreshProfile } = useAuth();
  const session = getScanSession();

  const [steps, setSteps] = useState<Step[]>([
    { key: 'upload', label: 'Uploading document pages', status: 'pending' },
    { key: 'verify', label: 'Verifying scan quota', status: 'pending' },
    { key: 'analyze', label: 'AI analyzing lease content', status: 'pending' },
    { key: 'save', label: 'Saving your report', status: 'pending' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const updateStep = (key: string, status: StepStatus) => {
    if (!mountedRef.current) return;
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, status } : s)));
  };

  const animateProgress = (toValue: number) => {
    Animated.timing(progressAnim, {
      toValue,
      duration: 600,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  const triggerError = (msg: string) => {
    if (!mountedRef.current) return;
    setError(msg);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const runAnalysis = useCallback(async () => {
    if (!session || !user) {
      triggerError('No document to analyze. Please go back and scan or import a lease.');
      return;
    }

    setError(null);
    setSteps([
      { key: 'upload', label: 'Uploading document pages', status: 'pending' },
      { key: 'verify', label: 'Verifying scan quota', status: 'pending' },
      { key: 'analyze', label: 'AI analyzing lease content', status: 'pending' },
      { key: 'save', label: 'Saving your report', status: 'pending' },
    ]);

    // Set up timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      updateStep('analyze', 'error');
      triggerError('The analysis is taking longer than expected. Please try again.');
    }, PROCESSING_TIMEOUT);

    // Step 1: Upload
    updateStep('upload', 'active');
    animateProgress(0.15);

    const leaseId = crypto.randomUUID();
    const basePath = `${user.id}/${leaseId}`;
    const uploadedPaths: string[] = [];

    try {
      for (let i = 0; i < session.imageUris.length; i++) {
        const uri = session.imageUris[i];
        const filePath = `${basePath}/page_${i + 1}.jpg`;

        const formData = new FormData();
        formData.append('file', {
          uri: uri,
          type: 'image/jpeg',
          name: `page_${i + 1}.jpg`,
        } as unknown as Blob);

        const { error: uploadError } = await supabase.storage
          .from('lease-pages')
          .upload(filePath, formData, { contentType: 'image/jpeg' });

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
        uploadedPaths.push(filePath);
      }

      updateStep('upload', 'done');
      animateProgress(0.35);

      // Step 2: Verify quota
      updateStep('verify', 'active');
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Not authenticated');

      updateStep('verify', 'done');
      animateProgress(0.45);

      // Step 3: Analyze via edge function
      updateStep('analyze', 'active');
      animateProgress(0.55);

      const { data: fnData, error: fnError } = await supabase.functions.invoke<{
        error?: string;
        report?: AnalyzeReport;
      }>('analyze-lease', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: {
          lease_id: leaseId,
          title: session.title,
          page_count: session.imageUris.length,
          image_paths: uploadedPaths,
          state_code: profile?.state_code,
        },
      });

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      if (fnError) {
        const errMsg = fnError.message || '';
        if (errMsg.includes('429') || errMsg.includes('rate')) {
          triggerError('High demand — retry in a minute.');
        } else if (errMsg.includes('not_a_lease')) {
          triggerError('This document does not appear to be a residential lease. Please try a different document.');
        } else if (errMsg.includes('quota') || errMsg.includes('limit') || errMsg.includes('remaining')) {
          triggerError('You have reached your scan limit. Upgrade to Pro for more daily scans.');
        } else {
          triggerError('We could not analyze this lease. Please try again.');
        }
        updateStep('analyze', 'error');
        return;
      }

      if (!fnData) {
        triggerError('No response from the analysis service. Please try again.');
        updateStep('analyze', 'error');
        return;
      }

      if (fnData.error) {
        if (fnData.error === 'not_a_lease') {
          triggerError('This document does not appear to be a residential lease. Please try a different document.');
        } else if (fnData.error.includes('quota') || fnData.error.includes('limit')) {
          triggerError('You have reached your scan limit. Upgrade to Pro for more daily scans.');
        } else if (fnData.error.includes('429') || fnData.error.includes('rate')) {
          triggerError('High demand — retry in a minute.');
        } else {
          triggerError(fnData.error);
        }
        updateStep('analyze', 'error');
        return;
      }

      updateStep('analyze', 'done');
      animateProgress(0.85);

      // Step 4: Save
      updateStep('save', 'active');
      if (fnData.report) {
        setAnalyzeReport(fnData.report);
      }
      await refreshProfile();
      updateStep('save', 'done');
      animateProgress(1);

      clearScanSession();

      setTimeout(() => {
        if (mountedRef.current) {
          router.replace(`/results/${leaseId}`);
        }
      }, 600);
    } catch (err) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      if (msg.includes('429') || msg.includes('rate')) {
        triggerError('High demand — retry in a minute.');
      } else {
        triggerError(msg);
      }
      // Mark the active step as error
      setSteps((prev) =>
        prev.map((s) => (s.status === 'active' ? { ...s, status: 'error' as StepStatus } : s))
      );
    }
  }, [session, user, profile, router, refreshProfile]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis, retryCount]);

  const handleRetry = () => {
    setRetryCount((c) => c + 1);
  };

  const handleCancel = () => {
    clearScanSession();
    router.replace('/(tabs)');
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const hasError = error !== null;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        {!hasError ? (
          <>
            <View style={styles.iconWrap}>
              <Loader2 size={40} color={Colors.amber[400]} strokeWidth={2} style={{ transform: [{ rotate: '0deg' }] }} />
            </View>
            <Text style={styles.title}>Analyzing your lease</Text>
            <Text style={styles.subtitle}>
              {session?.pageCount ?? 0} page{(session?.pageCount ?? 0) !== 1 ? 's' : ''} • {session?.source === 'camera' ? 'Camera scan' : 'PDF import'}
            </Text>

            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
            </View>

            <View style={styles.stepsContainer}>
              {steps.map((step) => (
                <View key={step.key} style={styles.stepRow}>
                  <View style={styles.stepIconWrap}>
                    {step.status === 'done' && <Check size={18} color={Colors.success} strokeWidth={2.5} />}
                    {step.status === 'active' && <Loader2 size={18} color={Colors.amber[400]} strokeWidth={2} />}
                    {step.status === 'pending' && <View style={styles.stepPending} />}
                    {step.status === 'error' && <AlertCircle size={18} color={Colors.error} strokeWidth={2} />}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      step.status === 'pending' && styles.stepLabelPending,
                      step.status === 'done' && styles.stepLabelDone,
                      step.status === 'error' && styles.stepLabelError,
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={[styles.iconWrap, styles.errorIconWrap]}>
              <AlertCircle size={40} color={Colors.error} strokeWidth={2} />
            </View>
            <Text style={styles.title}>Analysis failed</Text>
            <Text style={styles.errorText}>{error}</Text>

            <View style={styles.errorButtons}>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
                <RotateCcw size={20} color={Colors.navy[900]} />
                <Text style={styles.retryButtonText}>Try again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} activeOpacity={0.8}>
                <X size={20} color={Colors.gray[300]} />
                <Text style={styles.cancelButtonText}>Go home</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy[900],
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.navy[800],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.navy[700],
  },
  errorIconWrap: {
    backgroundColor: Colors.error + '22',
    borderColor: Colors.error + '44',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: Colors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.gray[400],
    marginBottom: 32,
  },
  progressTrack: {
    width: '100%',
    maxWidth: 360,
    height: 6,
    backgroundColor: Colors.navy[700],
    borderRadius: 3,
    marginBottom: 32,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.amber[400],
    borderRadius: 3,
  },
  stepsContainer: {
    width: '100%',
    maxWidth: 360,
    gap: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.navy[800],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.navy[700],
  },
  stepPending: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gray[600],
  },
  stepLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.white,
  },
  stepLabelPending: {
    color: Colors.gray[600],
  },
  stepLabelDone: {
    color: Colors.success,
  },
  stepLabelError: {
    color: Colors.error,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.gray[300],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 340,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 360,
  },
  retryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.amber[400],
    borderRadius: 14,
    paddingVertical: 16,
    minHeight: 54,
  },
  retryButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: Colors.navy[900],
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.navy[800],
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.navy[700],
    minHeight: 54,
  },
  cancelButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.gray[300],
  },
});
