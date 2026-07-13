import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secure, setSecure] = useState(true);

  const handleLogin = async () => {
    if (!password.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await login(password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Authentication failed';
      setError(msg);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const s = styles(colors);

  return (
    <LinearGradient
      colors={['#020608', '#050a12', '#081320']}
      style={[s.root, { paddingTop: topPad + 24, paddingBottom: botPad + 24 }]}
    >
      {/* Glow orb */}
      <View style={s.glow} />

      <View style={s.header}>
        {/* Logo mark */}
        <View style={s.logoRing}>
          <Ionicons name="skull-outline" size={36} color={colors.primary} />
        </View>
        <Text style={s.title}>NIÐAVELLIR</Text>
        <Text style={s.subtitle}>DYING STAR FORGE</Text>
        <View style={s.divider} />
        <Text style={s.caption}>OPERATOR AUTHENTICATION REQUIRED</Text>
      </View>

      <View style={s.form}>
        <Text style={s.label}>ACCESS CODE</Text>
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={secure}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={colors.mutedForeground}
            placeholder="••••••••••••"
            onSubmitEditing={handleLogin}
            returnKeyType="go"
          />
          <TouchableOpacity onPress={() => setSecure(v => !v)} style={s.eyeBtn}>
            <Ionicons
              name={secure ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={s.errorRow}>
            <Ionicons name="warning-outline" size={14} color={colors.destructive} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleLogin}
          disabled={loading || !password.trim()}
          activeOpacity={0.75}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <>
              <Ionicons name="flash" size={16} color={colors.primaryForeground} />
              <Text style={s.btnText}>AUTHENTICATE</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={s.footer}>
        <View style={[s.dot, { backgroundColor: colors.success }]} />
        <Text style={s.footerText}>HEIMDALLR SECURE · LEVIATHAN PROTOCOL</Text>
      </View>
    </LinearGradient>
  );
}

const styles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: {
      flex: 1,
      paddingHorizontal: 28,
      justifyContent: 'space-between',
    },
    glow: {
      position: 'absolute',
      top: -80,
      left: '50%',
      marginLeft: -120,
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: c.primary,
      opacity: 0.06,
    },
    header: {
      alignItems: 'center',
      marginTop: 32,
    },
    logoRing: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: 1.5,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      backgroundColor: `${c.primary}10`,
    },
    title: {
      fontSize: 28,
      fontFamily: 'Inter_700Bold',
      color: c.primary,
      letterSpacing: 8,
    },
    subtitle: {
      fontSize: 11,
      fontFamily: 'Inter_500Medium',
      color: c.mutedForeground,
      letterSpacing: 4,
      marginTop: 4,
    },
    divider: {
      width: 48,
      height: 1,
      backgroundColor: c.border,
      marginVertical: 16,
    },
    caption: {
      fontSize: 10,
      fontFamily: 'Inter_400Regular',
      color: c.mutedForeground,
      letterSpacing: 2,
    },
    form: {
      gap: 12,
    },
    label: {
      fontSize: 10,
      fontFamily: 'Inter_600SemiBold',
      color: c.mutedForeground,
      letterSpacing: 3,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: c.radius,
      backgroundColor: c.card,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    input: {
      flex: 1,
      fontSize: 16,
      fontFamily: 'Inter_400Regular',
      color: c.foreground,
    },
    eyeBtn: {
      paddingLeft: 8,
    },
    errorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    errorText: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: c.destructive,
    },
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.primary,
      borderRadius: c.radius,
      paddingVertical: 16,
      marginTop: 8,
    },
    btnDisabled: {
      opacity: 0.5,
    },
    btnText: {
      fontSize: 13,
      fontFamily: 'Inter_700Bold',
      color: c.primaryForeground,
      letterSpacing: 3,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    footerText: {
      fontSize: 9,
      fontFamily: 'Inter_400Regular',
      color: c.mutedForeground,
      letterSpacing: 2,
    },
  });
