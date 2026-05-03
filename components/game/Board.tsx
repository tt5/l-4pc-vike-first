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
import { Color, createPoint, HexColor, NamedColor, Piece, PieceType, Point } from '../../types/board';

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

const COLOR_MAP_FEN: Record<string, NamedColor> = {
  'r': 'RED',
  'b': 'BLUE',
  'y': 'YELLOW',
  'g': 'GREEN'
};

const PIECE_TYPE_MAP_FEN: Record<string, PieceType> = {
  'P': 'pawn',
  'R': 'rook',
  'N': 'knight',
  'B': 'bishop',
  'Q': 'queen',
  'K': 'king'
};

function getTeamFromColor(color: NamedColor): 1 | 2 {
  return color === 'RED' || color === 'YELLOW' ? 1 : 2;
}

function parseFen(fen: string): Piece[] {
  const parts = fen.split('-');
  if (parts.length < 7) {
    console.error('Invalid FEN: not enough parts');
    return [];
  }

  const piecePlacement = parts[6];
  const rows = piecePlacement.split('/');

  if (rows.length !== 14) {
    console.error('Invalid FEN: expected 14 rows, got', rows.length);
    return [];
  }

  const pieces: Piece[] = [];
  let pieceId = 0;

  for (let row = 0; row < 14; row++) {
    const rowStr = rows[row];
    let col = 0;
    let i = 0;

    while (i < rowStr.length && col < 14) {
      const char = rowStr[i];

      // Check if it's a color letter (r/b/y/g) followed by piece letter
      if (COLOR_MAP_FEN[char] && i + 1 < rowStr.length) {
        const pieceType = PIECE_TYPE_MAP_FEN[rowStr[i + 1]];
        const color = COLOR_MAP_FEN[char];

        if (pieceType && color) {
          pieces.push({
            id: pieceId++,
            x: col,
            y: row,
            color,
            pieceType,
            team: getTeamFromColor(color)
          });
          col++;
        }
        i += 2;
      }
      // Single empty square marked with x
      else if (char === 'x') {
        col++;
        i++;
      }
      // Multiple empty squares (number 1-14, multi-digit)
      else if (/\d/.test(char)) {
        let numStr = char;
        i++;
        while (i < rowStr.length && /\d/.test(rowStr[i])) {
          numStr += rowStr[i];
          i++;
        }
        const numEmpty = parseInt(numStr, 10);
        if (!isNaN(numEmpty) && numEmpty > 0) {
          col += numEmpty;
        }
      }
      // Unknown character, skip it
      else {
        i++;
      }
    }
  }

  return pieces;
}

const Board: Component<BoardProps> = (props) => {

  const [hoveredCell, setHoveredCell] = createSignal<Point | null>(null);
  const [pieces, setPieces] = createSignal<Piece[]>([]);
  const [pickedUpPiece, setPickedUpPiece] = createSignal<Piece | null>(null);
  const [isDragging, setIsDragging] = createSignal(false);
  const [currentMoveIndex, setCurrentMoveIndex] = createSignal(0);
  const [fen, setFen] = createSignal<string>('R-0,0,0,0-1,1,1,1-1,1,1,1-0,0,0,0-0-3yRyNyByKyQyByNyR3/3yPyPyPyPyPyPyPyP3/14/bRbP10gPgR/bNbP10gPgN/bBbP10gPgK/bQbP10gPgQ/bKbP10gPgB/bBbP10gPgB/bNbP10gPgN/bRbP10gPgR/14/3rPrPrPrPrPrPrPrP3/3rRrNrBrQrKrBrNrR3--,-,-,-');

  // Parse FEN and set up pieces when fen signal changes
  createEffect(on(fen, (currentFen) => {
    const parsedPieces = parseFen(currentFen);
    setPieces(parsedPieces);
  }, { defer: false }));

  const currentPlayerColor = () => PLAYER_COLORS[currentMoveIndex() % PLAYER_COLORS.length];

  const handlePiecePickup = (point: Point) => {
    const [x, y] = point;
    
    const piece = pieces().find(p => p.x === x && p.y === y);
    if (!piece) return;
    
    const currentTurnColor = currentPlayerColor();
    const color = piece.color;
    
    if (color !== currentTurnColor) {
      return;
    }
    
    setPickedUpPiece(piece);
    setIsDragging(true);
  };


  return (
    <div class={styles.board}>
      <div class={styles.boardContent}>
        <div 
          class={styles.grid}
          style={{ '--grid-cell-size': '5px' }}
        >
          {Array.from({ length: 14 * 14 }).map((_, index) => {
          const [x, y] = [index % 14, Math.floor(index / 14)];
          // Find if there's a base point at these coordinates and get its color
          const piece = pieces().find(p => p.x === x && p.y === y);
          const isPiece = !!piece;
          const isNonPlayable = isInNonPlayableCorner(x, y);
          
          // Only show restricted squares when dragging and they originate from the dragged base point
          const draggedPiece = pickedUpPiece();
          
          // Update the cell state to include the new hover state and base point properties
          const cellState = {
            isPiece: isPiece,
            isHovered: !!((hoveredCell() && hoveredCell()![0] === x && hoveredCell()![1] === y)),
            isNonPlayable,
            id: piece?.id,
            color: getColorHex(piece?.color),
            pieceType: piece?.pieceType
          };

          return (
            <GridCell
              x={x}
              y={y}
              state={cellState}
              isDragging={isDragging()}
              pickedUpPiece={draggedPiece ? createPoint(draggedPiece.x,draggedPiece.y) : null}
              onHover={(hovered) => {
                if (hovered) {
                  setHoveredCell(createPoint(x, y));
                } else if (hoveredCell()?.[0] === x && hoveredCell()?.[1] === y) {
                  setHoveredCell(null);
                }
              }}
              onPiecePickup={handlePiecePickup}
            />
          );
        })}
      </div>
      </div>
    </div>
  );
};

export default Board;
