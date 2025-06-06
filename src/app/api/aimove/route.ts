import { NextResponse } from 'next/server';
import { readGameState,writeGameState } from '../../backend/filehandling';
import { applyMove } from '../../backend/gameengine';
import { minimaxSearch } from '../../backend/gameengine';// Adjust if minimax is in gameengine.tsx
import path from 'path';

export async function POST() {
  try {
    console.log('AI move request received');
    const filePath = path.join(process.cwd(), 'gamestate.txt'); // Absolute path

    const { header, state } = await readGameState(filePath,true);

    console.log('Current game header:', header);
    if (header !== 'AI1 Move:' && header !== 'AI2 Move:') {
      return NextResponse.json({ error: 'Not AI’s turn' }, { status: 400 });
    }
    const [, bestMove] = minimaxSearch(state, 3);
    if (!bestMove) {
      return NextResponse.json({ error: 'No valid moves' }, { status: 400 });
    }
    const nextHeader = header === 'AI1 Move:' ? 'AI2 Move:' : 'AI1 Move:';
    const newState = applyMove(state, bestMove);
    await writeGameState('gamestate.txt',nextHeader, newState);
    console.log('AI move applied:', bestMove);
    console.log('player after AI move:', newState.current_player);
    return NextResponse.json(newState, { status: 200 });
  } catch{
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}