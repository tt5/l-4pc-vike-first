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
import { createPoint, NamedColor, Piece, Point, LegalMove } from '../../types/board';
import { PLAYER_COLORS, getColorHex, parseFen, isInNonPlayableCorner, getLegalMoves } from '../../utils/game';

interface BoardProps {
  gameId?: string;
  onGameIdChange?: (gameId: string) => void;
  onGameUpdate?: () => void;
}


const Board: Component<BoardProps> = (props) => {

  const [hoveredCell, setHoveredCell] = createSignal<Point | null>(null);
  const [pieces, setPieces] = createSignal<Piece[]>([]);
  const [pickedUpPiece, setPickedUpPiece] = createSignal<Piece | null>(null);
  const [legalMoves, setLegalMoves] = createSignal<LegalMove[]>([]);
  const [isDragging, setIsDragging] = createSignal(false);
  const [currentMoveIndex, setCurrentMoveIndex] = createSignal(0);
  const [fen, setFen] = createSignal<string>('R-0,0,0,0-1,1,1,1-1,1,1,1-0,0,0,0-0-3yRyNyByKyQyByNyR3/3yPyPyPyPyPyPyPyP3/14/bRbP10gPgR/bNbP10gPgN/bBbP10gPgB/bQbP10gPgK/bKbP10gPgQ/bBbP10gPgB/bNbP10gPgN/bRbP10gPgR/14/3rPrPrPrPrPrPrPrP3/3rRrNrBrQrKrBrNrR3--,-,-,-');
  const [enPassantTargets, setEnPassantTargets] = createSignal<Record<NamedColor, {x: number, y: number, color: NamedColor} | null>>({
    'RED': null,
    'YELLOW': null,
    'BLUE': null,
    'GREEN': null
  });


  // Parse FEN and set up pieces when fen signal changes
  createEffect(on(fen, (currentFen) => {
    const parsedPieces = parseFen(currentFen);
    setPieces(parsedPieces);
    // update state
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
    console.log(`[handlePiecePickup] ${x}, ${y}`);
    
    const moves = getLegalMoves(piece, pieces(), { enPassantTarget: enPassantTargets() });
    setLegalMoves(moves);
    
    setPickedUpPiece(piece);
    setIsDragging(true);
  };

  const handlePieceDrop = () => {
    setPickedUpPiece(null);
    setLegalMoves([]);
    setIsDragging(false);
    setHoveredCell(null);
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
              legalMoves={legalMoves()}
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
