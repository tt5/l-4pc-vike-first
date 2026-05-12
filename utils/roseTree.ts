import { RoseTree, RoseTreeNode, Move } from '../types/board';

// Generate unique ID for tree nodes
let nodeIdCounter = 0;
function generateNodeId(): string {
  return `node_${++nodeIdCounter}`;
}

// Create initial rose tree with root node
export function createRoseTree(): RoseTree {
  const rootNodeId = generateNodeId();
  const rootNode: RoseTreeNode = {
    id: rootNodeId,
    parentId: null,
    children: [],
    isRoot: true
  };

  const nodes = new Map<string, RoseTreeNode>();
  nodes.set(rootNodeId, rootNode);

  return {
    nodes,
    currentNodeId: rootNodeId,
    rootNodeId
  };
}

// Get current node from tree
export function getCurrentNode(tree: RoseTree): RoseTreeNode | undefined {
  return tree.nodes.get(tree.currentNodeId);
}

// Add a new move to the tree
export function addMove(tree: RoseTree, move: Move): string {
  const currentNode = getCurrentNode(tree);
  if (!currentNode) {
    throw new Error('Current node not found in tree');
  }

  const newNodeId = generateNodeId();
  const newNode: RoseTreeNode = {
    id: newNodeId,
    move,
    parentId: tree.currentNodeId,
    children: [],
    isRoot: false
  };

  // Add new node to tree
  tree.nodes.set(newNodeId, newNode);
  
  // Add as child to current node
  currentNode.children.push(newNodeId);
  
  // Update current position to new node
  tree.currentNodeId = newNodeId;

  return newNodeId;
}

// Navigate to parent node (undo)
export function navigateToParent(tree: RoseTree): boolean {
  const currentNode = getCurrentNode(tree);
  if (!currentNode || currentNode.parentId === null) {
    return false; // Cannot undo from root
  }

  tree.currentNodeId = currentNode.parentId;
  return true;
}

// Navigate to specific child node
export function navigateToChild(tree: RoseTree, childId: string): boolean {
  const currentNode = getCurrentNode(tree);
  if (!currentNode || !currentNode.children.includes(childId)) {
    return false;
  }

  tree.currentNodeId = childId;
  return true;
}

// Check if a move would create a new branch (different from existing children)
export function wouldCreateBranch(tree: RoseTree, move: Move): boolean {
  const currentNode = getCurrentNode(tree);
  if (!currentNode || currentNode.children.length === 0) {
    return false;
  }

  // Check if any existing child has the same move
  return !currentNode.children.some(childId => {
    const childNode = tree.nodes.get(childId);
    if (!childNode || !childNode.move) return false;
    
    return movesEqual(childNode.move, move);
  });
}

// Check if two moves are equal
function movesEqual(move1: Move, move2: Move): boolean {
  return move1.fromX === move2.fromX &&
         move1.fromY === move2.fromY &&
         move1.toX === move2.toX &&
         move1.toY === move2.toY &&
         move1.type === move2.type;
}

// Get move history from root to current node
export function getMoveHistory(tree: RoseTree): Move[] {
  const history: Move[] = [];
  let currentNodeId = tree.currentNodeId;

  while (currentNodeId !== null) {
    const node = tree.nodes.get(currentNodeId);
    if (!node) break;

    if (node.move) {
      history.unshift(node.move);
    }

    currentNodeId = node.parentId;
  }

  return history;
}

// Get all moves from current node (for redo functionality)
export function getChildMoves(tree: RoseTree): Move[] {
  const currentNode = getCurrentNode(tree);
  if (!currentNode) return [];

  return currentNode.children
    .map(childId => tree.nodes.get(childId))
    .filter((node): node is RoseTreeNode => node !== undefined && node.move !== undefined)
    .map(node => node.move!);
}
