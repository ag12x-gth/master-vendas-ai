// src/components/kanban/kanban-column.tsx
'use client';

import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { MoreHorizontal, Phone, Mail } from 'lucide-react';
import { Button } from '../ui/button';
import type { KanbanStage, KanbanCard as KanbanCardType } from '@/lib/types';

interface KanbanColumnProps {
  stage: KanbanStage;
  cards: KanbanCardType[];
  index: number;
}

interface KanbanCardProps {
  card: KanbanCardType;
  index: number;
}

function KanbanCard({ card, index }: KanbanCardProps): JSX.Element {
  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`mb-3 cursor-pointer transition-shadow hover:shadow-md ${
            snapshot.isDragging ? 'shadow-lg rotate-2' : ''
          }`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={card.contact?.avatarUrl || ''} alt={card.contact?.name || 'Lead'} />
                  <AvatarFallback className="text-xs">
                    {(card.contact?.name || 'L').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{card.contact?.name || 'Lead sem nome'}</p>
                  <p className="text-xs text-muted-foreground truncate">{card.title}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            {card.value && (
              <div className="mb-2">
                <Badge variant="secondary" className="text-xs">
                  R$ {Number(card.value).toLocaleString('pt-BR')}
                </Badge>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {card.contact?.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  <span className="truncate">{card.contact.phone}</span>
                </div>
              )}
              {card.contact?.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{card.contact.email}</span>
                </div>
              )}
            </div>
            
            {card.notes && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                {card.notes}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
}

export function KanbanColumn({ stage, cards }: KanbanColumnProps): JSX.Element {
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
    <div className={`flex flex-col min-w-80 max-w-80 border rounded-lg ${getStageColor(stage.type)}`}>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">{stage.title}</h3>
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
            className={`flex-1 p-4 min-h-32 transition-colors ${
              snapshot.isDraggingOver ? 'bg-muted/50' : ''
            }`}
          >
            {stageCards.map((card, cardIndex) => (
              <KanbanCard key={card.id} card={card} index={cardIndex} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}