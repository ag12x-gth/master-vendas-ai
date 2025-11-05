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


  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!funnel) {
    return <div>Funil não encontrado.</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="kanban" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
          <TabsTrigger 
            value="kanban" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            <KanbanIcon className="h-4 w-4 mr-2" />
            Visualização do Funil
          </TabsTrigger>
          <TabsTrigger 
            value="agents" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            <Bot className="h-4 w-4 mr-2" />
            Agentes IA por Estágio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="flex-1 mt-0">
          <KanbanView 
            funnel={funnel} 
            cards={cards} 
            onMoveCard={handleMoveCard} 
            onUpdateCards={fetchFunnelData} 
          />
        </TabsContent>

        <TabsContent value="agents" className="flex-1 mt-4 overflow-auto p-4">
          <StagePersonaConfig 
            boardId={params.funnelId} 
            stages={funnel.stages}
            funnelType={funnel.funnelType}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
