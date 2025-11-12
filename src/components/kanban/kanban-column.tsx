// src/components/kanban/kanban-column.tsx
'use client';

import { Droppable } from '@hello-pangea/dnd';
import { Badge } from '../ui/badge';
import type { KanbanStage, KanbanCard as KanbanCardType } from '@/lib/types';
import { KanbanCard } from './kanban-card';

interface KanbanColumnProps {
  stage: KanbanStage;
  stages: KanbanStage[];
  cards: KanbanCardType[];
  index: number;
  onUpdateLead: (leadId: string, data: { stageId?: string; title?: string; value?: number; notes?: string }) => Promise<void>;
  onDeleteLead: (leadId: string) => Promise<void>;
}

export function KanbanColumn({ stage, stages, cards, onUpdateLead, onDeleteLead }: KanbanColumnProps): JSX.Element {
  const stageCards = cards.filter(card => card.stageId === stage.id);
  const totalValue = stageCards.reduce((sum, card) => sum + (Number(card.value) || 0), 0);
  
  const getStageColor = (type: string) => {
    switch (type) {
      case 'WIN':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'LOSS':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className={`flex flex-col w-full md:min-w-80 md:max-w-80 border rounded-lg ${getStageColor(stage.type)}`}>
      <div className="p-3 sm:p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm sm:text-base">{stage.title}</h3>
          <Badge variant="outline" className="text-xs">
            {stageCards.length}
          </Badge>
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-muted-foreground">
            R$ {totalValue.toLocaleString('pt-BR')}
          </p>
        )}
      </div>
      
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-3 sm:p-4 min-h-32 transition-colors ${
              snapshot.isDraggingOver ? 'bg-muted/50' : ''
            }`}
          >
            {stageCards.map((card, cardIndex) => (
              <KanbanCard 
                key={card.id} 
                card={card} 
                index={cardIndex}
                stages={stages}
                onUpdate={onUpdateLead}
                onDelete={onDeleteLead}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
