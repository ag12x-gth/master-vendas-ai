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
}

export function KanbanView({ funnel, cards, onMoveCard }: KanbanViewProps): JSX.Element {
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
          <div className="p-4">
            <DragDropContext onDragEnd={onMoveCard}>
              <div className="flex w-max gap-4">
                {funnel.stages.map((stage: KanbanStage, index: number) => (
                  <Droppable key={stage.id} droppableId={stage.id}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="w-72"
                      >
                        <KanbanColumn
                          stage={stage}
                          cards={getCardsForStage(stage.id)}
                          index={index}
                        />
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </DragDropContext>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}
