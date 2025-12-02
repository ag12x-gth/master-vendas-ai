// src/components/kanban/funnel-toolbar.tsx
'use client';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Search, Plus, Filter, Settings } from 'lucide-react';
import type { KanbanFunnel } from '@/lib/types';
import Link from 'next/link';

interface FunnelToolbarProps {
  funnel: KanbanFunnel;
  onAddCard?: () => void;
  onSearch?: (query: string) => void;
  onFilter?: () => void;
}

export function FunnelToolbar({ funnel, onAddCard, onSearch, onFilter }: FunnelToolbarProps): JSX.Element {
  return (
    <div className="border-b bg-background flex-shrink-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold truncate">{funnel.name}</h2>
          <div className="text-xs text-muted-foreground">
            {funnel.totalLeads || 0} leads • R$ {(funnel.totalValue || 0).toLocaleString('pt-BR')}
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative hidden lg:block">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              className="pl-8 h-8 w-40 xl:w-56 text-sm"
              onChange={(e) => onSearch?.(e.target.value)}
            />
          </div>
          
          <Button variant="outline" size="sm" onClick={onFilter} className="h-8 px-2 sm:px-3">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline ml-1.5">Filtros</span>
          </Button>
          
          <Link href={`/kanban/${funnel.id}/edit`}>
            <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3">
              <Settings className="h-4 w-4" />
              <span className="hidden md:inline ml-1.5">Editar</span>
            </Button>
          </Link>
          
          <Button size="sm" onClick={onAddCard} className="h-8 px-2 sm:px-3">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline ml-1.5">Novo Lead</span>
          </Button>
        </div>
      </div>
      
      <div className="px-3 pb-3 lg:hidden">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar leads..."
            className="pl-8 h-8 w-full text-sm"
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}