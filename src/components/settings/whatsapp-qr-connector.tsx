'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Phone,
  QrCode,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface WhatsAppQRConnectorProps {
  connectionId: string;
  companyId: string;
  onConnectionSuccess?: () => void;
  onDisconnect?: () => void;
}

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export function WhatsAppQRConnector({
  connectionId,
  companyId: _companyId,
  onConnectionSuccess,
  onDisconnect,
}: WhatsAppQRConnectorProps) {
  const [qrCode, setQrCode] = useState<string>('');
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const socketRef = useRef<Socket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check initial status
    checkStatus();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [connectionId]);

  // Função para obter o token JWT via API (cookies httpOnly não são acessíveis no frontend)
  const getAuthToken = async () => {
    try {
      const response = await fetch('/api/auth/socket-token');
      if (!response.ok) {
        throw new Error('Failed to get auth token');
      }
      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  const checkStatus = async () => {
    try {
      const response = await fetch(`/api/whatsapp-qr/status?connectionId=${connectionId}`);
      const data = await response.json();

      if (data.isConnected) {
        setStatus('connected');
        setPhoneNumber(data.phoneNumber || '');
        setQrCode('');
      } else {
        setStatus('idle');
      }
    } catch (error) {
      console.error('Error checking status:', error);
      setStatus('idle');
    }
  };

  const initializeSocket = async () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Initialize Socket.IO API first
    fetch('/api/socket')
      .then(res => res.json())
      .then(data => {
        console.log('Socket.IO server info:', data);
      })
      .catch(err => console.error('Error initializing Socket.IO:', err));

    const socketUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : 'http://localhost:3001';
    
    // Obter token JWT para autenticação (agora assíncrono)
    const authToken = await getAuthToken();
    
    if (!authToken) {
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: 'Token de sessão não encontrado. Faça login novamente.',
      });
      setStatus('error');
      setErrorMessage('Erro de autenticação. Faça login novamente.');
      return;
    }
    
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      path: process.env.NODE_ENV === 'production' ? '/api/socket/' : '/',
      auth: {
        token: authToken  // Enviar token JWT para autenticação
      },
    });

    socketRef.current = socket;

    // Debug: Log all events
    socket.onAny((eventName, data) => {
      console.log('[WhatsApp QR Frontend] Event received:', eventName, data);
    });

    // Listen for QR code events (with and without connectionId)
    socket.on(`whatsapp:qr:${connectionId}`, (data) => {
      console.log(`[WhatsApp QR Frontend] QR event with connectionId received:`, data);
      if (data.qrCode) {
        setQrCode(data.qrCode);
        setStatus('connecting');
      }
    });
    
    // Also listen for generic QR event
    socket.on('whatsapp:qr', (data) => {
      console.log('[WhatsApp QR Frontend] Generic QR event received:', data);
      if (data.connectionId === connectionId && data.qrCode) {
        setQrCode(data.qrCode);
        setStatus('connecting');
      }
    });

    // Listen for connection success
    socket.on(`whatsapp:connected:${connectionId}`, (data) => {
      console.log(`[WhatsApp QR Frontend] Connected event received:`, data);
      setStatus('connected');
      setPhoneNumber(data.phoneNumber || '');
      setQrCode('');
      setIsDialogOpen(false);
      
      toast({
        title: 'WhatsApp Conectado!',
        description: `Número: ${data.phoneNumber}`,
      });

      if (onConnectionSuccess) {
        onConnectionSuccess();
      }
    });

    // Listen for errors
    socket.on('whatsapp:error', (data) => {
      if (data.connectionId === connectionId) {
        setStatus('error');
        setErrorMessage(data.error || 'Erro na conexão');
        toast({
          variant: 'destructive',
          title: 'Erro na conexão',
          description: data.error,
        });
      }
    });

    // Listen for disconnect events
    socket.on('whatsapp:disconnected', (data) => {
      if (data.connectionId === connectionId) {
        setStatus('disconnected');
        setPhoneNumber('');
        setQrCode('');
      }
    });

    socket.on('connect', () => {
      console.log('[WhatsApp QR Frontend] Socket connected to server');
      console.log('[WhatsApp QR Frontend] Socket ID:', socket.id);
    });

    // Tratar erros de autenticação
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
        setStatus('error');
        setErrorMessage('Erro de autenticação. Faça login novamente.');
        toast({
          variant: 'destructive',
          title: 'Erro de Autenticação',
          description: 'Sua sessão expirou ou é inválida. Faça login novamente.',
        });
      }
    });
    
    socket.on('disconnect', (reason) => {
      console.log('[WhatsApp QR Frontend] Socket disconnected:', reason);
    });
  };

  const handleConnect = async () => {
    console.log('[WhatsApp QR Frontend] Starting connection process');
    setStatus('connecting');
    setErrorMessage('');
    setIsDialogOpen(true);

    // Initialize Socket.IO connection (agora assíncrono)
    await initializeSocket();

    try {
      const response = await fetch('/api/whatsapp-qr/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to initiate connection');
      }

      // Connection initiated, waiting for QR code via Socket.IO
      console.log('[WhatsApp QR Frontend] Connection initiated, waiting for QR code');
      toast({
        title: 'Aguardando QR Code',
        description: 'Por favor, aguarde o código QR aparecer...',
      });
    } catch (error) {
      console.error('Error initiating connection:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to connect');
      setIsDialogOpen(false);
      
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Failed to connect',
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/whatsapp-qr/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to disconnect');
      }

      setStatus('disconnected');
      setPhoneNumber('');
      setQrCode('');
      
      toast({
        title: 'WhatsApp Desconectado',
        description: 'A sessão foi encerrada com sucesso.',
      });

      if (onDisconnect) {
        onDisconnect();
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Failed to disconnect',
      });
    }
  };

  const handleRetry = async () => {
    setQrCode('');
    setErrorMessage('');
    await handleConnect();
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'connecting':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'error':
      case 'disconnected':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Conectado';
      case 'connecting':
        return 'Conectando...';
      case 'error':
        return 'Erro na conexão';
      case 'disconnected':
        return 'Desconectado';
      default:
        return 'Não conectado';
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            WhatsApp Web (QR Code)
          </CardTitle>
          <CardDescription>
            Conecte sua conta pessoal do WhatsApp através de QR Code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <p className="font-medium">{getStatusText()}</p>
                {phoneNumber && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {phoneNumber}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              {status === 'connected' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  className="text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleConnect}
                  disabled={status === 'connecting'}
                >
                  {status === 'connecting' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Conectando
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 mr-2" />
                      Conectar
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Informações Importantes</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Use este método para conectar contas pessoais do WhatsApp</li>
                <li>A conexão permanecerá ativa até você desconectar ou fazer logout no WhatsApp Web</li>
                <li>Mensagens serão salvas no banco de dados automaticamente</li>
                <li>Aguarde 2-5 segundos entre envios em massa</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escaneie o QR Code</DialogTitle>
            <DialogDescription>
              Abra o WhatsApp no seu celular e escaneie este código QR
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {qrCode ? (
              <div className="p-4 bg-white rounded-lg">
                <img
                  src={qrCode}
                  alt="WhatsApp QR Code"
                  className="w-64 h-64"
                />
              </div>
            ) : (
              <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                1. Abra o WhatsApp no seu telefone
              </p>
              <p className="text-sm text-muted-foreground">
                2. Toque em Menu ou Configurações e selecione WhatsApp Web
              </p>
              <p className="text-sm text-muted-foreground">
                3. Aponte seu telefone para esta tela para capturar o código
              </p>
            </div>

            {status === 'error' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}