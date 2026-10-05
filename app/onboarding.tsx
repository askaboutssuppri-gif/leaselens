import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ShieldCheck,
  FileSearch,
  Lightbulb,
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react-native';
import { Colors } from '@/lib/theme';
import { US_STATES } from '@/lib/states';
import { useAuth } from '@/lib/auth';

const { width } = Dimensions.get('window');

type SlideKey = 'shield' | 'search' | 'advice';

interface Slide {
  key: SlideKey;
  icon: typeof ShieldCheck;
  title: string;
  body: string;
  accent: string;
}

const SLIDES: Slide[] = [
  {
    key: 'shield',
    icon: ShieldCheck,
    title: 'Understand every clause',
    body:
      'LeaseLens reads your lease and flags the clauses that could cost you money, limit your rights, or trap you in a bad deal — explained in plain English.',
    accent: Colors.amber[400],
  },
  {
    key: 'search',
    icon: FileSearch,
    title: 'See what others miss',
    body:
      'Hidden fees, unfair penalties, vague maintenance duties, and sneaky auto-renewal terms — LeaseLens surfaces the things landlords bury on page 14.',
    accent: Colors.amber[400],
  },
  {
    key: 'advice',
    icon: Lightbulb,
    title: 'Negotiate with confidence',
    body:
      'Every finding comes with a practical negotiation tip so you can walk into a lease conversation knowing exactly what to ask for and why.',
    accent: Colors.amber[400],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignupStep = currentSlide === 3;

  const handleScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const slideIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    if (slideIndex !== currentSlide) {
      setCurrentSlide(slideIndex);
      setError(null);
    }
  };

  const goToSlide = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
  };

  const handleNext = () => {
    if (currentSlide < 3) {
      goToSlide(currentSlide + 1);
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      goToSlide(currentSlide - 1);
    }
  };

  const handleSignUp = async () => {
    setError(null);
    if (!selectedState) {
      setError('Please select your state to continue.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Please enter your email and a password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    const { error: signUpError } = await signUp(email.trim(), password, selectedState);
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError);
    }
  };

  const totalSteps = 4;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.logo}>LeaseLens</Text>
        {!isSignupStep && (
          <TouchableOpacity onPress={() => goToSlide(3)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollContainer}
      >
        {SLIDES.map((slide) => {
          const Icon = slide.icon;
          return (
            <View key={slide.key} style={styles.slide}>
              <View style={styles.iconWrap}>
                <Icon size={56} color={slide.accent} strokeWidth={1.8} />
              </View>
              <Text style={styles.slideTitle}>{slide.title}</Text>
              <Text style={styles.slideBody}>{slide.body}</Text>
            </View>
          );
        })}

        <View style={styles.slide}>
          <ScrollView
            style={styles.stateSlideScroll}
            contentContainerStyle={styles.stateSlideContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
          <Text style={styles.slideTitle}>Choose your state</Text>
          <Text style={styles.slideBodySmall}>
            Lease laws vary by state. Select where you'll be renting so we can tailor our analysis to your local protections.
          </Text>
          <View style={styles.stateGrid}>
            {US_STATES.map((state) => {
              const isSelected = selectedState === state.code;
              return (
                <TouchableOpacity
                  key={state.code}
                  style={[styles.stateChip, isSelected && styles.stateChipSelected]}
                  onPress={() => setSelectedState(state.code)}
                  activeOpacity={0.7}
                >
                  {isSelected && <Check size={14} color={Colors.navy[900]} strokeWidth={3} />}
                  <Text
                    style={[styles.stateChipText, isSelected && styles.stateChipTextSelected]}
                  >
                    {state.code}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedState && (
            <Text style={styles.selectedStateName}>
              {US_STATES.find((s) => s.code === selectedState)?.name}
            </Text>
          )}
          <View style={styles.signupCard}>
            <Text style={styles.signupLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={Colors.gray[500]}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
            <Text style={styles.signupLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              placeholderTextColor={Colors.gray[500]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
            <TouchableOpacity
              style={[styles.signUpButton, submitting && styles.signUpButtonDisabled]}
              onPress={handleSignUp}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <Text style={styles.signUpButtonText}>
                {submitting ? 'Creating account…' : 'Create free account'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace('/sign-in')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.signInLink}>Already have an account? Sign in</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.dots}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentSlide && styles.dotActive]}
            />
          ))}
        </View>
        {!isSignupStep && (
          <View style={styles.navButtons}>
            {currentSlide > 0 ? (
              <TouchableOpacity style={styles.navButtonSecondary} onPress={handleBack}>
                <ChevronLeft size={20} color={Colors.gray[300]} />
                <Text style={styles.navButtonTextSecondary}>Back</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.navSpacer} />
            )}
            <TouchableOpacity style={styles.navButtonPrimary} onPress={handleNext}>
              <Text style={styles.navButtonTextPrimary}>
                {currentSlide === 2 ? 'Get started' : 'Next'}
              </Text>
              <ChevronRight size={20} color={Colors.navy[900]} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

import { TextInput } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy[900],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  logo: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: Colors.white,
    letterSpacing: -0.3,
  },
  skipText: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: Colors.gray[400],
  },
  scrollContainer: {
    flex: 1,
  },
  slide: {
    width,
    paddingHorizontal: 32,
    alignItems: 'center',
    paddingTop: 24,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.navy[700],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: Colors.navy[600],
  },
  slideTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 26,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 32,
  },
  slideBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.gray[300],
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 340,
  },
  slideBodySmall: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.gray[300],
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 340,
    marginBottom: 20,
  },
  stateSlideScroll: {
    flex: 1,
    width: '100%',
  },
  stateSlideContent: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  stateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 360,
    gap: 8,
  },
  stateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.navy[700],
    borderWidth: 1,
    borderColor: Colors.navy[600],
    minHeight: 40,
  },
  stateChipSelected: {
    backgroundColor: Colors.amber[400],
    borderColor: Colors.amber[400],
  },
  stateChipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.gray[200],
  },
  stateChipTextSelected: {
    color: Colors.navy[900],
  },
  selectedStateName: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: Colors.amber[400],
    marginTop: 12,
  },
  signupCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.navy[800],
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
  },
  signupLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: Colors.gray[400],
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.white,
    backgroundColor: Colors.navy[900],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  errorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: Colors.error,
    marginTop: 10,
    textAlign: 'center',
  },
  signUpButton: {
    backgroundColor: Colors.amber[400],
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    minHeight: 54,
    justifyContent: 'center',
  },
  signUpButtonDisabled: {
    opacity: 0.6,
  },
  signUpButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: Colors.navy[900],
  },
  signInLink: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: Colors.gray[400],
    textAlign: 'center',
    marginTop: 14,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.navy[600],
  },
  dotActive: {
    backgroundColor: Colors.amber[400],
    width: 24,
  },
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navSpacer: {
    width: 100,
  },
  navButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  navButtonTextSecondary: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: Colors.gray[300],
  },
  navButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.amber[400],
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    minHeight: 52,
  },
  navButtonTextPrimary: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
    color: Colors.navy[900],
  },
});
