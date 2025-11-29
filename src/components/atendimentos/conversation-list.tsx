// src/components/atendimentos/conversation-list.tsx
'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { Conversation, Message } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Check, CheckCheck, Clock, MessageSquare, Smartphone, Users, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { RelativeTime } from '../ui/relative-time';
import { Button } from '../ui/button';


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
                "w-full text-left p-3 rounded-lg flex gap-3 transition-colors min-w-0",
                isSelected ? "bg-primary/20" : "hover:bg-muted"
            )}
        >
            <Avatar className="shrink-0">
                <AvatarImage src={conversation.contactAvatar || ''} alt={conversation.contactName} data-ai-hint="avatar user" />
                <AvatarFallback>{conversation.contactName.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex justify-between items-start gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <p className="font-semibold truncate">{conversation.contactName}</p>
                        {conversation.isGroup && (
                            <Badge variant="secondary" className="shrink-0 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                GRUPO
                            </Badge>
                        )}
                        {conversation.contactActiveConversationsCount && conversation.contactActiveConversationsCount > 1 && (
                            <Badge variant="secondary" className="shrink-0 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {conversation.contactActiveConversationsCount}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">
                            <RelativeTime date={conversation.lastMessageAt} />
                        </span>
                        {conversation.connectionName && (
                            <Badge variant="outline" className="text-xs">
                                {conversation.connectionName}
                            </Badge>
                        )}
                    </div>
                </div>
                <div className="flex justify-between items-center gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-1 min-w-0">
                         <StatusIcon status={conversation.lastMessageStatus} />
                         <span className="truncate">{conversation.lastMessage}</span>
                    </div>
                    {conversation.unreadCount && conversation.unreadCount > 0 && (
                        <Badge className="h-5 w-5 flex items-center justify-center p-0 shrink-0">{conversation.unreadCount}</Badge>
                    )}
                </div>
            </div>
        </button>
    )
}


interface ConversationListProps {
    conversations: Conversation[];
    currentConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onLoadMore?: () => void;
    hasMore?: boolean;
    isLoadingMore?: boolean;
    searchTerm?: string;
    onSearchChange?: (term: string) => void;
    isSearching?: boolean;
}

export function ConversationList({
    conversations,
    currentConversationId,
    onSelectConversation,
    onLoadMore,
    hasMore = false,
    isLoadingMore = false,
    searchTerm = '',
    onSearchChange,
    isSearching = false,
}: ConversationListProps) {
    const [localSearch, setLocalSearch] = useState(searchTerm);
    const [sourceFilter, setSourceFilter] = useState<'all' | 'meta_api' | 'baileys'>('all');
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setLocalSearch(searchTerm);
    }, [searchTerm]);

    const handleSearchInputChange = useCallback((value: string) => {
        setLocalSearch(value);
        
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        
        debounceTimeoutRef.current = setTimeout(() => {
            onSearchChange?.(value);
        }, 500);
    }, [onSearchChange]);

    const handleClearSearch = useCallback(() => {
        setLocalSearch('');
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        onSearchChange?.('');
    }, [onSearchChange]);

    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, []);

    const filteredConversations = useMemo(() => {
        let filtered = conversations;
        
        if (sourceFilter !== 'all') {
            filtered = filtered.filter(c => c.connectionType === sourceFilter);
        }
        
        return filtered;
    }, [conversations, sourceFilter]);

    const handleScroll = useCallback(() => {
        if (!scrollContainerRef.current || !onLoadMore || !hasMore || isLoadingMore) return;
        
        const container = scrollContainerRef.current;
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        
        const threshold = 100;
        if (scrollHeight - scrollTop - clientHeight < threshold) {
            onLoadMore();
        }
    }, [onLoadMore, hasMore, isLoadingMore]);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    return (
        <div className="h-full flex flex-col min-h-0 overflow-hidden">
            <div className="p-4 border-b flex-shrink-0 space-y-3">
                <Tabs value={sourceFilter} onValueChange={(v) => setSourceFilter(v as any)}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="all">Todas</TabsTrigger>
                        <TabsTrigger value="meta_api">
                            <MessageSquare className="h-4 w-4 mr-1.5" />
                            Business
                        </TabsTrigger>
                        <TabsTrigger value="baileys">
                            <Smartphone className="h-4 w-4 mr-1.5" />
                            Normal
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="relative">
                    {isSearching ? (
                        <Loader2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
                    ) : (
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    )}
                    <Input
                        placeholder="Buscar por nome, telefone ou mensagem..."
                        className="pl-8 pr-8"
                        value={localSearch}
                        onChange={(e) => handleSearchInputChange(e.target.value)}
                    />
                    {localSearch && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 h-7 w-7"
                            onClick={handleClearSearch}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
            <ScrollArea className="flex-1 min-h-0" viewportRef={scrollContainerRef}>
                <div className="p-2 space-y-1">
                    {filteredConversations.length === 0 ? (
                        <div
                            className="text-center p-10 text-muted-foreground"
                        >
                            <p>Nenhuma conversa encontrada.</p>
                        </div>
                    ) : (
                        <>
                            {filteredConversations.map(conversation => (
                                <ConversationListItem
                                    key={conversation.id}
                                    conversation={conversation}
                                    isSelected={currentConversationId === conversation.id}
                                    onSelect={onSelectConversation}
                                />
                            ))}
                            {hasMore && (
                                <div 
                                    ref={loadMoreTriggerRef}
                                    className="flex justify-center py-4"
                                >
                                    {isLoadingMore ? (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="text-sm">Carregando mais...</span>
                                        </div>
                                    ) : (
                                        <span className="text-sm text-muted-foreground">
                                            Role para carregar mais
                                        </span>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
