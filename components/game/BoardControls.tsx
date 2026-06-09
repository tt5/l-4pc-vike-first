import { type Component } from 'solid-js';
import styles from './BoardControls.module.css';

interface BoardControlsProps {
  isConnected: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
}

const BoardControls: Component<BoardControlsProps> = (props) => {
  return (
    <div class={styles.container}>
      <h2 class={styles.heading}>Board Controls</h2>
      <div class={styles.navRow}>
        <button class={styles.undoButton} onClick={props.onGoBack} disabled={!props.isConnected}>
          ◀ Go Back
        </button>
        <button class={styles.redoButton} onClick={props.onGoForward} disabled={!props.isConnected}>
          Go Forward ▶
        </button>
      </div>
      <div class={styles.statusRow}>
        <span class={`${styles.statusDot} ${props.isConnected ? styles.connected : styles.disconnected}`} />
        <span class={styles.statusText}>
          Engine: {props.isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
  );
};

export default BoardControls;
