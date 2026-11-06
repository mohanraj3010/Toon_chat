import React, { memo } from 'react';
import styles from '../WorldCanvas.module.css';

interface SceneProps {
  parallaxOffset: { x: number; y: number };
}

export const CozyCafeScene: React.FC<SceneProps> = memo(({ parallaxOffset }) => {
  const p1x = parallaxOffset.x * 10;
  const p1y = parallaxOffset.y * 5;

  const p2x = parallaxOffset.x * 20;
  const p2y = parallaxOffset.y * 10;

  return (
    <>
      {/* Layer 0: Warm Ambient Indoor Wall & Sunlit Windows */}
      <div
        className={styles.layerPlane}
        style={{ transform: `translate3d(${p1x}px, ${p1y}px, 0)` }}
      >
        <svg width="1000" height="600" viewBox="0 0 1000 600" fill="none">
          <defs>
            <linearGradient id="cafeWallGrad" x1="500" y1="0" x2="500" y2="400" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="100%" stopColor="#fed7aa" />
            </linearGradient>
          </defs>

          {/* Wall background */}
          <rect width="1000" height="600" fill="url(#cafeWallGrad)" />

          {/* Decorative wooden wainscoting panel line */}
          <rect y="180" width="1000" height="12" fill="#b45309" stroke="#1e1e24" strokeWidth="2.5" />

          {/* Arched sunlit windows with park greenery view */}
          <g transform="translate(140, 40)">
            <path d="M 0 130 L 0 50 A 45 45 0 0 1 90 50 L 90 130 Z" fill="#bae6fd" stroke="#1e1e24" strokeWidth="3" />
            <path d="M 10 130 C 15 90 40 85 80 90 L 80 130 Z" fill="#86efac" />
            <line x1="45" y1="10" x2="45" y2="130" stroke="#1e1e24" strokeWidth="2.2" />
            <line x1="0" y1="75" x2="90" y2="75" stroke="#1e1e24" strokeWidth="2.2" />
          </g>

          <g transform="translate(680, 40)">
            <path d="M 0 130 L 0 50 A 45 45 0 0 1 90 50 L 90 130 Z" fill="#bae6fd" stroke="#1e1e24" strokeWidth="3" />
            <path d="M 10 130 C 25 80 60 85 80 90 L 80 130 Z" fill="#86efac" />
            <line x1="45" y1="10" x2="45" y2="130" stroke="#1e1e24" strokeWidth="2.2" />
            <line x1="0" y1="75" x2="90" y2="75" stroke="#1e1e24" strokeWidth="2.2" />
          </g>

          {/* Warm Hanging Pendant Lamps */}
          <g transform="translate(360, 0)">
            <line x1="0" y1="0" x2="0" y2="70" stroke="#1e1e24" strokeWidth="2.5" />
            <polygon points="-18,90 18,90 12,70 -12,70" fill="#f59e0b" stroke="#1e1e24" strokeWidth="2.5" />
            <circle cx="0" cy="94" r="6" fill="#fffbeb" />
            <circle cx="0" cy="95" r="28" fill="#fef08a" opacity="0.3" />
          </g>
          <g transform="translate(540, 0)">
            <line x1="0" y1="0" x2="0" y2="70" stroke="#1e1e24" strokeWidth="2.5" />
            <polygon points="-18,90 18,90 12,70 -12,70" fill="#f59e0b" stroke="#1e1e24" strokeWidth="2.5" />
            <circle cx="0" cy="94" r="6" fill="#fffbeb" />
            <circle cx="0" cy="95" r="28" fill="#fef08a" opacity="0.3" />
          </g>
        </svg>
      </div>

      {/* Layer 1: Cafe Wooden Flooring, Bar Counter, Booths & Tables */}
      <div
        className={styles.layerPlane}
        style={{ transform: `translate3d(${p2x}px, ${p2y}px, 0)` }}
      >
        <svg width="1000" height="600" viewBox="0 0 1000 600" fill="none">
          {/* Polished timber plank floor */}
          <rect y="210" width="1000" height="390" fill="#d97706" stroke="#1e1e24" strokeWidth="3.2" />

          {/* Floor plank seams */}
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={i}
              x1="0"
              y1={210 + i * 50}
              x2="1000"
              y2={210 + i * 50}
              stroke="#b45309"
              strokeWidth="2"
              opacity="0.6"
            />
          ))}

          {/* Persian style warm woven rug */}
          <rect x="250" y="320" width="460" height="190" rx="12" fill="#991b1b" stroke="#1e1e24" strokeWidth="2.8" />
          <rect x="265" y="335" width="430" height="160" rx="8" fill="#b91c1c" stroke="#fef08a" strokeWidth="2" strokeDasharray="6 4" />

          {/* Barista Counter & Espresso Machine */}
          <g transform="translate(200, 200)">
            {/* Wooden counter bar */}
            <rect x="0" y="24" width="220" height="70" rx="6" fill="#78350f" stroke="#1e1e24" strokeWidth="3" />
            <rect x="-8" y="16" width="236" height="14" rx="4" fill="#f8fafc" stroke="#1e1e24" strokeWidth="2.8" />
            {/* Shiny Espresso Machine */}
            <rect x="24" y="-18" width="54" height="36" rx="4" fill="#94a3b8" stroke="#1e1e24" strokeWidth="2.4" />
            <circle cx="40" cy="-6" r="4" fill="#38bdf8" />
            <circle cx="62" cy="-6" r="4" fill="#ef4444" />
            {/* Steam puff */}
            <g className={styles.steamPuff}>
              <path d="M 50 -24 Q 54 -32 50 -38" stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" />
            </g>
          </g>

          {/* Pastry Display Glass Case */}
          <g transform="translate(420, 216)">
            <rect x="0" y="8" width="80" height="42" rx="4" fill="#e0f2fe" stroke="#1e1e24" strokeWidth="2.4" fillOpacity="0.75" />
            {/* Croissants and donuts inside */}
            <ellipse cx="24" cy="30" rx="12" ry="6" fill="#f59e0b" stroke="#1e1e24" strokeWidth="1.6" />
            <circle cx="56" cy="30" r="7" fill="#f472b6" stroke="#1e1e24" strokeWidth="1.6" />
          </g>

          {/* Cozy Window Booth */}
          <g transform="translate(710, 250)">
            <rect x="0" y="0" width="130" height="85" rx="10" fill="#047857" stroke="#1e1e24" strokeWidth="3" />
            <rect x="10" y="10" width="110" height="30" rx="6" fill="#065f46" />
            <ellipse cx="65" cy="74" rx="34" ry="14" fill="#f8fafc" stroke="#1e1e24" strokeWidth="2.4" />
          </g>

          {/* Potted Monstera Plant */}
          <g transform="translate(80, 280)">
            <polygon points="10,40 38,40 44,0 4,0" fill="#b45309" stroke="#1e1e24" strokeWidth="2.4" />
            <circle cx="12" cy="-14" r="18" fill="#15803d" stroke="#1e1e24" strokeWidth="2.4" />
            <circle cx="36" cy="-20" r="22" fill="#16a34a" stroke="#1e1e24" strokeWidth="2.4" />
            <circle cx="24" cy="-38" r="16" fill="#15803d" stroke="#1e1e24" strokeWidth="2.4" />
          </g>
        </svg>
      </div>
    </>
  );
});
