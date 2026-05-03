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
import { createPoint, NamedColor, Piece, Point, LegalMove, Move } from '../../types/board';
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
  const [moves, setMoves] = createSignal<Move[]>([]);
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

  // Handle drops outside the board (scenario 4)
  onMount(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging()) {
        // Check if we have a hovered cell - if not, it's an outside drop
        if (!hoveredCell()) {
          resetDragState();
        }
      }
    };
    document.addEventListener('mouseup', handleGlobalMouseUp);
    onCleanup(() => document.removeEventListener('mouseup', handleGlobalMouseUp));
  });

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

  const handlePieceDrop = (targetPoint?: Point) => {
    const pickedUp = pickedUpPiece();
    if (!pickedUp) {
      resetDragState();
      return;
    }

    const from = createPoint(pickedUp.x, pickedUp.y);
    
    // Scenario 1: Drop on same square OR no target (cancel)
    if (!targetPoint || (targetPoint[0] === from[0] && targetPoint[1] === from[1])) {
      resetDragState();
      return;
    }

    const legalMove = legalMoves().find(m => m.x === targetPoint[0] && m.y === targetPoint[1]);
    
    // Scenario 3: Drop on illegal square (reject/cancel)
    if (!legalMove) {
      resetDragState();
      return;
    }

    // Scenario 2: Drop on legal target (execute move)
    executeMove(pickedUp, targetPoint, legalMove);
    resetDragState();
  };

  const resetDragState = () => {
    setPickedUpPiece(null);
    setLegalMoves([]);
    setIsDragging(false);
    setHoveredCell(null);
  };

  const isPromotionSquare = (color: NamedColor, x: number, y: number): boolean => {
    // Promotion squares are on the opposite side from starting position
    switch (color) {
      case 'RED': return y === 0 || y === 1 || y === 2; // Top rows
      case 'YELLOW': return y === 11 || y === 12 || y === 13; // Bottom rows
      case 'BLUE': return x === 11 || x === 12 || x === 13; // Right columns
      case 'GREEN': return x === 0 || x === 1 || x === 2; // Left columns
      default: return false;
    }
  };

  const executeMove = (piece: Piece, target: Point, legalMove: LegalMove) => {
    let moveType: Move['type'] = 'normal';
    let captured: Piece | undefined;

    // Determine move type
    if (legalMove.isCastle) {
      moveType = legalMove.castleType === 'KING_SIDE' ? 'kcastle' : 'qcastle';
    } else if (legalMove.isEnPassant && legalMove.capturedPiece) {
      moveType = 'enpassant';
      captured = pieces().find(p => 
        p.x === legalMove.capturedPiece!.x && 
        p.y === legalMove.capturedPiece!.y
      );
    } else if (legalMove.canCapture) {
      moveType = 'capture';
      captured = pieces().find(p => p.x === target[0] && p.y === target[1]);
    }

    // Check for promotion
    if (piece.pieceType === 'pawn' && isPromotionSquare(piece.color, target[0], target[1])) {
      moveType = 'qpromotion';
    }

    const newMove: Move = {
      type: moveType,
      fromX: piece.x,
      fromY: piece.y,
      toX: target[0],
      toY: target[1],
      captured,
      oldKCastleRights: true, // TODO: track actual castle rights
      oldQCastleRights: true
    };

    // Update pieces
    setPieces(prev => {
      let next = prev.map(p => {
        // Move the picked piece
        if (p.id === piece.id) {
          const isPromoting = moveType === 'qpromotion';
          return { 
            ...p, 
            x: target[0], 
            y: target[1], 
            hasMoved: true,
            pieceType: isPromoting ? 'queen' : p.pieceType
          };
        }
        
        // Handle castling rook move
        if (legalMove.isCastle && legalMove.castleType) {
          const rookMove = getRookMoveForCastle(piece.color, legalMove.castleType);
          if (p.pieceType === 'rook' && p.x === rookMove.fromX && p.y === rookMove.fromY) {
            return { ...p, x: rookMove.toX, y: rookMove.toY, hasMoved: true };
          }
        }
        
        return p;
      });
      
      // Remove captured piece (including en passant)
      if (captured) {
        next = next.filter(p => p.id !== captured!.id);
      } else if (legalMove.isEnPassant && legalMove.capturedPiece) {
        next = next.filter(p => !(p.x === legalMove.capturedPiece!.x && p.y === legalMove.capturedPiece!.y));
      }
      
      return next;
    });

    // Record move
    setMoves(prev => [...prev, newMove]);
    
    // Update en passant targets
    updateEnPassantTarget(piece, target[0], target[1]);
    
    // Advance turn
    setCurrentMoveIndex(prev => prev + 1);
  };

  const getRookMoveForCastle = (color: NamedColor, castleType: 'KING_SIDE' | 'QUEEN_SIDE') => {
    // King-side: rook moves from corner to king's destination - 1
    // Queen-side: rook moves from corner to king's destination + 1
    switch (color) {
      case 'RED':
        return castleType === 'KING_SIDE' 
          ? { fromX: 10, fromY: 13, toX: 9, toY: 13 }
          : { fromX: 3, fromY: 13, toX: 5, toY: 13 };
      case 'YELLOW':
        return castleType === 'KING_SIDE'
          ? { fromX: 3, fromY: 0, toX: 4, toY: 0 }
          : { fromX: 10, fromY: 0, toX: 8, toY: 0 };
      case 'BLUE':
        return castleType === 'KING_SIDE'
          ? { fromX: 0, fromY: 10, toX: 0, toY: 9 }
          : { fromX: 0, fromY: 3, toX: 0, toY: 5 };
      case 'GREEN':
        return castleType === 'KING_SIDE'
          ? { fromX: 13, fromY: 3, toX: 13, toY: 4 }
          : { fromX: 13, fromY: 10, toX: 13, toY: 8 };
    }
  };

  const updateEnPassantTarget = (piece: Piece, toX: number, toY: number) => {
    // Set en passant target if pawn moved 2 squares
    if (piece.pieceType === 'pawn') {
      const dx = Math.abs(toX - piece.x);
      const dy = Math.abs(toY - piece.y);
      if (dx === 2 || dy === 2) {
        // Target is the square the pawn skipped over
        const targetX = piece.x + (toX - piece.x) / 2;
        const targetY = piece.y + (toY - piece.y) / 2;
        setEnPassantTargets(prev => ({
          ...prev,
          [piece.color]: { x: targetX, y: targetY, color: piece.color }
        }));
        return;
      }
    }
    
    // Clear this color's en passant target after any move
    setEnPassantTargets(prev => ({
      ...prev,
      [piece.color]: null
    }));
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
              onPieceDrop={handlePieceDrop}
            />
          );
        })}
      </div>
      </div>
    </div>
  );
};

export default Board;
