'use client';
import type { GameState, Color, Token } from '@ludo/game-logic';
import {
  BOARD_TRACK, BOARD_HOME_SLOTS, BOARD_FINAL_RUN, CENTER, tokenCell,
} from '@/lib/boardLayout';
import { SAFE_ABSOLUTE_SQUARES } from '@ludo/game-logic';

const CELL = 36;     // base cell size in SVG units
const SIZE = CELL * 15;

const colorFill: Record<Color, string> = {
  red: '#e8a3a3', green: '#a3c9a8', yellow: '#f0d896', blue: '#a3b8d6',
};
const colorStroke: Record<Color, string> = {
  red: '#a17070', green: '#6a8c70', yellow: '#b89c5a', blue: '#6f88aa',
};

export function Board({ state, onTokenClick, hintTokenIds }: {
  state: GameState;
  onTokenClick?: (tokenId: string) => void;
  hintTokenIds?: ReadonlySet<string>;
}) {
  const allTokens: Token[] = Object.values(state.tokens).flat();
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full max-w-[640px] aspect-square select-none"
      role="img"
      aria-label="Ludo board"
    >
      {/* Outer frame */}
      <rect x={0} y={0} width={SIZE} height={SIZE} rx={14} fill="#fdf6ec" stroke="#8b6f47" strokeWidth={2}/>

      {/* Color quadrants */}
      <rect x={0}            y={0}            width={CELL*6} height={CELL*6} fill={colorFill.red}    rx={10}/>
      <rect x={CELL*9}       y={0}            width={CELL*6} height={CELL*6} fill={colorFill.green}  rx={10}/>
      <rect x={CELL*9}       y={CELL*9}       width={CELL*6} height={CELL*6} fill={colorFill.yellow} rx={10}/>
      <rect x={0}            y={CELL*9}       width={CELL*6} height={CELL*6} fill={colorFill.blue}   rx={10}/>

      {/* Track squares */}
      {BOARD_TRACK.map((c, abs) => (
        <rect
          key={`tr-${abs}`}
          x={c.col*CELL+1} y={c.row*CELL+1}
          width={CELL-2} height={CELL-2}
          rx={6}
          fill={SAFE_ABSOLUTE_SQUARES.has(abs) ? '#fef3c7' : '#fff'}
          stroke="#c8b18a" strokeWidth={1}
        />
      ))}

      {/* Final-run lanes (color tinted) */}
      {(['red','green','yellow','blue'] as const).map((color) => (
        BOARD_FINAL_RUN[color].map((c, i) => (
          <rect key={`fr-${color}-${i}`}
            x={c.col*CELL+1} y={c.row*CELL+1}
            width={CELL-2} height={CELL-2}
            rx={6}
            fill={colorFill[color]} stroke={colorStroke[color]} strokeWidth={1} opacity={0.85}
          />
        ))
      ))}

      {/* Center finish (4 colored triangles) */}
      <polygon points={`${CENTER.col*CELL},${CENTER.row*CELL} ${(CENTER.col+1)*CELL},${CENTER.row*CELL} ${(CENTER.col+0.5)*CELL},${(CENTER.row+0.5)*CELL}`} fill={colorFill.red} stroke={colorStroke.red}/>
      <polygon points={`${(CENTER.col+1)*CELL},${CENTER.row*CELL} ${(CENTER.col+1)*CELL},${(CENTER.row+1)*CELL} ${(CENTER.col+0.5)*CELL},${(CENTER.row+0.5)*CELL}`} fill={colorFill.green} stroke={colorStroke.green}/>
      <polygon points={`${(CENTER.col+1)*CELL},${(CENTER.row+1)*CELL} ${CENTER.col*CELL},${(CENTER.row+1)*CELL} ${(CENTER.col+0.5)*CELL},${(CENTER.row+0.5)*CELL}`} fill={colorFill.yellow} stroke={colorStroke.yellow}/>
      <polygon points={`${CENTER.col*CELL},${(CENTER.row+1)*CELL} ${CENTER.col*CELL},${CENTER.row*CELL} ${(CENTER.col+0.5)*CELL},${(CENTER.row+0.5)*CELL}`} fill={colorFill.blue} stroke={colorStroke.blue}/>

      {/* Home circles (the 4 nests) */}
      {(['red','green','yellow','blue'] as const).map((color) => (
        BOARD_HOME_SLOTS[color].map((c, i) => (
          <circle key={`hs-${color}-${i}`}
            cx={c.col*CELL + CELL/2} cy={c.row*CELL + CELL/2}
            r={CELL*0.45}
            fill="#fff" stroke={colorStroke[color]} strokeWidth={1.5}/>
        ))
      ))}

      {/* Tokens */}
      {allTokens.map((t) => {
        const c = tokenCell(t);
        const cx = c.col*CELL + CELL/2;
        const cy = c.row*CELL + CELL/2;
        const isHinted = hintTokenIds?.has(t.id);
        return (
          <g key={t.id}
             onClick={onTokenClick ? () => onTokenClick(t.id) : undefined}
             style={{ cursor: onTokenClick ? 'pointer' : 'default' }}
          >
            {/* extended invisible hit-area for mobile */}
            <circle cx={cx} cy={cy} r={CELL*0.7} fill="transparent" />
            <circle
              cx={cx} cy={cy} r={CELL*0.32}
              fill={colorFill[t.color]} stroke={colorStroke[t.color]} strokeWidth={2}
            />
            {isHinted && (
              <circle cx={cx} cy={cy} r={CELL*0.42} fill="none" stroke="#3a2e1f" strokeWidth={2}
                strokeDasharray="4 3">
                <animate attributeName="stroke-dashoffset" from="0" to="14" dur="0.8s" repeatCount="indefinite"/>
              </circle>
            )}
          </g>
        );
      })}
    </svg>
  );
}
