'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ActiveCall {
  callId: string;
  contactId?: string;
  customerName: string;
  customerNumber: string;
  status: 'initiated' | 'ringing' | 'in_progress' | 'completed' | 'failed';
  startedAt: Date;
}

interface VapiCallContextType {
  activeCall: ActiveCall | null;
  setActiveCall: (call: ActiveCall | null) => void;
  isCallInProgress: boolean;
}

const VapiCallContext = createContext<VapiCallContextType | undefined>(undefined);

export function VapiCallProvider({ children }: { children: ReactNode }) {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  return (
    <VapiCallContext.Provider
      value={{
        activeCall,
        setActiveCall,
        isCallInProgress: activeCall !== null && 
          ['initiated', 'ringing', 'in_progress'].includes(activeCall.status),
      }}
    >
      {children}
    </VapiCallContext.Provider>
  );
}

export function useVapiCallContext() {
  const context = useContext(VapiCallContext);
  if (context === undefined) {
    throw new Error('useVapiCallContext must be used within a VapiCallProvider');
  }
  return context;
}
