import { type Component } from 'solid-js';
import styles from './BoardControls.module.css';

interface BoardControlsProps {
  isConnected: boolean;
  onGoBack: () => void;
}

const BoardControls: Component<BoardControlsProps> = (props) => {
  return (
    <div class={styles.container}>
      <h2 class={styles.heading}>Board Controls</h2>
      <button class={styles.undoButton} onClick={props.onGoBack} disabled={!props.isConnected}>
        Go Back
      </button>
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
