import { createSignal, createEffect, type Component } from 'solid-js';
import styles from './Board.module.css';

interface EngineAnalysisProps {
  isAnalyzing: boolean;
  evalScore: number | null;
  pvLine: string[];
  depth: number;
  nps: number | null;
  onToggleAnalysis: () => void;
}

const EngineAnalysis: Component<EngineAnalysisProps> = (props) => {
  // Convert centipawns to display format
  const formatScore = (score: number | null): string => {
    if (score === null) return "--";
    // Score is in centipawns from the engine
    // Positive = advantage for the side to move
    const pawns = score / 100;
    if (Math.abs(pawns) > 10) {
      return pawns > 0 ? "+M" : "-M";
    }
    return (pawns > 0 ? "+" : "") + pawns.toFixed(2);
  };

  // Format nodes per second
  const formatNps = (nps: number | null): string => {
    if (nps === null) return "--";
    if (nps >= 1000000) {
      return (nps / 1000000).toFixed(1) + "M";
    }
    if (nps >= 1000) {
      return (nps / 1000).toFixed(1) + "k";
    }
    return nps.toString();
  };

  // Calculate eval bar percentage (0-100, 50 is equal)
  const evalBarPercent = (): number => {
    if (props.evalScore === null) return 50;
    const score = props.evalScore / 100; // convert to pawns
    // Clamp between -5 and +5 pawns for display
    const clamped = Math.max(-5, Math.min(5, score));
    // Map -5..+5 to 0..100
    return 50 + (clamped / 5) * 50;
  };

  return (
    <div class={styles.analysisPanel}>
      <div class={styles.analysisHeader}>
        <h3>Engine Analysis</h3>
        <button 
          class={props.isAnalyzing ? styles.stopButton : styles.analyzeButton}
          onClick={props.onToggleAnalysis}
        >
          {props.isAnalyzing ? "Stop" : "Analyze"}
        </button>
      </div>

      <div class={styles.evalBar}>
        <div 
          class={styles.evalBarFill} 
          style={{ width: `${evalBarPercent()}%` }}
        />
        <div class={styles.evalBarText}>
          {formatScore(props.evalScore)}
        </div>
      </div>

      <div class={styles.analysisInfo}>
        <div class={styles.infoRow}>
          <span class={styles.infoLabel}>Depth:</span>
          <span class={styles.infoValue}>{props.depth || "--"}</span>
        </div>
        <div class={styles.infoRow}>
          <span class={styles.infoLabel}>Speed:</span>
          <span class={styles.infoValue}>{formatNps(props.nps)} nodes/s</span>
        </div>
      </div>

      <div class={styles.pvContainer}>
        <div class={styles.pvLabel}>Best line:</div>
        <div class={styles.pvMoves}>
          {props.pvLine.length > 0 ? props.pvLine.join(" ") : "--"}
        </div>
      </div>
    </div>
  );
};

export default EngineAnalysis;
