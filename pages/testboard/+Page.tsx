import { createSignal, createMemo, onMount, onCleanup } from "solid-js";
import Board from "../../components/game/Board";
import EngineAnalysis from "../../components/game/EngineAnalysis";
import MoveHistory from "../../components/game/MoveHistory";
import BoardControls from "../../components/game/BoardControls";
import type { RoseTree } from "../../types/board";
import { createRoseTree } from "../../utils/roseTree";
import styles from "./Page.module.css";

export default function Page() {
  let undoFunction: (() => void) | undefined;
  let redoFunction: (() => void) | undefined;
  let ws: WebSocket | undefined;

  // Rose tree for move history display
  const [moveTree, setMoveTree] = createSignal<RoseTree>(createRoseTree());
  const [treeVersion, setTreeVersion] = createSignal(0);

  // Force re-read of moveTree when version changes (avoids Solid batching issues)
  const syncedTree = createMemo(() => {
    treeVersion(); // subscribe to version changes
    return moveTree();
  });

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
    //console.log('[Engine DEBUG] Received message:', message);
    
    switch (message.type) {
      case 'ready':
        console.log('[Engine] Ready');
        break;

      case 'info':
        const info = message.data as {
          score?: number;
          pv?: string[];
        };
        if (info.score !== undefined) setEvalScore(info.score);
        if (info.pv !== undefined) setPvLine(info.pv);
        break;

      case 'depth':
        const depthInfo = message.data as {
          depth?: number;
          nps?: number;
        };
        if (depthInfo.depth !== undefined) setDepth(depthInfo.depth);
        if (depthInfo.nps !== undefined) setNps(depthInfo.nps);
        break;

      case 'bestmove':
        // Analysis completed or stopped
        break;

      case 'error':
        console.error('[Engine] Error:', message.data);
        break;
        
      default:
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
    console.log('[Board] Go back');
    // Notify engine of undo
    sendCommand({ type: 'undo' });
    
    // Restart analysis if it was running
    if (isAnalyzing()) {
      sendCommand({ type: 'stop' });
      setTimeout(() => sendCommand({ type: 'go' }), 100);
    }
  }

  function handleBoardRedo() {
    console.log('[Board] Go forward');
    // Notify engine of redo (re-send the move)
    sendCommand({ type: 'redo' });
    
    // Restart analysis if it was running
    if (isAnalyzing()) {
      sendCommand({ type: 'stop' });
      setTimeout(() => sendCommand({ type: 'go' }), 100);
    }
  }

  function handleGoBack() {
    if (undoFunction) {
      undoFunction();
    }
  }

  function handleGoForward() {
    if (redoFunction) {
      redoFunction();
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
      <BoardControls isConnected={isConnected()} onGoBack={handleGoBack} onGoForward={handleGoForward} />
      <div class={styles.mainContent}>
        <div class={styles.boardContainer}>
          <Board
            onUndo={(undoFn: () => void) => { undoFunction = undoFn; }}
            onRedo={(redoFn: () => void) => { redoFunction = redoFn; }}
            onMove={handleBoardMove}
            onUndoMove={handleBoardUndo}
            onRedoMove={handleBoardRedo}
            onTreeChange={(tree) => { setMoveTree(tree); setTreeVersion(v => v + 1); }}
            pvLine={pvLine()}
            isAnalyzing={isAnalyzing()}
          />
        </div>
        <div class={styles.sidebar}>
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
          <div class={styles.historyContainer}>
            <MoveHistory moveTree={syncedTree()} />
          </div>
        </div>
      </div>
    </div>
  );
}
