'use client';
import type { Color } from '@ludo/game-shared';

const fillByColor: Record<Color, string> = {
  red: '#c97a7a', green: '#7eaa83', yellow: '#d8b86a', blue: '#7d9ec5',
};
const darkByColor: Record<Color, string> = {
  red: '#8c5252', green: '#557560', yellow: '#9c7e3b', blue: '#516f93',
};

/**
 * 3D-looking pawn (rounded sphere on tapered base) rendered as SVG.
 * Use inside an existing <svg>. The component returns an <svg> <g> wrapper that
 * smooth-transitions its position when (cx, cy) change.
 */
export function Pawn({ color, cx, cy, size = 14 }: {
  color: Color;
  cx: number;
  cy: number;
  size?: number;
}) {
  const fill = fillByColor[color];
  const dark = darkByColor[color];
  return (
    <g
      style={{
        transform: `translate(${cx}px, ${cy}px)`,
        transition: 'transform 250ms ease-out',
      }}
    >
      {/* Drop shadow */}
      <ellipse cx={0} cy={size * 0.6} rx={size * 0.7} ry={size * 0.18} fill="#3a2e1f33"/>
      {/* Tapered base */}
      <path
        d={`M ${-size*0.5} ${size*0.5}
            L ${size*0.5} ${size*0.5}
            L ${size*0.35} ${-size*0.1}
            L ${-size*0.35} ${-size*0.1}
            Z`}
        fill={dark}
      />
      {/* Spherical top */}
      <circle cx={0} cy={-size*0.3} r={size*0.4} fill={fill} stroke={dark} strokeWidth={1}/>
      {/* Highlight */}
      <ellipse cx={-size*0.15} cy={-size*0.45} rx={size*0.12} ry={size*0.08} fill="#ffffff77"/>
    </g>
  );
}
