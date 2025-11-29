'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type LayoutMode = 'default' | 'full-height';

interface PageLayoutContextType {
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
}

const PageLayoutContext = createContext<PageLayoutContextType | undefined>(undefined);

export function PageLayoutProvider({ children }: { children: ReactNode }): JSX.Element {
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>('default');

  const setLayoutMode = useCallback((mode: LayoutMode) => {
    setLayoutModeState(mode);
  }, []);

  return (
    <PageLayoutContext.Provider value={{ layoutMode, setLayoutMode }}>
      {children}
    </PageLayoutContext.Provider>
  );
}

export function usePageLayout(): PageLayoutContextType {
  const context = useContext(PageLayoutContext);
  if (context === undefined) {
    throw new Error('usePageLayout deve ser usado dentro de um PageLayoutProvider');
  }
  return context;
}

export function useFullHeightLayout(): void {
  const { setLayoutMode } = usePageLayout();
  
  useState(() => {
    setLayoutMode('full-height');
    return null;
  });
}
