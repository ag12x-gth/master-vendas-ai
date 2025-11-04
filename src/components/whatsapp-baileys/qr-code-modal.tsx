'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import QRCode from 'qrcode';

interface QRCodeModalProps {
  sessionId: string | null;
  sessionName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function QRCodeModal({ sessionId, sessionName, isOpen, onClose }: QRCodeModalProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'qr' | 'connected' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !isOpen) {
      setQrCode(null);
      setStatus('loading');
      setError(null);
      return;
    }

    const eventSource = new EventSource(`/api/v1/whatsapp/sessions/${sessionId}/qr`);

    eventSource.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.qr) {
          const qrDataUrl = await QRCode.toDataURL(data.qr, {
            width: 300,
            margin: 2,
          });
          setQrCode(qrDataUrl);
          setStatus('qr');
        }

        if (data.status === 'connected') {
          setStatus('connected');
          setTimeout(() => {
            onClose();
          }, 2000);
        }

        if (data.status === 'disconnected') {
          setStatus('error');
          setError('Falha ao conectar');
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    eventSource.onerror = () => {
      setStatus('error');
      setError('Erro ao conectar com o servidor');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [sessionId, isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp - {sessionName}</DialogTitle>
          <DialogDescription>
            Escaneie o QR Code com seu WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Aguardando QR Code...
              </p>
            </>
          )}

          {status === 'qr' && qrCode && (
            <>
              <img src={qrCode} alt="QR Code" className="w-72 h-72" />
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">
                  1. Abra o WhatsApp no seu celular
                </p>
                <p className="text-sm text-muted-foreground">
                  2. Toque em Menu (⋮) ou Configurações e selecione{' '}
                  <span className="font-medium">Aparelhos conectados</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  3. Toque em <span className="font-medium">Conectar um aparelho</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  4. Aponte seu celular para esta tela para escanear o QR Code
                </p>
              </div>
            </>
          )}

          {status === 'connected' && (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <p className="text-lg font-medium text-green-600">
                Conectado com sucesso!
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-destructive" />
              <p className="text-sm text-destructive">
                {error || 'Erro desconhecido'}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
