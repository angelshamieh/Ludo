'use client';
import type { GameState } from '@ludo/game-logic-snakes';
import { LADDERS, SNAKES } from '@ludo/game-logic-snakes';
import { squareToCell } from '@/lib/snakes/boardLayout';

const CELL = 40;
const SIZE = CELL * 10;

const colorFill: Record<string, string> = {
  red: '#c97a7a', green: '#7eaa83', yellow: '#d8b86a', blue: '#7d9ec5',
};

export function SnakesBoard({ state }: { state: GameState }) {
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full max-w-[640px] aspect-square select-none"
      role="img" aria-label="Snakes & Ladders board"
    >
      <rect x={0} y={0} width={SIZE} height={SIZE} rx={10} fill="#fdf6ec" stroke="#8b6f47" strokeWidth={2}/>

      {Array.from({ length: 100 }, (_, i) => {
        const sq = i + 1;
        const { col, row } = squareToCell(sq);
        const x = col * CELL;
        const y = row * CELL;
        const isLadder = LADDERS[sq] != null;
        const isSnake = SNAKES[sq] != null;
        const fill = isLadder ? '#dcefcd' : isSnake ? '#f8d4d4' : ((col + row) % 2 === 0 ? '#fff' : '#fbf3df');
        return (
          <g key={sq}>
            <rect x={x+1} y={y+1} width={CELL-2} height={CELL-2} rx={4}
              fill={fill} stroke="#c8b18a" strokeWidth={0.5}/>
            <text x={x+4} y={y+12} fontSize={9} fill="#8b6f47">{sq}</text>
          </g>
        );
      })}

      {Object.entries(LADDERS).map(([bottom, top]) => {
        const a = squareToCell(Number(bottom));
        const b = squareToCell(top);
        return (
          <line key={`l-${bottom}`}
            x1={a.col*CELL + CELL/2} y1={a.row*CELL + CELL/2}
            x2={b.col*CELL + CELL/2} y2={b.row*CELL + CELL/2}
            stroke="#8b6f47" strokeWidth={3} strokeLinecap="round"/>
        );
      })}

      {Object.entries(SNAKES).map(([head, tail]) => {
        const a = squareToCell(Number(head));
        const b = squareToCell(tail);
        const mx = (a.col + b.col) / 2 * CELL + CELL/2 + 15;
        const my = (a.row + b.row) / 2 * CELL + CELL/2;
        return (
          <path key={`s-${head}`}
            d={`M ${a.col*CELL + CELL/2} ${a.row*CELL + CELL/2}
                Q ${mx} ${my},
                  ${b.col*CELL + CELL/2} ${b.row*CELL + CELL/2}`}
            fill="none" stroke="#a13030" strokeWidth={3} strokeLinecap="round"/>
        );
      })}

      {state.players.map((p, i) => {
        const sq = state.tokens[p.id]!;
        if (sq === 0) {
          return (
            <circle key={p.id}
              cx={5 + i*15} cy={SIZE - 8}
              r={5} fill={colorFill[p.color]!} stroke="#3a2e1f" strokeWidth={1}/>
          );
        }
        const c = squareToCell(sq);
        const cx = c.col*CELL + CELL/2 + (i - state.players.length/2) * 6;
        const cy = c.row*CELL + CELL/2 + 8;
        return (
          <circle key={p.id} cx={cx} cy={cy} r={6}
            fill={colorFill[p.color]!} stroke="#3a2e1f" strokeWidth={1.5}/>
        );
      })}
    </svg>
  );
}
