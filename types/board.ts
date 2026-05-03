
export type Point = [number, number] & { readonly __brand: 'Point' };
export function createPoint(x: number, y: number): Point {
  return [x, y] as Point;
}

export type SquareIndex = number & { readonly __brand: 'SquareIndex' };
export type LegalSquares = SquareIndex[];

export type Direction = 'up' | 'down' | 'left' | 'right';

export type PieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';

export type NamedColor = 'RED' | 'BLUE' | 'YELLOW' | 'GREEN'
export type HexColor = '#F44336' | '#2196F3' | '#FFEB3B' | '#4CAF50'
export type Color = NamedColor | HexColor

export interface Piece {
  readonly id: number;
  x: number;
  y: number;
  color: NamedColor;
  pieceType: PieceType;
  team: 1 | 2; // 1 for team 1 (red/yellow), 2 for team 2 (blue/green)
  hasMoved?: boolean;
}

type MoveType = 'normal' | 'capture' | 'kcastle' | 'qcastle' | 'enpassant' | 'qpromotion'

export interface Move {
  type: MoveType;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  captured?: Piece;
  oldKCastleRights?: boolean;
  oldQCastleRights?: boolean;
}

interface CapturedPiece {
    x: number;
    y: number;
    color: NamedColor;
    pieceType: PieceType;
}

export interface LegalMove {
  x: number;
  y: number;
  canCapture: boolean;
  isCastle?: boolean;
  castleType?: 'KING_SIDE' | 'QUEEN_SIDE' | null;
  isEnPassant?: boolean;
  capturedPiece?: CapturedPiece;
}
