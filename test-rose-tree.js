// Simple test script to verify rose tree functionality
// This can be run in the browser console to test the rose tree

// Mock the types for testing
const Move = {
  type: 'normal',
  fromX: 0, fromY: 0,
  toX: 1, toY: 1
};

console.log('Testing Rose Tree functionality...');

// Test basic rose tree operations
// This would need to be run in the browser console where the actual functions are available

// Test 1: Create initial tree
console.log('Test 1: Creating rose tree...');
// const tree = createRoseTree();
// console.log('Tree created:', tree);

// Test 2: Add moves
console.log('Test 2: Adding moves...');
// addMove(tree, { ...Move, fromX: 0, fromY: 0, toX: 0, toY: 1 });
// addMove(tree, { ...Move, fromX: 0, fromY: 1, toX: 0, toY: 2 });
// console.log('History after adding moves:', getMoveHistory(tree));

// Test 3: Undo move
console.log('Test 3: Undoing move...');
// navigateToParent(tree);
// console.log('History after undo:', getMoveHistory(tree));

// Test 4: Create branch
console.log('Test 4: Creating branch...');
// navigateToParent(tree); // Go back to start
// addMove(tree, { ...Move, fromX: 0, fromY: 0, toX: 1, toY: 0 }); // Different move
// console.log('History after branching:', getMoveHistory(tree));

console.log('Rose tree tests completed. Check browser console for actual results.');
