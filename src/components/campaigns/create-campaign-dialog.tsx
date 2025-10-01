
'use client';

import * as React from 'react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, MessageSquareText } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CreateCampaignDialogProps {
  children: React.ReactNode;
}

export function CreateCampaignDialog({ children }: CreateCampaignDialogProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleNavigate = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Nova Campanha</DialogTitle>
          <DialogDescription>
            Escolha o canal pelo qual você deseja enviar a sua campanha.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <Button variant="outline" className="w-full h-24 flex-col gap-2" onClick={() => handleNavigate('/templates')}>
                <MessageSquareText className="h-8 w-8 text-green-500"/>
                <span className="text-base">WhatsApp</span>
            </Button>
            <Button variant="outline" className="w-full h-24 flex-col gap-2" onClick={() => handleNavigate('/sms')}>
                <MessageCircle className="h-8 w-8 text-blue-500"/>
                <span className="text-base">SMS</span>
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
