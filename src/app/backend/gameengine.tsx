import { player, cell, move, gamestate, board } from "./game";
import { evaluate } from "./heuristics";

export function initializeBoard(rows: number = 9, cols: number = 6): board {
    const newBoard: board = [];
    for (let i = 0; i < rows; i++) {
        const row: cell[] = [];
        for (let j = 0; j < cols; j++) {
            row.push({ rowIndex: i, colIndex: j, orb_count: 0, player: 'blank' });
        }
        newBoard.push(row);
    }
    return newBoard;
}

export function getCriticalMass(cell: cell, board: board): number {
    const maxRow = board.length - 1;
    const maxCol = board[0].length - 1;
    
    // Corners
    if ((cell.rowIndex === 0 || cell.rowIndex === maxRow) && 
        (cell.colIndex === 0 || cell.colIndex === maxCol)) {
        return 2;
    }
    // Edges
    else if (cell.rowIndex === 0 || cell.rowIndex === maxRow || 
             cell.colIndex === 0 || cell.colIndex === maxCol) {
        return 3;
    }
    // Inner cells
    else {
        return 4;
    }
}

export function isValidMove(board: board, move: move): boolean {
    const expected_row = move.row;
    const expected_col = move.col;

    const num_of_rows = board.length;
    const num_of_cols = board[0].length;
    
    // Check bounds
    if (expected_row < 0 || expected_row >= num_of_rows || 
        expected_col < 0 || expected_col >= num_of_cols) {
        return false;
    }
    
    // Check if cell is empty or belongs to current player
    const targetCell = board[expected_row][expected_col];
    return targetCell.player === move.player || targetCell.player === 'blank';
}

export function checkAndExplode(board: board, initialCell: cell): void {
    let queue: cell[] = [];
    const rowindex = initialCell.rowIndex;
    const colindex = initialCell.colIndex;
    queue.push(board[rowindex][colindex]);
    
    while (queue.length > 0) {
        const currentCell = queue.shift();
        if (!currentCell) continue;
        
        const currentRow = currentCell.rowIndex;
        const currentCol = currentCell.colIndex;
        
        const criticalMass = getCriticalMass(currentCell, board);
        
        if (board[currentRow][currentCol].orb_count >= criticalMass) {
            // Store the player before explosion
            const explodingPlayer = board[currentRow][currentCol].player;
            
            // Cell becomes empty after explosion
            board[currentRow][currentCol].orb_count = 0;
            board[currentRow][currentCol].player = 'blank';
            
            // Spread orbs to adjacent cells
            const allDirections = [[1, 0], [-1, 0], [0, 1], [0, -1]];
            for (const direction of allDirections) {
                const newRow = currentRow + direction[0];
                const newCol = currentCol + direction[1];
                
                if (newRow >= 0 && newRow < board.length && 
                    newCol >= 0 && newCol < board[0].length) {
                    
                    board[newRow][newCol].orb_count += 1;
                    board[newRow][newCol].player = explodingPlayer;
                    
                    // Check if this cell should explode
                    if (board[newRow][newCol].orb_count >= getCriticalMass(board[newRow][newCol], board)) {
                        queue.push(board[newRow][newCol]);
                    }
                }
            }
        }
    }
}

export function checkWinner(board: board): player {
  let redCount: number = 0;
  let blueCount: number = 0;
  let totalMoves: number = 0;

  for (const row of board) {
      for (const cell of row) {
          if (cell.player === 'red') {
              redCount += cell.orb_count;
          } else if (cell.player === 'blue') {
              blueCount += cell.orb_count;
          }
          if (cell.player !== 'blank') {
              totalMoves += cell.orb_count;
          }
      }
  }

  // Need at least 2 moves (one from each player) before declaring winner
  if (totalMoves < 2) {
      return 'blank';
  }

  // Game continues if both players have pieces
  if (redCount > 0 && blueCount > 0) {
      return 'blank';
  }
  // Winner is determined only after both have played
  else if (redCount > 0 && blueCount === 0) {
      return 'red';
  } else if (blueCount > 0 && redCount === 0) {
      return 'blue';
  } else {
      return 'blank';
  }
}

export function applyMove(state: gamestate, move: move): gamestate {
    // console.log('Applying move:', move);
    // console.log('Current game state:', state);
    
    // Deep copy the board
    const newBoard = JSON.parse(JSON.stringify(state.board)) as board;
    
    if (!isValidMove(newBoard, move)) {
        console.error('Invalid move attempted:', move);
        throw new Error("Invalid move");
    }
    
    // Apply the move
    newBoard[move.row][move.col].orb_count += 1;
    newBoard[move.row][move.col].player = move.player;
    
    // console.log('Board after adding orb:', newBoard);
    
    // Handle explosions
    checkAndExplode(newBoard, newBoard[move.row][move.col]);
    
    // console.log('Board after explosions:', newBoard);
    
    // Check for winner
    const newWinner: player = checkWinner(newBoard);

    const newState: gamestate = {
        board: newBoard,
        current_player: move.player === 'red' ? 'blue' : 'red',
        winner: newWinner
    };
    
    // console.log('New game state after move:', newState);
    return newState;
}

export function getLegalMoves(board: board, player: player): move[] {
    const moves: move[] = [];
    for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[0].length; c++) {
            if (isValidMove(board, { row: r, col: c, player })) {
                moves.push({ row: r, col: c, player });
            }
        }
    }
    return moves;
}

export function minimaxSearch(state: gamestate, depthLimit: number): [number, move | null] {
    const maximizingPlayer = state.current_player === 'blue'; // AI is Blue
    return alphaBeta(state, depthLimit, -Infinity, Infinity, maximizingPlayer);
}

function alphaBeta(
    state: gamestate,
    depth: number,
    alpha: number,
    beta: number,
    maximizingPlayer: boolean
): [number, move | null] {
    
    // Terminal conditions
    if (depth === 0 || state.winner !== 'blank') {
        return [evaluate(state, 'blue'), null];
    }

    const player = state.current_player;
    const moves = getLegalMoves(state.board, player);

    if (moves.length === 0) {
        return [evaluate(state, 'blue'), null];
    }

    let bestMove: move | null = null;

    if (maximizingPlayer) {
        let maxEval = -Infinity;
        for (const move of moves) {
            try {
                const newState = applyMove(state, move);
                const [evalScore] = alphaBeta(newState, depth - 1, alpha, beta, false);
                if (evalScore > maxEval) {
                    maxEval = evalScore;
                    bestMove = move;
                }
                alpha = Math.max(alpha, maxEval);
                if (beta <= alpha) break; // Alpha-beta pruning
            } catch (error) {
                console.error('Error in minimax for move:', move, error);
                continue;
            }
        }
        return [maxEval, bestMove];
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            try {
                const newState = applyMove(state, move);
                const [evalScore] = alphaBeta(newState, depth - 1, alpha, beta, true);
                if (evalScore < minEval) {
                    minEval = evalScore;
                    bestMove = move;
                }
                beta = Math.min(beta, minEval);
                if (beta <= alpha) break; // Alpha-beta pruning
            } catch (error) {
                console.error('Error in minimax for move:', move, error);
                continue;
            }
        }
        return [minEval, bestMove];
    }
}