// src/components/atendimentos/active-chat.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Paperclip,
  Send,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Archive,
  Undo,
  Clock,
  Bot,
  ChevronUp,
  PanelRightOpen,
  PanelRightClose,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MessageBubble } from './message-bubble';
import type { Conversation, Message, Template, Contact } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { is24HourWindowOpen, formatTimeLeft, getMillisecondsLeft } from '@/lib/utils';
import { SendTemplateDialog } from './send-template-dialog';
import { Switch } from '../ui/switch';

interface ActiveChatProps {
  conversation: Conversation | null;
  contact: Contact | null;
  messages: Message[];
  loadingMessages: boolean;
  templates: Template[];
  onSendMessage: (text: string) => Promise<void>;
  onBack: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onToggleAi: (conversationId: string, aiActive: boolean) => Promise<void>;
  onLoadMoreMessages?: () => Promise<void>;
  hasMoreMessages?: boolean;
  isLoadingMoreMessages?: boolean;
  showContactDetails?: boolean;
  onToggleContactDetails?: () => void;
}

export function ActiveChat({
  conversation,
  contact,
  messages,
  loadingMessages,
  templates,
  onSendMessage,
  onBack,
  onArchive,
  onUnarchive,
  onToggleAi,
  onLoadMoreMessages,
  hasMoreMessages = false,
  isLoadingMoreMessages = false,
  showContactDetails = false,
  onToggleContactDetails,
}: ActiveChatProps) {
  const isMobile = useIsMobile();
  const [messageText, setMessageText] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const previousScrollHeightRef = React.useRef<number>(0);
  const isInitialLoadRef = React.useRef(true);

  const lastUserMessage = React.useMemo(() => {
    return [...messages].filter(m => m.senderType === 'USER').sort((a,b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())[0];
  }, [messages]);
  
  const [timeLeft, setTimeLeft] = React.useState<number | null>(
    lastUserMessage ? getMillisecondsLeft(lastUserMessage.sentAt) : null
  );

  const canSendFreeform = lastUserMessage ? is24HourWindowOpen(lastUserMessage.sentAt) : false;
  
  React.useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (canSendFreeform && lastUserMessage) {
      interval = setInterval(() => {
        const msLeft = getMillisecondsLeft(lastUserMessage.sentAt);
        setTimeLeft(msLeft > 0 ? msLeft : 0);
      }, 1000);
    }
    return () => {
        if (interval) {
            clearInterval(interval);
        }
    };
  }, [canSendFreeform, lastUserMessage]);

  React.useEffect(() => {
    if (scrollAreaRef.current && isInitialLoadRef.current && messages.length > 0 && !loadingMessages) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'auto' });
      isInitialLoadRef.current = false;
    }
  }, [messages, loadingMessages]);

  React.useEffect(() => {
    if (scrollAreaRef.current && !isInitialLoadRef.current && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && (lastMessage.senderType === 'AGENT' || lastMessage.id.startsWith('temp-'))) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages]);

  React.useEffect(() => {
    if (scrollAreaRef.current && previousScrollHeightRef.current > 0 && !isLoadingMoreMessages) {
      const newScrollHeight = scrollAreaRef.current.scrollHeight;
      const scrollDiff = newScrollHeight - previousScrollHeightRef.current;
      if (scrollDiff > 0) {
        scrollAreaRef.current.scrollTop = scrollDiff;
      }
      previousScrollHeightRef.current = 0;
    }
  }, [messages, isLoadingMoreMessages]);

  React.useEffect(() => {
    isInitialLoadRef.current = true;
  }, [conversation?.id]);

  const handleScroll = React.useCallback(() => {
    if (!scrollAreaRef.current || !onLoadMoreMessages || !hasMoreMessages || isLoadingMoreMessages) return;
    
    const scrollTop = scrollAreaRef.current.scrollTop;
    const threshold = 100;
    
    if (scrollTop < threshold) {
      previousScrollHeightRef.current = scrollAreaRef.current.scrollHeight;
      onLoadMoreMessages();
    }
  }, [onLoadMoreMessages, hasMoreMessages, isLoadingMoreMessages]);

  React.useEffect(() => {
    const container = scrollAreaRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !conversation) return;

    setIsSending(true);
    try {
      await onSendMessage(messageText);
      setMessageText('');
    } catch (error) {
      // Error is handled by the caller
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  if (!conversation || !contact) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <p className="text-muted-foreground">Selecione uma conversa para começar.</p>
      </div>
    );
  }
  
  const isArchived = conversation.status === 'ARCHIVED';

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center p-3 border-b shrink-0">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-3 flex-1">
          <Avatar>
            <AvatarImage src={contact.avatarUrl || ''} alt={contact.name} data-ai-hint="avatar user"/>
            <AvatarFallback>{contact.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold">
              <Link href={`/contacts/${contact.id}`} target="_blank" className="hover:underline">
                {contact.name}
              </Link>
            </p>
            <p className="text-xs text-muted-foreground">{contact.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                         <div className="flex items-center gap-2 border-r pr-2 mr-2">
                            <Bot className="h-4 w-4 text-primary" />
                            <Switch
                                id={`ai-switch-${conversation.id}`}
                                checked={conversation.aiActive}
                                onCheckedChange={(checked) => onToggleAi(conversation.id, checked)}
                                aria-label="Ativar/Desativar IA"
                            />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent><p>{conversation.aiActive ? 'IA Ativa' : 'IA Desativada'}</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {onToggleContactDetails && !isMobile && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      type="button" 
                      variant={showContactDetails ? "secondary" : "ghost"} 
                      size="icon" 
                      onClick={onToggleContactDetails}
                      className="mr-1"
                    >
                      {showContactDetails ? (
                        <PanelRightClose className="h-5 w-5" />
                      ) : (
                        <PanelRightOpen className="h-5 w-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{showContactDetails ? 'Ocultar Detalhes' : 'Ver Detalhes do Contato'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {isArchived ? (
                    <Button type="button" variant="ghost" size="icon" onClick={onUnarchive}>
                        <Undo className="h-5 w-5" />
                    </Button>
                ) : (
                    <Button type="button" variant="ghost" size="icon" onClick={onArchive}>
                        <Archive className="h-5 w-5" />
                    </Button>
                )}
              </TooltipTrigger>
              <TooltipContent>
                <p>{isArchived ? 'Reabrir Conversa' : 'Arquivar Conversa'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

       <div className="flex-1 min-h-0 overflow-hidden relative">
        <ScrollArea className="absolute inset-0" viewportRef={scrollAreaRef}>
          <div className="p-4 pr-3 space-y-3">
            {hasMoreMessages && (
              <div className="flex justify-center py-2">
                {isLoadingMoreMessages ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Carregando mensagens anteriores...</span>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLoadMoreMessages}
                    className="text-muted-foreground"
                  >
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Carregar mensagens anteriores
                  </Button>
                )}
              </div>
            )}
            {loadingMessages ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} allMessages={messages} contactName={contact.name} />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="shrink-0 border-t bg-background p-4 overflow-x-hidden">
        {!isArchived && (
          <>
            {canSendFreeform && timeLeft !== null ? (
                <div className="mb-2 text-xs text-center text-primary font-semibold flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>Tempo: {formatTimeLeft(timeLeft)}</span>
                </div>
            ) : (
                <div className="mb-2 p-2 text-xs text-center text-yellow-800 bg-yellow-400/20 rounded-md flex items-center justify-center gap-2 flex-wrap">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span className="break-words">A janela de 24 horas expirou. Envie um modelo para continuar.</span>
                </div>
            )}
          </>
        )}
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <SendTemplateDialog templates={templates} connectionId={conversation.connectionId!} contact={contact}>
                <Button type="button" variant="outline" size="icon" className="shrink-0" disabled={isArchived}>
                    <Paperclip className="h-5 w-5" />
                </Button>
            </SendTemplateDialog>
          <Input
            ref={inputRef}
            placeholder={isArchived ? "Esta conversa está arquivada." : "Digite sua mensagem..."}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            disabled={isSending || isArchived}
          />
          <Button type="submit" size="icon" className="shrink-0" disabled={!canSendFreeform || isSending || isArchived}>
            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
