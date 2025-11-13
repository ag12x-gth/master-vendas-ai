// src/components/kanban/funnel-toolbar.tsx
'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Search, Plus, Filter, Settings, Scan } from 'lucide-react';
import type { KanbanFunnel } from '@/lib/types';
import Link from 'next/link';
import { AnalyzeMeetingsDialog } from './analyze-meetings-dialog';

interface FunnelToolbarProps {
  funnel: KanbanFunnel;
  onAddCard?: () => void;
  onSearch?: (query: string) => void;
  onFilter?: () => void;
}

export function FunnelToolbar({ funnel, onAddCard, onSearch, onFilter }: FunnelToolbarProps): JSX.Element {
  const [analyzeOpen, setAnalyzeOpen] = useState(false);

  return (
    <>
      <AnalyzeMeetingsDialog open={analyzeOpen} onOpenChange={setAnalyzeOpen} funnelId={funnel.id} />
    <div className="border-b bg-background">
      {/* Mobile: Stack vertically, Desktop: horizontal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 gap-3">
        {/* Title section */}
        <div className="flex flex-col gap-1">
          <h2 className="text-lg sm:text-xl font-semibold truncate">{funnel.name}</h2>
          <div className="text-xs sm:text-sm text-muted-foreground">
            {funnel.totalLeads || 0} leads • R$ {(funnel.totalValue || 0).toLocaleString('pt-BR')}
          </div>
        </div>
        
        {/* Actions section */}
        <div className="flex items-center gap-2">
          {/* Search - hidden on mobile, visible on tablet+ */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              className="pl-10 w-48 lg:w-64"
              onChange={(e) => onSearch?.(e.target.value)}
            />
          </div>
          
          {/* Filter button - icon only on mobile */}
          <Button variant="outline" size="sm" onClick={onFilter} className="flex-shrink-0">
            <Filter className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Filtros</span>
          </Button>
          
          {/* Analyze meetings button */}
          <Button variant="outline" size="sm" onClick={() => setAnalyzeOpen(true)} className="flex-shrink-0">
            <Scan className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Analisar Agendamentos</span>
          </Button>
          
          {/* Edit funnel button */}
          <Link href={`/kanban/${funnel.id}/edit`}>
            <Button variant="outline" size="sm" className="flex-shrink-0">
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Editar Kanban</span>
            </Button>
          </Link>
          
          {/* Add button - icon only on mobile */}
          <Button size="sm" onClick={onAddCard} className="flex-shrink-0">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Novo Lead</span>
          </Button>
        </div>
      </div>
      
      {/* Mobile search bar - only visible on mobile */}
      <div className="px-3 pb-3 md:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar leads..."
            className="pl-10 w-full"
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </div>
      </div>
    </div>
    </>
  );
}