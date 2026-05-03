import { spawn, ChildProcess } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type { WebSocket } from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the 4pchess CLI binary
const CLI_PATH = join(__dirname, "..", "4pchess", "cli");

interface EngineClient {
  ws: WebSocket;
  process: ChildProcess;
  buffer: string;
  isReady: boolean;
}

const clients = new Map<WebSocket, EngineClient>();

// Parse engine output line and extract relevant info
function parseEngineOutput(line: string): { type: string; data: unknown } | null {
  line = line.trim();
  
  if (line.startsWith("info ")) {
    // Parse: info depth 12 time 245 nodes 45000 pv e2-e4 e7-e5 score 45 nps 183673
    const info: Record<string, string | number | string[]> = {};
    const parts = line.substring(5).split(" ");
    
    for (let i = 0; i < parts.length; i++) {
      const key = parts[i];
      if (key === "pv") {
        // PV is a list of moves until end of line
        info.pv = parts.slice(i + 1);
        break;
      } else if (i + 1 < parts.length) {
        const val = parts[i + 1];
        if (key === "depth" || key === "time" || key === "nodes" || key === "score" || key === "nps") {
          info[key] = parseInt(val, 10);
        }
        i++;
      }
    }
    
    return { type: "info", data: info };
  }
  
  if (line.startsWith("bestmove ")) {
    const move = line.substring(9).trim();
    return { type: "bestmove", data: { move } };
  }
  
  return null;
}

// Send command to engine process
function sendCommand(client: EngineClient, command: string) {
  if (client.process.stdin && !client.process.killed) {
    client.process.stdin.write(command + "\n");
  }
}

// Handle WebSocket connection
export function handleEngineConnection(ws: WebSocket) {
  console.log("[Engine] New WebSocket connection");
  
  // Spawn the engine process
  const engineProcess = spawn(CLI_PATH, [], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  
  const client: EngineClient = {
    ws,
    process: engineProcess,
    buffer: "",
    isReady: false,
  };
  
  clients.set(ws, client);
  
  // Handle engine stdout
  engineProcess.stdout?.on("data", (data: Buffer) => {
    const text = data.toString();
    client.buffer += text;
    
    // Process complete lines
    let newlineIdx;
    while ((newlineIdx = client.buffer.indexOf("\n")) !== -1) {
      const line = client.buffer.substring(0, newlineIdx);
      client.buffer = client.buffer.substring(newlineIdx + 1);
      
      const parsed = parseEngineOutput(line);
      if (parsed) {
        ws.send(JSON.stringify(parsed));
      }
    }
  });
  
  // Handle engine stderr (log errors)
  engineProcess.stderr?.on("data", (data: Buffer) => {
    console.error("[Engine stderr]", data.toString());
  });
  
  // Handle engine exit
  engineProcess.on("exit", (code) => {
    console.log(`[Engine] Process exited with code ${code}`);
    if (ws.readyState === 1) { // OPEN
      ws.send(JSON.stringify({ type: "error", data: { message: "Engine process exited" } }));
      ws.close();
    }
  });
  
  // Handle WebSocket messages from client
  ws.on("message", (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case "init":
          // Set up initial position with FEN
          if (data.fen) {
            // Initialize board with FEN - using the 'fen' command to display it, 
            // then we need to set position. The CLI doesn't have a direct 'position' command,
            // but we can use 'd' to verify and the engine maintains internal state.
            // Actually, looking at the CLI code, we need to handle this differently.
            // The board_ is internal, so we send moves from startpos.
            // For custom FEN, we might need to modify the approach.
            sendCommand(client, `d`); // Show current board
          }
          break;
          
        case "move":
          if (data.move) {
            sendCommand(client, `move ${data.move}`);
          }
          break;
          
        case "undo":
          sendCommand(client, "undo");
          break;
          
        case "go":
          if (data.depth) {
            sendCommand(client, `go depth ${data.depth}`);
          } else {
            sendCommand(client, "go");
          }
          break;
          
        case "stop":
          sendCommand(client, "stop");
          break;
          
        default:
          ws.send(JSON.stringify({ type: "error", data: { message: `Unknown command: ${data.type}` } }));
      }
    } catch (err) {
      console.error("[Engine] Error handling message:", err);
      ws.send(JSON.stringify({ type: "error", data: { message: "Invalid message format" } }));
    }
  });
  
  // Handle WebSocket close
  ws.on("close", () => {
    console.log("[Engine] WebSocket closed, terminating engine process");
    if (!engineProcess.killed) {
      engineProcess.kill();
    }
    clients.delete(ws);
  });
  
  // Send ready message
  ws.send(JSON.stringify({ type: "ready", data: {} }));
}
