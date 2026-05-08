import { connect, NatsError, NatsConnection } from 'nats';

interface EngineCommand {
  clientId: string;
  type: "go" | "stop" | "move" | "undo";
  data?: {
    depth?: number;
    move?: string;
  };
  timestamp: number;
}

interface EngineResponse {
  clientId: string;
  type: "info" | "depth" | "bestmove" | "error" | "ready";
  data: any;
  timestamp: number;
}

class NATSManager {
  private static instance: NATSManager;
  private nc: NatsConnection | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000; // 2 seconds

  private constructor() {}

  static getInstance(): NATSManager {
    if (!NATSManager.instance) {
      NATSManager.instance = new NATSManager();
    }
    return NATSManager.instance;
  }

  async connect(): Promise<void> {
    const natsUrl = process.env.NATS_URL || 'nats://localhost:4222';
    
    try {
      console.log(`[NATS] Connecting to ${natsUrl}...`);
      this.nc = await connect({
        servers: natsUrl,
        reconnect: true,
        maxReconnectAttempts: this.maxReconnectAttempts,
        reconnectTimeWait: this.reconnectDelay,
        name: '4pchess-server'
      });

      console.log('[NATS] Connected successfully');
      this.reconnectAttempts = 0;

      this.nc.closed().then((err) => {
        if (err) {
          console.error('[NATS] Connection closed with error:', err);
          this.handleReconnect();
        } else {
          console.log('[NATS] Connection closed gracefully');
        }
      });

    } catch (error) {
      console.error('[NATS] Failed to connect:', error);
      throw error;
    }
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[NATS] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(async () => {
        try {
          await this.connect();
        } catch (error) {
          console.error('[NATS] Reconnect failed:', error);
          this.handleReconnect();
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('[NATS] Max reconnection attempts reached');
    }
  }

  async publishCommand(command: EngineCommand): Promise<void> {
    if (!this.nc) {
      throw new Error('NATS not connected');
    }

    const subject = `engine.commands.${command.clientId}`;
    const message = JSON.stringify(command);
    
    try {
      this.nc.publish(subject, message);
      console.log(`[NATS] Published command to ${subject}:`, command);
    } catch (error) {
      console.error('[NATS] Failed to publish command:', error);
      throw error;
    }
  }

  async subscribeToResponses(clientId: string, callback: (response: EngineResponse) => void): Promise<void> {
    if (!this.nc) {
      throw new Error('NATS not connected');
    }

    const subject = `engine.responses.${clientId}`;
    
    try {
      const sub = this.nc.subscribe(subject);
      console.log(`[NATS] Subscribed to ${subject}`);
      
      (async () => {
        for await (const msg of sub) {
          try {
            const response: EngineResponse = JSON.parse(msg.data.toString());
            callback(response);
          } catch (error) {
            console.error('[NATS] Failed to parse response:', error);
          }
        }
      })();
    } catch (error) {
      console.error('[NATS] Failed to subscribe:', error);
      throw error;
    }
  }

  async unsubscribeFromResponses(clientId: string): Promise<void> {
    // Note: NATS.js doesn't provide direct unsubscribe by subject
    // This would need to be handled at the subscription level
    console.log(`[NATS] Unsubscribing from responses for client ${clientId}`);
  }

  isConnected(): boolean {
    return this.nc !== null && !this.nc.isClosed();
  }

  async close(): Promise<void> {
    if (this.nc && !this.nc.isClosed()) {
      try {
        await this.nc.drain();
        await this.nc.close();
        console.log('[NATS] Connection closed');
      } catch (error) {
        console.error('[NATS] Error closing connection:', error);
      }
    }
  }
}

export default NATSManager;
export { EngineCommand, EngineResponse };
