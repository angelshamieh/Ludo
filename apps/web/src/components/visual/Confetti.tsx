'use client';
import type { Color } from '@ludo/game-shared';

const fillByColor: Record<Color, string> = {
  red: '#c97a7a', green: '#7eaa83', yellow: '#d8b86a', blue: '#7d9ec5',
};

export function Confetti({ winnerColor }: { winnerColor: Color }) {
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1.5 + Math.random(),
    rotate: Math.random() * 360,
    color: i % 3 === 0 ? fillByColor[winnerColor] : (i % 3 === 1 ? '#fbbf24' : '#fdf6ec'),
  }));
  return (
    <svg className="fixed inset-0 pointer-events-none z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
      {pieces.map((p) => (
        <rect key={p.id} x={p.x} y={-2} width={1.5} height={2.5} fill={p.color}
          style={{
            animation: `confetti-fall ${p.duration}s linear ${p.delay}s forwards`,
            transformOrigin: `${p.x + 0.75}px 0px`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          to { transform: translateY(120px) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </svg>
  );
}
