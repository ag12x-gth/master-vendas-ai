'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Users, Search, CheckSquare, Square, List } from 'lucide-react';
import type { ContactList } from '@/lib/types';

interface MultiListSelectorProps {
  lists: ContactList[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  maxHeight?: string;
}

export function MultiListSelector({
  lists,
  selectedIds,
  onSelectionChange,
  maxHeight = '200px',
}: MultiListSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLists = useMemo(() => {
    if (!searchTerm.trim()) return lists;
    const term = searchTerm.toLowerCase();
    return lists.filter(list => 
      list.name.toLowerCase().includes(term)
    );
  }, [lists, searchTerm]);

  const totalContacts = useMemo(() => {
    return lists
      .filter(list => selectedIds.includes(list.id))
      .reduce((sum, list) => sum + (list.contactCount || 0), 0);
  }, [lists, selectedIds]);

  const handleToggle = (listId: string) => {
    if (selectedIds.includes(listId)) {
      onSelectionChange(selectedIds.filter(id => id !== listId));
    } else {
      onSelectionChange([...selectedIds, listId]);
    }
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredLists.map(l => l.id);
    const newSelection = [...new Set([...selectedIds, ...allFilteredIds])];
    onSelectionChange(newSelection);
  };

  const handleDeselectAll = () => {
    const filteredIds = new Set(filteredLists.map(l => l.id));
    onSelectionChange(selectedIds.filter(id => !filteredIds.has(id)));
  };

  const allFilteredSelected = filteredLists.length > 0 && 
    filteredLists.every(list => selectedIds.includes(list.id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar listas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={allFilteredSelected || filteredLists.length === 0}
            title="Selecionar todas"
          >
            <CheckSquare className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDeselectAll}
            disabled={selectedIds.length === 0}
            title="Desmarcar todas"
          >
            <Square className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="border">
        <ScrollArea className="pr-3" style={{ height: maxHeight }}>
          <div className="p-2 space-y-1">
            {filteredLists.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <List className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {searchTerm ? 'Nenhuma lista encontrada' : 'Nenhuma lista disponível'}
                </p>
              </div>
            ) : (
              filteredLists.map(list => (
                <div
                  key={list.id}
                  className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedIds.includes(list.id) ? 'bg-primary/5 border border-primary/20' : ''
                  }`}
                  onClick={() => handleToggle(list.id)}
                >
                  <Checkbox
                    id={`list-${list.id}`}
                    checked={selectedIds.includes(list.id)}
                    onCheckedChange={() => handleToggle(list.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor={`list-${list.id}`}
                      className="font-medium cursor-pointer truncate block"
                    >
                      {list.name}
                    </Label>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    <Users className="h-3 w-3 mr-1" />
                    {list.contactCount || 0}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between text-sm bg-primary/5 p-2 rounded-md border border-primary/20">
          <span className="font-medium text-primary">
            {selectedIds.length} lista{selectedIds.length !== 1 ? 's' : ''} selecionada{selectedIds.length !== 1 ? 's' : ''}
          </span>
          <Badge variant="default" className="bg-primary">
            <Users className="h-3 w-3 mr-1" />
            {totalContacts.toLocaleString('pt-BR')} contatos
          </Badge>
        </div>
      )}
    </div>
  );
}

export function SelectedListsSummary({
  lists,
  selectedIds,
}: {
  lists: ContactList[];
  selectedIds: string[];
}) {
  const selectedLists = lists.filter(l => selectedIds.includes(l.id));
  const totalContacts = selectedLists.reduce((sum, l) => sum + (l.contactCount || 0), 0);

  if (selectedLists.length === 0) {
    return <span className="text-muted-foreground">Nenhuma lista selecionada</span>;
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {selectedLists.map(list => (
          <Badge key={list.id} variant="outline" className="text-xs">
            {list.name} ({list.contactCount || 0})
          </Badge>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Total: {totalContacts.toLocaleString('pt-BR')} contatos em {selectedLists.length} lista{selectedLists.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
