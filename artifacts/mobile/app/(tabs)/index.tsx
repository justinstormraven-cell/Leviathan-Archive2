import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useGetSystemMetrics, useGetAuditLogs, useGetRealms } from '@workspace/api-client-react';

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ThreatPulse({ level }: { level: string }) {
  const colors = useColors();
  const opacity = useSharedValue(1);
  const isCritical = level === 'CRITICAL';
  const isElevated = level === 'ELEVATED';

  useEffect(() => {
    if (isCritical || isElevated) {
      opacity.value = withRepeat(
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      opacity.value = 1;
    }
  }, [level, isCritical, isElevated, opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const color = isCritical ? colors.destructive : isElevated ? colors.warning : colors.success;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }, animStyle]} />
      <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color, letterSpacing: 2 }}>
        {level}
      </Text>
    </View>
  );
}

function MetricCard({
  title,
  value,
  sub,
  icon,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  const colors = useColors();
  const s = mcStyles(colors);
  return (
    <View style={s.card}>
      <View style={s.iconWrap}>{icon}</View>
      <Text style={s.value}>{value}</Text>
      <Text style={s.title}>{title}</Text>
      {sub ? <Text style={s.sub}>{sub}</Text> : null}
    </View>
  );
}

const mcStyles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: c.radius,
      padding: 14,
      gap: 4,
    },
    iconWrap: { marginBottom: 4 },
    value: { fontSize: 24, fontFamily: 'Inter_700Bold', color: c.primary },
    title: { fontSize: 10, fontFamily: 'Inter_500Medium', color: c.mutedForeground, letterSpacing: 1 },
    sub: { fontSize: 9, fontFamily: 'Inter_400Regular', color: c.mutedForeground },
  });

function severityColor(sev: string, c: ReturnType<typeof useColors>) {
  if (sev === 'CRITICAL') return c.destructive;
  if (sev === 'HIGH') return c.accent;
  if (sev === 'MEDIUM') return c.warning;
  return c.mutedForeground;
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === 'web' ? 67 : insets.top + 12;

  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } =
    useGetSystemMetrics({ query: { refetchInterval: 3000 } });

  const { data: realms } = useGetRealms({ query: { refetchInterval: 6000 } });

  const { data: auditLogs } = useGetAuditLogs({ query: { refetchInterval: 8000 } });

  const s = styles(colors);

  const recentLogs = Array.isArray(auditLogs) ? auditLogs.slice(0, 5) : [];
  const realmList = Array.isArray(realms) ? realms : [];

  return (
    <ScrollView
      style={[s.root, { paddingTop: topPad }]}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={metricsLoading}
          onRefresh={refetchMetrics}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>ÓÐINN MATRIX</Text>
          <Text style={s.headerSub}>System Telemetry</Text>
        </View>
        {metrics ? (
          <ThreatPulse level={metrics.threatLevel} />
        ) : null}
      </View>

      {/* Uptime */}
      <View style={s.uptimeRow}>
        <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
        <Text style={s.uptimeText}>
          UPTIME {metrics ? formatUptime(metrics.uptimeSeconds) : '--:--:--'}
        </Text>
      </View>

      {/* Metric grid */}
      <View style={s.grid}>
        <MetricCard
          title="CPU LOAD"
          value={metrics ? `${metrics.cpuPercent.toFixed(1)}%` : '--'}
          icon={<Ionicons name="hardware-chip-outline" size={16} color={colors.primary} />}
        />
        <MetricCard
          title="MEMORY"
          value={metrics ? `${metrics.memoryPercent.toFixed(1)}%` : '--'}
          icon={<Ionicons name="server-outline" size={16} color={colors.primary} />}
        />
      </View>
      <View style={s.grid}>
        <MetricCard
          title="MODULES"
          value={metrics ? `${metrics.activeModules}` : '--'}
          sub={metrics ? `of ${metrics.totalModules} total` : undefined}
          icon={<Ionicons name="pulse-outline" size={16} color={colors.primary} />}
        />
        <MetricCard
          title="REALMS"
          value={metrics ? `${metrics.activeRealms}` : '--'}
          sub="ONLINE"
          icon={<Ionicons name="planet-outline" size={16} color={colors.primary} />}
        />
      </View>

      {/* Realms quick status */}
      {realmList.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>YGGDRASIL REALMS</Text>
          {realmList.slice(0, 5).map(realm => (
            <View key={realm.id} style={s.realmRow}>
              <View style={[s.realmDot, { backgroundColor: realmStatusColor(realm.status, colors) }]} />
              <Text style={s.realmName}>{realm.name}</Text>
              <Text style={s.realmStatus}>{realm.status}</Text>
              {realm.diskUsagePercent != null && (
                <Text style={s.realmDisk}>{realm.diskUsagePercent.toFixed(0)}% disk</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Audit log tail */}
      {recentLogs.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>BRAGI AUDIT LOG</Text>
          {recentLogs.map(log => (
            <View key={log.id} style={s.logRow}>
              <View style={[s.logDot, { backgroundColor: severityColor(log.severity, colors) }]} />
              <View style={s.logContent}>
                <Text style={s.logMsg} numberOfLines={2}>{log.message}</Text>
                <Text style={s.logMeta}>
                  {log.severity} · {log.eventType}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function realmStatusColor(status: string, c: ReturnType<typeof useColors>) {
  if (status === 'ONLINE') return c.success;
  if (status === 'CRITICAL') return c.destructive;
  if (status === 'DEGRADED') return c.warning;
  return c.mutedForeground;
}

const styles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 16, paddingBottom: 100, gap: 12 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 4,
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: 'Inter_700Bold',
      color: c.foreground,
      letterSpacing: 3,
    },
    headerSub: {
      fontSize: 11,
      fontFamily: 'Inter_400Regular',
      color: c.mutedForeground,
      letterSpacing: 1,
    },
    uptimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    uptimeText: {
      fontSize: 10,
      fontFamily: 'Inter_500Medium',
      color: c.mutedForeground,
      letterSpacing: 2,
    },
    grid: { flexDirection: 'row', gap: 10 },
    section: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: c.radius,
      padding: 14,
      gap: 10,
    },
    sectionTitle: {
      fontSize: 10,
      fontFamily: 'Inter_600SemiBold',
      color: c.mutedForeground,
      letterSpacing: 3,
      marginBottom: 2,
    },
    realmRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    realmDot: { width: 6, height: 6, borderRadius: 3 },
    realmName: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium', color: c.foreground },
    realmStatus: { fontSize: 11, fontFamily: 'Inter_400Regular', color: c.mutedForeground },
    realmDisk: { fontSize: 10, fontFamily: 'Inter_400Regular', color: c.mutedForeground },
    logRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    logDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
    logContent: { flex: 1, gap: 2 },
    logMsg: { fontSize: 12, fontFamily: 'Inter_400Regular', color: c.foreground },
    logMeta: { fontSize: 10, fontFamily: 'Inter_400Regular', color: c.mutedForeground, letterSpacing: 1 },
  });
