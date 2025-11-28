
// src/components/atendimentos/message-bubble.tsx
'use client';

import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";
import { Check, CheckCheck, Clock, AlertTriangle, FileText, ImageIcon, Mic, Video, User, Bot, Smile } from 'lucide-react';
import Image from "next/image";
import { AudioPlayer } from "./audio-player";
import { Avatar, AvatarFallback } from "../ui/avatar";

type MessageReaction = {
    emoji: string;
    reactorPhone: string;
    reactorName?: string | null;
};

type MessageWithReactions = Message & {
    reactions?: MessageReaction[];
};

const StatusIcon = ({ status }: { status: Message['status'] }) => {
    if (!status) return null;
    const lowerCaseStatus = status.toLowerCase();

    switch (lowerCaseStatus) {
        case 'sent': return <Check className="h-4 w-4" />;
        case 'delivered': return <CheckCheck className="h-4 w-4" />;
        case 'read': return <CheckCheck className="h-4 w-4 text-blue-500" />;
        case 'failed': return <AlertTriangle className="h-4 w-4 text-destructive" />;
        case 'pending': return <Clock className="h-4 w-4" />;
        default: return <Clock className="h-4 w-4" />;
    }
}

const MediaError = () => (
    <div className="flex flex-col items-center justify-center gap-2 p-4 bg-muted rounded-md border border-dashed">
        <AlertTriangle className="h-6 w-6 text-muted-foreground" />
        <p className="text-xs text-center text-muted-foreground">Mídia indisponível</p>
        <p className="text-[10px] text-center text-muted-foreground/60">Arquivo deletado ou expirado</p>
    </div>
);

const RepliedMessagePreview = ({ message, contactName }: { message: MessageWithReactions | undefined, contactName?: string | null }) => {
    if (!message) return null;

    const isUser = message.senderType === 'USER';
    const author = isUser ? contactName || 'Cliente' : 'Você';
    
    let content: React.ReactNode = message.content;
    if (message.contentType === 'IMAGE') content = <div className="flex items-center gap-1.5"><ImageIcon className="h-4 w-4" /> Imagem</div>;
    else if (message.contentType === 'VIDEO') content = <div className="flex items-center gap-1.5"><Video className="h-4 w-4" /> Vídeo</div>;
    else if (message.contentType === 'DOCUMENT') content = <div className="flex items-center gap-1.5"><FileText className="h-4 w-4" /> {message.content}</div>;
    else if (message.contentType === 'AUDIO') content = <div className="flex items-center gap-1.5"><Mic className="h-4 w-4" /> Mensagem de voz</div>;
    else if (message.contentType === 'STICKER') content = <div className="flex items-center gap-1.5"><Smile className="h-4 w-4" /> Sticker</div>;
    
    if (typeof content === 'string' && content.length > 70) {
      content = `${content.substring(0, 70)}...`;
    }
    
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        const targetId = e.currentTarget.hash.substring(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Add a visual cue
            targetElement.classList.add('bg-primary/20', 'transition-colors', 'duration-1000');
            setTimeout(() => {
                targetElement.classList.remove('bg-primary/20');
            }, 1500);
        }
    };

    return (
        <a
            href={`#message-${message.id}`}
            onClick={handleClick}
            className={cn(
                "block p-2 rounded-md mb-2 text-xs cursor-pointer hover:bg-black/10 dark:hover:bg-white/10",
                !isUser ? 'bg-primary/20' : 'bg-muted'
            )}
        >
            <p className="font-semibold">{author}</p>
            <div className="opacity-80">{content}</div>
        </a>
    )
}

