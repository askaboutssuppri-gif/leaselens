import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import {
  X,
  RotateCcw,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react-native';
import { Colors, MAX_PAGES } from '@/lib/theme';
import { setScanSession } from '@/lib/scan-session';

const { width } = Dimensions.get('window');

export default function CameraCaptureScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ title?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [photos, setPhotos] = useState<string[]>([]);
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || photos.length >= MAX_PAGES) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });
      if (photo?.uri) {
        setPhotos((prev) => [...prev, photo.uri]);
        setLastPhoto(photo.uri);
        triggerHaptic();
        Animated.sequence([
          Animated.timing(flashAnim, { toValue: 0.6, duration: 80, useNativeDriver: true }),
          Animated.timing(flashAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
        ]).start();
      }
    } catch {
      // Camera capture failed
    }
  };

  const handleRetake = () => {
    setPhotos((prev) => prev.slice(0, -1));
    setLastPhoto(null);
  };

  const handleDone = () => {
    setScanSession({
      source: 'camera',
      title: params.title || 'Scanned Lease',
      pageCount: photos.length,
      imageUris: photos,
    });
    router.replace('/processing');
  };

  const handleClose = () => {
    router.replace('/(tabs)');
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Camera size={48} color={Colors.gray[500]} strokeWidth={1.5} />
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionBody}>
          LeaseLens needs your camera to scan lease documents. Your photos never leave the device until you press analyze.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} activeOpacity={0.8}>
          <Text style={styles.permissionButtonText}>Grant camera access</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.permissionCancel}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isFull = photos.length >= MAX_PAGES;

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
        <Animated.View style={[styles.flash, { opacity: flashAnim }]} pointerEvents="none" />

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.topButton} onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <X size={24} color={Colors.white} />
          </TouchableOpacity>

          <View style={styles.pageCounter}>
            <Text style={styles.pageCounterText}>
              {photos.length} / {MAX_PAGES} pages
            </Text>
          </View>

          <TouchableOpacity
            style={styles.topButton}
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <RotateCcw size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {photos.length > 0 && (
          <View style={styles.thumbStrip}>
            {photos.map((uri, i) => (
              <View key={i} style={[styles.thumb, i === photos.length - 1 && styles.thumbActive]}>
                <Text style={styles.thumbNum}>{i + 1}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
          {lastPhoto ? (
            <View style={styles.reviewRow}>
              <TouchableOpacity style={styles.reviewButton} onPress={handleRetake} activeOpacity={0.7}>
                <Trash2 size={20} color={Colors.error} />
                <Text style={styles.reviewButtonText}>Retake last</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.doneButton, photos.length === 0 && styles.doneButtonDisabled]}
                onPress={handleDone}
                disabled={photos.length === 0}
                activeOpacity={0.8}
              >
                <Text style={styles.doneButtonText}>Analyze {photos.length} page{photos.length !== 1 ? 's' : ''}</Text>
                <ChevronRight size={20} color={Colors.navy[900]} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.captureRow}>
              <View style={styles.captureSpacer} />
              <TouchableOpacity
                style={[styles.captureButton, isFull && styles.captureButtonDisabled]}
                onPress={takePicture}
                disabled={isFull}
                activeOpacity={0.85}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
              <View style={styles.captureSpacer}>
                {isFull && <Text style={styles.fullText}>Max pages</Text>}
              </View>
            </View>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy[950],
  },
  camera: {
    flex: 1,
  },
  flash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.white,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageCounter: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pageCounterText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.white,
  },
  thumbStrip: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    flexWrap: 'wrap',
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  thumbActive: {
    borderColor: Colors.amber[400],
    borderWidth: 2,
  },
  thumbNum: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.white,
  },
  bottomBar: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  captureSpacer: {
    width: 80,
    alignItems: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.white,
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.white,
  },
  captureButtonDisabled: {
    opacity: 0.4,
  },
  fullText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: Colors.amber[400],
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    gap: 16,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    minHeight: 52,
  },
  reviewButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.error,
  },
  doneButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.amber[400],
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    minHeight: 52,
  },
  doneButtonDisabled: {
    opacity: 0.5,
  },
  doneButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: Colors.navy[900],
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.navy[900],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: Colors.white,
    marginTop: 20,
    marginBottom: 10,
  },
  permissionBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.gray[300],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    maxWidth: 320,
  },
  permissionButton: {
    backgroundColor: Colors.amber[400],
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 28,
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  permissionButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: Colors.navy[900],
  },
  permissionCancel: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: Colors.gray[400],
  },
});
