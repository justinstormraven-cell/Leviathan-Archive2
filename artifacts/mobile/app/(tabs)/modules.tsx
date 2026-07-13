import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useGetModules } from '@workspace/api-client-react';

type Module = {
  id: number;
  name: string;
  codename: string;
  realmName: string;
  status: string;
  description: string;
  authLevel: string;
  pid: number | null;
  lastActivated: string | null;
};

function statusColor(status: string, c: ReturnType<typeof useColors>) {
  if (status === 'ACTIVE') return c.success;
  if (status === 'INACTIVE') return c.mutedForeground;
  return c.warning;
}

function authIcon(level: string) {
  if (level === 'OPERATOR') return 'shield' as const;
  if (level === 'ELEVATED') return 'shield-half' as const;
  return 'shield-outline' as const;
}

function ModuleCard({ mod }: { mod: Module }) {
  const colors = useColors();
  const s = cardStyles(colors);
  const sc = statusColor(mod.status, colors);
  const isActive = mod.status === 'ACTIVE';

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <TouchableOpacity activeOpacity={0.75} onPress={handlePress} style={s.card}>
      <View style={s.top}>
        <View style={s.nameRow}>
          <View style={[s.statusDot, { backgroundColor: sc }]} />
          <Text style={s.name}>{mod.name}</Text>
        </View>
        <View style={s.badgeRow}>
          <Ionicons name={authIcon(mod.authLevel)} size={11} color={colors.mutedForeground} />
          <View style={[s.statusBadge, { borderColor: sc }]}>
            <Text style={[s.statusText, { color: sc }]}>{mod.status}</Text>
          </View>
        </View>
      </View>

      <Text style={s.codename}>/{mod.codename}</Text>
      <Text style={s.desc} numberOfLines={2}>{mod.description}</Text>

      <View style={s.meta}>
        <Text style={s.metaText}>{mod.realmName}</Text>
        {isActive && mod.pid ? (
          <Text style={s.metaText}>PID {mod.pid}</Text>
        ) : null}
        {mod.lastActivated ? (
          <Text style={s.metaText}>
            {new Date(mod.lastActivated).toLocaleDateString()}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const cardStyles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: c.radius,
      padding: 14,
      marginHorizontal: 16,
      marginBottom: 10,
      gap: 6,
    },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    name: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: c.foreground, flex: 1 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusBadge: {
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    statusText: { fontSize: 9, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
    codename: { fontSize: 10, fontFamily: 'Inter_400Regular', color: c.primary, letterSpacing: 1 },
    desc: { fontSize: 12, fontFamily: 'Inter_400Regular', color: c.mutedForeground, lineHeight: 17 },
    meta: { flexDirection: 'row', gap: 12, marginTop: 2 },
    metaText: { fontSize: 10, fontFamily: 'Inter_400Regular', color: c.mutedForeground },
  });

export default function ModulesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top + 12;

  const { data: modules, isLoading, refetch } = useGetModules({
    query: { refetchInterval: 5000 },
  });

  const modList = Array.isArray(modules) ? modules as Module[] : [];
  const active = modList.filter(m => m.status === 'ACTIVE').length;

  const s = styles(colors);

  return (
    <View style={[s.root, { paddingTop: topPad }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>PANTHEON</Text>
        <Text style={s.headerSub}>Daemon Governance</Text>
        <View style={s.stat}>
          <View style={[s.dot, { backgroundColor: colors.success }]} />
          <Text style={s.statText}>{active} ACTIVE · {modList.length} TOTAL</Text>
        </View>
      </View>

      <FlatList
        data={modList}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => <ModuleCard mod={item} />}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.empty}>
              <Ionicons name="hardware-chip-outline" size={36} color={colors.mutedForeground} />
              <Text style={s.emptyText}>No modules found</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    header: { paddingHorizontal: 16, paddingBottom: 12, gap: 2 },
    headerTitle: {
      fontSize: 20,
      fontFamily: 'Inter_700Bold',
      color: c.foreground,
      letterSpacing: 3,
    },
    headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: c.mutedForeground },
    stat: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    statText: {
      fontSize: 10,
      fontFamily: 'Inter_500Medium',
      color: c.mutedForeground,
      letterSpacing: 2,
    },
    empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
    emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: c.mutedForeground },
  });
