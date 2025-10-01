// src/components/atendimentos/conversation-list.tsx
'use client';

import { useState, useMemo } from 'react';
import type { Conversation, Message } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Check, CheckCheck, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { RelativeTime } from '../ui/relative-time';


const StatusIcon = ({ status }: { status: Message['status'] }) => {
    if (!status) return null;
    const lowerCaseStatus = status.toLowerCase();

    switch (lowerCaseStatus) {
        case 'sent': return <Check className="h-4 w-4" />;
        case 'delivered': return <CheckCheck className="h-4 w-4" />;
        case 'read': return <CheckCheck className="h-4 w-4 text-blue-500" />;
        case 'pending': return <Clock className="h-4 w-4" />;
        default: return <Clock className="h-4 w-4" />;
    }
};


const ConversationListItem = ({ conversation, isSelected, onSelect }: { conversation: Conversation, isSelected: boolean, onSelect: (id: string) => void }) => {
    return (
        <button
            type="button"
            onClick={() => onSelect(conversation.id)}
            className={cn(
                "w-full text-left p-3 rounded-lg flex gap-3 transition-colors",
                isSelected ? "bg-primary/20" : "hover:bg-muted"
            )}
        >
            <Avatar>
                <AvatarImage src={conversation.contactAvatar || ''} alt={conversation.contactName} data-ai-hint="avatar user" />
                <AvatarFallback>{conversation.contactName.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
                <div className="flex flex-col">
                    <div className="flex justify-between items-baseline">
                        <p className="font-semibold truncate pr-2">{conversation.contactName}</p>
                    </div>
                     <RelativeTime date={conversation.lastMessageAt} />
                </div>
                <div className="flex justify-between items-start mt-1">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground truncate pr-2">
                         <StatusIcon status={conversation.lastMessageStatus} />
                         <span className="truncate">{conversation.lastMessage}</span>
                    </div>
                    {conversation.unreadCount && conversation.unreadCount > 0 && (
                        <Badge className="h-5 w-5 flex items-center justify-center p-0">{conversation.unreadCount}</Badge>
                    )}
                </div>
            </div>
        </button>
    )
}


export function ConversationList({
    conversations,
    currentConversationId,
    onSelectConversation,
}: {
    conversations: Conversation[],
    currentConversationId: string | null,
    onSelectConversation: (id: string) => void,
}) {
    const [search, setSearch] = useState('');

    const filteredConversations = useMemo(() => {
        return conversations.filter(c => 
            c.contactName.toLowerCase().includes(search.toLowerCase()) ||
            c.phone.includes(search)
        );
    }, [conversations, search]);

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b shrink-0">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome ou telefone..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>
            <ScrollArea className="flex-1 min-h-0">
                <div className="p-2 space-y-1">
                    {filteredConversations.length === 0 ? (
                        <div
                            className="text-center p-10 text-muted-foreground"
                        >
                            <p>Nenhuma conversa encontrada.</p>
                        </div>
                    ) : (
                        filteredConversations.map(conversation => (
                            <ConversationListItem
                                key={conversation.id}
                                conversation={conversation}
                                isSelected={currentConversationId === conversation.id}
                                onSelect={onSelectConversation}
                            />
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
