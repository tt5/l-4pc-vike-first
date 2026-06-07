import { createMemo, type Component } from 'solid-js';
import { type Move, type RoseTree, type NamedColor } from '../../types/board';
import { PLAYER_COLORS } from '../../utils/game';
import { getMoveHistory } from '../../utils/roseTree';
import styles from './MoveHistory.module.css';

interface MoveHistoryProps {
  moveTree: RoseTree;
}

const colorLabels: Record<NamedColor, string> = {
  RED: 'R',
  BLUE: 'B',
  YELLOW: 'Y',
  GREEN: 'G',
};

const colorClasses: Record<NamedColor, string> = {
  RED: styles.colorRed,
  BLUE: styles.colorBlue,
  YELLOW: styles.colorYellow,
  GREEN: styles.colorGreen,
};

function moveToNotation(move: Move): string {
  const files = 'abcdefghijklmn';
  const from = `${files[move.fromX]}${14 - move.fromY}`;
  const to = `${files[move.toX]}${14 - move.toY}`;
  return `${from}-${to}`;
}

const MoveHistory: Component<MoveHistoryProps> = (props) => {
  const moves = createMemo(() => getMoveHistory(props.moveTree));

  const movePairs = createMemo(() => {
    const list = moves();
    const pairs: { moveNum: number; red?: { move: Move; notation: string }; blue?: { move: Move; notation: string }; yellow?: { move: Move; notation: string }; green?: { move: Move; notation: string } }[] = [];
    let current: typeof pairs[number] | null = null;

    for (let i = 0; i < list.length; i++) {
      const move = list[i];
      const colorIndex = i % 4;
      const color = PLAYER_COLORS[colorIndex];
      const notation = moveToNotation(move);

      if (color === 'RED') {
        current = { moveNum: pairs.length + 1, red: { move, notation } };
        pairs.push(current);
      } else if (current) {
        current[color === 'BLUE' ? 'blue' : color === 'YELLOW' ? 'yellow' : 'green'] = { move, notation };
      }
    }

    return pairs;
  });

  const currentMoveIndex = createMemo(() => {
    const list = moves();
    return list.length - 1;
  });

  return (
    <div class={styles.container}>
      <div class={styles.header}>
        <h3>Move History</h3>
        <span class={styles.moveCount}>{moves().length} moves</span>
      </div>
      <div class={styles.moveList}>
        {movePairs().length === 0 ? (
          <div class={styles.empty}>No moves yet</div>
        ) : (
          movePairs().map((pair) => (
            <div class={styles.moveRow}>
              <span class={styles.moveNumber}>{pair.moveNum}.</span>
              {pair.red && (
                <span class={`${styles.move} ${styles.colorRed} ${currentMoveIndex() === (pair.moveNum - 1) * 4 ? styles.current : ''}`}>
                  {pair.red.notation}
                </span>
              )}
              {pair.blue && (
                <span class={`${styles.move} ${styles.colorBlue} ${currentMoveIndex() === (pair.moveNum - 1) * 4 + 1 ? styles.current : ''}`}>
                  {pair.blue.notation}
                </span>
              )}
              {pair.yellow && (
                <span class={`${styles.move} ${styles.colorYellow} ${currentMoveIndex() === (pair.moveNum - 1) * 4 + 2 ? styles.current : ''}`}>
                  {pair.yellow.notation}
                </span>
              )}
              {pair.green && (
                <span class={`${styles.move} ${styles.colorGreen} ${currentMoveIndex() === (pair.moveNum - 1) * 4 + 3 ? styles.current : ''}`}>
                  {pair.green.notation}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MoveHistory;
