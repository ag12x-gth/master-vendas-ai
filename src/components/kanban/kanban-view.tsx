// src/components/kanban/kanban-view.tsx
'use client';

import { FunnelToolbar } from './funnel-toolbar';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { KanbanColumn } from './kanban-column';
import type { KanbanFunnel, KanbanCard as KanbanCardType, KanbanStage } from '@/lib/types';
import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd';

interface KanbanViewProps {
  funnel: KanbanFunnel;
  cards: KanbanCardType[];
  onMoveCard: (result: DropResult) => void;
  onUpdateCards: () => void;
  onUpdateLead: (leadId: string, data: { stageId?: string; title?: string; value?: number; notes?: string }) => Promise<void>;
  onDeleteLead: (leadId: string) => Promise<void>;
}

export function KanbanView({ funnel, cards, onMoveCard, onUpdateLead, onDeleteLead }: KanbanViewProps): JSX.Element {
  if (!funnel || !funnel.stages) {
    return <div>Funil não encontrado ou sem etapas.</div>;
  }

  const getCardsForStage = (stageId: string): KanbanCardType[] => {
    return cards.filter(card => card.stageId === stageId);
  };
  
  return (
    <div className="flex h-full flex-col">
      <FunnelToolbar funnel={funnel} />
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full w-full">
          <div className="p-2 sm:p-4">
            <DragDropContext onDragEnd={onMoveCard}>
              {/* Mobile: vertical stack, Desktop: horizontal scroll */}
              <div className="flex flex-col md:flex-row md:w-max gap-3 md:gap-4">
                {funnel.stages.map((stage: KanbanStage, index: number) => (
                  <Droppable key={stage.id} droppableId={stage.id}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="w-full md:w-80"
                      >
                        <KanbanColumn
                          stage={stage}
                          stages={funnel.stages}
                          cards={getCardsForStage(stage.id)}
                          index={index}
                          onUpdateLead={onUpdateLead}
                          onDeleteLead={onDeleteLead}
                        />
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </DragDropContext>
          </div>
          <ScrollBar orientation="horizontal" className="hidden md:flex" />
        </ScrollArea>
      </div>
    </div>
  );
}
