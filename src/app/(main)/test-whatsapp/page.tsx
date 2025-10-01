'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import io, { Socket } from 'socket.io-client';
import { Loader2, Phone, QrCode, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function TestWhatsAppPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('Desconectado');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [connectionId] = useState('bf9bdff3-fefa-4ac4-b981-3dc795cc0387'); // ID de teste fixo

  useEffect(() => {
    console.info('[Test WhatsApp] Página de teste iniciada');
    console.info('[Test WhatsApp] Connection ID:', connectionId);
    
    // Conectar Socket.IO
    const initSocket = async () => {
      try {
        console.log('[Test WhatsApp] Obtendo token de autenticação...');
        const res = await fetch('/api/auth/socket-token');
        
        if (!res.ok) {
          console.error('[Test WhatsApp] Erro ao obter token:', res.status);
          setErrorMessage('Erro ao obter token de autenticação');
          setStatus('error');
          return;
        }
        
        const { token } = await res.json();
        console.log('[Test WhatsApp] Token obtido com sucesso');
        
        const newSocket = io('/', {
          auth: { token },
          transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => {
          console.log('[Test WhatsApp] Socket conectado com ID:', newSocket.id);
          setStatusMessage('Socket conectado - Aguardando QR Code');
        });

        newSocket.on('disconnect', (reason) => {
          console.log('[Test WhatsApp] Socket desconectado:', reason);
          setStatusMessage('Socket desconectado');
        });

        newSocket.on('connect_error', (error) => {
          console.error('[Test WhatsApp] Erro de conexão:', error.message);
          setErrorMessage(`Erro de conexão: ${error.message}`);
          setStatus('error');
        });

        // Ouvir eventos de QR Code
        newSocket.on('whatsapp:qr', (data) => {
          console.log('[Test WhatsApp] QR recebido (genérico):', data);
          if (data.connectionId === connectionId && data.qrCode) {
            setQrCode(data.qrCode);
            setStatusMessage('QR Code disponível - Escaneie com seu WhatsApp');
            setStatus('connecting');
          }
        });

        newSocket.on(`whatsapp:qr:${connectionId}`, (data) => {
          console.log('[Test WhatsApp] QR recebido (específico):', data);
          if (data.qrCode) {
            setQrCode(data.qrCode);
            setStatusMessage('QR Code disponível - Escaneie com seu WhatsApp');
            setStatus('connecting');
          }
        });

        // Ouvir evento de conexão bem-sucedida
        newSocket.on('whatsapp:connected', (data) => {
          console.log('[Test WhatsApp] WhatsApp conectado (genérico):', data);
          if (data.connectionId === connectionId) {
            setStatus('connected');
            setStatusMessage(`WhatsApp conectado: ${data.phoneNumber}`);
            setPhoneNumber(data.phoneNumber);
            setQrCode(null);
          }
        });

        newSocket.on(`whatsapp:connected:${connectionId}`, (data) => {
          console.log('[Test WhatsApp] WhatsApp conectado (específico):', data);
          setStatus('connected');
          setStatusMessage(`WhatsApp conectado: ${data.phoneNumber}`);
          setPhoneNumber(data.phoneNumber);
          setQrCode(null);
        });

        // Ouvir erros
        newSocket.on('whatsapp:error', (data) => {
          console.error('[Test WhatsApp] Erro recebido:', data);
          if (data.connectionId === connectionId) {
            setErrorMessage(data.error || 'Erro desconhecido');
            setStatus('error');
          }
        });

        // Debug: Capturar todos os eventos
        newSocket.onAny((event, ...args) => {
          console.log('[Test WhatsApp] Evento recebido:', event, args);
        });

        setSocket(newSocket);
      } catch (error) {
        console.error('[Test WhatsApp] Erro ao conectar socket:', error);
        setErrorMessage('Erro ao conectar socket');
        setStatus('error');
      }
    };

    initSocket();

    return () => {
      if (socket) {
        console.log('[Test WhatsApp] Desconectando socket...');
        socket.disconnect();
      }
    };
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    setStatus('connecting');
    console.log('[Test WhatsApp] Iniciando conexão WhatsApp...');
    console.log('[Test WhatsApp] Connection ID:', connectionId);
    
    try {
      const res = await fetch('/api/whatsapp-qr/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });

      const data = await res.json();
      console.log('[Test WhatsApp] Resposta da API:', data);
      
      if (!res.ok) {
        console.error('[Test WhatsApp] Erro da API:', data.error);
        setErrorMessage(data.error || 'Erro ao conectar');
        setStatus('error');
        setStatusMessage(`Erro: ${data.error}`);
      } else {
        setStatusMessage('Aguardando QR Code...');
        console.log('[Test WhatsApp] Conexão iniciada, aguardando QR Code via Socket.IO');
      }
    } catch (error) {
      console.error('[Test WhatsApp] Erro na requisição:', error);
      setErrorMessage('Erro na requisição de conexão');
      setStatus('error');
      setStatusMessage('Erro na conexão');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    console.log('[Test WhatsApp] Desconectando WhatsApp...');
    
    try {
      const res = await fetch('/api/whatsapp-qr/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });

      const data = await res.json();
      console.log('[Test WhatsApp] Resposta da desconexão:', data);
      
      if (res.ok) {
        setStatus('idle');
        setStatusMessage('Desconectado');
        setPhoneNumber(null);
        setQrCode(null);
      }
    } catch (error) {
      console.error('[Test WhatsApp] Erro ao desconectar:', error);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'connecting':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Teste WhatsApp QR Code</h1>
        <p className="text-muted-foreground">Página de teste para conexão WhatsApp via QR Code com monitoramento de logs em tempo real</p>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Status da Conexão</CardTitle>
          <CardDescription>Informações sobre o estado atual da conexão</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            {getStatusIcon()}
            <span className="font-medium">{statusMessage}</span>
          </div>
          
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Connection ID: <code className="bg-muted px-2 py-1 rounded">{connectionId}</code></p>
            {phoneNumber && (
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Número: <span className="font-medium">{phoneNumber}</span>
              </p>
            )}
            {socket && socket.connected && (
              <p>Socket ID: <code className="bg-muted px-2 py-1 rounded">{socket.id}</code></p>
            )}
          </div>
        </CardContent>
      </Card>

      {errorMessage && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Controles de Conexão</CardTitle>
          <CardDescription>Use os botões abaixo para gerenciar a conexão</CardDescription>
        </CardHeader>
        <CardContent>
          {status !== 'connected' ? (
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting || status === 'connecting'}
              className="w-full sm:w-auto"
            >
              {isConnecting || status === 'connecting' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  Conectar WhatsApp
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleDisconnect}
              variant="destructive"
              className="w-full sm:w-auto"
            >
              Desconectar
            </Button>
          )}

          {qrCode && (
            <div className="mt-6 text-center">
              <p className="mb-4 font-medium">Escaneie o QR Code com seu WhatsApp:</p>
              <div className="bg-white p-4 rounded-lg inline-block border-2 border-gray-200">
                <img src={qrCode} alt="QR Code" className="max-w-xs" />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                1. Abra o WhatsApp no seu celular<br />
                2. Toque em Menu ou Configurações e selecione WhatsApp Web<br />
                3. Aponte o telefone para esta tela para capturar o código
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logs em Tempo Real</CardTitle>
          <CardDescription>Monitor de console para acompanhar eventos</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Console Monitor Ativo</AlertTitle>
            <AlertDescription>
              Clique no botão no canto inferior direito da tela para abrir o Console Monitor e ver todos os logs em tempo real.
            </AlertDescription>
          </Alert>
          
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Eventos Monitorados:</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Conexão do Socket.IO</li>
              <li>• Recebimento do QR Code</li>
              <li>• Status de conexão do WhatsApp</li>
              <li>• Mensagens de erro e debug</li>
              <li>• Todos os eventos do sistema</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}