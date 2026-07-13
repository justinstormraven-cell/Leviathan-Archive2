import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';

const BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type Entry =
  | { id: string; type: 'sys'; text: string }
  | { id: string; type: 'in'; text: string }
  | { id: string; type: 'out'; text: string; exitCode: number }
  | { id: string; type: 'err'; text: string };

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function TerminalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token, isAuthenticated } = useAuth();

  const [entries, setEntries] = useState<Entry[]>([
    { id: uid(), type: 'sys', text: 'Storm Raven OS [v29.14.0-ymir]' },
    { id: uid(), type: 'sys', text: 'Leviathan Protocol active.' },
    { id: uid(), type: 'sys', text: 'Type a command to begin.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const topPad = Platform.OS === 'web' ? 67 : insets.top + 8;

  // Load history on mount
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/terminal/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const history = await res.json() as Array<{
          id: number; command: string; output: string; exitCode: number;
        }>;
        if (!Array.isArray(history) || history.length === 0) return;
        const histEntries: Entry[] = [];
        for (const h of history.slice(-20)) {
          histEntries.push({ id: uid(), type: 'in', text: h.command });
          histEntries.push({ id: uid(), type: 'out', text: h.output, exitCode: h.exitCode });
        }
        setEntries(prev => [
          { id: uid(), type: 'sys', text: '── History restored ──' },
          ...histEntries,
          ...prev,
        ]);
      } catch {
        // ignore
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const submit = async () => {
    const cmd = input.trim();
    if (!cmd || loading) return;
    setInput('');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setEntries(prev => [...prev, { id: uid(), type: 'in', text: cmd }]);

    if (cmd === 'clear') {
      setEntries([{ id: uid(), type: 'sys', text: 'Terminal cleared.' }]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/terminal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json() as { output?: string; exitCode?: number; error?: string };
      if (!res.ok) {
        setEntries(prev => [...prev, { id: uid(), type: 'err', text: data.error ?? 'Command failed' }]);
      } else {
        setEntries(prev => [
          ...prev,
          { id: uid(), type: 'out', text: data.output ?? '', exitCode: data.exitCode ?? 0 },
        ]);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Network error';
      setEntries(prev => [...prev, { id: uid(), type: 'err', text: msg }]);
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors);

  if (!isAuthenticated) {
    return (
      <View style={[s.root, { paddingTop: topPad, alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="lock-closed-outline" size={40} color={colors.mutedForeground} />
        <Text style={[s.sysText, { marginTop: 12 }]}>OPERATOR AUTH REQUIRED</Text>
      </View>
    );
  }

  // Inverted FlatList — newest at bottom, pass data reversed
  const reversed = [...entries].reverse();

  return (
    <View style={[s.root, { paddingTop: topPad }]}>
      <View style={s.titleBar}>
        <View style={[s.dot, { backgroundColor: colors.destructive }]} />
        <View style={[s.dot, { backgroundColor: colors.warning }]} />
        <View style={[s.dot, { backgroundColor: colors.success }]} />
        <Text style={s.titleText}>leviathan-tty1</Text>
      </View>

      <KeyboardAvoidingView style={s.flex} behavior="padding" keyboardVerticalOffset={0}>
        <FlatList
          style={s.flex}
          data={reversed}
          keyExtractor={item => item.id}
          inverted
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled
          renderItem={({ item }) => {
            if (item.type === 'sys') {
              return <Text style={s.sysText}>{item.text}</Text>;
            }
            if (item.type === 'in') {
              return (
                <Text style={s.inText}>
                  <Text style={s.prompt}>root@stormraven:~# </Text>
                  {item.text}
                </Text>
              );
            }
            if (item.type === 'err') {
              return <Text style={s.errText}>{item.text}</Text>;
            }
            // out
            return (
              <Text style={[s.outText, item.exitCode !== 0 && s.errText]}>
                {item.text}
              </Text>
            );
          }}
        />

        <View style={[s.inputBar, { paddingBottom: botPad + 8 }]}>
          <Text style={s.prompt}>root@stormraven:~# </Text>
          <TextInput
            style={s.textInput}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={submit}
            returnKeyType="send"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            placeholderTextColor={colors.mutedForeground}
            placeholder="enter directive..."
            editable={!loading}
          />
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
          ) : (
            <TouchableOpacity onPress={submit} style={s.sendBtn}>
              <Ionicons name="return-down-back-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: '#020509' },
    flex: { flex: 1 },
    titleBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: '#050b15',
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    dot: { width: 10, height: 10, borderRadius: 5 },
    titleText: {
      marginLeft: 8,
      fontSize: 11,
      fontFamily: 'Inter_400Regular',
      color: c.mutedForeground,
      letterSpacing: 1,
    },
    listContent: { padding: 14, gap: 4 },
    sysText: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: c.mutedForeground,
    },
    inText: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: c.foreground,
    },
    outText: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: '#8fc7d9',
      lineHeight: 18,
    },
    errText: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: c.destructive,
    },
    prompt: {
      color: c.primary,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: '#050b15',
    },
    textInput: {
      flex: 1,
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: c.foreground,
      paddingVertical: 0,
    },
    sendBtn: { paddingLeft: 8 },
  });
