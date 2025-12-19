

'use client';

import Link from 'next/link';
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  BotMessageSquare,
  LayoutDashboard,
  Send,
  MessageSquareText,
  Users,
  Settings,
  MessagesSquare,
  Plug,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  GalleryVertical,
  MessageCircle,
  LifeBuoy,
  ChevronDown,
  Tags,
  Shield,
  GitBranch,
  Bot,
  Route,
  Phone,
  Kanban,
  Menu,
  X,
} from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { useSession } from '@/contexts/session-context';
import { Skeleton } from './ui/skeleton';
import { useResponsive } from '@/hooks/useResponsive';

interface SidebarContextType {
  isExpanded: boolean;
  setExpanded: (expanded: boolean) => void;
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setExpanded] = useState(true);
  const [isMobileOpen, setMobileOpen] = useState(false);

  const toggleMobile = () => setMobileOpen(!isMobileOpen);

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  return (
    <SidebarContext.Provider value={{ isExpanded, setExpanded, isMobileOpen, setMobileOpen, toggleMobile }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

export function MobileMenuButton() {
  const { toggleMobile, isMobileOpen } = useSidebar();
  const { isMobile } = useResponsive();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isMobile) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleMobile}
      className="md:hidden fixed top-3 left-3 z-50 bg-background border border-border shadow-lg"
    >
      {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </Button>
  );
}

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'atendente', 'superadmin'] },
  { href: '/ajuda', label: 'Primeiros Passos', icon: LifeBuoy, roles: ['admin', 'atendente', 'superadmin'] },
  { href: '/atendimentos', label: 'Atendimentos', icon: MessagesSquare, roles: ['admin', 'atendente', 'superadmin'] },
  {
    label: 'Leads & CRM',
    icon: Users,
    roles: ['admin', 'atendente', 'superadmin'],
    isGroup: true,
    subItems: [
        { href: '/contacts', label: 'Contatos', icon: Users, roles: ['admin', 'atendente', 'superadmin'] },
        { href: '/lists', label: 'Listas', icon: ClipboardList, roles: ['admin', 'atendente', 'superadmin'] },
        { href: '/tags', label: 'Tags', icon: Tags, roles: ['admin', 'superadmin'] },
        { href: '/kanban', label: 'Pipeline Kanban', icon: Kanban, roles: ['admin', 'superadmin'] },
    ]
  },
  {
    label: 'Campanhas',
    icon: Send,
    roles: ['admin', 'superadmin'],
    isGroup: true,
    subItems: [
      { href: '/campaigns', label: 'WhatsApp Normal', icon: MessageSquareText, roles: ['admin', 'superadmin'] },
      { href: '/campaigns-baileys', label: 'WhatsApp Business', icon: MessageCircle, roles: ['admin', 'superadmin'] },
      { href: '/sms', label: 'SMS', icon: MessageCircle, roles: ['admin', 'superadmin'] },
      { href: '/templates-v2', label: 'Templates WhatsApp', icon: MessageSquareText, roles: ['admin', 'superadmin'] },
    ],
  },
  {
    label: 'Automação',
    icon: GitBranch,
    roles: ['admin', 'superadmin'],
    isGroup: true,
    subItems: [
      { href: '/automations', label: 'Fluxos', icon: GitBranch, roles: ['admin', 'superadmin'] },
      { href: '/agentes-ia', label: 'Agentes de IA', icon: Bot, roles: ['admin', 'superadmin'] },
      { href: '/roteamento', label: 'Roteamento', icon: Route, roles: ['admin', 'superadmin'] },
    ],
  },
  {
    label: 'Canais',
    icon: Plug,
    roles: ['admin', 'superadmin'],
    isGroup: true,
    subItems: [
      { href: '/connections', label: 'WhatsApp Business', icon: Plug, roles: ['admin', 'superadmin'] },
      { href: '/whatsapp-sessoes', label: 'Sessões WhatsApp', icon: BotMessageSquare, roles: ['admin', 'superadmin'] },
      { href: '/voice-ai', label: 'Voice AI', icon: Phone, roles: ['admin', 'superadmin'] },
    ],
  },
  { href: '/gallery', label: 'Galeria', icon: GalleryVertical, roles: ['admin', 'superadmin'] },
];

