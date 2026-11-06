import React, { memo } from 'react';
import styles from '../WorldCanvas.module.css';

interface SceneProps {
  parallaxOffset: { x: number; y: number };
}

export const TownPlazaScene: React.FC<SceneProps> = memo(({ parallaxOffset }) => {
  const p1x = parallaxOffset.x * 10;
  const p1y = parallaxOffset.y * 5;

  const p2x = parallaxOffset.x * 20;
  const p2y = parallaxOffset.y * 10;

  return (
    <>
      {/* Layer 0: Sky, Clock Tower & Town Buildings */}
      <div
        className={styles.layerPlane}
        style={{ transform: `translate3d(${p1x}px, ${p1y}px, 0)` }}
      >
        <svg width="1000" height="600" viewBox="0 0 1000 600" fill="none">
          <defs>
            <linearGradient id="plazaSky" x1="500" y1="0" x2="500" y2="400" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="100%" stopColor="#e0f2fe" />
            </linearGradient>
          </defs>

          {/* Sky background */}
          <rect width="1000" height="600" fill="url(#plazaSky)" />

          {/* Town Hall Clock Tower (Center) */}
          <g transform="translate(450, 40)">
            {/* Tower spire */}
            <polygon points="50,0 30,60 70,60" fill="#3b82f6" stroke="#1e1e24" strokeWidth="2.8" strokeLinejoin="round" />
            <rect x="25" y="60" width="50" height="150" fill="#f8fafc" stroke="#1e1e24" strokeWidth="3" />
            {/* Clock Face */}
            <circle cx="50" cy="95" r="18" fill="#fef08a" stroke="#1e1e24" strokeWidth="2.4" />
            <line x1="50" y1="95" x2="50" y2="84" stroke="#1e1e24" strokeWidth="2" strokeLinecap="round" />
            <line x1="50" y1="95" x2="58" y2="95" stroke="#1e1e24" strokeWidth="2" strokeLinecap="round" />
            {/* Archway bells */}
            <rect x="42" y="126" width="16" height="24" rx="8" fill="#d97706" stroke="#1e1e24" strokeWidth="2" />
          </g>

          {/* Left Townhouses */}
          <rect x="120" y="110" width="140" height="120" rx="4" fill="#fed7aa" stroke="#1e1e24" strokeWidth="2.8" />
          <polygon points="110,110 190,60 270,110" fill="#f97316" stroke="#1e1e24" strokeWidth="2.8" strokeLinejoin="round" />

          {/* Right Townhouses */}
          <rect x="740" y="110" width="150" height="120" rx="4" fill="#e0e7ff" stroke="#1e1e24" strokeWidth="2.8" />
          <polygon points="730,110 815,60 900,110" fill="#6366f1" stroke="#1e1e24" strokeWidth="2.8" strokeLinejoin="round" />

          {/* Festive Garland / Bunting overhead */}
          <path d="M 120 120 Q 300 170 500 130 Q 700 170 880 120" stroke="#1e1e24" strokeWidth="2" fill="none" />
          {/* Colorful Bunting flags */}
          {['#f43f5e', '#facc15', '#38bdf8', '#4ade80', '#c084fc', '#f97316', '#38bdf8', '#facc15'].map((color, i) => (
            <polygon
              key={i}
              points={`${180 + i * 80},${140 + Math.sin(i) * 10} ${195 + i * 80},${158 + Math.sin(i) * 10} ${210 + i * 80},${140 + Math.sin(i) * 10}`}
              fill={color}
              stroke="#1e1e24"
              strokeWidth="1.8"
            />
          ))}
        </svg>
      </div>

      {/* Layer 1: Cobblestone Square, Grand Fountain & Flower Cart */}
      <div
        className={styles.layerPlane}
        style={{ transform: `translate3d(${p2x}px, ${p2y}px, 0)` }}
      >
        <svg width="1000" height="600" viewBox="0 0 1000 600" fill="none">
          {/* Plaza Stone ground */}
          <rect y="210" width="1000" height="390" fill="#e2e8f0" stroke="#1e1e24" strokeWidth="3.2" />

          {/* Decorative Cobblestone Patterns */}
          <ellipse cx="500" cy="380" rx="340" ry="160" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="3" strokeDasharray="8 6" />

          {/* Grand Marble Bubbling Fountain (Center) */}
          <g id="grand-fountain" transform="translate(420, 240)">
            {/* Fountain base basin */}
            <ellipse cx="80" cy="90" rx="95" ry="34" fill="#94a3b8" stroke="#1e1e24" strokeWidth="3.2" />
            <ellipse cx="80" cy="85" rx="85" ry="28" fill="#38bdf8" stroke="#1e1e24" strokeWidth="2.5" />
            {/* Water shimmer */}
            <ellipse cx="80" cy="85" rx="55" ry="16" fill="#7dd3fc" opacity="0.6" />

            {/* Middle tier pedestal */}
            <rect x="68" y="30" width="24" height="50" rx="4" fill="#cbd5e1" stroke="#1e1e24" strokeWidth="2.6" />
            <ellipse cx="80" cy="34" rx="44" ry="14" fill="#94a3b8" stroke="#1e1e24" strokeWidth="2.8" />
            <ellipse cx="80" cy="31" rx="38" ry="10" fill="#38bdf8" stroke="#1e1e24" strokeWidth="2" />

            {/* Water Spray stream & mist */}
            <g className={styles.steamPuff}>
              <path d="M 80 30 Q 72 0 68 -15 Q 80 -10 80 30" fill="#e0f2fe" opacity="0.8" />
              <path d="M 80 30 Q 88 0 92 -15 Q 80 -10 80 30" fill="#e0f2fe" opacity="0.8" />
              <circle cx="80" cy="-18" r="4" fill="#bae6fd" stroke="#1e1e24" strokeWidth="1" />
            </g>
          </g>

          {/* Artisan Flower Market Cart (Left) */}
          <g transform="translate(180, 290)">
            {/* Cart body */}
            <rect x="0" y="20" width="90" height="40" rx="4" fill="#b45309" stroke="#1e1e24" strokeWidth="2.8" />
            <rect x="-6" y="14" width="102" height="10" rx="3" fill="#d97706" stroke="#1e1e24" strokeWidth="2.4" />
            {/* Big wooden spokes wheel */}
            <circle cx="45" cy="65" r="22" fill="#fed7aa" stroke="#1e1e24" strokeWidth="3" />
            <circle cx="45" cy="65" r="6" fill="#78350f" stroke="#1e1e24" strokeWidth="2" />
            {/* Flower buckets with sunflowers & tulips */}
            <circle cx="20" cy="6" r="10" fill="#facc15" stroke="#1e1e24" strokeWidth="2" />
            <circle cx="20" cy="6" r="4" fill="#78350f" />
            <circle cx="45" cy="4" r="9" fill="#f43f5e" stroke="#1e1e24" strokeWidth="2" />
            <circle cx="70" cy="6" r="10" fill="#c084fc" stroke="#1e1e24" strokeWidth="2" />
          </g>
        </svg>
      </div>
    </>
  );
});
