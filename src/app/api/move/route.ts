import { NextResponse } from 'next/server';
import { applyMove } from '@/app/backend/gameengine';
import { minimaxSearch } from '@/app/backend/gameengine';

export async function POST(request: Request) {
  try {
    console.log('AI move request received');
    
    // Get the current game state from request body (sent from frontend)
    const currentState = await request.json();
    
    // Validate it's the AI's turn (blue player)
    if (currentState.current_player !== 'blue') {
      return NextResponse.json({ error: 'Not AI\'s turn' }, { status: 400 });
    }

    // Validate game hasn't ended
    if (currentState.winner !== 'blank') {
      return NextResponse.json({ error: 'Game already ended' }, { status: 400 });
    }

    // const TIMEOUT_MS = 6000;
    
    console.log('Starting minimax search...');
    console.time('AI move');
    
    const [, bestMove] = minimaxSearch(currentState, 3, 'blue');
    
    console.timeEnd('AI move');

    if (!bestMove) {
      return NextResponse.json({ error: 'No valid moves' }, { status: 400 });
    }

    const newState = applyMove(currentState, bestMove);
    
    console.log('AI move applied:', bestMove);
    
    return NextResponse.json(newState, { status: 200 });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
