SOLUÇÃO PARA O ERRO "Connection is not configured for QR code"
PROBLEMA IDENTIFICADO
O erro ocorre porque o backend não está retornando o QR Code corretamente ou o Socket.IO não está configurado.

CORREÇÃO COMPLETA:
1. VERIFICAR INICIALIZAÇÃO DO SERVIÇO
// server/index.ts ou server/app.ts
import { WhatsAppService } from './services/whatsapp';
import { Server as SocketServer } from 'socket.io';
import { createServer } from 'http';
// IMPORTANTE: Criar instância ANTES de usar
const whatsAppService = new WhatsAppService();
// Criar servidor HTTP e Socket.IO
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
// CONECTAR Socket.IO ao WhatsApp
whatsAppService.setSocketServer(io);
// Socket handlers
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('whatsapp:requestStatus', async () => {
    const status = whatsAppService.getSessionStatus('default');
    socket.emit('whatsapp:status', status);
  });
});
// Usar httpServer.listen ao invés de app.listen
httpServer.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
2. CORRIGIR ROTA DE CONEXÃO
// server/routes.ts
app.post("/api/whatsapp/connect", async (req, res) => {
  try {
    console.log('📱 Tentando conectar WhatsApp...');

    // Verificar se serviço existe
    if (!whatsAppService) {
      console.error('❌ WhatsAppService não inicializado!');
      return res.status(500).json({
        success: false,
        error: 'WhatsApp service not initialized'
      });
    }

    const result = await whatsAppService.connectSession('default');
    console.log('📱 Resultado da conexão:', result);

    if (result.success) {
      res.json({
        success: true,
        message: result.qrCode ? 'QR code generated' : 'Already connected',
        qrCode: result.qrCode || null,
        connected: !result.qrCode
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to connect'
      });
    }
  } catch (error) {
    console.error('❌ Erro ao conectar:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Connection failed'
    });
  }
});
3. GARANTIR GERAÇÃO DO QR CODE
// server/services/whatsapp.ts - Adicionar timeout maior
async connectSession(sessionId: string = 'default'): Promise<{ success: boolean; qrCode?: string; error?: string }> {
  try {
    // ... código anterior ...

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false, // Desabilitar print no terminal
      browser: ['WhatsApp Web', 'Chrome', '120.0.0'],
      // ADICIONAR ESTAS CONFIGURAÇÕES:
      qrTimeout: 60000, // 60 segundos para QR
      connectTimeoutMs: 60000, // 60 segundos timeout
    });

    // ... resto do código ...

    // IMPORTANTE: Aguardar QR ou conexão
    return new Promise((resolve) => {
      let resolved = false;

      // Timeout de 45 segundos
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          const session = this.sessions.get(sessionId);
          if (session?.qrCode) {
            resolve({ success: true, qrCode: session.qrCode });
          } else if (session?.isConnected) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: 'Connection timeout - no QR generated' });
          }
        }
      }, 45000);

      // Listeners para QR e conexão
      this.once('qr', (data) => {
        if (data.sessionId === sessionId && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve({ success: true, qrCode: data.qrCode });
        }
      });

      this.once('connected', (data) => {
        if (data.sessionId === sessionId && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve({ success: true });
        }
      });
    });
  } catch (error) {
    console.error('❌ Erro na conexão:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to initialize connection' 
    };
  }
}
4. FRONTEND - TRATAMENTO DE ERRO
// client/src/components/WhatsAppConnector.tsx
import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
export function WhatsAppConnector() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  useEffect(() => {
    // Conectar Socket.IO
    const newSocket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true
    });

    newSocket.on('connect', () => {
      console.log('Socket conectado');
      setError(null);
    });

    newSocket.on('whatsapp:qr', (data) => {
      console.log('QR recebido:', data);
      setQrCode(data.qrCode);
      setIsConnected(false);
      setLoading(false);
      setError(null);
    });

    newSocket.on('whatsapp:connected', () => {
      console.log('WhatsApp conectado');
      setQrCode(null);
      setIsConnected(true);
      setLoading(false);
      setError(null);
    });

    newSocket.on('whatsapp:error', (data) => {
      console.error('Erro WhatsApp:', data);
      setError(data.error || 'Erro na conexão');
      setLoading(false);
    });

    setSocket(newSocket);

    // Verificar status inicial
    checkStatus();

    return () => {
      newSocket.close();
    };
  }, []);
  const checkStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/status');
      const data = await response.json();
      if (data.connected) {
        setIsConnected(true);
        setQrCode(null);
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err);
    }
  };
  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'default' })
      });

      const data = await response.json();
      console.log('Resposta da API:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao conectar');
      }

      if (data.qrCode) {
        setQrCode(data.qrCode);
        setError(null);
      } else if (data.connected) {
        setIsConnected(true);
        setError(null);
      } else {
        setError('Connection is not configured for QR code');
      }
    } catch (err) {
      console.error('Erro:', err);
      setError(err.message || 'Erro ao conectar');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="p-6">
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          Erro: {error}
        </div>
      )}

      {!isConnected && !qrCode && (
        <button 
          onClick={handleConnect}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Conectando...' : 'Conectar WhatsApp'}
        </button>
      )}

      {qrCode && (
        <div className="text-center">
          <p className="mb-4">Escaneie o QR Code com seu WhatsApp:</p>
          <img src={qrCode} alt="QR Code" className="mx-auto" />
        </div>
      )}

      {isConnected && (
        <div className="text-green-500">
          ✅ WhatsApp conectado com sucesso!
        </div>
      )}
    </div>
  );
}
5. CHECKLIST DE VERIFICAÇÃO
✅ Certificar que tem estas dependências:

npm install baileys@6.7.5 qrcode socket.io socket.io-client
✅ Criar pasta de sessões:

mkdir whatsapp_sessions
chmod 777 whatsapp_sessions
✅ Verificar no console do navegador:

Abrir F12 → Console
Ver se Socket.IO está conectando
Ver mensagens de erro
✅ Logs do servidor:

# Adicionar logs para debug
console.log('WhatsApp Service:', whatsAppService);
console.log('Socket.IO:', io);
SOLUÇÃO RÁPIDA SE AINDA DER ERRO:
// No frontend, trocar a chamada da API por:
const handleConnect = async () => {
  // Forçar nova tentativa com delay
  setLoading(true);
  setError(null);

  // Aguardar 1 segundo para garantir Socket.IO conectado
  await new Promise(resolve => setTimeout(resolve, 1000));

  const response = await fetch('/api/whatsapp/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: 'default' })
  });

  // Se não retornar QR, tentar novamente após 2 segundos
  if (!data.qrCode && !data.connected) {
    setTimeout(() => handleConnect(), 2000);
  }
};
O erro geralmente é causado por Socket.IO não estar configurado corretamente ou o serviço WhatsApp não estar inicializado. Use o código acima para corrigir!