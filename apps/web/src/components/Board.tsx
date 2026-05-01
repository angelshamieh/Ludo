'use client';
import type { GameState, Color, Token } from '@ludo/game-logic-ludo';
import {
  BOARD_TRACK, BOARD_HOME_SLOTS, BOARD_FINAL_RUN, CENTER, tokenCell,
} from '@/lib/boardLayout';
import { SAFE_ABSOLUTE_SQUARES } from '@ludo/game-logic-ludo';

const CELL = 36;     // base cell size in SVG units
const SIZE = CELL * 15;

// Light pastels for the quadrant backgrounds
const quadrantFill: Record<Color, string> = {
  red: '#e8a3a3', green: '#a3c9a8', yellow: '#f0d896', blue: '#a3b8d6',
};
// Stronger tones for tokens — match the Tailwind theme tokens (rust/sage/honey/sky)
const tokenFill: Record<Color, string> = {
  red: '#c97a7a', green: '#7eaa83', yellow: '#d8b86a', blue: '#7d9ec5',
};
const tokenStroke: Record<Color, string> = {
  red: '#8c5252', green: '#557560', yellow: '#9c7e3b', blue: '#516f93',
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
      <rect x={0}            y={0}            width={CELL*6} height={CELL*6} fill={quadrantFill.red}    rx={10}/>
      <rect x={CELL*9}       y={0}            width={CELL*6} height={CELL*6} fill={quadrantFill.green}  rx={10}/>
      <rect x={CELL*9}       y={CELL*9}       width={CELL*6} height={CELL*6} fill={quadrantFill.yellow} rx={10}/>
      <rect x={0}            y={CELL*9}       width={CELL*6} height={CELL*6} fill={quadrantFill.blue}   rx={10}/>

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
            fill={quadrantFill[color]} stroke={tokenStroke[color]} strokeWidth={1} opacity={0.85}
          />
        ))
      ))}

      {/* Center finish (4 colored triangles) */}
      <polygon points={`${CENTER.col*CELL},${CENTER.row*CELL} ${(CENTER.col+1)*CELL},${CENTER.row*CELL} ${(CENTER.col+0.5)*CELL},${(CENTER.row+0.5)*CELL}`} fill={quadrantFill.red} stroke={tokenStroke.red}/>
      <polygon points={`${(CENTER.col+1)*CELL},${CENTER.row*CELL} ${(CENTER.col+1)*CELL},${(CENTER.row+1)*CELL} ${(CENTER.col+0.5)*CELL},${(CENTER.row+0.5)*CELL}`} fill={quadrantFill.green} stroke={tokenStroke.green}/>
      <polygon points={`${(CENTER.col+1)*CELL},${(CENTER.row+1)*CELL} ${CENTER.col*CELL},${(CENTER.row+1)*CELL} ${(CENTER.col+0.5)*CELL},${(CENTER.row+0.5)*CELL}`} fill={quadrantFill.yellow} stroke={tokenStroke.yellow}/>
      <polygon points={`${CENTER.col*CELL},${(CENTER.row+1)*CELL} ${CENTER.col*CELL},${CENTER.row*CELL} ${(CENTER.col+0.5)*CELL},${(CENTER.row+0.5)*CELL}`} fill={quadrantFill.blue} stroke={tokenStroke.blue}/>

      {/* Home circles (the 4 nests) */}
      {(['red','green','yellow','blue'] as const).map((color) => (
        BOARD_HOME_SLOTS[color].map((c, i) => (
          <circle key={`hs-${color}-${i}`}
            cx={c.col*CELL + CELL/2} cy={c.row*CELL + CELL/2}
            r={CELL*0.45}
            fill="#fff" stroke={tokenStroke[color]} strokeWidth={1.5}/>
        ))
      ))}

      {/* Tokens */}
      {allTokens.map((t) => {
        const c = tokenCell(t);
        const cx = c.col*CELL + CELL/2;
        const cy = c.row*CELL + CELL/2;
        const isHinted = hintTokenIds?.has(t.id);
        // Sparkle "+" shape, used for the rotating sparkles
        const sparklePath = (sx: number, sy: number, size: number) =>
          `M ${sx} ${sy - size} L ${sx + size*0.25} ${sy - size*0.25} L ${sx + size} ${sy} L ${sx + size*0.25} ${sy + size*0.25} L ${sx} ${sy + size} L ${sx - size*0.25} ${sy + size*0.25} L ${sx - size} ${sy} L ${sx - size*0.25} ${sy - size*0.25} Z`;
        return (
          <g key={t.id}
             onClick={onTokenClick && isHinted ? () => onTokenClick(t.id) : undefined}
             style={{ cursor: onTokenClick && isHinted ? 'pointer' : 'default' }}
          >
            {/* Extended invisible hit-area for mobile taps */}
            <circle cx={cx} cy={cy} r={CELL*0.7} fill="transparent" style={{ pointerEvents: 'all' }} />

            {/* Bright white glow halo behind the token */}
            {isHinted && (
              <circle cx={cx} cy={cy} r={CELL*0.6} fill="#fff" opacity={0.55} style={{ pointerEvents: 'none' }}>
                <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.2s" repeatCount="indefinite"/>
                <animate attributeName="r" values={`${CELL*0.55};${CELL*0.7};${CELL*0.55}`} dur="1.2s" repeatCount="indefinite"/>
              </circle>
            )}

            {/* Soft amber aura just behind/around the token */}
            {isHinted && (
              <circle cx={cx} cy={cy} r={CELL*0.5} fill="#fbbf24" opacity={0.5} style={{ pointerEvents: 'none' }}>
                <animate attributeName="opacity" values="0.25;0.55;0.25" dur="1.2s" repeatCount="indefinite"/>
              </circle>
            )}

            {/* The token itself */}
            <circle
              cx={cx} cy={cy} r={CELL*0.36}
              fill={tokenFill[t.color]} stroke={tokenStroke[t.color]} strokeWidth={2}
            />

            {/* Rotating sparkles around the token */}
            {isHinted && (
              <g style={{ pointerEvents: 'none' }}>
                <animateTransform attributeName="transform" type="rotate"
                  from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`}
                  dur="4s" repeatCount="indefinite"/>
                {/* 4 sparkle stars at NE / NW / SE / SW */}
                <path d={sparklePath(cx + CELL*0.45, cy - CELL*0.45, CELL*0.13)}
                      fill="#fff" stroke="#f59e0b" strokeWidth={0.6}>
                  <animate attributeName="opacity" values="0.4;1;0.4" dur="1s" repeatCount="indefinite"/>
                </path>
                <path d={sparklePath(cx + CELL*0.45, cy + CELL*0.45, CELL*0.10)}
                      fill="#fff" stroke="#f59e0b" strokeWidth={0.5}>
                  <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite"/>
                </path>
                <path d={sparklePath(cx - CELL*0.45, cy + CELL*0.45, CELL*0.13)}
                      fill="#fff" stroke="#f59e0b" strokeWidth={0.6}>
                  <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
                </path>
                <path d={sparklePath(cx - CELL*0.45, cy - CELL*0.45, CELL*0.10)}
                      fill="#fff" stroke="#f59e0b" strokeWidth={0.5}>
                  <animate attributeName="opacity" values="1;0.4;1" dur="1.2s" repeatCount="indefinite"/>
                </path>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
