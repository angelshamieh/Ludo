'use client';
import { useState, useEffect } from 'react';

const PIPS: Record<number, [number, number][]> = {
  1: [[1,1]],
  2: [[0,0],[2,2]],
  3: [[0,0],[1,1],[2,2]],
  4: [[0,0],[0,2],[2,0],[2,2]],
  5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,1],[0,2],[2,0],[2,1],[2,2]],
};

// One pip: a small dark "well" with subtle highlight rim. Looks indented.
const Pip = ({ row, col }: { row: number; col: number }) => {
  // Pip cells are laid out on a 3x3 grid inside a 60x60 face.
  const cx = 14 + col * 16;
  const cy = 14 + row * 16;
  return (
    <g>
      {/* Outer rim — slightly lighter, gives the well shape */}
      <circle cx={cx} cy={cy} r={4.5} fill="url(#pipWell)"/>
      {/* Inner pip dot — dark, slightly offset to suggest light from upper-left */}
      <circle cx={cx + 0.4} cy={cy + 0.4} r={3} fill="#2a2014"/>
      {/* Tiny shine on the bottom-right of the pip (light bouncing inside the well) */}
      <circle cx={cx + 1} cy={cy + 1} r={0.8} fill="#ffffff55"/>
    </g>
  );
};

export function Dice({ value, onRoll, disabled }: {
  value: number | null;
  onRoll: () => void;
  disabled: boolean;
  rolling?: boolean;
}) {
  const [rollFace, setRollFace] = useState<number | null>(null);
  const isRolling = rollFace !== null;

  useEffect(() => {
    if (!isRolling) return;
    const tick = setInterval(() => {
      setRollFace(1 + Math.floor(Math.random() * 6));
    }, 80);
    const stop = setTimeout(() => {
      clearInterval(tick);
      setRollFace(null);
      onRoll();
    }, 600);
    return () => { clearInterval(tick); clearTimeout(stop); };
  }, [isRolling, onRoll]);

  const handleClick = () => {
    if (disabled || isRolling) return;
    setRollFace(1 + Math.floor(Math.random() * 6));
  };

  const displayValue = isRolling ? rollFace : value;
  const ready = !disabled && value === null && !isRolling;

  // Visual constants — keep the 2 SVG views in sync
  const FACE = 80;       // top face is FACE x FACE
  const DEPTH = 8;       // perceived "depth" of the cube on right & bottom
  const W = FACE + DEPTH;
  const H = FACE + DEPTH;

  return (
    <div className="relative">
      {ready && (
        <span aria-hidden
          className="absolute inset-2 rounded-2xl bg-honey/60 animate-ping" />
      )}
      <button
        onClick={handleClick}
        disabled={disabled || isRolling}
        aria-label="Roll dice"
        className={`relative w-24 h-24 active:scale-95 transition-transform duration-100
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isRolling ? 'animate-[wiggle_0.18s_ease-in-out_infinite]' : ''}`}
        style={{ filter: 'drop-shadow(0 4px 6px rgba(58, 46, 31, 0.25))' }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
          <defs>
            {/* Top face gradient — light cream to warm white */}
            <linearGradient id="topFace" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff"/>
              <stop offset="100%" stopColor="#f5e6c4"/>
            </linearGradient>
            {/* Right side face — darker warm */}
            <linearGradient id="rightFace" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d8b97a"/>
              <stop offset="100%" stopColor="#a8884c"/>
            </linearGradient>
            {/* Bottom face — even darker */}
            <linearGradient id="bottomFace" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b89c5a"/>
              <stop offset="100%" stopColor="#8b6f47"/>
            </linearGradient>
            {/* Pip "well" gradient — lighter rim around dark center */}
            <radialGradient id="pipWell" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#5a4530"/>
              <stop offset="60%" stopColor="#3a2e1f"/>
              <stop offset="100%" stopColor="#beae89"/>
            </radialGradient>
          </defs>

          {/* Right side face (parallelogram) */}
          <path
            d={`M ${FACE},0 L ${W},${DEPTH} L ${W},${FACE} L ${FACE},${FACE} Z`}
            fill="url(#rightFace)"
          />

          {/* Bottom face (parallelogram) */}
          <path
            d={`M 0,${FACE} L ${FACE},${FACE} L ${W},${H} L ${DEPTH},${H} Z`}
            fill="url(#bottomFace)"
          />

          {/* Top face — main rounded square that shows the pips */}
          <rect
            x={0} y={0} width={FACE} height={FACE} rx={12} ry={12}
            fill="url(#topFace)"
            stroke="#c8b18a" strokeWidth={1}
          />

          {/* Pips on top face — using a 3x3 grid inside a 60x60 sub-area centered at (40, 40) */}
          <g transform={`translate(${(FACE - 60) / 2} ${(FACE - 60) / 2})`}>
            {displayValue ? (
              PIPS[displayValue]!.map(([r, c], i) => (
                <Pip key={i} row={r} col={c} />
              ))
            ) : (
              // Idle face: 3 small faded dots
              <g opacity={0.35}>
                <circle cx={14} cy={30} r={4} fill="#3a2e1f"/>
                <circle cx={30} cy={30} r={4} fill="#3a2e1f"/>
                <circle cx={46} cy={30} r={4} fill="#3a2e1f"/>
              </g>
            )}
          </g>
        </svg>
      </button>
    </div>
  );
}
