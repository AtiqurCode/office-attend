import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useServices } from '@/hooks/useServices';
import { useAppStore } from '@/store/appStore';
import { canManage } from '@/utils/access';
import { href } from '@/utils/navigation';

export default function AdminEmployeesScreen() {
  const theme = useAppTheme();
  const services = useServices();
  const company = useAppStore((s) => s.company);
  const employees = useAppStore((s) => s.employees);
  const authUser = useAppStore((s) => s.authUser);
  const settings = useAppStore((s) => s.settings);
  const setEmployees = useAppStore((s) => s.setEmployees);
  const [locCounts, setLocCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!company) {
        setLoading(false);
        return;
      }
      void (async () => {
        setLoading(true);
        try {
          const list = await services.employees.listByCompany(company.id);
          setEmployees(list);
          const counts: Record<string, number> = {};
          await Promise.all(
            list.map(async (e) => {
              counts[e.id] = (await services.employees.listOfficeIds(e.id)).length;
            })
          );
          setLocCounts(counts);
        } finally {
          setLoading(false);
        }
      })();
    }, [company, services.employees, setEmployees])
  );

  if (!canManage(authUser, settings)) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Unlock admin first</Text>
        <Button title="Back" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Button title="Add employee" onPress={() => router.push(href('/admin/employee-form'))} />
      <Text style={[styles.hint, { color: theme.textSecondary }]}>
        Assign a site so they only punch there.
      </Text>
      <FlatList
        data={employees}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 10, paddingTop: 4, paddingBottom: 40 }}
        ListEmptyComponent={
          loading ? (
            <SkeletonList count={6} />
          ) : (
            <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>No employees yet.</Text>
          )
        }
        renderItem={({ item }) => {
          const n = locCounts[item.id] ?? 0;
          return (
            <Pressable
              onPress={() => router.push(href(`/admin/employee-form?id=${item.id}`))}
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              {item.profileImagePath ? (
                <Image source={{ uri: item.profileImagePath }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: theme.brandSoft }]}>
                  <Text style={{ color: theme.brand, fontWeight: '800', fontSize: 18 }}>
                    {item.fullName.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }} numberOfLines={1}>
                  {item.fullName}
                </Text>
                <Text style={{ color: theme.textSecondary }} numberOfLines={1}>
                  {item.employeeCode}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 13 }} numberOfLines={1}>
                  {item.pinHash ? 'PIN set' : 'No PIN'}
                  {' · '}
                  {n ? `${n} ${n === 1 ? 'site' : 'sites'}` : 'No site'}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  hint: { fontSize: 13, lineHeight: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
