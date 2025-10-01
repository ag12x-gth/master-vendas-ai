// src/components/atendimentos/inbox-view.tsx
'use client';

import { Loader2, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { Conversation, Message, Template, Contact } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { ConversationList } from './conversation-list';
import { ActiveChat } from './active-chat';
import { ContactDetailsPanel } from './contact-details-panel';
import { Skeleton } from '../ui/skeleton';
import { useSession } from '@/contexts/session-context';


const InboxSkeleton = () => (
    <div className="h-full grid grid-cols-1 md:grid-cols-[minmax(320px,_1fr)_2fr_1fr] border rounded-lg overflow-hidden">
        <div className="h-full border-r p-4 space-y-2 hidden md:flex md:flex-col">
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
        <div className="h-full hidden md:flex items-center justify-center border-r"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        <div className="h-full hidden xl:flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [lastKnownUpdate, setLastKnownUpdate] = useState<string | null>(null);
  
  const isMobile = useIsMobile();
  const router = useRouter();
  const { session } = useSession(); // Use session hook to get the logged-in user
  
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/conversations');
      if (!res.ok) throw new Error('Falha ao carregar as conversas.');
      const data: Conversation[] = await res.json();
      
      setConversations(data);
      return data || [];

    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: (error as Error).message });
      return [];
    }
  }, [toast]);

  const fetchAndSetMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/v1/conversations/${conversationId}/messages`);
      if (!res.ok) throw new Error('Falha ao carregar as mensagens.');
      const data: Message[] = await res.json();
      
      setCurrentMessages(data);

    } catch (error) {
       toast({ variant: 'destructive', title: 'Erro', description: (error as Error).message });
    } finally {
      setLoadingMessages(false);
    }
  }, [toast]);
  
  const fetchContactDetails = useCallback(async (contactId: string) => {
    try {
        const res = await fetch(`/api/v1/contacts/${contactId}`);
        if (!res.ok) throw new Error('Falha ao buscar detalhes do contato.');
        const data = await res.json();
        setSelectedContact(data);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erro', description: (error as Error).message });
    }
  }, [toast]);


  useEffect(() => {
    const fetchInitialData = async () => {
        const [initialConversations] = await Promise.all([
            fetchConversations(),
            fetch('/api/v1/templates').then(res => res.json()).then(setTemplates).catch(() => toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os modelos.' }))
        ]);
        
        fetch('/api/v1/conversations/status').then(res => res.json()).then(data => setLastKnownUpdate(data.lastUpdated));
        
        const conversationToSelectId = preselectedConversationId || initialConversations.find((c: Conversation) => c.status !== 'ARCHIVED')?.id;
        if (conversationToSelectId) {
            const conversationToSelect = initialConversations.find((c: Conversation) => c.id === conversationToSelectId);
            if (conversationToSelect) {
                setSelectedConversation(conversationToSelect);
                await fetchAndSetMessages(conversationToSelect.id);
                await fetchContactDetails(conversationToSelect.contactId);
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
      router.push('/atendimentos', { scroll: false });
  }

  const handleArchive = async () => {
    if (!selectedConversation) return;
    try {
      const response = await fetch(`/api/v1/conversations/${selectedConversation.id}/archive`, { method: 'POST' });
      if (!response.ok) throw new Error('Falha ao arquivar a conversa.');
      toast({ title: "Conversa Arquivada" });
      
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
      toast({ variant: 'destructive', title: 'Erro', description: (error as Error).message });
    }
  }
  
  const handleUnarchive = async () => {
    if (!selectedConversation) return;
    try {
        const response = await fetch(`/api/v1/conversations/${selectedConversation.id}/archive`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Falha ao reabrir a conversa.');
        
        toast({ title: "Conversa Reaberta" });
        await fetchConversations();
        
        const unarchivedConvo = await response.json();
        setSelectedConversation(unarchivedConvo);

    } catch (error) {
        toast({ variant: 'destructive', title: 'Erro', description: (error as Error).message });
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
        toast({ variant: 'destructive', title: 'Erro de Envio', description: (error as Error).message });
        setCurrentMessages(prev => prev.map(m => m.id === tempId ? {...m, status: 'FAILED' } : m));
        throw error;
    }
};

 const handleToggleAi = async (conversationId: string, aiActive: boolean) => {
    if (!selectedConversation) return;

    // Optimistic update
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

      toast({ title: 'Status da IA Alterado!', description: `A IA foi ${aiActive ? 'reativada' : 'desativada'} para esta conversa.`});

    } catch (error) {
      // Revert on failure
      setSelectedConversation(originalConversation);
      toast({ variant: 'destructive', title: 'Erro', description: (error as Error).message });
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
            <div className="w-full md:w-[320px] lg:w-[350px] xl:w-[400px] flex-shrink-0 h-full border-r min-h-0">
                <ConversationList 
                    conversations={conversations}
                    currentConversationId={selectedConversation?.id || null}
                    onSelectConversation={handleSelectConversation}
                />
            </div>
        )}
      
        {showActiveChat ? (
            selectedConversation ? (
                 <div className="flex-1 flex flex-col min-h-0 border-r">
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
                    />
                </div>
            ) : (
                <NoConversationSelected />
            )
        ) : null}

       <aside className="hidden xl:flex flex-col w-[340px] flex-shrink-0 h-full bg-card min-h-0">
         <ContactDetailsPanel contactId={selectedConversation?.contactId} />
       </aside>
    </div>
  );
}
