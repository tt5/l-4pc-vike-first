import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type { WebSocket } from "ws";
import NATSManager, { EngineCommand, EngineResponse } from "./nats-manager";
import { randomUUID } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface EngineClient {
  ws: WebSocket;
  clientId: string;
  isReady: boolean;
}

const clients = new Map<WebSocket, EngineClient>();


// Handle WebSocket connection
export async function handleEngineConnection(ws: WebSocket) {
  console.log("[Engine] New WebSocket connection");
  
  // Generate unique client ID
  const clientId = randomUUID();
  
  const client: EngineClient = {
    ws,
    clientId,
    isReady: false,
  };
  
  clients.set(ws, client);
  
  // Subscribe to responses from pv_bridge for this client
  try {
    await natsManager.subscribeToResponses(clientId, (response: EngineResponse) => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(JSON.stringify({
          type: response.type,
          data: response.data
        }));
      }
    });
  } catch (error) {
    console.error('[Engine] Failed to subscribe to responses:', error);
    ws.send(JSON.stringify({ 
      type: "error", 
      data: { message: "Failed to setup response channel" } 
    }));
    return;
  }
  
  // Handle WebSocket messages from client
  ws.on("message", async (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString());
      
      // Convert WebSocket message to EngineCommand
      const command: EngineCommand = {
        clientId,
        type: data.type,
        timestamp: Date.now()
      };
      
      switch (data.type) {
        case "move":
          if (data.move) {
            command.data = { move: data.move };
          }
          break;
          
        case "go":
          if (data.depth) {
            command.data = { depth: data.depth };
          }
          break;
          
        case "stop":
        case "undo":
          // No additional data needed
          break;
          
        default:
          ws.send(JSON.stringify({ type: "error", data: { message: `Unknown command: ${data.type}` } }));
          return;
      }
      
      // Publish command to NATS
      await natsManager.publishCommand(command);
      console.log(`[Engine] Published command for client ${clientId}:`, command);
      
    } catch (err) {
      console.error("[Engine] Error handling message:", err);
      ws.send(JSON.stringify({ type: "error", data: { message: "Invalid message format" } }));
    }
  });
  
  // Handle WebSocket close
  ws.on("close", async () => {
    console.log(`[Engine] WebSocket closed for client ${clientId}`);
    await natsManager.unsubscribeFromResponses(clientId);
    clients.delete(ws);
  });
  
  // Send ready message
  ws.send(JSON.stringify({ type: "ready", data: { clientId } }));
}
