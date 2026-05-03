
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
}

type MoveType = 'normal' | 'capture' | 'castle' | 'enpassant' | 'promotion'

interface SimpleMove {
  fromX: number;
  fromY: number;  
  toX: number;
  toY: number;
}

export interface Move {
  type: MoveType;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  rookMove: SimpleMove;
  captured: Piece;
  promotion: boolean;
}
