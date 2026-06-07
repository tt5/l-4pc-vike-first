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

  const branching = currentNode.children.length > 0;

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

  console.log(`[RoseTree] addMove → node ${newNodeId} (${move.type} ${String.fromCharCode(97+move.fromX)}${14-move.fromY}-${String.fromCharCode(97+move.toX)}${14-move.toY})${branching ? ' ⚡ BRANCH created' : ''}`);
  console.log(`[RoseTree]   parent: ${newNode.parentId} | siblings: ${currentNode.children.length} | depth: ${getDepth(tree, newNodeId)}`);
  logTreeStats(tree);

  return newNodeId;
}

// Navigate to parent node (undo)
export function navigateToParent(tree: RoseTree): boolean {
  const currentNode = getCurrentNode(tree);
  if (!currentNode || currentNode.parentId === null) {
    return false; // Cannot undo from root
  }

  const fromId = tree.currentNodeId;
  const fromMove = currentNode.move;
  const notation = fromMove ? `${String.fromCharCode(97+fromMove.fromX)}${14-fromMove.fromY}-${String.fromCharCode(97+fromMove.toX)}${14-fromMove.toY}` : 'root';

  tree.currentNodeId = currentNode.parentId;

  const parentChildren = getCurrentNode(tree)!.children;
  if (parentChildren.length > 1) {
    const siblings = parentChildren.map(id => {
      const n = tree.nodes.get(id);
      const m = n?.move;
      return m ? `${String.fromCharCode(97+m.fromX)}${14-m.fromY}-${String.fromCharCode(97+m.toX)}$${14-m.toY}` : 'root';
    });
    console.log(`[RoseTree] navigateToParent ← node ${fromId} (${notation}) [branch point: ${parentChildren.length} variations]`);
    console.log(`[RoseTree]   sibling variations at this position: ${siblings.join(', ')}`);
  } else {
    console.log(`[RoseTree] navigateToParent ← node ${fromId} (${notation})`);
  }

  return true;
}

// Navigate to specific child node
export function navigateToChild(tree: RoseTree, childId: string): boolean {
  const currentNode = getCurrentNode(tree);
  if (!currentNode || !currentNode.children.includes(childId)) {
    return false;
  }

  const fromId = tree.currentNodeId;
  tree.currentNodeId = childId;

  const childMove = tree.nodes.get(childId)?.move;
  const notation = childMove ? `${String.fromCharCode(97+childMove.fromX)}${14-childMove.fromY}-${String.fromCharCode(97+childMove.toX)}${14-childMove.toY}` : 'root';
  console.log(`[RoseTree] navigateToChild → node ${childId} (${notation}) [${currentNode.children.length} children at parent]`);

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

// ── Debug helpers ─────────────────────────────────────────────────────────────

// Get depth of a node from root
function getDepth(tree: RoseTree, nodeId: string): number {
  let depth = 0;
  let current = tree.nodes.get(nodeId);
  while (current && current.parentId !== null) {
    depth++;
    current = tree.nodes.get(current.parentId);
  }
  return depth;
}

// Count total branches (nodes with >1 children)
function countBranches(tree: RoseTree): number {
  let count = 0;
  tree.nodes.forEach(node => {
    if (node.children.length > 1) count++;
  });
  return count;
}

// Log compact tree statistics
export function logTreeStats(tree: RoseTree): void {
  const totalNodes = tree.nodes.size;
  const branches = countBranches(tree);
  const maxChildren = Math.max(...Array.from(tree.nodes.values()).map(n => n.children.length));
  const leafCount = Array.from(tree.nodes.values()).filter(n => n.children.length === 0).length;
  const currentDepth = getDepth(tree, tree.currentNodeId);

  console.log(`[RoseTree] 📊 stats: ${totalNodes} nodes | depth: ${currentDepth} | branches: ${branches} | max variations/node: ${maxChildren} | leaves: ${leafCount}`);
}

// Log the full tree structure (ASCII)
export function logTree(tree: RoseTree, nodeId?: string, prefix = '', isLast = true): void {
  const id = nodeId ?? tree.rootNodeId;
  const node = tree.nodes.get(id);
  if (!node) return;

  const connector = prefix === '' ? '🌳' : (isLast ? '└── ' : '├── ');
  const moveNotation = node.move
    ? `${String.fromCharCode(97 + node.move.fromX)}${14 - node.move.fromY}-${String.fromCharCode(97 + node.move.toX)}${14 - node.move.toY}`
    : '(root)';
  const branchMarker = node.children.length > 1 ? ` ⚡×${node.children.length}` : '';
  const currentMarker = id === tree.currentNodeId ? ' ◀ current' : '';

  console.log(`${prefix}${connector}[${id}] ${moveNotation}${branchMarker}${currentMarker}`);

  const extension = prefix === '' ? '' : (isLast ? '    ' : '│   ');
  node.children.forEach((childId, i) => {
    logTree(tree, childId, prefix + extension, i === node.children.length - 1);
  });
}
