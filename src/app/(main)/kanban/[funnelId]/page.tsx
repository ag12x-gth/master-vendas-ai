// src/app/(main)/kanban/[funnelId]/page.tsx
'use client';

import { KanbanView } from '@/components/kanban/kanban-view';
import { StagePersonaConfig } from '@/components/kanban/stage-persona-config';
import type { KanbanFunnel, KanbanCard as KanbanCardType } from '@/lib/types';
import { useState, useEffect } from 'react';
import { Loader2, Kanban as KanbanIcon, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { DropResult } from '@hello-pangea/dnd';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function FunnelPage({ params }: { params: { funnelId: string } }) {
  const [funnel, setFunnel] = useState<KanbanFunnel | null>(null);
  const [cards, setCards] = useState<KanbanCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const fetchFunnelData = async () => {
    try {
      setLoading(true);
      const [funnelRes, leadsRes] = await Promise.all([
        fetch(`/api/v1/kanbans/${params.funnelId}`),
        fetch(`/api/v1/leads?boardId=${params.funnelId}`),
      ]);
      
      if (!funnelRes.ok || !leadsRes.ok) throw new Error('Falha ao carregar dados do funil.');

      const funnelData = await funnelRes.json();
      const leadsData = await leadsRes.json();

      setFunnel(funnelData);
      setCards(leadsData);
      
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFunnelData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.funnelId, toast]);
  
  const handleMoveCard = async (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    
    // Optimistic UI update
    const movedCard = cards.find(c => c.id === draggableId);
    if (!movedCard) return;

    const newCards = cards.map(card => 
      card.id === draggableId ? { ...card, stageId: destination.droppableId } : card
    );
    setCards(newCards);

    try {
      const response = await fetch(`/api/v1/leads/${draggableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: destination.droppableId })
      });

      if (!response.ok) {
        throw new Error("Falha ao atualizar o card.");
      }

    } catch (error) {
      // Revert optimistic update on failure
      setCards(cards);
      toast({ variant: "destructive", title: "Erro", description: (error as Error).message });
    }
  };

  const handleUpdateLead = async (leadId: string, data: { stageId?: string; title?: string; value?: number | null; notes?: string }) => {
    const oldCards = [...cards];
    
    // Optimistic update - convert value to string for KanbanCard type
    const updateData: Partial<KanbanCardType> = {
      ...(data.stageId !== undefined && { stageId: data.stageId }),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.value !== undefined && { value: data.value === null ? '' : data.value.toString() })
    };
    
    setCards(cards.map(card => 
      card.id === leadId ? { ...card, ...updateData } : card
    ));

    try {
      const response = await fetch(`/api/v1/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error("Falha ao atualizar o lead.");
      }

      toast({ title: "Sucesso", description: "Lead atualizado com sucesso!" });
    } catch (error) {
      setCards(oldCards);
      toast({ variant: "destructive", title: "Erro", description: (error as Error).message });
      throw error;
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    const oldCards = [...cards];
    
    // Optimistic delete
    setCards(cards.filter(card => card.id !== leadId));

    try {
      const response = await fetch(`/api/v1/leads/${leadId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error("Falha ao excluir o lead.");
      }

      toast({ title: "Sucesso", description: "Lead excluído com sucesso!" });
    } catch (error) {
      setCards(oldCards);
      toast({ variant: "destructive", title: "Erro", description: (error as Error).message });
      throw error;
    }
  };

  const handleAddCard = () => {
    toast({ title: "Em breve", description: "Funcionalidade de adicionar lead em desenvolvimento." });
  };

  const handleFilter = () => {
    toast({ title: "Em breve", description: "Funcionalidade de filtros em desenvolvimento." });
  };

  const handleSearch = (query: string) => {
    console.log('Buscar:', query);
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!funnel) {
    return <div>Funil não encontrado.</div>;
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <Tabs defaultValue="kanban" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent flex-shrink-0">
          <TabsTrigger 
            value="kanban" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
          >
            <KanbanIcon className="h-4 w-4 mr-2" />
            Visualização do Funil
          </TabsTrigger>
          <TabsTrigger 
            value="agents" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
          >
            <Bot className="h-4 w-4 mr-2" />
            Agentes IA por Estágio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="flex-1 mt-0 min-h-0">
          <KanbanView 
            funnel={funnel} 
            cards={cards} 
            onMoveCard={handleMoveCard} 
            onUpdateCards={fetchFunnelData}
            onUpdateLead={handleUpdateLead}
            onDeleteLead={handleDeleteLead}
            onAddCard={handleAddCard}
            onFilter={handleFilter}
            onSearch={handleSearch}
          />
        </TabsContent>

        <TabsContent value="agents" className="flex-1 mt-0 min-h-0 overflow-auto p-4">
          <StagePersonaConfig 
            boardId={params.funnelId} 
            stages={funnel.stages}
            funnelType={funnel.funnelType ?? undefined}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
