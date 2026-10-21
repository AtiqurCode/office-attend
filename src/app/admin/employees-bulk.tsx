import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { FormKeyboardScroll } from '@/components/ui/FormKeyboardScroll';
import { EMPLOYEE_PIN_LENGTH } from '@/constants/pin';
import {
  buildEmployeeTemplateWorkbookBase64,
  buildEmployeesWorkbookBase64,
  parseEmployeesWorkbookBase64,
  type EmployeeExportRow,
} from '@/features/employees/bulkEmployees';
import { importEmployeeSheetRows } from '@/features/employees/bulkImport';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useServices } from '@/hooks/useServices';
import { useAppStore } from '@/store/appStore';
import { canManage } from '@/utils/access';
import { pickSpreadsheetFile, promptSaveXlsx } from '@/utils/sheetFileIo';

export default function EmployeesBulkScreen() {
  const theme = useAppTheme();
  const services = useServices();
  const company = useAppStore((s) => s.company);
  const authUser = useAppStore((s) => s.authUser);
  const settings = useAppStore((s) => s.settings);
  const setEmployees = useAppStore((s) => s.setEmployees);
  const [busy, setBusy] = useState<'export' | 'template' | 'import' | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  if (!canManage(authUser, settings) || !company) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Unlock admin first</Text>
        <Button title="Back" onPress={() => router.back()} />
      </View>
    );
  }

  const buildExportRows = async (): Promise<EmployeeExportRow[]> => {
    const [people, offices] = await Promise.all([
      services.employees.listByCompany(company.id),
      services.offices.listByCompany(company.id),
    ]);
    const officeName = new Map(offices.map((o) => [o.id, o.name]));

    const rows: EmployeeExportRow[] = [];
    for (const emp of people) {
      const officeIds = await services.employees.listOfficeIds(emp.id);
      rows.push({
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        department: emp.department ?? '',
        designation: emp.designation ?? '',
        email: emp.email ?? '',
        pin: '',
        locationNames: officeIds.map((id) => officeName.get(id) ?? id).filter(Boolean),
        isActive: emp.isActive,
        pinSet: !!emp.pinHash,
      });
    }
    return rows;
  };

  const saveWorkbook = async (base64: string, filename: string, okNote: string) => {
    const result = await promptSaveXlsx(base64, filename);
    if (!result.ok) {
      if (!result.canceled) {
        Alert.alert('Save failed', result.message);
      }
      return;
    }
    setLastResult(`${okNote}\n${result.pathHint}`);
  };

  const onDownload = async () => {
    setBusy('export');
    setLastResult(null);
    try {
      const rows = await buildExportRows();
      const safe = (company.name || 'company').replace(/[^\w.-]+/g, '_');
      const base64 = buildEmployeesWorkbookBase64(rows);
      await saveWorkbook(
        base64,
        `employees_${safe}.xlsx`,
        rows.length
          ? `Exported ${rows.length} people. PIN column is blank.`
          : 'Exported empty sheet — fill rows, then upload.'
      );
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Could not export.');
    } finally {
      setBusy(null);
    }
  };

  const onTemplate = async () => {
    setBusy('template');
    setLastResult(null);
    try {
      const offices = await services.offices.listByCompany(company.id);
      const base64 = buildEmployeeTemplateWorkbookBase64(offices[0]?.name);
      await saveWorkbook(
        base64,
        'employees_template.xlsx',
        `Blank template. Set pin to ${EMPLOYEE_PIN_LENGTH} digits for each new person.`
      );
    } catch (e) {
      Alert.alert('Template failed', e instanceof Error ? e.message : 'Could not build template.');
    } finally {
      setBusy(null);
    }
  };

  const onUpload = async () => {
    setBusy('import');
    setLastResult(null);
    try {
      const picked = await pickSpreadsheetFile();
      if (!picked.ok) {
        if (!picked.canceled) {
          Alert.alert('Pick a file', picked.message);
        }
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(picked.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const parsed = parseEmployeesWorkbookBase64(base64);
      if (parsed.errors.length && parsed.rows.length === 0) {
        Alert.alert('Invalid sheet', parsed.errors.slice(0, 8).join('\n'));
        return;
      }

      if (services.backend !== 'firebase') {
        Alert.alert(
          'Firebase required',
          'People must be saved to Firestore. Set EXPO_PUBLIC_FIREBASE_* in .env and restart Expo with --clear.'
        );
        return;
      }

      const result = await importEmployeeSheetRows(
        { employees: services.employees, offices: services.offices, backend: services.backend },
        company.id,
        parsed.rows
      );
      const allErrors = [...parsed.errors, ...result.errors];
      setEmployees(await services.employees.listByCompany(company.id));

      const dbLabel = `Firestore · companies/${company.id}/employees`;
      const summary = [
        `From ${picked.name}`,
        `Created: ${result.created}`,
        `Updated: ${result.updated}`,
        allErrors.length ? `Issues: ${allErrors.length}` : 'No issues',
      ].join(' · ');
      setLastResult(`${summary}\nSaved to ${dbLabel}`);

      if (allErrors.length) {
        Alert.alert(
          'Import finished with issues',
          `${summary}\n\nSaved to ${dbLabel}\n\n${allErrors.slice(0, 12).join('\n')}${
            allErrors.length > 12 ? `\n…and ${allErrors.length - 12} more` : ''
          }`
        );
      } else {
        Alert.alert('Saved to Firestore', `${summary}\n\n${dbLabel}`);
      }
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not import sheet.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <FormKeyboardScroll
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: theme.text }]}>Bulk people (Excel)</Text>
      <Text style={{ color: theme.textSecondary, lineHeight: 21 }}>
        Files live on the phone (or Drive) — the app only reads/writes them when you pick a path.
        Upload then saves people to Firestore at companies/{company.id}/employees.
      </Text>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Download to phone</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 18 }}>
          {Platform.OS === 'android'
            ? 'You’ll get “Save to phone folder…” (Downloads / Documents / SD card) or Share.'
            : 'Share sheet → Save to Files / Downloads.'}
        </Text>
        <Button
          title="Download employees (.xlsx)"
          loading={busy === 'export'}
          onPress={onDownload}
        />
        <Button
          title="Download blank template"
          variant="secondary"
          loading={busy === 'template'}
          onPress={onTemplate}
        />
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Upload from phone</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 18 }}>
          Opens the system file browser — pick from Downloads, Files, Drive, USB, etc. (.xlsx / .csv).
          Each row is written to Firestore (same as Add employee).
        </Text>
        <Button
          title="Pick Excel / CSV from storage"
          loading={busy === 'import'}
          onPress={onUpload}
        />
      </View>

      {lastResult ? (
        <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 18 }}>{lastResult}</Text>
      ) : null}

      <Button title="Back to people list" variant="ghost" onPress={() => router.back()} />
    </FormKeyboardScroll>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 },
  title: { fontSize: 22, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
});
