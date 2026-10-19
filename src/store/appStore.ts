import { create } from 'zustand';

import type { Company } from '@/features/companies/types';
import type { Employee } from '@/features/employees/types';
import type { Office } from '@/features/offices/types';
import type { AppSettings } from '@/features/settings/repositories/SettingsRepository';
import type { AuthProfile } from '@/firebase/authAccount';

interface AppState {
  hydrated: boolean;
  authUser: AuthProfile | null;
  company: Company | null;
  employees: Employee[];
  selectedEmployee: Employee | null;
  office: Office | null;
  settings: AppSettings | null;
  setHydrated: (value: boolean) => void;
  setAuthUser: (user: AuthProfile | null) => void;
  setCompany: (company: Company | null) => void;
  setEmployees: (employees: Employee[]) => void;
  setSelectedEmployee: (employee: Employee | null) => void;
  setOffice: (office: Office | null) => void;
  setSettings: (settings: AppSettings) => void;
}

export const useAppStore = create<AppState>((set) => ({
  hydrated: false,
  authUser: null,
  company: null,
  employees: [],
  selectedEmployee: null,
  office: null,
  settings: null,
  setHydrated: (hydrated) => set({ hydrated }),
  setAuthUser: (authUser) => set({ authUser }),
  setCompany: (company) => set({ company }),
  setEmployees: (employees) => set({ employees }),
  setSelectedEmployee: (selectedEmployee) => set({ selectedEmployee }),
  setOffice: (office) => set({ office }),
  setSettings: (settings) => set({ settings }),
}));
