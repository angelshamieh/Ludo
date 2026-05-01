'use client';
export function SnakeArt({ x1, y1, x2, y2, length, idSuffix }: {
  x1: number; y1: number; x2: number; y2: number; length: number; idSuffix: string;
}) {
  const isLong = length > 30;
  const bodyMain = isLong ? '#9b6cd8' : '#88a36e';
  const bodyDark = isLong ? '#5e3a8c' : '#566c41';

  const dx = x2 - x1;
  const dy = y2 - y1;
  const cp1x = x1 + dx*0.1 + dy*0.4;
  const cp1y = y1 + dy*0.4;
  const cp2x = x2 - dx*0.1 - dy*0.4;
  const cp2y = y2 - dy*0.4;

  const id = `snake-${idSuffix}`;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={bodyMain}/>
          <stop offset="100%" stopColor={bodyDark}/>
        </linearGradient>
      </defs>
      <path
        d={`M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`}
        fill="none" stroke={`url(#${id})`} strokeWidth={6} strokeLinecap="round"
      />
      <circle cx={x1} cy={y1} r={5} fill={bodyMain} stroke={bodyDark} strokeWidth={1.5}/>
      <circle cx={x1-1.5} cy={y1-1} r={1} fill="#000"/>
      <circle cx={x1+1.5} cy={y1-1} r={1} fill="#000"/>
    </g>
  );
}
