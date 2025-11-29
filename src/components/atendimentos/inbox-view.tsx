// src/components/atendimentos/inbox-view.tsx
'use client';

import { Loader2, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useMemo } from 'react';
import type { Conversation, Message, Template, Contact } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { createToastNotifier } from '@/lib/toast-helper';
import { ConversationList } from './conversation-list';
import { ActiveChat } from './active-chat';
import { ContactDetailsPanel } from './contact-details-panel';
import { Skeleton } from '../ui/skeleton';
import { useSession } from '@/contexts/session-context';

const CONVERSATIONS_PAGE_SIZE = 50;

const InboxSkeleton = () => (
    <div className="h-full flex flex-row border rounded-lg overflow-hidden">
        <div className="w-full md:w-[280px] lg:w-[260px] xl:w-[280px] flex-shrink-0 h-full border-r p-4 space-y-2 hidden md:flex md:flex-col">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
        </div>
        <div className="h-full flex md:hidden items-center justify-center p-4">
             <div className="w-full space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-16 w-full" />
             </div>
        </div>
        <div className="flex-1 min-w-0 hidden md:flex items-center justify-center border-r"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        <div className="w-[280px] flex-shrink-0 hidden lg:flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    </div>
)

const NoConversationSelected = () => (
    <div className="h-full hidden md:flex flex-col items-center justify-center text-center p-8 border-r">
        <Info className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Nenhuma Conversa Selecionada</h3>
        <p className="text-sm text-muted-foreground">Selecione uma conversa da lista para ver as mensagens.</p>
    </div>
);


