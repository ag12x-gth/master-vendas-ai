

import '../globals.css';
import { AppSidebar, SidebarProvider } from '@/components/app-sidebar';
import { ThemeProvider } from '@/components/theme-provider';
import { SessionProvider, MainContent } from '@/contexts/session-context';
import type { ReactNode } from 'react';
import { getUserSession } from '@/app/actions';
import { redirect } from 'next/navigation';
import { AnalyticsProvider } from '@/contexts/analytics-context';
import { ConsoleMonitor } from '@/components/dev/console-monitor';

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store';

export default async function MainLayout({
  children,
}: {
  children: ReactNode;
}): Promise<React.ReactElement> {

  const sessionData = await getUserSession();
  
  if (sessionData.error || !sessionData.user) {
    const params = new URLSearchParams();
    if (sessionData.errorCode) {
        params.set('error', sessionData.errorCode);
    }
    return redirect(`/login?${params.toString()}`);
  }

  const session = {
      empresaId: sessionData.user.companyId,
      userId: sessionData.user.id,
      userData: sessionData.user,
  };
  
  return (
    <SessionProvider value={session}>
        <AnalyticsProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                <SidebarProvider>
                <div className="flex h-screen w-full bg-background overflow-hidden">
                    <AppSidebar />
                    <MainContent>
                        {children}
                    </MainContent>
                </div>
                </SidebarProvider>
                <ConsoleMonitor />
            </ThemeProvider>
        </AnalyticsProvider>
    </SessionProvider>
  );
}
