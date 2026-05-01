'use client';
export function LadderArt({ x1, y1, x2, y2 }: {
  x1: number; y1: number; x2: number; y2: number;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx*dx + dy*dy);
  if (len < 1) return null;
  const nx = -dy / len * 4;
  const ny =  dx / len * 4;

  const rungCount = Math.max(2, Math.floor(len / 14));
  const rungs = [];
  for (let i = 1; i < rungCount; i++) {
    const t = i / rungCount;
    rungs.push({
      rx1: x1 + dx*t - nx,
      ry1: y1 + dy*t - ny,
      rx2: x1 + dx*t + nx,
      ry2: y1 + dy*t + ny,
    });
  }

  return (
    <g>
      <line x1={x1-nx} y1={y1-ny} x2={x2-nx} y2={y2-ny}
        stroke="#a8754a" strokeWidth={3} strokeLinecap="round"/>
      <line x1={x1+nx} y1={y1+ny} x2={x2+nx} y2={y2+ny}
        stroke="#a8754a" strokeWidth={3} strokeLinecap="round"/>
      {rungs.map((r, i) => (
        <line key={i} x1={r.rx1} y1={r.ry1} x2={r.rx2} y2={r.ry2}
          stroke="#7c5635" strokeWidth={2} strokeLinecap="round"/>
      ))}
    </g>
  );
}
