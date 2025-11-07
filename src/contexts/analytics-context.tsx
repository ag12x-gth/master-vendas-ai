// src/contexts/analytics-context.tsx
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getFirebaseAnalytics } from '@/lib/firebase-lazy';
import type { Analytics } from 'firebase/analytics';

interface AnalyticsContextType {
  trackEvent: (eventName: string, params?: Record<string, unknown>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export function AnalyticsProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    getFirebaseAnalytics().then((analyticsInstance) => {
      setAnalytics(analyticsInstance);
      if (analyticsInstance) {
        if (process.env.NODE_ENV !== 'production') console.debug('Analytics Provider montado e pronto.');
      } else {
        if (process.env.NODE_ENV !== 'production') console.debug('Analytics não está disponível.');
      }
    });
  }, []);

  const trackEvent = async (eventName: string, params?: Record<string, unknown>): Promise<void> => {
    if (!analytics) {
      const analyticsInstance = await getFirebaseAnalytics();
      if (analyticsInstance) {
        const { logEvent } = await import('firebase/analytics');
        logEvent(analyticsInstance, eventName, params);
        if (process.env.NODE_ENV !== 'production') console.debug(`[Analytics Event]: ${eventName}`, params);
      } else {
        if (process.env.NODE_ENV !== 'production') console.debug(`[Analytics SKIPPED]: ${eventName} (Analytics não suportado)`);
      }
    } else {
      const { logEvent } = await import('firebase/analytics');
      logEvent(analytics, eventName, params);
      if (process.env.NODE_ENV !== 'production') console.debug(`[Analytics Event]: ${eventName}`, params);
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
