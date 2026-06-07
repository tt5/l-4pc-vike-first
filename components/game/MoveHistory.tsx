import { createMemo, type Component } from 'solid-js';
import { type Move, type RoseTree } from '../../types/board';
import { PLAYER_COLORS } from '../../utils/game';
import { getFullLine, getCurrentMoveIndex } from '../../utils/roseTree';
import styles from './MoveHistory.module.css';

interface MoveHistoryProps {
  moveTree: RoseTree;
}

function moveToNotation(move: Move): string {
  const files = 'abcdefghijklmn';
  const from = `${files[move.fromX]}${14 - move.fromY}`;
  const to = `${files[move.toX]}${14 - move.toY}`;
  return `${from}-${to}`;
}

interface MoveEntry {
  move: Move;
  notation: string;
  isFuture: boolean;
}

const MoveHistory: Component<MoveHistoryProps> = (props) => {
  const currentIdx = createMemo(() => getCurrentMoveIndex(props.moveTree));
  const allMoves = createMemo(() => getFullLine(props.moveTree));

  const movePairs = createMemo(() => {
    const list = allMoves();
    const cur = currentIdx();
    const pairs: {
      moveNum: number;
      red?: MoveEntry;
      blue?: MoveEntry;
      yellow?: MoveEntry;
      green?: MoveEntry;
    }[] = [];
    let current: typeof pairs[number] | null = null;

    for (let i = 0; i < list.length; i++) {
      const move = list[i];
      const colorIndex = i % 4;
      const color = PLAYER_COLORS[colorIndex];
      const notation = moveToNotation(move);
      const isFuture = i > cur;
      const entry: MoveEntry = { move, notation, isFuture };

      if (color === 'RED') {
        current = { moveNum: pairs.length + 1, red: entry };
        pairs.push(current);
      } else if (current) {
        const key = color === 'BLUE' ? 'blue' : color === 'YELLOW' ? 'yellow' : 'green';
        (current as any)[key] = entry;
      }
    }

    return pairs;
  });

  return (
    <div class={styles.container}>
      <div class={styles.header}>
        <h3>Move History</h3>
        <span class={styles.moveCount}>{allMoves().length} moves</span>
      </div>
      <div class={styles.moveList}>
        {movePairs().length === 0 ? (
          <div class={styles.empty}>No moves yet</div>
        ) : (
          movePairs().map((pair) => (
            <div class={styles.moveRow}>
              <span class={styles.moveNumber}>{pair.moveNum}.</span>
              {pair.red && (
                <span class={`${styles.move} ${styles.colorRed} ${pair.red.isFuture ? styles.future : ''}`}>
                  {pair.red.notation}
                </span>
              )}
              {pair.blue && (
                <span class={`${styles.move} ${styles.colorBlue} ${pair.blue.isFuture ? styles.future : ''}`}>
                  {pair.blue.notation}
                </span>
              )}
              {pair.yellow && (
                <span class={`${styles.move} ${styles.colorYellow} ${pair.yellow.isFuture ? styles.future : ''}`}>
                  {pair.yellow.notation}
                </span>
              )}
              {pair.green && (
                <span class={`${styles.move} ${styles.colorGreen} ${pair.green.isFuture ? styles.future : ''}`}>
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
