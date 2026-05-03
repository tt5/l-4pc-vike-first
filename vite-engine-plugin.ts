import type { Plugin } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import { handleEngineConnection } from './server/engine-handlers';

export function engineWebSocketPlugin(): Plugin {
  return {
    name: 'engine-websocket',
    configureServer(server) {
      // Wait for server to be ready
      server.httpServer?.once('listening', () => {
        const wss = new WebSocketServer({
          server: server.httpServer!,
          path: '/ws/engine',
        });

        wss.on('connection', (ws: WebSocket) => {
          handleEngineConnection(ws);
        });

        console.log('[Engine WS] WebSocket server attached to /ws/engine');
      });
    },
  };
}
