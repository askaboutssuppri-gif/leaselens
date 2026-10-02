import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { Colors } from '@/lib/theme';
import { useAuth } from '@/lib/auth';

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (signInError) {
      setError(signInError);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace('/onboarding')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={24} color={Colors.gray[300]} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue reviewing your leases.</Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Email</Text>
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
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Your password"
            placeholderTextColor={Colors.gray[500]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <TouchableOpacity
            style={[styles.signInButton, submitting && styles.signInButtonDisabled]}
            onPress={handleSignIn}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.signInButtonText}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace('/onboarding')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.signUpLink}>Don't have an account? Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy[900],
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 20,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: Colors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.gray[300],
    marginBottom: 28,
    lineHeight: 24,
  },
  formCard: {
    backgroundColor: Colors.navy[800],
    borderRadius: 16,
    padding: 20,
  },
  label: {
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
  signInButton: {
    backgroundColor: Colors.amber[400],
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    minHeight: 54,
    justifyContent: 'center',
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: Colors.navy[900],
  },
  signUpLink: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: Colors.gray[400],
    textAlign: 'center',
    marginTop: 14,
  },
});
