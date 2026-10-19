import AsyncStorage from '@react-native-async-storage/async-storage';

const COMPANY_KEY = 'attendface.boundCompanyId';

export async function getBoundCompanyId(): Promise<string | null> {
  return AsyncStorage.getItem(COMPANY_KEY);
}

export async function setBoundCompanyId(companyId: string): Promise<void> {
  await AsyncStorage.setItem(COMPANY_KEY, companyId);
}

export async function clearBoundCompanyId(): Promise<void> {
  await AsyncStorage.removeItem(COMPANY_KEY);
}
