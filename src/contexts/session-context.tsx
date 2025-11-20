
'use client';

import { createContext, useContext, type ReactNode } from 'react';
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
  const userEmail = session?.userData?.email || '';
  const hasFacebookLinked = !!session?.userData?.facebookId;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <AppHeader />
      <main className="flex-1 overflow-y-auto bg-muted/40 p-3 sm:p-4 md:p-6 lg:p-8 pb-20 md:pb-6" suppressHydrationWarning>
        {!hasFacebookLinked && userEmail && (
          <div className="max-w-7xl mx-auto mb-4">
            <FacebookLinkBanner userEmail={userEmail} />
          </div>
        )}
        {children}
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