const NavItemLink = ({ item, isExpanded }: { item: any, isExpanded: boolean }) => {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const checkIsActive = () => {
      if (!item.href) return false;
      const pathMatches = pathname === item.href;
      
      if (!item.query) {
          return pathMatches && !searchParams.has('tab');
      }

      const queryParamsMatch = Object.entries(item.query).every(([key, value]) => {
          return searchParams.get(key) === value;
      });

      return pathMatches && queryParamsMatch;
    }

    const isActive = checkIsActive();
    const linkHref = item.query ? `${item.href}?${new URLSearchParams(item.query).toString()}` : item.href;

    return (
        <Tooltip delayDuration={500}>
            <TooltipTrigger asChild>
                <Link
                  href={linkHref}
                  className={cn(
                    'flex h-9 items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground',
                     isExpanded ? 'w-full px-3' : 'w-9 justify-center',
                     isActive ? 'bg-accent text-accent-foreground' : '',
                     'min-w-0'
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {isExpanded && <span className="ml-4 truncate flex-1 min-w-0 text-left">{item.label}</span>}
                  {!isExpanded && <span className="sr-only">{item.label}</span>}
                </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
    );
};

const NavItemGroup = ({ item, isExpanded }: { item: any, isExpanded: boolean }) => {
    const pathname = usePathname();
    const isChildActive = item.subItems.some((sub: any) => sub.href && pathname.startsWith(sub.href));

    return (
        <Collapsible defaultOpen={isChildActive}>
            <Tooltip delayDuration={500}>
                <TooltipTrigger asChild>
                    <CollapsibleTrigger asChild>
                         <div className={cn(
                                'flex h-9 cursor-pointer items-center justify-between rounded-lg text-muted-foreground transition-colors hover:text-foreground',
                                 isExpanded ? 'w-full px-3' : 'w-9 justify-center',
                                 isChildActive && 'text-foreground'
                            )}>
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                <item.icon className="h-5 w-5 flex-shrink-0" />
                                {isExpanded && <span className="font-medium truncate">{item.label}</span>}
                                {!isExpanded && <span className="sr-only">{item.label}</span>}
                            </div>
                            {isExpanded && <ChevronDown className="h-4 w-4 flex-shrink-0 transition-transform [&[data-state=open]]:rotate-180" />}
                        </div>
                    </CollapsibleTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
            <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                 <div className={cn("flex flex-col gap-1 py-1", isExpanded ? "pl-6 border-l ml-5" : "items-center")}>
                     {item.subItems.map((subItem: any) => (
                        <NavItemLink key={subItem.href + (subItem.query ? `?tab=${subItem.query.tab}` : '')} item={subItem} isExpanded={isExpanded} />
                    ))}
                 </div>
            </CollapsibleContent>
        </Collapsible>
    )
}

export function AppSidebar() {
  const { isExpanded, setExpanded, isMobileOpen, setMobileOpen } = useSidebar();
  const { session, loading } = useSession();
  const { isMobile } = useResponsive();
  const [mounted, setMounted] = useState(false);
  const userRole = session?.userData?.role;
  const navItems = allNavItems.filter(item => userRole && item.roles.includes(userRole));
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [pathname, isMobile, setMobileOpen]);

  return (
    <>
      {mounted && isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside 
        className={cn(
          "flex-col border-r bg-background transition-all duration-300",
          isMobile 
            ? cn(
                "fixed inset-y-0 left-0 z-50 w-72 md:hidden",
                isMobileOpen ? "translate-x-0" : "-translate-x-full"
              )
            : cn(
                "hidden sm:flex",
                isExpanded ? "w-60" : "w-16"
              )
        )}
      >
        <div className={cn("flex h-14 items-center border-b", isExpanded ? "px-4" : "justify-center")}>
             <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                <BotMessageSquare className="h-6 w-6 text-primary" />
                <span className={cn(isExpanded ? "block" : "hidden")}>Master IA</span>
            </Link>
        </div>
      <TooltipProvider>
        <nav className="flex flex-col gap-1 px-2 sm:py-5">
          {loading ? (
             [...Array(8)].map((_, i) => (
                <div key={i} className={cn('flex h-9 items-center justify-start rounded-lg', isExpanded ? 'w-full px-3' : 'w-9 justify-center')}>
                    <Skeleton className={cn("h-full", isExpanded ? "w-full" : "w-9")} />
                </div>
            ))
          ) : navItems.map((item) => (
             item.isGroup ? (
                 <NavItemGroup key={item.label} item={item} isExpanded={isExpanded} />
             ) : (
                 <NavItemLink key={item.href} item={item} isExpanded={isExpanded} />
             )
          ))}
        </nav>
        <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
          {(userRole === 'admin' || userRole === 'superadmin') && !loading && (
            <Tooltip delayDuration={isExpanded ? 1000 : 0}>
                <TooltipTrigger asChild>
                <Link
                    href="/settings"
                    className={cn('flex h-9 items-center justify-start rounded-lg text-muted-foreground transition-colors hover:text-foreground',
                    isExpanded ? 'w-full px-3' : 'w-9 justify-center',
                    pathname.startsWith('/settings') && 'bg-accent text-accent-foreground'
                    )}
                >
                    <Settings className="h-5 w-5" />
                    {isExpanded && <span className="ml-4">Configurações</span>}
                    {!isExpanded && <span className="sr-only">Configurações</span>}
                </Link>
                </TooltipTrigger>
                {!isExpanded && (
                    <TooltipContent side="right">Configurações</TooltipContent>
                )}
            </Tooltip>
          )}
          {userRole === 'superadmin' && !loading && (
             <Tooltip delayDuration={isExpanded ? 1000 : 0}>
                <TooltipTrigger asChild>
                <Link
                    href="/super-admin"
                    className={cn('flex h-9 items-center justify-start rounded-lg text-muted-foreground transition-colors hover:text-foreground',
                    isExpanded ? 'w-full px-3' : 'w-9 justify-center',
                    pathname.startsWith('/super-admin') && 'bg-accent text-accent-foreground'
                    )}
                >
                    <Shield className="h-5 w-5" />
                    {isExpanded && <span className="ml-4">Super Admin</span>}
                    {!isExpanded && <span className="sr-only">Super Admin</span>}
                </Link>
                </TooltipTrigger>
                {!isExpanded && (
                    <TooltipContent side="right">Super Admin</TooltipContent>
                )}
            </Tooltip>
          )}
            <div className="flex flex-col items-center gap-2 w-full">
                
                <Button
                    variant="ghost"
                    className={cn('flex h-9 items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground', isExpanded ? 'w-full px-3 justify-start' : 'w-9 justify-center')}
                    onClick={() => setExpanded(!isExpanded)}
                >
                    {isExpanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    {isExpanded && <span className="ml-4">Recolher</span>}
                    {!isExpanded && <span className="sr-only">Expandir menu</span>}
                </Button>
            </div>
        </nav>
      </TooltipProvider>
    </aside>
    </>
  );
}
