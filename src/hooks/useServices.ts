import { createContext, useContext } from 'react';

import type { ServiceContainer } from '@/services/ServiceContainer';

export const ServicesContext = createContext<ServiceContainer | null>(null);

export function useServices(): ServiceContainer {
  const ctx = useContext(ServicesContext);
  if (!ctx) {
    throw new Error('useServices must be used within ServicesContext.Provider');
  }
  return ctx;
}
