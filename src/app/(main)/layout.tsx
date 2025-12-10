

import '../globals.css';
import { AppSidebar, SidebarProvider, MobileMenuButton } from '@/components/app-sidebar';
import { MobileNav } from '@/components/responsive/mobile-nav';
import { ThemeProvider } from '@/components/theme-provider';
import { SessionProvider, MainContent } from '@/contexts/session-context';
import type { ReactNode } from 'react';
import { getUserSession } from '@/app/actions';
import { redirect } from 'next/navigation';
import { AnalyticsProvider } from '@/contexts/analytics-context';
import dynamic from 'next/dynamic';

const ConsoleMonitor = dynamic(() => import('@/components/dev/console-monitor').then(m => m.ConsoleMonitor), { ssr: false });
const InstallBanner = dynamic(() => import('@/components/pwa/install-banner').then(m => m.InstallBanner), { ssr: false });

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
                        <MobileMenuButton />
                        <AppSidebar />
                        <MainContent>
                            {children}
                        </MainContent>
                        <MobileNav />
                    </div>
                </SidebarProvider>
                <ConsoleMonitor />
                <InstallBanner />
            </ThemeProvider>
        </AnalyticsProvider>
    </SessionProvider>
  );
}
