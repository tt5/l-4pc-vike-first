import type { Plugin } from 'vite';
import type { WebSocket } from 'ws';

export function engineWebSocketPlugin(): Plugin {
  return {
    name: 'engine-websocket',
    async configureServer(server) {
      const { WebSocket } = await import('ws');
      const { handleEngineConnection } = await import('./server/engine-handlers');

      const httpServer = server.httpServer;
      if (!httpServer) return;

      // Create WebSocketServer without attaching to HTTP server (manual upgrade handling)
      const { WebSocketServer } = await import('ws');
      const wss = new WebSocketServer({ noServer: true });

      wss.on('connection', (ws: WebSocket) => {
        handleEngineConnection(ws);
      });

      // Handle upgrade manually to avoid conflicts with Vite's HMR WebSocket
      httpServer.on('upgrade', (request, socket, head) => {
        if (request.url === '/ws/engine') {
          wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
          });
        }
      });

      console.log('[Engine WS] Upgrade handler attached for /ws/engine');
    },
  };
}
