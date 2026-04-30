'use client';
const PIPS: Record<number, [number, number][]> = {
  1: [[1,1]],
  2: [[0,0],[2,2]],
  3: [[0,0],[1,1],[2,2]],
  4: [[0,0],[0,2],[2,0],[2,2]],
  5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,1],[0,2],[2,0],[2,1],[2,2]],
};

export function Dice({ value, onRoll, disabled, rolling }: {
  value: number | null;
  onRoll: () => void;
  disabled: boolean;
  rolling?: boolean;
}) {
  return (
    <button
      onClick={onRoll}
      disabled={disabled}
      aria-label="Roll dice"
      className={`w-20 h-20 rounded-2xl bg-white border-2 border-edge shadow-md
        active:scale-95 transition-transform
        disabled:opacity-50 disabled:cursor-not-allowed
        ${rolling ? 'animate-spin' : ''}`}
    >
      <svg viewBox="0 0 60 60" className="w-full h-full p-2">
        {value && PIPS[value]!.map(([r, c], i) => (
          <circle key={i} cx={10 + c*20} cy={10 + r*20} r={5} fill="#3a2e1f"/>
        ))}
        {!value && <text x="30" y="38" textAnchor="middle" fontSize="20">🎲</text>}
      </svg>
    </button>
  );
}
