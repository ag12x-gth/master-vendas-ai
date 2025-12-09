
'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { UserWithCompany } from '@/lib/types';
import { AppHeader } from '@/components/app-header';
import { FacebookLinkBanner } from '@/components/oauth/facebook-link-banner';
import { PageLayoutProvider, usePageLayout } from './page-layout-context';

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

function MainContentInner({ children }: { children: ReactNode }): JSX.Element {
  const { session } = useSession();
  const { layoutMode } = usePageLayout();
  const [mounted, setMounted] = useState(false);
  const userEmail = session?.userData?.email || '';
  const hasFacebookLinked = !!session?.userData?.facebookId;

  useEffect(() => {
    setMounted(true);
  }, []);

  const isFullHeight = layoutMode === 'full-height';

  const mainClasses = isFullHeight
    ? 'flex-1 min-h-0 overflow-hidden bg-muted/40 p-3 sm:p-4 md:p-4 lg:p-4 flex flex-col'
    : 'flex-1 overflow-y-auto bg-muted/40 p-3 sm:p-4 md:p-4 lg:p-4 pb-20 md:pb-4';

  const contentWrapperClasses = isFullHeight
    ? 'flex-1 min-h-0 w-full max-w-full overflow-hidden'
    : 'w-full max-w-full';

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AppHeader />
      <main className={mainClasses}>
        {mounted && !hasFacebookLinked && userEmail && !isFullHeight && (
          <div className="max-w-7xl mx-auto mb-4">
            <FacebookLinkBanner userEmail={userEmail} />
          </div>
        )}
        <div className={contentWrapperClasses}>
          {children}
        </div>
      </main>
    </div>
  );
}

export function MainContent({ children }: { children: ReactNode }): JSX.Element {
  return (
    <PageLayoutProvider>
      <MainContentInner>{children}</MainContentInner>
    </PageLayoutProvider>
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
