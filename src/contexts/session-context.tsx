
'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { UserWithCompany } from '@/lib/types';
import { AppHeader } from '@/components/app-header';
import { FacebookLinkBanner } from '@/components/oauth/facebook-link-banner';

interface Session {
  empresaId: string | null;
  userId: string | null;
  userData: UserWithCompany | null;
}

interface SessionContextType {
  session: Session | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function MainContent({ children }: { children: ReactNode }): JSX.Element {
  const { session } = useSession();
  const [mounted, setMounted] = useState(false);
  const userEmail = session?.userData?.email || '';
  const hasFacebookLinked = !!session?.userData?.facebookId;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <AppHeader />
      <main className="flex-1 overflow-y-auto bg-muted/40 p-3 sm:p-4 md:p-4 lg:p-4 pb-4">
        {mounted && !hasFacebookLinked && userEmail && (
          <div className="max-w-7xl mx-auto mb-4">
            <FacebookLinkBanner userEmail={userEmail} />
          </div>
        )}
        <div className="w-full max-w-full">
          {children}
        </div>
      </main>
    </div>
  );
}

// O provider agora é usado apenas para disponibilizar os dados da sessão, não para validação.
export function SessionProvider({ children, value }: { children: ReactNode, value: Session | null }): JSX.Element {
    return (
        <SessionContext.Provider value={{ session: value, loading: !value }}>
            {children}
        </SessionContext.Provider>
    )
}

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession deve ser usado dentro de um SessionProvider');
  }
  return context;
};