export function InboxView({ preselectedConversationId }: { preselectedConversationId?: string }) {
  const { toast } = useToast();
  const notify = useMemo(() => createToastNotifier(toast), [toast]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [lastKnownUpdate, setLastKnownUpdate] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const [conversationsOffset, setConversationsOffset] = useState(0);
  const [hasMoreConversations, setHasMoreConversations] = useState(true);
  const [isLoadingMoreConversations, setIsLoadingMoreConversations] = useState(false);
  
  const [showContactDetails, setShowContactDetails] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  
  const isMobileDetected = useIsMobile();
  const isMobile = mounted ? isMobileDetected : false;
  const router = useRouter();
  const { session } = useSession();
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const fetchConversations = useCallback(async (offset = 0, append = false, search = '') => {
    try {
      const params = new URLSearchParams({
        limit: String(CONVERSATIONS_PAGE_SIZE),
        offset: String(offset),
      });
      if (search) {
        params.set('search', search);
      }
      
      const res = await fetch(`/api/v1/conversations?${params.toString()}`);
      if (!res.ok) throw new Error('Falha ao carregar as conversas.');
      const response = await res.json();
      const data: Conversation[] = response.data || response;
      
      if (append) {
        setConversations(prev => [...prev, ...data]);
      } else {
        setConversations(data);
      }
      
      setHasMoreConversations(data.length === CONVERSATIONS_PAGE_SIZE);
      return data || [];

    } catch (error) {
      notify.error('Erro', (error as Error).message);
      return [];
    }
  }, [notify]);

  const loadMoreConversations = useCallback(async () => {
    if (isLoadingMoreConversations || !hasMoreConversations) return;
    
    setIsLoadingMoreConversations(true);
    const newOffset = conversationsOffset + CONVERSATIONS_PAGE_SIZE;
    
    try {
      await fetchConversations(newOffset, true, searchTerm);
      setConversationsOffset(newOffset);
    } finally {
      setIsLoadingMoreConversations(false);
    }
  }, [conversationsOffset, fetchConversations, hasMoreConversations, isLoadingMoreConversations, searchTerm]);

  const handleSearchChange = useCallback(async (term: string) => {
    setSearchTerm(term);
    setConversationsOffset(0);
    setIsSearching(true);
    
    try {
      await fetchConversations(0, false, term);
    } finally {
      setIsSearching(false);
    }
  }, [fetchConversations]);

  const fetchAndSetMessages = useCallback(async (conversationId: string, before?: string, prepend = false) => {
    if (!prepend) {
      setLoadingMessages(true);
    }
    
    try {
      const url = before 
        ? `/api/v1/conversations/${conversationId}/messages?limit=50&before=${before}`
        : `/api/v1/conversations/${conversationId}/messages?limit=50`;
        
      const res = await fetch(url);
      if (!res.ok) throw new Error('Falha ao carregar as mensagens.');
      const response = await res.json();
      
      const data: Message[] = response.messages || response;
      
      if (prepend) {
        setCurrentMessages(prev => [...data, ...prev]);
      } else {
        setCurrentMessages(data);
      }
      
      setHasMoreMessages(response.hasMore ?? data.length === 50);
      return data;

    } catch (error) {
       notify.error('Erro', (error as Error).message);
       return [];
    } finally {
      if (!prepend) {
        setLoadingMessages(false);
      }
    }
  }, [notify]);

  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMoreMessages || !hasMoreMessages || !selectedConversation || currentMessages.length === 0) return;
    
    setIsLoadingMoreMessages(true);
    
    try {
      const oldestMessage = currentMessages[0];
      if (oldestMessage) {
        const sentAtTimestamp = oldestMessage.sentAt instanceof Date 
          ? oldestMessage.sentAt.toISOString() 
          : new Date(oldestMessage.sentAt).toISOString();
        await fetchAndSetMessages(
          selectedConversation.id, 
          sentAtTimestamp,
          true
        );
      }
    } finally {
      setIsLoadingMoreMessages(false);
    }
  }, [currentMessages, fetchAndSetMessages, hasMoreMessages, isLoadingMoreMessages, selectedConversation]);
  
  const fetchContactDetails = useCallback(async (contactId: string) => {
    try {
        const res = await fetch(`/api/v1/contacts/${contactId}`);
        if (!res.ok) throw new Error('Falha ao buscar detalhes do contato.');
        const data = await res.json();
        setSelectedContact(data);
        return data;
    } catch (error) {
        notify.error('Erro', (error as Error).message);
        return null;
    }
  }, [notify]);


  useEffect(() => {
    const fetchInitialData = async () => {
        const [conversationsResult, _templatesResult, _statusResult] = await Promise.all([
            fetchConversations(),
            fetch('/api/v1/message-templates')
                .then(res => res.json())
                .then(data => {
                    const templates = data.templates || data;
                    setTemplates(templates);
                    return templates;
                })
                .catch(() => {
                    notify.error('Erro', 'Não foi possível carregar os modelos.');
                    return [];
                }),
            fetch('/api/v1/conversations/status')
                .then(res => res.json())
                .then(data => {
                    setLastKnownUpdate(data.lastUpdated);
                    return data;
                })
                .catch(() => null)
        ]);
        
        const initialConversations = conversationsResult;
        const conversationToSelectId = preselectedConversationId || initialConversations.find((c: Conversation) => c.status !== 'ARCHIVED')?.id;
        
        if (conversationToSelectId) {
            const conversationToSelect = initialConversations.find((c: Conversation) => c.id === conversationToSelectId);
            if (conversationToSelect) {
                setSelectedConversation(conversationToSelect);
                
                await Promise.all([
                    fetchAndSetMessages(conversationToSelect.id),
                    fetchContactDetails(conversationToSelect.contactId)
                ]);
            }
        }
        setInitialLoading(false);
    };

    fetchInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedConversationId]);
  
  
  useEffect(() => {
    const pollStatus = async () => {
        try {
            const res = await fetch('/api/v1/conversations/status');
            if (!res.ok) return;
            
            const data = await res.json() as { lastUpdated: string | null };
            
            if (data.lastUpdated && data.lastUpdated !== lastKnownUpdate) {
                setLastKnownUpdate(data.lastUpdated);
                const updatedConversations = await fetchConversations();
                
                if (selectedConversation && updatedConversations.some(c => c.id === selectedConversation.id)) {
                    await fetchAndSetMessages(selectedConversation.id);
                }
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    };
    
    const intervalId = setInterval(pollStatus, 5000);

    return () => clearInterval(intervalId);
  }, [lastKnownUpdate, fetchConversations, selectedConversation, fetchAndSetMessages]);


  const handleSelectConversation = useCallback(async (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
        setSelectedConversation(conversation);
        setCurrentMessages([]);
        setSelectedContact(null);
        setHasMoreMessages(true);
        setShowContactDetails(false);
        
        await Promise.all([
            fetchAndSetMessages(conversationId),
            fetchContactDetails(conversation.contactId)
        ]);
        if (!isMobile) {
            router.push(`/atendimentos?conversationId=${conversationId}`, { scroll: false });
        }
    }
  }, [conversations, fetchAndSetMessages, fetchContactDetails, isMobile, router]);
  
  const handleBackToList = () => {
      setSelectedConversation(null);
      setCurrentMessages([]);
      setSelectedContact(null);
      setShowContactDetails(false);
      router.push('/atendimentos', { scroll: false });
  }

  const handleArchive = async () => {
    if (!selectedConversation) return;
    try {
      const response = await fetch(`/api/v1/conversations/${selectedConversation.id}/archive`, { method: 'POST' });
      if (!response.ok) throw new Error('Falha ao arquivar a conversa.');
      notify.success("Conversa Arquivada");
      
      const updatedConversations = await fetchConversations();
      const nextConversation = updatedConversations.find(c => c.id !== selectedConversation.id);

      if (nextConversation) {
          handleSelectConversation(nextConversation.id);
      } else {
          setSelectedConversation(null);
          setCurrentMessages([]);
          setSelectedContact(null);
          router.push('/atendimentos', { scroll: false });
      }

    } catch (error) {
      notify.error('Erro', (error as Error).message);
    }
  }
  
  const handleUnarchive = async () => {
    if (!selectedConversation) return;
    try {
        const response = await fetch(`/api/v1/conversations/${selectedConversation.id}/archive`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Falha ao reabrir a conversa.');
        
        notify.success("Conversa Reaberta");
        await fetchConversations();
        
        const unarchivedConvo = await response.json();
        setSelectedConversation(unarchivedConvo);

    } catch (error) {
        notify.error('Erro', (error as Error).message);
    }
  }

  const handleSendMessage = async (text: string) => {
    if (!selectedConversation || !session?.userId) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
        id: tempId,
        conversationId: selectedConversation.id,
        senderType: 'AGENT',
        senderId: session.userId,
        content: text,
        contentType: 'TEXT',
        status: 'PENDING',
        sentAt: new Date(),
        providerMessageId: null,
        repliedToMessageId: null,
        mediaUrl: null,
        readAt: null
    };

    setCurrentMessages(prev => [...prev, optimisticMessage]);
    
    try {
        const response = await fetch(`/api/v1/conversations/${selectedConversation.id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'text', text: optimisticMessage.content })
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Falha ao enviar mensagem.');
        setCurrentMessages(prev => prev.map(m => m.id === tempId ? result : m));

    } catch (error) {
        notify.error('Erro de Envio', (error as Error).message);
        setCurrentMessages(prev => prev.map(m => m.id === tempId ? {...m, status: 'FAILED' } : m));
        throw error;
    }
};

 const handleToggleAi = async (conversationId: string, aiActive: boolean) => {
    if (!selectedConversation) return;

    const originalConversation = { ...selectedConversation };
    setSelectedConversation(prev => prev ? { ...prev, aiActive } : null);

    try {
      const response = await fetch(`/api/v1/conversations/${conversationId}/toggle-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiActive }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao alternar status da IA.');
      }

      notify.success('Status da IA Alterado!', `A IA foi ${aiActive ? 'reativada' : 'desativada'} para esta conversa.`);

    } catch (error) {
      setSelectedConversation(originalConversation);
      notify.error('Erro', (error as Error).message);
    }
  }


  if (initialLoading) {
      return <InboxSkeleton />;
  }

  const showConversationList = !isMobile || (isMobile && !selectedConversation);
  const showActiveChat = !isMobile || (isMobile && !!selectedConversation);

  return (
    <div className="h-full flex flex-row border rounded-lg overflow-hidden">
        {showConversationList && (
            <div className="w-full md:w-[280px] lg:w-[260px] xl:w-[280px] flex-shrink-0 h-full border-r min-h-0 overflow-hidden">
                <ConversationList 
                    conversations={conversations}
                    currentConversationId={selectedConversation?.id || null}
                    onSelectConversation={handleSelectConversation}
                    onLoadMore={loadMoreConversations}
                    hasMore={hasMoreConversations}
                    isLoadingMore={isLoadingMoreConversations}
                    searchTerm={searchTerm}
                    onSearchChange={handleSearchChange}
                    isSearching={isSearching}
                />
            </div>
        )}
      
        {showActiveChat ? (
            selectedConversation ? (
                 <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 border-r overflow-hidden">
                    <ActiveChat
                        key={selectedConversation.id}
                        conversation={selectedConversation}
                        contact={selectedContact}
                        messages={currentMessages}
                        loadingMessages={loadingMessages}
                        templates={templates}
                        onSendMessage={handleSendMessage}
                        onBack={handleBackToList}
                        onArchive={handleArchive}
                        onUnarchive={handleUnarchive}
                        onToggleAi={handleToggleAi}
                        onLoadMoreMessages={loadMoreMessages}
                        hasMoreMessages={hasMoreMessages}
                        isLoadingMoreMessages={isLoadingMoreMessages}
                        showContactDetails={showContactDetails}
                        onToggleContactDetails={() => setShowContactDetails(prev => !prev)}
                    />
                </div>
            ) : (
                <NoConversationSelected />
            )
        ) : null}

       {showContactDetails && selectedConversation && (
         <aside className="hidden lg:flex flex-col w-[280px] flex-shrink-0 h-full bg-card min-h-0 overflow-hidden border-l">
           <ContactDetailsPanel contactId={selectedConversation.contactId} />
         </aside>
       )}
    </div>
  );
}
