'use client';

import { useState, useCallback, useEffect } from 'react';
import { gamestate, move } from './backend/game';
import { initializeBoard, applyMove,getLegalMoves } from './backend/gameengine';
import { writeGameState } from './backend/filehandling';
import Board from './frontend/board';
import GameStatus from './frontend/gamestatus';
import { evaluate } from './backend/heuristics';

export default function Home() {
  const [gameState, setGameState] = useState<gamestate>({
    board: initializeBoard(),
    current_player: 'red',
    winner: 'blank',
  });

  const [isAiVsAi, setIsAiVsAi] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstAiMove, setFirstAiMove] = useState<boolean>(true);





  const handleAiMove = useCallback(async () => {
    if (!isAiVsAi || gameState.winner !== 'blank' || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      if (firstAiMove) {

        const legalMoves = getLegalMoves(gameState.board, gameState.current_player);
        if (legalMoves.length === 0) {
          console.warn('No legal moves available for AI');
          setError('No legal moves available for AI');
          setIsProcessing(false);
          return;
        }

        const newState: gamestate = applyMove(gameState, legalMoves[0]);
        setFirstAiMove(false);
        setGameState(newState);
        try {
          await writeGameState('gamestate.txt', 'AI1 Move:', newState);
        } catch (fileError) {
          console.warn('Failed to save game state:', fileError);
        }

      }
      const response = await fetch('/api/aimove', {
        method: 'POST' // Send current game state
      });

      if (response.ok) {
        const aiState = await response.json();
        console.log('AI move result:', aiState);
        setGameState(aiState);
      } else {
        const errorText = await response.text();
        console.error('API error:', errorText);
        setError('Failed to get AI move');
      }
    } catch (apiError) {
      console.error('Error calling AI API:', apiError);
      setError('Failed to get AI move. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [gameState, isAiVsAi, isProcessing]);

  //add useeeffect to handle AI vs AI mode
  useEffect(() => {
    if (isAiVsAi && gameState.winner === 'blank' && !isProcessing) {
      // Add small delay to make moves visible
      const timer = setTimeout(() => {

        handleAiMove();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [gameState.current_player, isAiVsAi, gameState.winner, isProcessing, handleAiMove]);
  

  const handleMove = useCallback(async (move: move) => {
    // Only allow human moves in human vs AI mode
    if (isAiVsAi || gameState.current_player !== 'red' || gameState.winner !== 'blank' || isProcessing) {
      console.log('Move blocked - invalid conditions');
      return;
    }

    setIsProcessing(true);
    setError(null);
    // let progressInterval: NodeJS.Timeout;
    // let dots = 0;

    // const updateProgress = () => {
    //   dots = (dots + 1) % 4;
    //   setError(`AI is thinking${'.'.repeat(dots)}`);
    // };

    // progressInterval = setInterval(updateProgress, 500);

    try {
      // Apply human move
      const newState = applyMove(gameState, move);
      setGameState(newState);

      // Save game state
      try {
        await writeGameState('gamestate.txt', 'Human Move:', newState);
      } catch (fileError) {
        console.warn('Failed to save game state:', fileError);
      }

      // Check if game ended after human move
      if (newState.winner !== 'blank') {
        console.log('Game ended after human move, winner:', newState.winner);
        setIsProcessing(false);
        return;
      }

      // AI's turn
      setTimeout(async () => {
        try {
          const response = await fetch('/api/move', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(newState),
          });

          if (response.ok) {
            const aiState = await response.json();
            setGameState(aiState);
          } else {
            const errorData = await response.text();
            console.error('API error:', errorData);
            setError('Failed to get AI move. Please try again.');
          }
        } catch (apiError) {
          console.error('Error calling AI API:', apiError);
          setError('Failed to get AI move. Please try again.');
        } finally {
          setIsProcessing(false);
        }
      }, 500);

    } catch (gameError) {
      console.error('Error applying move:', gameError);
      setError(`Invalid move: ${gameError instanceof Error ? gameError.message : 'Unknown error'}`);
      setIsProcessing(false);
    }
  }, [gameState, isProcessing, isAiVsAi]);
  

  const resetGame = useCallback(() => {
    setGameState({
      board: initializeBoard(),
      current_player: 'red',
      winner: 'blank',
    });
    setIsProcessing(false);
    setError(null);
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-200 to-base-300">
      {/* Header */}
      <div className="navbar bg-base-100 shadow-lg border-b border-base-300">
        <div className="navbar-start">
          <div className="text-xl font-bold text-primary">⚡ Chain Reaction</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-soft btn-warning"
            onClick={() => {
              resetGame(); // clean slate
              setIsAiVsAi(true); // then activate AI loop
            }}
            disabled={isProcessing}
          >
            🤖Ai vs 🤖Ai
          </button>

          <button
            className="btn btn-soft btn-warning"
            onClick={() => {
              resetGame(); // clean slate
              setIsAiVsAi(false); // then activate AI loop
            }}
            disabled={isProcessing}
          >
            human vs 🤖Ai
          </button>
        </div>
        <div className="navbar-end">
          <button
            className="btn btn-outline btn-sm"
            onClick={resetGame}
            disabled={isProcessing}
          >
            🔄 New Game
          </button>
        </div>

      </div>

      {/* Error Alert */}
      {error && (
        <div className="container mx-auto p-4 max-w-4xl">
          <div className="alert alert-error shadow-lg">
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
            <div className="flex-none">
              <button className="btn btn-sm btn-ghost" onClick={dismissError}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Hero Section */}
        <div className="hero py-8">
          <div className="hero-content text-center">
            <div className="max-w-md">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Chain Reaction
              </h1>
              <p className="py-4 text-base-content/70">
                Fill cells with orbs to trigger explosive chain reactions and dominate the board!
              </p>
            </div>
          </div>
        </div>
        {isProcessing && (
          <div className="spinner text-primary">🤖 Thinking...</div>
        )}

        {/* Game Status */}
        <GameStatus state={gameState} flag={isAiVsAi}/>

        {/* Game Board */}
        <Board state={gameState} onMove={handleMove} />

        {/* Game Rules */}
        <div className="mt-8">
          <div className="collapse collapse-arrow bg-base-100 shadow border border-base-300">
            <input type="checkbox" />
            <div className="collapse-title text-xl font-medium">
              📚 How to Play
            </div>
            <div className="collapse-content text-base-content/80">
              <div className="space-y-3">
                <p><strong>🎯 Objective:</strong> Eliminate all opponent pieces by triggering chain reactions.</p>
                <p><strong>🔴 Your Turn:</strong> Click on empty cells or your own pieces to add orbs.</p>
                <p><strong>💥 Chain Reaction:</strong> When a cell reaches its capacity (corner=2, edge=3, center=4), it explodes and spreads orbs to adjacent cells.</p>
                <p><strong>🎲 Strategy:</strong> Plan your moves to create cascading explosions that capture enemy territory!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {isProcessing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body items-center text-center">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="mt-2">
                  {gameState.current_player === 'blue' ? 'AI is thinking...' : 'Processing move...'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="footer footer-center p-4 bg-base-200 text-base-content border-t border-base-300 mt-8">
        <div>
          <p className="text-sm opacity-70">Built with Next.js, Tailwind CSS & DaisyUI</p>
        </div>
      </footer>
    </div>
  );
}