const ReactionsBadge = ({ reactions }: { reactions?: MessageReaction[] }) => {
    if (!reactions || reactions.length === 0) return null;

    const groupedReactions = reactions.reduce((acc, reaction) => {
        if (!acc[reaction.emoji]) {
            acc[reaction.emoji] = [];
        }
        acc[reaction.emoji]!.push(reaction);
        return acc;
    }, {} as Record<string, MessageReaction[]>);

    return (
        <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(groupedReactions).map(([emoji, reactors]) => (
                <div
                    key={emoji}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/80 border text-xs"
                    title={reactors.map(r => r.reactorName || r.reactorPhone).join(', ')}
                >
                    <span>{emoji}</span>
                    {reactors.length > 1 && <span className="font-medium">{reactors.length}</span>}
                </div>
            ))}
        </div>
    );
};

export function MessageBubble({ message, allMessages, contactName }: { message: MessageWithReactions, allMessages: MessageWithReactions[], contactName?: string | null }) {
    const isUserMessage = message.senderType === 'USER';
    const isAiMessage = message.senderType === 'AI';
    const repliedMessage = message.repliedToMessageId ? allMessages.find(m => m.id === message.repliedToMessageId) : undefined;
    const isAudio = message.contentType === 'AUDIO';

    const renderContent = () => {
        switch (message.contentType) {
            case 'IMAGE':
                return message.mediaUrl ? (
                    <Image 
                        src={message.mediaUrl} 
                        alt="Imagem enviada" 
                        width={300} 
                        height={200} 
                        className="rounded-lg object-cover" 
                    />
                ) : <MediaError />;
            case 'VIDEO':
                return message.mediaUrl ? (
                    <video src={message.mediaUrl} controls className="rounded-lg w-full max-w-xs">
                        Seu navegador não suporta a tag de vídeo.
                    </video>
                ) : <MediaError />;
            case 'AUDIO':
                return message.mediaUrl ? (
                    <div className="w-full">
                        <AudioPlayer key={message.id} src={message.mediaUrl} />
                    </div>
                ) : <MediaError />;
            case 'DOCUMENT':
                return message.mediaUrl ? (
                    <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20">
                        <FileText className="h-6 w-6" />
                        <span className="truncate">{message.content}</span>
                    </a>
                ) : <MediaError />;
            case 'STICKER':
                return message.mediaUrl ? (
                    <Image 
                        src={message.mediaUrl} 
                        alt="Sticker" 
                        width={150} 
                        height={150} 
                        className="object-contain bg-transparent" 
                    />
                ) : <MediaError />;
            case 'TEXT':
            case 'BUTTON':
            case 'INTERACTIVE':
            default:
                return <p className="text-sm whitespace-pre-wrap break-words [word-break:break-word]">{message.content}</p>;
        }
    }

    return (
        <div id={`message-${message.id}`} className={cn("flex items-end gap-2 w-full", !isUserMessage ? 'justify-end' : 'justify-start')}>
            <Avatar className={cn("h-7 w-7 shrink-0", isUserMessage ? 'order-first' : 'order-last')}>
                <AvatarFallback className="text-xs">
                    {isUserMessage ? <User className="h-4 w-4" /> 
                    : isAiMessage ? <Bot className="h-4 w-4" /> 
                    : <User className="h-4 w-4" />}
                </AvatarFallback>
            </Avatar>
            <div className={cn(
                "p-3 rounded-lg min-w-0 break-words",
                isAudio ? "max-w-[280px]" : "max-w-[60%]",
                isUserMessage ? 'bg-background text-foreground rounded-bl-none shadow-sm border'
                : isAiMessage ? 'bg-accent text-accent-foreground rounded-br-none'
                : 'bg-primary text-primary-foreground rounded-br-none'
            )}>
                {repliedMessage && <RepliedMessagePreview message={repliedMessage} contactName={contactName} />}
                <div className="overflow-hidden break-words">
                  {renderContent()}
                </div>
                <ReactionsBadge reactions={message.reactions} />
                <div className={cn(
                    "flex items-center gap-1.5 mt-1",
                    !isUserMessage ? 'justify-end' : 'justify-start'
                )}>
                    <p className="text-xs opacity-70">
                        {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {!isUserMessage && <StatusIcon status={message.status} />}
                </div>
            </div>
        </div>
    );
}
