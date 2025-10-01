// src/app/(main)/kanban/[funnelId]/page.tsx
'use client';

import { KanbanView } from '@/components/kanban/kanban-view';
import type { KanbanFunnel, KanbanCard as KanbanCardType } from '@/lib/types';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { DropResult } from '@hello-pangea/dnd';

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
    <div className="h-full">
      <KanbanView funnel={funnel} cards={cards} onMoveCard={handleMoveCard} onUpdateCards={fetchFunnelData} />
    </div>
  );
}
