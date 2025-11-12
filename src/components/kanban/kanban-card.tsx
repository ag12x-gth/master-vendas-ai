'use client';

import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { MoreHorizontal, Phone, Mail, Eye, Edit2, Trash2, MessageCircle, MoveRight } from 'lucide-react';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '../ui/dropdown-menu';
import type { KanbanCard as KanbanCardType, KanbanStage } from '@/lib/types';
import { EditLeadDialog, DeleteLeadDialog, ViewLeadDialog } from './lead-dialogs';

interface KanbanCardProps {
  card: KanbanCardType;
  index: number;
  stages: KanbanStage[];
  onUpdate: (leadId: string, data: { stageId?: string; title?: string; value?: number | null; notes?: string }) => Promise<void>;
  onDelete: (leadId: string) => Promise<void>;
  onOpenWhatsApp?: (phone: string) => void;
}

export function KanbanCard({ card, index, stages, onUpdate, onDelete, onOpenWhatsApp }: KanbanCardProps) {
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleMoveStage = async (stageId: string) => {
    await onUpdate(card.id, { stageId });
  };

  const handleOpenWhatsApp = () => {
    if (card.contact?.phone) {
      if (onOpenWhatsApp) {
        onOpenWhatsApp(card.contact.phone);
      } else {
        const cleanPhone = card.contact.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
      }
    }
  };

  return (
    <>
      <Draggable draggableId={card.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
          >
            <Card
              className={`mb-3 cursor-pointer transition-shadow hover:shadow-md ${
                snapshot.isDragging ? 'shadow-lg rotate-2' : ''
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div 
                    {...provided.dragHandleProps}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
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
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 -mr-1"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setViewOpen(true)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditOpen(true)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Editar Lead
                      </DropdownMenuItem>
                      
                      {card.contact?.phone && (
                        <DropdownMenuItem onClick={handleOpenWhatsApp}>
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Abrir WhatsApp
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <MoveRight className="mr-2 h-4 w-4" />
                          Mover para
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {stages.filter(s => s.id !== card.stageId).map((stage) => (
                            <DropdownMenuItem 
                              key={stage.id}
                              onClick={() => handleMoveStage(stage.id)}
                            >
                              {stage.title}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setDeleteOpen(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {(card.value !== null && card.value !== undefined) && (
                  <div className="mb-2">
                    <Badge variant="secondary" className="text-xs">
                      R$ {Number(card.value).toLocaleString('pt-BR')}
                    </Badge>
                  </div>
                )}
                
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {card.contact?.phone && (
                    <div className="flex items-center gap-1 min-w-0">
                      <Phone className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{card.contact.phone}</span>
                    </div>
                  )}
                  {card.contact?.email && (
                    <div className="flex items-center gap-1 min-w-0">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{card.contact.email}</span>
                    </div>
                  )}
                </div>
                
                {card.notes && card.notes.includes('📅 Reunião agendada:') && (
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      {card.notes.split('\n')[0]}
                    </Badge>
                  </div>
                )}
                
                {card.notes && !card.notes.includes('📅 Reunião agendada:') && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {card.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </Draggable>

      <ViewLeadDialog 
        open={viewOpen} 
        onOpenChange={setViewOpen} 
        card={card} 
        onEdit={() => setEditOpen(true)}
        onDelete={() => setDeleteOpen(true)}
      />
      <EditLeadDialog open={editOpen} onOpenChange={setEditOpen} card={card} onSave={onUpdate} />
      <DeleteLeadDialog open={deleteOpen} onOpenChange={setDeleteOpen} card={card} onConfirm={onDelete} />
    </>
  );
}
