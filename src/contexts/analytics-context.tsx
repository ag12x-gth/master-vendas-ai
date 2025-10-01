// src/contexts/analytics-context.tsx
'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { analytics } from '@/lib/firebase'; // Importa a instância inicializada
import { logEvent } from 'firebase/analytics';

interface AnalyticsContextType {
  trackEvent: (eventName: string, params?: Record<string, unknown>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export function AnalyticsProvider({ children }: { children: ReactNode }): React.ReactElement {
  useEffect(() => {
    // A inicialização já é feita em firebase.ts, garantindo que só aconteça uma vez.
    // Este useEffect apenas confirma que o módulo foi carregado no cliente e o analytics está pronto.
    if (analytics) {
      if (process.env.NODE_ENV !== 'production') console.debug('Analytics Provider montado e pronto.');
    } else {
      if (process.env.NODE_ENV !== 'production') console.debug('Analytics não está disponível ou está a inicializar.');
    }
  }, []);

  const trackEvent = (eventName: string, params?: Record<string, unknown>): void => {
    if (analytics) {
      logEvent(analytics, eventName, params);
       if (process.env.NODE_ENV !== 'production') console.debug(`[Analytics Event]: ${eventName}`, params);
    } else {
        if (process.env.NODE_ENV !== 'production') console.debug(`[Analytics SKIPPED]: ${eventName} (Analytics não suportado ou inicializando)`);
    }
  };

  return (
    <AnalyticsContext.Provider value={{ trackEvent }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export const useAnalytics = (): AnalyticsContextType => {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics deve ser usado dentro de um AnalyticsProvider');
  }
  return context;
};
