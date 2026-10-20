import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

export type SearchableOption = {
  id: string;
  label: string;
  hint?: string;
};

type Props = {
  label: string;
  options: SearchableOption[];
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
  emptyText?: string;
  /** Max visible rows in the dropdown. */
  maxVisible?: number;
};

/**
 * Compact select: shows the chosen value, expands to a searchable list.
 * Built for forms inside FormKeyboardScroll (no nested VirtualizedList).
 */
export function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Search…',
  emptyText = 'No matches',
  maxVisible = 6,
}: Props) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.hint?.toLowerCase().includes(q) ?? false)
    );
  }, [options, query]);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>

      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={[
          styles.field,
          {
            backgroundColor: theme.surface,
            borderColor: open ? theme.brand : theme.border,
          },
        ]}
      >
        <View style={styles.fieldText}>
          {selected ? (
            <>
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }} numberOfLines={1}>
                {selected.label}
              </Text>
              {selected.hint ? (
                <Text style={{ color: theme.textSecondary, fontSize: 13 }} numberOfLines={1}>
                  {selected.hint}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={{ color: theme.textSecondary, fontSize: 16 }}>Tap to choose…</Text>
          )}
        </View>
        <Text style={{ color: theme.textSecondary, fontSize: 18 }}>{open ? '▴' : '▾'}</Text>
      </Pressable>

      {open ? (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder}
            placeholderTextColor={theme.textSecondary}
            autoFocus
            style={[
              styles.search,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.background,
              },
            ]}
          />
          <View style={{ maxHeight: maxVisible * 52 }}>
            {filtered.length === 0 ? (
              <Text style={[styles.empty, { color: theme.textSecondary }]}>{emptyText}</Text>
            ) : (
              filtered.map((o) => {
                const active = o.id === value;
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => pick(o.id)}
                    style={[
                      styles.row,
                      {
                        backgroundColor: active ? theme.brandSoft : 'transparent',
                        borderBottomColor: theme.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={{ color: theme.text, fontWeight: active ? '800' : '600', fontSize: 15 }}
                        numberOfLines={1}
                      >
                        {o.label}
                      </Text>
                      {o.hint ? (
                        <Text style={{ color: theme.textSecondary, fontSize: 12 }} numberOfLines={1}>
                          {o.hint}
                        </Text>
                      ) : null}
                    </View>
                    {active ? (
                      <Text style={{ color: theme.brand, fontWeight: '800' }}>✓</Text>
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  field: {
    minHeight: 54,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldText: { flex: 1, gap: 2, minWidth: 0 },
  dropdown: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 2,
  },
  search: {
    margin: 10,
    marginBottom: 4,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  row: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  empty: { padding: 16, textAlign: 'center', fontSize: 14 },
});
