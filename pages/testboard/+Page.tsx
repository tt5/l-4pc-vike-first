import { createSignal, onMount, onCleanup } from "solid-js";
import Board from "../../components/game/Board";
import EngineAnalysis from "../../components/game/EngineAnalysis";
import styles from "./Page.module.css";

export default function Page() {
  let undoFunction: (() => void) | undefined;
  let ws: WebSocket | undefined;

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = createSignal(false);
  const [evalScore, setEvalScore] = createSignal<number | null>(null);
  const [pvLine, setPvLine] = createSignal<string[]>([]);
  const [depth, setDepth] = createSignal(0);
  const [nps, setNps] = createSignal<number | null>(null);
  const [isConnected, setIsConnected] = createSignal(false);

  // Starting FEN for 4-player chess
  const startingFen = 'R-0,0,0,0-1,1,1,1-1,1,1,1-0,0,0,0-0-3yRyNyByKyQyByNyR3/3yPyPyPyPyPyPyPyP3/14/bRbP10gPgR/bNbP10gPgN/bBbP10gPgB/bQbP10gPgK/bKbP10gPgQ/bBbP10gPgB/bNbP10gPgN/bRbP10gPgR/14/3rPrPrPrPrPrPrPrP3/3rRrNrBrQrKrBrNrR3--,-,-,-';

  onMount(() => {
    // Connect to engine WebSocket
    const wsUrl = `ws://${window.location.host}/ws/engine`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[Engine WS] Connected');
      setIsConnected(true);
      // Initialize engine with starting position
      sendCommand({ type: 'init', fen: startingFen });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleEngineMessage(message);
      } catch (err) {
        console.error('[Engine WS] Error parsing message:', err);
      }
    };

    ws.onclose = () => {
      console.log('[Engine WS] Disconnected');
      setIsConnected(false);
      setIsAnalyzing(false);
    };

    ws.onerror = (error) => {
      console.error('[Engine WS] Error:', error);
      setIsConnected(false);
    };
  });

  onCleanup(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  function sendCommand(command: { type: string; [key: string]: unknown }) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(command));
    }
  }

  function handleEngineMessage(message: { type: string; data?: unknown }) {
    switch (message.type) {
      case 'ready':
        console.log('[Engine] Ready');
        break;

      case 'info':
        const info = message.data as {
          depth?: number;
          score?: number;
          pv?: string[];
          nps?: number;
          time?: number;
        };
        if (info.depth !== undefined) setDepth(info.depth);
        if (info.score !== undefined) setEvalScore(info.score);
        if (info.pv !== undefined) setPvLine(info.pv);
        if (info.nps !== undefined) setNps(info.nps);
        break;

      case 'bestmove':
        // Analysis completed or stopped
        break;

      case 'error':
        console.error('[Engine] Error:', message.data);
        break;
    }
  }

  function handleBoardMove(moveNotation: string) {
    console.log('[Board] Move made:', moveNotation);
    // Notify engine of the move
    sendCommand({ type: 'move', move: moveNotation });
    
    // If analysis is running, restart it to analyze new position
    if (isAnalyzing()) {
      sendCommand({ type: 'stop' });
      setTimeout(() => sendCommand({ type: 'go' }), 100);
    }
  }

  function handleBoardUndo() {
    console.log('[Board] Undo');
    // Notify engine of undo
    sendCommand({ type: 'undo' });
    
    // Restart analysis if it was running
    if (isAnalyzing()) {
      sendCommand({ type: 'stop' });
      setTimeout(() => sendCommand({ type: 'go' }), 100);
    }
  }

  function handleUndo() {
    if (undoFunction) {
      undoFunction();
    }
  }

  function toggleAnalysis() {
    if (!isConnected()) return;
    
    if (isAnalyzing()) {
      sendCommand({ type: 'stop' });
      setIsAnalyzing(false);
    } else {
      sendCommand({ type: 'go' });
      setIsAnalyzing(true);
    }
  }

  return (
    <div class={styles.page}>
      <div class={styles.controlsContainer}>
        <h2>Board Controls</h2>
        <button class={styles.undoButton} onClick={handleUndo}>
          Undo Move
        </button>
        <div class={styles.connectionStatus}>
          Engine: {isConnected() ? 'Connected' : 'Disconnected'}
        </div>
      </div>
      <div class={styles.mainContent}>
        <div class={styles.boardContainer}>
          <Board 
            onUndo={(undoFn: () => void) => { undoFunction = undoFn; }}
            onMove={handleBoardMove}
            onUndoMove={handleBoardUndo}
          />
        </div>
        <div class={styles.analysisContainer}>
          <EngineAnalysis
            isAnalyzing={isAnalyzing()}
            evalScore={evalScore()}
            pvLine={pvLine()}
            depth={depth()}
            nps={nps()}
            onToggleAnalysis={toggleAnalysis}
          />
        </div>
      </div>
    </div>
  );
}
