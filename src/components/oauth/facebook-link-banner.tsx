'use client';

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FaFacebook } from 'react-icons/fa';
import { X, Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';

interface FacebookLinkBannerProps {
  userEmail: string;
}

export function FacebookLinkBanner({ userEmail }: FacebookLinkBannerProps) {
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`facebook-banner-dismissed-${userEmail}`) === 'true';
    }
    return false;
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`facebook-banner-dismissed-${userEmail}`, 'true');
    }
  };

  const handleLinkFacebook = async () => {
    setIsLoading(true);
    try {
      await signIn('facebook', { 
        callbackUrl: window.location.href,
        redirect: true 
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao vincular conta Facebook. Tente novamente.',
      });
      setIsLoading(false);
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <Alert className="border-blue-600/50 bg-blue-50/50 dark:bg-blue-950/20 mb-4">
      <div className="flex items-center justify-between w-full gap-4">
        <div className="flex items-center gap-3 flex-1">
          <FaFacebook className="h-5 w-5 text-[#1877F2] flex-shrink-0" />
          <AlertDescription className="text-sm">
            <strong className="font-semibold">Vincule sua conta Facebook</strong>
            <span className="ml-2">para acessar recursos adicionais e sincronizar dados.</span>
          </AlertDescription>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={handleLinkFacebook}
            disabled={isLoading}
            className="whitespace-nowrap border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <FaFacebook className="mr-2 h-4 w-4 text-[#1877F2]" />
                Conectar
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>
      </div>
    </Alert>
  );
}
