import { type Component } from 'solid-js';
import styles from './GridCell.module.css';
import { createPoint, type Point } from '../../types/board';
import { King, Queen, Pawn, Bishop, Knight, Rook } from './ChessPieces';

interface CellState {
  isPiece: boolean;
  isHovered: boolean;
  isNonPlayable?: boolean;
  id?: number;
  color?: string;
  pieceType?: string;
}

interface GridCellProps {
  x: number;
  y: number;
  state: CellState;
  isDragging: boolean;
  pickedUpPiece: Point | null;
  legalMoves: { x: number; y: number }[];
  onHover: (isHovered: boolean) => void;
  onClick?: () => void;
  onPiecePickup: (point: Point) => void;
}

export const GridCell: Component<GridCellProps> = (props) => {
  const { state, x, y, isDragging: isDraggingProp, pickedUpPiece, legalMoves } = props;
  
  const isValidMoveTarget = () => {
    return legalMoves.some(move => move.x === x && move.y === y);
  };
  const { isPiece, isHovered, id, color, pieceType } = state;
  
  const handleMouseDown = (e: MouseEvent) => {
    if (isPiece) {
      props.onPiecePickup(createPoint(x, y));
      e.stopPropagation();
    }
  };

  const handleMouseEnter = () => {
    props.onHover(true);
  };

  const handleMouseUp = () => {};

  const squareClass = () => {
    const classes = [styles.square];
    if (isPiece) classes.push(styles.basePoint);
    if (state.isNonPlayable) classes.push(styles.nonPlayable)
    if (isDraggingProp && pickedUpPiece && isPiece) {
      classes.push(styles.dragging);
    }
    if (isHovered && isDraggingProp && pickedUpPiece !== null) {
      classes.push(styles['valid-drop']);
    }
    if (isDraggingProp && isValidMoveTarget()) {
      classes.push(styles['valid-move-target']);
    }
    return classes.join(' ');
  };

  return (
    <button
      class={squareClass()}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => props.onHover(false)}
      onClick={props.onClick}
    >
      {isPiece ? (
        <div 
          class={`${styles.basePoint} ${styles.basePointMarker}`}
          style={{ 'background-color': state.color, '--piece-color': state.color}}
          data-piece={state.pieceType}
          data-x={x}
          data-y={y}
          data-testid={`piece-${x}-${y}`}
        >
          {pieceType === 'queen' && state.id != null && state.color && (
            <Queen 
              class={styles.pieceIcon} 
              color={state.color} 
              data-piece-id={state.id} 
              data-x={x} 
              data-y={y} 
              data-piece="queen"
            />
          )}
          {pieceType === 'king' && state.id != null && state.color && (
            <King 
              class={styles.pieceIcon} 
              color={state.color} 
              data-piece-id={state.id} 
              data-x={x} 
              data-y={y}
              data-piece="king"
            />
          )}
          {pieceType === 'pawn' && state.id != null && state.color && (
            <Pawn 
              class={styles.pieceIcon} 
              color={state.color} 
              data-piece-id={state.id} 
              data-x={x} 
              data-y={y}
              data-piece="pawn"
            />
          )}
          {pieceType === 'bishop' && state.id != null && state.color && (
            <Bishop 
              class={styles.pieceIcon} 
              color={state.color} 
              data-piece-id={state.id} 
              data-x={x} 
              data-y={y}
              data-piece="bishop"
            />
          )}
          {pieceType === 'knight' && state.id != null && state.color && (
            <Knight 
              class={styles.pieceIcon} 
              color={state.color} 
              data-piece-id={state.id} 
              data-x={x} 
              data-y={y}
              data-piece="knight"
            />
          )}
          {pieceType === 'rook' && state.id != null && state.color && (
            <Rook 
              class={styles.pieceIcon} 
              color={state.color} 
              data-piece-id={state.id} 
              data-x={x} 
              data-y={y}
              data-piece="rook"
            />
          )}
        </div>
      ) : null}
    </button>
  );
};
