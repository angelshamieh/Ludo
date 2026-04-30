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

const Pip = ({ row, col }: { row: number; col: number }) => {
  // 3x3 pip grid centered inside a 60x60 SVG viewBox.
  const cx = 14 + col * 16;
  const cy = 14 + row * 16;
  return (
    <g>
      {/* Outer rim — gives the "well" indented look */}
      <circle cx={cx} cy={cy} r={4.5} fill="url(#pipWell)"/>
      {/* Dark inner pip */}
      <circle cx={cx} cy={cy} r={3.2} fill="#2a2014"/>
      {/* Tiny highlight near bottom-right of the well */}
      <circle cx={cx + 1.2} cy={cy + 1.2} r={0.7} fill="#ffffff66"/>
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

  return (
    <div className="relative" style={{ perspective: '400px' }}>
      {ready && (
        <span aria-hidden
          className="absolute inset-0 rounded-2xl bg-honey/60 animate-ping" />
      )}
      <button
        onClick={handleClick}
        disabled={disabled || isRolling}
        aria-label="Roll dice"
        className={`relative w-20 h-20 rounded-2xl
          active:scale-95 transition-transform duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isRolling ? 'animate-[wiggle_0.18s_ease-in-out_infinite]' : ''}`}
        style={{
          // Layered effects:
          //  - outer drop shadow (lifts dice off the page)
          //  - bottom-edge inset shadow (darker bottom, simulates ambient occlusion)
          //  - top-edge inset highlight (lighter top, simulates light from above)
          background: 'linear-gradient(160deg, #ffffff 0%, #fbf3df 55%, #efdfb4 100%)',
          boxShadow: [
            '0 6px 12px -2px rgba(58, 46, 31, 0.30)',  // big soft shadow under
            '0 2px 4px rgba(58, 46, 31, 0.20)',         // tighter shadow for closer surface
            'inset 0 -3px 0 rgba(184, 156, 90, 0.45)',  // bottom edge "thickness"
            'inset 0 1px 0 rgba(255, 255, 255, 0.9)',   // top edge highlight
          ].join(', '),
          transform: 'rotateX(8deg) rotateY(-4deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        <svg viewBox="0 0 60 60" className="w-full h-full">
          <defs>
            <radialGradient id="pipWell" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#5a4530"/>
              <stop offset="65%" stopColor="#3a2e1f"/>
              <stop offset="100%" stopColor="#d8c8a3"/>
            </radialGradient>
          </defs>
          {displayValue ? (
            PIPS[displayValue]!.map(([r, c], i) => (
              <Pip key={i} row={r} col={c} />
            ))
          ) : (
            // Idle face: 3 small faded dots — "tap to roll"
            <g opacity={0.40}>
              <circle cx={18} cy={30} r={3.5} fill="#3a2e1f"/>
              <circle cx={30} cy={30} r={3.5} fill="#3a2e1f"/>
              <circle cx={42} cy={30} r={3.5} fill="#3a2e1f"/>
            </g>
          )}
        </svg>
      </button>
    </div>
  );
}
