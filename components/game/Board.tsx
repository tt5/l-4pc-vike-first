import { 
  type Component, 
  createSignal,
  createEffect,
  batch,
  onMount,
  onCleanup,
  on,
} from 'solid-js';

import { GridCell } from './GridCell';

import styles from './Board.module.css';
import { Color, createPoint, HexColor, Piece, Point } from '../../types/board';

interface BoardProps {
  gameId?: string;
  onGameIdChange?: (gameId: string) => void;
  onGameUpdate?: () => void;
}

// Non-playable corner squares (3x3 in each corner)
export const NON_PLAYABLE_CORNERS = [
  // Top-left corner (0,0)
  { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
  { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
  { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
  
  // Top-right corner (11,0)
  { x: 11, y: 0 }, { x: 12, y: 0 }, { x: 13, y: 0 },
  { x: 11, y: 1 }, { x: 12, y: 1 }, { x: 13, y: 1 },
  { x: 11, y: 2 }, { x: 12, y: 2 }, { x: 13, y: 2 },
  
  // Bottom-left corner (0,11)
  { x: 0, y: 11 }, { x: 1, y: 11 }, { x: 2, y: 11 },
  { x: 0, y: 12 }, { x: 1, y: 12 }, { x: 2, y: 12 },
  { x: 0, y: 13 }, { x: 1, y: 13 }, { x: 2, y: 13 },
  
  // Bottom-right corner (11,11)
  { x: 11, y: 11 }, { x: 12, y: 11 }, { x: 13, y: 11 },
  { x: 11, y: 12 }, { x: 12, y: 12 }, { x: 13, y: 12 },
  { x: 11, y: 13 }, { x: 12, y: 13 }, { x: 13, y: 13 }
];

// Helper function to check if a square is in a non-playable corner
export function isInNonPlayableCorner(x: number, y: number): boolean {
  return NON_PLAYABLE_CORNERS.some(corner => corner.x === x && corner.y === y);
}

export const PLAYER_COLORS = ['RED', 'BLUE', 'YELLOW', 'GREEN'] as const;

type ColorMap = Record<Color, HexColor>;

export const COLOR_MAP: ColorMap = {
  'RED': '#F44336',
  'BLUE': '#2196F3',
  'YELLOW': '#FFEB3B',
  'GREEN': '#4CAF50',
  '#F44336': '#F44336',
  '#2196F3': '#2196F3',
  '#FFEB3B': '#FFEB3B',
  '#4CAF50': '#4CAF50'
} as const;

export function getColorHex(color: Color | undefined): HexColor | undefined {
  if (!color) {
    return undefined
  }
  return COLOR_MAP[color];
}

const Board: Component<BoardProps> = (props) => {

  const [hoveredCell, setHoveredCell] = createSignal<Point | null>(null);
  const [pieces, setPieces] = createSignal<Piece[]>([]);
  const [pickedUpPiece, setPickedUpPiece] = createSignal<Piece | null>(null);
  const [isDragging, setIsDragging] = createSignal(false);
  const [currentMoveIndex, setCurrentMoveIndex] = createSignal(-1);


  const currentPlayerColor = () => PLAYER_COLORS[currentMoveIndex() % PLAYER_COLORS.length];

  const handleBasePointPickup = (point: Point) => {
    const [x, y] = point;
    
    const basePoint = pieces().find(bp => bp.x === x && bp.y === y);
    if (!basePoint) return;
    
    const currentTurnColor = currentPlayerColor();
    const color = basePoint.color;
    
    if (color !== currentTurnColor) {
      return;
    }
    
    setPickedUpPiece(basePoint);
    setIsDragging(true);
  };


  return (
    <div class={styles.board}>
      <div class={styles.boardContent}>
        <div 
          class={styles.grid}
          style={{ '--grid-cell-size': `${5}px` }}
        >
          {Array.from({ length: 14 * 14 }).map((_, index) => {
          const [x, y] = [index % 14, Math.floor(index / 14)];
          // Find if there's a base point at these coordinates and get its color
          const basePoint = pieces().find(bp => bp.x === x && bp.y === y);
          const isBP = !!basePoint;
          const isNonPlayable = isInNonPlayableCorner(x, y);
          
          // Only show restricted squares when dragging and they originate from the dragged base point
          const draggedBasePoint = pickedUpPiece();
          
          // Update the cell state to include the new hover state and base point properties
          const cellState = {
            isBasePoint: isBP,
            isHovered: !!((hoveredCell() && hoveredCell()![0] === x && hoveredCell()![1] === y)),
            isNonPlayable,
            id: basePoint?.id,
            color: getColorHex(basePoint?.color),
            pieceType: basePoint?.pieceType
          };

          return (
            <GridCell
              x={x}
              y={y}
              state={cellState}
              isDragging={isDragging()}
              pickedUpBasePoint={draggedBasePoint ? createPoint(draggedBasePoint.x,draggedBasePoint.y) : null}
              onHover={(hovered) => {
                if (hovered) {
                  setHoveredCell(createPoint(x, y));
                } else if (hoveredCell()?.[0] === x && hoveredCell()?.[1] === y) {
                  setHoveredCell(null);
                }
              }}
              onBasePointPickup={handleBasePointPickup}
            />
          );
        })}
      </div>
      </div>
    </div>
  );
};

export default Board;
