
// src/components/atendimentos/message-bubble.tsx
'use client';

import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";
import { Check, CheckCheck, Clock, AlertTriangle, FileText, ImageIcon, Mic, Video, User, Bot } from 'lucide-react';
import Image from "next/image";
import { AudioPlayer } from "./audio-player";
import { Avatar, AvatarFallback } from "../ui/avatar";

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
    <div className="flex flex-col items-center justify-center gap-2 p-4 bg-red-500/10 text-destructive rounded-md">
        <AlertTriangle className="h-6 w-6" />
        <p className="text-xs text-center">Não foi possível carregar a mídia.</p>
    </div>
);

const RepliedMessagePreview = ({ message, contactName }: { message: Message | undefined, contactName?: string | null }) => {
    if (!message) return null;

    const isUser = message.senderType === 'USER';
    const author = isUser ? contactName || 'Cliente' : 'Você';
    
    let content: React.ReactNode = message.content;
    if (message.contentType === 'IMAGE') content = <div className="flex items-center gap-1.5"><ImageIcon className="h-4 w-4" /> Imagem</div>;
    else if (message.contentType === 'VIDEO') content = <div className="flex items-center gap-1.5"><Video className="h-4 w-4" /> Vídeo</div>;
    else if (message.contentType === 'DOCUMENT') content = <div className="flex items-center gap-1.5"><FileText className="h-4 w-4" /> {message.content}</div>;
    else if (message.contentType === 'AUDIO') content = <div className="flex items-center gap-1.5"><Mic className="h-4 w-4" /> Mensagem de voz</div>;
    
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

export function MessageBubble({ message, allMessages, contactName }: { message: Message, allMessages: Message[], contactName?: string | null }) {
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
            case 'TEXT':
            case 'BUTTON':
            case 'INTERACTIVE':
            default:
                return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
        }
    }

    return (
        <div id={`message-${message.id}`} className={cn("flex", !isUserMessage ? 'justify-end' : 'justify-start')}>
            <div className={cn(
                "p-3 rounded-lg w-full",
                isAudio ? "max-w-sm" : "max-w-[85%] sm:max-w-[70%]",
                isUserMessage ? 'bg-background text-foreground rounded-bl-none shadow-sm border'
                : isAiMessage ? 'bg-accent text-accent-foreground rounded-br-none'
                : 'bg-primary text-primary-foreground rounded-br-none'
            )}>
                {repliedMessage && <RepliedMessagePreview message={repliedMessage} contactName={contactName} />}
                <div className="w-full">
                  {renderContent()}
                </div>
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
             <Avatar className={cn("h-8 w-8 shrink-0 self-end ml-2 mr-2", !isUserMessage ? 'order-last' : 'order-first')}>
                <AvatarFallback>
                    {isUserMessage ? <User className="h-5 w-5" /> 
                    : isAiMessage ? <Bot className="h-5 w-5" /> 
                    : <User className="h-5 w-5" />}
                </AvatarFallback>
            </Avatar>
        </div>
    );
}
