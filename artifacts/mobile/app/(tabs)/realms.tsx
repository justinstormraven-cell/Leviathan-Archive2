import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useGetRealms } from '@workspace/api-client-react';

type Realm = {
  id: number;
  name: string;
  codename: string;
  status: string;
  description: string;
  mountPath: string;
  diskUsagePercent: number | null;
  activeProcesses: number | null;
};

function statusColor(status: string, c: ReturnType<typeof useColors>): string {
  if (status === 'ONLINE') return c.success;
  if (status === 'CRITICAL') return c.destructive;
  if (status === 'DEGRADED') return c.warning;
  return c.mutedForeground;
}

function realmIcon(codename: string): keyof typeof Ionicons.glyphMap {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = {
    midgard: 'earth-outline',
    asgard: 'star-outline',
    niflheim: 'snow-outline',
    muspelheim: 'flame-outline',
    jotunheim: 'triangle-outline',
    alfheim: 'sparkles-outline',
    svartalfheim: 'moon-outline',
    helheim: 'skull-outline',
    vanaheim: 'leaf-outline',
  };
  return map[codename.toLowerCase()] ?? 'planet-outline';
}

function DiskBar({ pct, color }: { pct: number; color: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
      <View style={{ flex: 1, height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' }}>
        <View style={{ width: `${Math.min(pct, 100)}%`, height: 3, backgroundColor: color, borderRadius: 2 }} />
      </View>
      <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>
        {pct.toFixed(0)}%
      </Text>
    </View>
  );
}

function RealmCard({ realm }: { realm: Realm }) {
  const colors = useColors();
  const sc = statusColor(realm.status, colors);
  const s = cardStyles(colors);

  return (
    <View style={s.card}>
      <View style={s.top}>
        <View style={[s.iconWrap, { borderColor: sc }]}>
          <Ionicons name={realmIcon(realm.codename)} size={22} color={sc} />
        </View>
        <View style={s.info}>
          <View style={s.nameRow}>
            <Text style={s.name}>{realm.name}</Text>
            <View style={[s.badge, { backgroundColor: sc + '22', borderColor: sc }]}>
              <Text style={[s.badgeText, { color: sc }]}>{realm.status}</Text>
            </View>
          </View>
          <Text style={s.codename}>{realm.codename.toUpperCase()}</Text>
          <Text style={s.mount}>{realm.mountPath}</Text>
        </View>
      </View>

      <Text style={s.desc} numberOfLines={2}>{realm.description}</Text>

      {realm.diskUsagePercent != null && (
        <View>
          <Text style={s.metaLabel}>DISK USAGE</Text>
          <DiskBar
            pct={realm.diskUsagePercent}
            color={realm.diskUsagePercent > 85 ? colors.destructive : colors.primary}
          />
        </View>
      )}

      {realm.activeProcesses != null && (
        <View style={s.procRow}>
          <Ionicons name="pulse-outline" size={10} color={colors.mutedForeground} />
          <Text style={s.procText}>{realm.activeProcesses} processes</Text>
        </View>
      )}
    </View>
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
      gap: 8,
    },
    top: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${c.card}80`,
    },
    info: { flex: 1, gap: 2 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { flex: 1, fontSize: 15, fontFamily: 'Inter_600SemiBold', color: c.foreground },
    badge: {
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 2,
    },
    badgeText: { fontSize: 9, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
    codename: { fontSize: 10, fontFamily: 'Inter_500Medium', color: c.primary, letterSpacing: 2 },
    mount: { fontSize: 10, fontFamily: 'Inter_400Regular', color: c.mutedForeground },
    desc: { fontSize: 12, fontFamily: 'Inter_400Regular', color: c.mutedForeground, lineHeight: 17 },
    metaLabel: { fontSize: 9, fontFamily: 'Inter_500Medium', color: c.mutedForeground, letterSpacing: 2 },
    procRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    procText: { fontSize: 10, fontFamily: 'Inter_400Regular', color: c.mutedForeground },
  });

export default function RealmsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top + 12;

  const { data: realms, isLoading, refetch } = useGetRealms({
    query: { refetchInterval: 6000 },
  });

  const realmList = Array.isArray(realms) ? realms as Realm[] : [];
  const online = realmList.filter(r => r.status === 'ONLINE').length;

  const s = styles(colors);

  return (
    <View style={[s.root, { paddingTop: topPad }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>YGGDRASIL</Text>
        <Text style={s.headerSub}>Realm Topology</Text>
        <View style={s.stat}>
          <View style={[s.dot, { backgroundColor: colors.success }]} />
          <Text style={s.statText}>{online} ONLINE · {realmList.length} REALMS</Text>
        </View>
      </View>

      <FlatList
        data={realmList}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => <RealmCard realm={item} />}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.empty}>
              <Ionicons name="planet-outline" size={36} color={colors.mutedForeground} />
              <Text style={s.emptyText}>No realms found</Text>
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
