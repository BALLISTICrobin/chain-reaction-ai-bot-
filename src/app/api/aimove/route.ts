import { NextResponse } from 'next/server';
import { applyMove } from '@/app/backend/gameengine';
import { minimaxSearch } from '@/app/backend/gameengine';

export async function POST(request: Request) {
  try {
    console.log('AI vs AI move request received');
    
    // Get current game state from request body
    const currentState = await request.json();
    
    // Validate game hasn't ended
    if (currentState.winner !== 'blank') {
      return NextResponse.json({ error: 'Game already ended' }, { status: 400 });
    }

    const TIMEOUT_MS = 5000;
    const currentPlayer = currentState.current_player;
    
    console.log(`AI ${currentPlayer} making move...`);
    console.time('AI move');
    
    const [, bestMove] = minimaxSearch(currentState, 3, currentPlayer, TIMEOUT_MS);
    
    console.timeEnd('AI move');

    if (!bestMove) {
      return NextResponse.json({ error: 'No valid moves' }, { status: 400 });
    }

    const newState = applyMove(currentState, bestMove);
    
    console.log(`AI ${currentPlayer} move applied:`, bestMove);
    
    return NextResponse.json(newState, { status: 200 });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}