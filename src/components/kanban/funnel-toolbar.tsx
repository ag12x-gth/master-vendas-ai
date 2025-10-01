// src/components/kanban/funnel-toolbar.tsx
'use client';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Search, Plus, Filter } from 'lucide-react';
import type { KanbanFunnel } from '@/lib/types';

interface FunnelToolbarProps {
  funnel: KanbanFunnel;
  onAddCard?: () => void;
  onSearch?: (query: string) => void;
  onFilter?: () => void;
}

export function FunnelToolbar({ funnel, onAddCard, onSearch, onFilter }: FunnelToolbarProps): JSX.Element {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-background">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold">{funnel.name}</h2>
        <div className="text-sm text-muted-foreground">
          {funnel.totalLeads || 0} leads • R$ {(funnel.totalValue || 0).toLocaleString('pt-BR')}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar leads..."
            className="pl-10 w-64"
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </div>
        
        <Button variant="outline" size="sm" onClick={onFilter}>
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
        
        <Button size="sm" onClick={onAddCard}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Lead
        </Button>
      </div>
    </div>
  );
}