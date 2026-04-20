import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Colors, Fonts, Spacing, Radius, Shadows } from '../../constants/theme';

export default function RegisterScreen() {
  const { register, error, clearError } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    shopName: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    const { name, email, phone, password, confirmPassword, shopName } = form;

    if (!name.trim() || !email.trim() || !phone.trim() || !password) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    clearError();
    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        shopName: shopName.trim(),
      });
      router.replace('/(app)/dashboard');
    } catch (err) {
      Alert.alert('Registration Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'name', label: 'Full Name', placeholder: 'Your name', required: true },
    { key: 'shopName', label: 'Shop Name', placeholder: 'Your shop name (optional)' },
    {
      key: 'email',
      label: 'Email',
      placeholder: 'you@example.com',
      keyboardType: 'email-address',
      required: true,
    },
    {
      key: 'phone',
      label: 'Phone Number',
      placeholder: '10-digit phone number',
      keyboardType: 'phone-pad',
      required: true,
    },
    { key: 'password', label: 'Password', placeholder: 'Min 6 characters', secure: true, required: true },
    { key: 'confirmPassword', label: 'Confirm Password', placeholder: 'Re-enter password', secure: true, required: true },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Set up your digital ledger in seconds</Text>
        </View>

        <View style={styles.form}>
          {fields.map((f) => (
            <View key={f.key} style={styles.inputGroup}>
              <Text style={styles.label}>
                {f.label} {f.required && <Text style={styles.required}>*</Text>}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={f.placeholder}
                placeholderTextColor={Colors.textMuted}
                value={form[f.key]}
                onChangeText={(val) => updateField(f.key, val)}
                keyboardType={f.keyboardType || 'default'}
                secureTextEntry={f.secure}
                autoCapitalize={['email', 'password', 'confirmPassword'].includes(f.key) ? 'none' : 'words'}
              />
            </View>
          ))}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  title: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  form: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadows.card,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  required: {
    color: Colors.danger,
  },
  input: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Fonts.sizes.base,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  error: {
    color: Colors.danger,
    fontSize: Fonts.sizes.sm,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    marginTop: Spacing.md,
    ...Shadows.button,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: Fonts.sizes.lg,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.md,
  },
  link: {
    color: Colors.primary,
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
  },
});
