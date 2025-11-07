// src/lib/socket-lazy.ts
// Dynamic import wrapper para Socket.IO-client - reduz bundle inicial em ~1.6MB

import type { Socket, ManagerOptions, SocketOptions } from 'socket.io-client';

/**
 * Cria e retorna uma instância do Socket.IO com lazy loading
 * @param opts Opções para configuração do socket
 * @returns Promise<Socket>
 */
export async function createSocket(opts?: Partial<ManagerOptions & SocketOptions>): Promise<Socket> {
  const { io } = await import('socket.io-client');
  return io(opts);
}

/**
 * Helper para inicializar socket com autenticação
 * @param token Token de autenticação
 * @param additionalOpts Opções adicionais
 * @returns Promise<Socket>
 */
export async function createAuthenticatedSocket(
  token: string,
  additionalOpts?: Partial<ManagerOptions & SocketOptions>
): Promise<Socket> {
  const { io } = await import('socket.io-client');
  
  return io({
    path: '/api/socketio',
    auth: {
      token,
    },
    ...additionalOpts,
  });
}
