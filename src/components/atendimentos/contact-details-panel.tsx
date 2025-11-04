// src/components/atendimentos/contact-details-panel.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Tag, ContactList, ExtendedContact } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '../ui/textarea';
import { Loader2, Save, Phone, MessageSquare, AlertCircle } from 'lucide-react';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { RelativeTime } from '../ui/relative-time';
import Image from 'next/image';

export const ContactDetailsPanel = ({ contactId }: { contactId: string | undefined }) => {
    const { toast } = useToast();
    const [contact, setContact] = useState<ExtendedContact | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isCalling, setIsCalling] = useState(false);
    const [notes, setNotes] = useState('');

    const fetchDetails = useCallback(async (id: string) => {
        setLoading(true);
        try {
            const contactRes = await fetch(`/api/v1/contacts/${id}`);
            if (!contactRes.ok) {
                throw new Error('Falha ao buscar dados para o painel de detalhes.');
            }

            const contactData: ExtendedContact = await contactRes.json();
            setContact(contactData);
            setNotes(contactData.notes || '');

        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: (error as Error).message });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (contactId) {
            fetchDetails(contactId);
        } else {
            setContact(null);
            setLoading(false);
        }
    }, [contactId, fetchDetails]);

    const handleSaveChanges = async () => {
        if (!contact) return;
        setIsSaving(true);
        try {
            const payload = {
                notes,
            };
            const response = await fetch(`/api/v1/contacts/${contact.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error('Falha ao salvar alterações.');
            const updatedContact = await response.json();
            setContact(updatedContact);
            toast({ title: 'Salvo!', description: 'As informações do contato foram atualizadas.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao Salvar', description: (error as Error).message });
        } finally {
            setIsSaving(false);
        }
    }

    const handleInitiateCall = async () => {
        if (!contact) return;
        setIsCalling(true);
        try {
            const response = await fetch('/api/vapi/initiate-call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneNumber: contact.phone,
                    customerName: contact.name,
                    context: notes || 'Cliente solicitou atendimento via voz.',
                    conversationId: contact.id
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao iniciar chamada');
            }

            const result = await response.json();
            toast({ 
                title: '📞 Chamada Iniciada!', 
                description: `Ligando para ${contact.name}. ID: ${result.callId}` 
            });
        } catch (error) {
            toast({ 
                variant: 'destructive', 
                title: 'Erro ao Iniciar Chamada', 
                description: (error as Error).message 
            });
        } finally {
            setIsCalling(false);
        }
    }
    
    if (loading) {
         return (
            <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    if (!contact) {
        return (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground p-4 text-center">
                Selecione uma conversa para ver os detalhes do contato.
            </div>
        );
    }
    
    return (
        <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
                <div className="flex flex-col items-center text-center">
                    <Avatar className="h-20 w-20 mb-4">
                        <AvatarImage src={contact.avatarUrl || `https://placehold.co/80x80.png`} alt={contact.name} data-ai-hint="avatar user"/>
                        <AvatarFallback>{contact.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <h3 className="text-lg font-bold">{contact.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Image src="https://flagsapi.com/BR/flat/16.png" alt="Bandeira do Brasil" width={16} height={12} className="h-4 w-auto" />
                        {contact.phone}
                    </p>
                </div>

                <Button 
                    size="sm" 
                    className="w-full bg-green-600 hover:bg-green-700 text-white" 
                    onClick={handleInitiateCall} 
                    disabled={isCalling}
                >
                    {isCalling ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Iniciando chamada...
                        </>
                    ) : (
                        <>
                            <Phone className="h-4 w-4 mr-2" />
                            Iniciar Chamada de Voz
                        </>
                    )}
                </Button>

                {contact.activeConversations && contact.activeConversations.length > 1 && (
                    <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-sm">
                            <span className="font-semibold">Conversas Múltiplas Detectadas</span>
                            <p className="text-xs text-muted-foreground mt-1">
                                Este contato está em conversa com {contact.activeConversations.length} números diferentes simultaneamente.
                            </p>
                        </AlertDescription>
                    </Alert>
                )}

                {contact.activeConversations && contact.activeConversations.length > 0 && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                Conversas Ativas ({contact.activeConversations.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {contact.activeConversations.map((conv) => (
                                <div key={conv.id} className="p-3 rounded-lg border bg-muted/30 space-y-1.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{conv.connectionName || 'Sem nome'}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-xs">
                                                    {conv.connectionType === 'meta_api' ? 'Meta API' : 'Baileys'}
                                                </Badge>
                                                <Badge variant={conv.status === 'NEW' ? 'default' : 'secondary'} className="text-xs">
                                                    {conv.status}
                                                </Badge>
                                                {conv.aiActive && (
                                                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                                        IA Ativa
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {conv.lastMessageAt && (
                                        <p className="text-xs text-muted-foreground">
                                            Última mensagem: <RelativeTime date={conv.lastMessageAt} />
                                        </p>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Segmentação</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                             <Label>Tags</Label>
                             <div className="flex flex-wrap gap-2 pt-2">
                                {contact.tags?.map((tag: Tag) => ( <Badge key={tag.id} style={{backgroundColor: tag.color, color: '#fff'}}>{tag.name}</Badge> ))}
                                {(!contact.tags || contact.tags.length === 0) && ( <p className="text-sm text-muted-foreground">Nenhuma tag.</p> )}
                            </div>
                        </div>
                         <div>
                             <Label>Listas</Label>
                             <div className="flex flex-wrap gap-2 pt-2">
                                {contact.lists?.map((list: ContactList) => ( <Badge key={list.id} variant="secondary">{list.name}</Badge> ))}
                                {(!contact.lists || contact.lists.length === 0) && ( <p className="text-sm text-muted-foreground">Nenhuma lista.</p> )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Notas Internas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Textarea 
                            placeholder="Adicione uma nota sobre este contato..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="min-h-[100px] text-xs"
                        />
                    </CardContent>
                </Card>

                 <Button size="sm" className="w-full" onClick={handleSaveChanges} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar Alterações
                </Button>
            </div>
        </ScrollArea>
    )
}
