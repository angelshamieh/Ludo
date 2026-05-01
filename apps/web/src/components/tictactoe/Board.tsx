'use client';
import type { GameState } from '@ludo/game-logic-tictactoe';
import { Pawn } from '@/components/visual/Pawn';
import { cellToCoords, CELL_SIZE, BOARD_PIXELS, GRID_DIM } from '@/lib/tictactoe/boardLayout';

export function TicTacToeBoard({ state, onCellClick, hintCells }: {
  state: GameState;
  onCellClick?: (cell: number) => void;
  hintCells?: ReadonlySet<number>;
}) {
  // Player → color mapping. First seat (X) = red, second (O) = blue.
  const xPlayer = state.players[0];
  const oPlayer = state.players[1];

  return (
    <svg
      viewBox={`0 0 ${BOARD_PIXELS} ${BOARD_PIXELS}`}
      className="w-full max-w-[480px] aspect-square select-none"
      style={{ filter: 'drop-shadow(0 6px 12px rgba(58, 46, 31, 0.20))' }}
      role="img"
      aria-label="Tic-Tac-Toe board"
    >
      {/* Surface */}
      <rect x={0} y={0} width={BOARD_PIXELS} height={BOARD_PIXELS}
        fill="#fdf6ec" stroke="#8b6f47" strokeWidth={2} rx={8} />

      {/* Grid lines */}
      {[1, 2].map((i) => (
        <g key={`grid-${i}`}>
          <line x1={i * CELL_SIZE} y1={4} x2={i * CELL_SIZE} y2={BOARD_PIXELS - 4}
            stroke="#c8b18a" strokeWidth={2} strokeLinecap="round" />
          <line x1={4} y1={i * CELL_SIZE} x2={BOARD_PIXELS - 4} y2={i * CELL_SIZE}
            stroke="#c8b18a" strokeWidth={2} strokeLinecap="round" />
        </g>
      ))}

      {/* 9 cells: hint highlight + click target */}
      {Array.from({ length: GRID_DIM * GRID_DIM }, (_, i) => {
        const { col, row } = cellToCoords(i);
        const x = col * CELL_SIZE;
        const y = row * CELL_SIZE;
        const isHinted = hintCells?.has(i) ?? false;
        const clickable = !!onCellClick && state.board[i] === '';
        return (
          <g key={`cell-${i}`}
             onClick={clickable ? () => onCellClick!(i) : undefined}
             style={{ cursor: clickable ? 'pointer' : 'default' }}>
            <rect x={x + 4} y={y + 4} width={CELL_SIZE - 8} height={CELL_SIZE - 8}
              rx={6}
              fill={isHinted ? '#fbbf2440' : 'transparent'}
              style={{ pointerEvents: 'all' }} />
            {isHinted && (
              <circle cx={x + CELL_SIZE/2} cy={y + CELL_SIZE/2} r={CELL_SIZE * 0.25}
                fill="none" stroke="#f59e0b" strokeWidth={2}
                strokeDasharray="6 5" strokeLinecap="round">
                <animate attributeName="stroke-dashoffset" from="0" to="22"
                  dur="1.2s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        );
      })}

      {/* Pawns at filled cells */}
      {state.board.map((mark, i) => {
        if (!mark) return null;
        const { col, row } = cellToCoords(i);
        const cx = col * CELL_SIZE + CELL_SIZE/2;
        const cy = row * CELL_SIZE + CELL_SIZE/2;
        const player = mark === 'X' ? xPlayer : oPlayer;
        if (!player) return null;
        return <Pawn key={`p-${i}`} color={player.color} cx={cx} cy={cy} size={CELL_SIZE * 0.5} />;
      })}
    </svg>
  );
}
