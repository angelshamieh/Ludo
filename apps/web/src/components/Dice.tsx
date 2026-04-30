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
  const cx = 12 + col * 18;
  const cy = 12 + row * 18;
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill="#3a2e1f"/>
      {/* tiny highlight for depth */}
      <circle cx={cx - 1.4} cy={cy - 1.4} r={1.4} fill="#ffffffaa"/>
    </g>
  );
};

export function Dice({ value, onRoll, disabled }: {
  value: number | null;
  onRoll: () => void;
  disabled: boolean;
  rolling?: boolean;
}) {
  // Internal rolling animation: cycle face every 80ms for 600ms before triggering onRoll.
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

  // Face shown right now: rolling preview > real value > idle
  const displayValue = isRolling ? rollFace : value;
  // Ready = enabled, no value yet, not rolling
  const ready = !disabled && value === null && !isRolling;

  return (
    <div className="relative">
      {ready && (
        <span aria-hidden
          className="absolute inset-0 rounded-2xl bg-honey/60 animate-ping" />
      )}
      <button
        onClick={handleClick}
        disabled={disabled || isRolling}
        aria-label="Roll dice"
        className={`relative w-20 h-20 rounded-2xl border-2 shadow-lg
          active:scale-95 transition-all duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
          ${ready ? 'border-honey ring-4 ring-honey/40' : 'border-edge'}
          ${isRolling ? 'animate-[wiggle_0.15s_ease-in-out_infinite]' : ''}`}
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f5ead2 100%)',
        }}
      >
        <svg viewBox="0 0 60 60" className="w-full h-full p-2">
          {displayValue ? (
            PIPS[displayValue]!.map(([r, c], i) => (
              <Pip key={i} row={r} col={c} />
            ))
          ) : (
            // Idle face: 3 small faded dots, hinting at "click to roll"
            <g opacity={0.45}>
              <circle cx={20} cy={30} r={3.5} fill="#3a2e1f"/>
              <circle cx={30} cy={30} r={3.5} fill="#3a2e1f"/>
              <circle cx={40} cy={30} r={3.5} fill="#3a2e1f"/>
            </g>
          )}
        </svg>
      </button>
    </div>
  );
}
