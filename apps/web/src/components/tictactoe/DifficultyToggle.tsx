'use client';

export function DifficultyToggle({ value, onChange }: {
  value: 'easy' | 'hard';
  onChange: (v: 'easy' | 'hard') => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs opacity-60">🤖 Bot difficulty</span>
      <div className="flex gap-2">
        {(['easy', 'hard'] as const).map((d) => (
          <button key={d}
            onClick={() => onChange(d)}
            className={`px-4 py-2 rounded-xl border-2 capitalize text-sm
              ${value === d ? 'border-ink bg-white font-medium' : 'border-edge bg-paper opacity-60'}`}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}
