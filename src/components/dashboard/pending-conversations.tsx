
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Conversation } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { RelativeTime } from '../ui/relative-time';


export function PendingConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

   useEffect(() => {
        const fetchConversations = async () => {
            setLoading(true);
            try {
                const response = await fetch('/api/v1/conversations');
                if (!response.ok) throw new Error('Falha ao buscar conversas.');
                const data: Conversation[] = await response.json();
                const pendingConversations = data.filter(c => c.status === 'NEW').slice(0, 4);
                setConversations(pendingConversations);
            } catch (error) {
                 toast({ variant: 'destructive', title: 'Erro', description: (error as Error).message });
            } finally {
                setLoading(false);
            }
        };
        fetchConversations();
    }, [toast]);


  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-lg">Atendimentos Pendentes</CardTitle>
        <CardDescription>Conversas aguardando uma primeira resposta.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
             <div className="flex justify-center items-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length > 0 ? conversations.map(conv => (
            <div key={conv.id} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={conv.contactAvatar || ''} alt={conv.contactName} data-ai-hint="avatar user"/>
                  <AvatarFallback>{conv.contactName.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">
                    <Link href={`/contacts/${conv.contactId}`} target="_blank" className="hover:underline">
                      {conv.contactName}
                    </Link>
                  </p>
                  <RelativeTime date={conv.lastMessageAt} />
                </div>
              </div>
              <Link href={`/atendimentos?conversationId=${conv.id}`} passHref>
                <Button variant="outline" size="sm">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )) : (
             <p className="text-sm text-muted-foreground text-center py-4">Nenhum atendimento pendente.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
