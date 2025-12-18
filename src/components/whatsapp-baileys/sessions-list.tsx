'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Trash2, RefreshCw, QrCode, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useWhatsAppSessions } from '@/hooks/use-whatsapp-sessions';
import { CreateSessionDialog } from './create-session-dialog';
import { QRCodeModal } from './qr-code-modal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SessionsList() {
  const { sessions, isLoading, createSession, deleteSession, reconnectSession, mutate } =
    useWhatsAppSessions();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSessionName, setSelectedSessionName] = useState<string>('');
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const handleConnect = async (sessionId: string, sessionName: string) => {
    await reconnectSession(sessionId);
    setSelectedSessionId(sessionId);
    setSelectedSessionName(sessionName);
    setQrModalOpen(true);
  };

  const handleReconnect = async (sessionId: string, sessionName: string) => {
    await reconnectSession(sessionId);
    setSelectedSessionId(sessionId);
    setSelectedSessionName(sessionName);
    setQrModalOpen(true);
  };

  const handleSessionCreated = async (sessionId: string, sessionName: string) => {
    await reconnectSession(sessionId);
    setSelectedSessionId(sessionId);
    setSelectedSessionName(sessionName);
    setQrModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Conectada
          </Badge>
        );
      case 'connecting':
      case 'qr':
        return (
          <Badge variant="secondary">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Aguardando QR
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Desconectada
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Falha
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status || 'Desconhecido'}
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Sessões WhatsApp Normal</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie suas sessões WhatsApp conectadas via multi-dispositivo
          </p>
        </div>
        <CreateSessionDialog onCreateSession={createSession} onSessionCreated={handleSessionCreated} />
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Smartphone className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma sessão criada</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
              Crie uma nova sessão para conectar uma conta WhatsApp via QR Code
            </p>
            <CreateSessionDialog onCreateSession={createSession} onSessionCreated={handleSessionCreated} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">{session.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {session.id.substring(0, 8)}...
                    </CardDescription>
                  </div>
                  {getStatusBadge(session.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {session.phone && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Telefone: </span>
                    <span className="font-mono">{session.phone}</span>
                  </div>
                )}

                {session.lastConnected && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Última conexão: </span>
                    <span>
                      {format(new Date(session.lastConnected), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  {session.status === 'connected' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReconnect(session.id, session.name)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reconectar
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleConnect(session.id, session.name)}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Conectar
                    </Button>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Deletar Sessão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja deletar a sessão &quot;{session.name}&quot;? Esta ação não
                          pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteSession(session.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Deletar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <QRCodeModal
        sessionId={selectedSessionId}
        sessionName={selectedSessionName}
        isOpen={qrModalOpen}
        onClose={() => {
          setQrModalOpen(false);
          setSelectedSessionId(null);
          setSelectedSessionName('');
          mutate();
        }}
      />
    </div>
  );
}
