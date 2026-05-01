'use client';
import type { GameState } from '@ludo/game-logic-snakes';
import { LADDERS, SNAKES } from '@ludo/game-logic-snakes';
import { squareToCell } from '@/lib/snakes/boardLayout';
import { Pawn } from '@/components/visual/Pawn';
import { SnakeArt } from '@/components/visual/SnakeArt';
import { LadderArt } from '@/components/visual/LadderArt';

const CELL = 40;
const SIZE = CELL * 10;

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
          <LadderArt key={`l-${bottom}`}
            x1={a.col*CELL + CELL/2} y1={a.row*CELL + CELL/2}
            x2={b.col*CELL + CELL/2} y2={b.row*CELL + CELL/2}
          />
        );
      })}

      {Object.entries(SNAKES).map(([head, tail]) => {
        const a = squareToCell(Number(head));
        const b = squareToCell(tail);
        return (
          <SnakeArt key={`s-${head}`}
            x1={a.col*CELL + CELL/2} y1={a.row*CELL + CELL/2}
            x2={b.col*CELL + CELL/2} y2={b.row*CELL + CELL/2}
            length={Number(head) - tail}
            idSuffix={`${head}-${tail}`}
          />
        );
      })}

      {state.players.map((p, i) => {
        const sq = state.tokens[p.id]!;
        if (sq === 0) {
          return (
            <g key={p.id}>
              <Pawn color={p.color} cx={5 + i*15} cy={SIZE - 8} size={10} />
            </g>
          );
        }
        const c = squareToCell(sq);
        const cx = c.col*CELL + CELL/2 + (i - state.players.length/2) * 6;
        const cy = c.row*CELL + CELL/2 + 8;
        return (
          <g key={p.id}>
            <Pawn color={p.color} cx={cx} cy={cy} size={CELL*0.6} />
          </g>
        );
      })}
    </svg>
  );
}
