'use client';
import Link from 'next/link';

export function GameCard({
  href, name, tagline, accent, icon,
}: {
  href: string;
  name: string;
  tagline: string;
  accent: string;        // a Tailwind bg class, e.g. 'bg-rust/30'
  icon: string;          // emoji
}) {
  return (
    <Link href={href}
      className={`flex flex-col items-start gap-2 p-5 rounded-2xl border-2 border-edge ${accent}
        active:scale-95 transition-transform shadow-md`}
    >
      <div className="text-4xl">{icon}</div>
      <h3 className="font-display text-2xl">{name}</h3>
      <p className="text-sm opacity-70">{tagline}</p>
    </Link>
  );
}
