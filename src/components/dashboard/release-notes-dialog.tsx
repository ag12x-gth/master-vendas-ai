
'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bot, Sparkles, Lightbulb } from 'lucide-react';
import { useRouter } from 'next/navigation';

const SESSION_STORAGE_KEY = 'release-notes-ai-chats-v1-seen';

export function ReleaseNotesDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Verifica se o modal já foi visto nesta sessão
    const hasSeen = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!hasSeen) {
      setIsOpen(true);
      sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
    }
  }, []);
  
  const handleGoToChat = () => {
    router.push('/ai-chats');
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center items-center">
            <div className="p-3 bg-primary/10 rounded-full mb-4">
                 <Sparkles className="h-8 w-8 text-primary" />
            </div>
          <DialogTitle className="text-2xl">Apresentamos o AI Chats!</DialogTitle>
          <DialogDescription className="text-base pt-2">
            O seu novo assistente de dados para gerir a sua empresa usando linguagem natural.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
            <div className="flex items-start gap-4">
                <Lightbulb className="h-6 w-6 text-yellow-400 mt-1 shrink-0"/>
                <div>
                    <h4 className="font-semibold">O que você pode fazer?</h4>
                    <ul className="list-disc pl-5 mt-2 text-sm text-muted-foreground space-y-1">
                        <li>
                            <strong>Gerir Contatos:</strong> Peça para criar, listar ou segmentar contatos.
                            <br/>
                            <i className="text-xs">&quot;Crie uma tag chamada &apos;Cliente VIP&apos;&quot;</i>
                        </li>
                        <li>
                            <strong>Analisar Dados:</strong> Peça resumos sobre campanhas e conversas.
                            <br/>
                            <i className="text-xs">&quot;Resuma minha conversa com o João da Silva.&quot;</i>
                        </li>
                        <li>
                            <strong>Executar Ações:</strong> Adicione contatos a listas e tags com facilidade.
                            <br/>
                            <i className="text-xs">&quot;Adicione todos os contatos do DDD 11 à lista &apos;Clientes de SP&apos;.&quot;</i>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Fechar</Button>
            <Button type="button" onClick={handleGoToChat}>
                <Bot className="mr-2 h-4 w-4" />
                Experimentar Agora
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

