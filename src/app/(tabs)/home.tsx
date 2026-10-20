import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { SkeletonList } from '@/components/ui/Skeleton';
import type { Employee } from '@/features/employees/types';
import type { Office } from '@/features/offices/types';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useServices } from '@/hooks/useServices';
import { useAppStore } from '@/store/appStore';
import { todayLabel } from '@/utils/datetime';
import { href } from '@/utils/navigation';

export default function KioskHomeScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const services = useServices();
  const company = useAppStore((s) => s.company);
  const office = useAppStore((s) => s.office);
  const settings = useAppStore((s) => s.settings);
  const employees = useAppStore((s) => s.employees);
  const setEmployees = useAppStore((s) => s.setEmployees);
  const setOffice = useAppStore((s) => s.setOffice);
  const setSettings = useAppStore((s) => s.setSettings);
  const setSelectedEmployee = useAppStore((s) => s.setSelectedEmployee);
  const [query, setQuery] = useState('');
  const [offices, setOffices] = useState<Office[]>([]);
  /** True only until the first list fetch settles — avoids skeleton flash on empty refocus. */
  const [listReady, setListReady] = useState(false);

  const companyName = company?.name?.trim() || 'Your company';

  useLayoutEffect(() => {
    navigation.setOptions({
      title: companyName,
      headerTitleAlign: 'left',
      headerRight: () => null,
      headerTitle: () => (
        <View style={styles.headerTitleWrap}>
          <Text
            style={[styles.headerCompany, { color: theme.text }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {companyName}
          </Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]} numberOfLines={1}>
            {todayLabel()}
            {office ? ` · ${office.name}` : ''}
          </Text>
        </View>
      ),
    });
  }, [companyName, navigation, office, theme.text, theme.textSecondary]);

  const refresh = useCallback(async () => {
    if (!company) {
      setListReady(true);
      return;
    }
    try {
      const locs = await services.offices.listByCompany(company.id);
      setOffices(locs);
      if (office) {
        setEmployees(await services.employees.listByCompanyAndOffice(company.id, office.id));
      } else {
        setEmployees(await services.employees.listByCompany(company.id));
      }
    } finally {
      setListReady(true);
    }
  }, [company, office, services.employees, services.offices, setEmployees]);

  const openMapQuery = useQuery({
    queryKey: ['open-map', company?.id, office?.id, employees.map((e) => e.id).join(',')],
    enabled: employees.length > 0,
    staleTime: 0,
    queryFn: async () => {
      const map: Record<string, boolean> = {};
      await Promise.all(
        employees.map(async (e) => {
          const open = await services.attendance.getOpenCheckIn(e.id);
          map[e.id] = !!open;
        })
      );
      return map;
    },
  });

  const refetchOpenMap = openMapQuery.refetch;

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void refetchOpenMap();
    }, [refresh, refetchOpenMap])
  );

  const selectOffice = async (next: Office) => {
    setOffice(next);
    if (settings) {
      const updated = await services.settings.updateMany({ selectedOfficeId: next.id });
      setSettings(updated);
    }
    if (company) {
      setEmployees(await services.employees.listByCompanyAndOffice(company.id, next.id));
    }
    void refetchOpenMap();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q)
    );
  }, [employees, query]);

  const onSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
    router.push(href(`/kiosk/verify?employeeId=${employee.id}&action=auto`));
  };

  const listHeader = (
    <View style={styles.headerBlock}>
      {offices.length > 1 ? (
        <View style={styles.siteBlock}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Working site</Text>
          <View style={styles.siteRow}>
            {offices.map((loc) => (
              <Chip
                key={loc.id}
                label={loc.name}
                selected={office?.id === loc.id}
                onPress={() => void selectOffice(loc)}
              />
            ))}
          </View>
        </View>
      ) : offices.length === 1 ? (
        <Text style={[styles.singleSite, { color: theme.textSecondary }]}>
          Site · {offices[0].name}
        </Text>
      ) : null}

      <Text style={[styles.heading, { color: theme.text }]}>Who’s punching?</Text>
      <Text style={[styles.headingHint, { color: theme.textSecondary }]}>
        Tap a person to check in or out at this site.
      </Text>
      <TextInput
        placeholder="Search name or code"
        placeholderTextColor={theme.textSecondary}
        value={query}
        onChangeText={setQuery}
        style={[
          styles.search,
          { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface },
        ]}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          !listReady ? (
            <SkeletonList count={4} />
          ) : (
            <View
              style={[
                styles.emptyBox,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No people here</Text>
              <Text style={[styles.empty, { color: theme.textSecondary }]}>
                {office
                  ? 'Nobody is assigned to this site yet. An admin can assign locations under Manage → People.'
                  : 'No people yet. An admin can add them under Manage → People.'}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const checkedIn = openMapQuery.data?.[item.id] === true;
          return (
            <Pressable
              onPress={() => onSelect(item)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
            >
              {item.profileImagePath ? (
                <Image source={{ uri: item.profileImagePath }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: theme.brandSoft }]}>
                  <Text style={{ color: theme.brand, fontWeight: '700', fontSize: 18 }}>
                    {item.fullName.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.cardText}>
                <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                  {item.fullName}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 14 }} numberOfLines={1}>
                  {item.employeeCode}
                  {checkedIn ? ' · tap to check out' : ' · tap to check in'}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: checkedIn ? theme.brand : theme.surfaceMuted,
                    borderColor: checkedIn ? theme.brand : theme.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: checkedIn ? '#fff' : theme.textSecondary,
                    fontWeight: '800',
                    fontSize: 13,
                    letterSpacing: 0.6,
                  }}
                >
                  {checkedIn ? 'IN' : 'OUT'}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16, gap: 10, paddingBottom: 80, flexGrow: 1 },
  headerBlock: { gap: 12, marginBottom: 6 },
  headerTitleWrap: { maxWidth: 280, justifyContent: 'center' },
  headerCompany: { fontSize: 17, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  siteBlock: { gap: 8 },
  siteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  sectionLabel: { fontSize: 13, fontWeight: '600' },
  heading: { fontSize: 24, fontWeight: '800', marginTop: 4, letterSpacing: -0.2 },
  headingHint: { fontSize: 14, lineHeight: 20, marginTop: -4 },
  singleSite: { fontSize: 14 },
  search: {
    borderWidth: 1.5,
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  emptyBox: {
    marginTop: 12,
    minHeight: 160,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  empty: { textAlign: 'center', lineHeight: 22, fontSize: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 72,
  },
  cardText: { flex: 1, gap: 2, minWidth: 0 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 17, fontWeight: '600' },
  statusBadge: {
    minWidth: 52,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

