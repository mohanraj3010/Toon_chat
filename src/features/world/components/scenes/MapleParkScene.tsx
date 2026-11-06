import React, { memo } from 'react';
import styles from '../WorldCanvas.module.css';

interface SceneProps {
  parallaxOffset: { x: number; y: number };
}

export const MapleParkScene: React.FC<SceneProps> = memo(({ parallaxOffset }) => {
  // Parallax offsets for different planes
  const p0x = parallaxOffset.x * 6;
  const p0y = parallaxOffset.y * 3;

  const p1x = parallaxOffset.x * 12;
  const p1y = parallaxOffset.y * 6;

  const p2x = parallaxOffset.x * 20;
  const p2y = parallaxOffset.y * 10;

  const p3x = parallaxOffset.x * 32;
  const p3y = parallaxOffset.y * 16;

  return (
    <>
      {/* ============================================================== */}
      {/* LAYER 0: SKY, SUN & DRIFTING PUFFY CLOUDS                     */}
      {/* ============================================================== */}
      <div
        className={styles.layerPlane}
        style={{ transform: `translate3d(${p0x}px, ${p0y}px, 0)` }}
      >
        <svg width="1000" height="600" viewBox="0 0 1000 600" fill="none">
          <defs>
            <linearGradient id="skyGrad" x1="500" y1="0" x2="500" y2="400" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#cceeff" />
              <stop offset="60%" stopColor="#eaf8ff" />
              <stop offset="100%" stopColor="#fff7d6" />
            </linearGradient>
            <radialGradient id="sunGlow" cx="500" cy="220" r="140" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fff3b0" stopOpacity="1" />
              <stop offset="50%" stopColor="#ffe484" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ffd866" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Sky background */}
          <rect width="1000" height="600" fill="url(#skyGrad)" />

          {/* Morning sun halo behind hills */}
          <circle cx="500" cy="200" r="130" fill="url(#sunGlow)" />
          <circle cx="500" cy="200" r="46" fill="#fff9db" stroke="#fcd34d" strokeWidth="2.5" />

          {/* Drifting cartoon puffy clouds */}
          <g className={styles.cloudDrift1}>
            <path
              d="M 60 70 C 60 55 75 45 92 45 C 105 32 130 30 148 44 C 160 36 182 40 190 54 C 205 56 215 68 210 82 C 215 95 200 106 185 105 L 75 105 C 58 105 50 85 60 70 Z"
              fill="#ffffff"
              stroke="#1e1e24"
              strokeWidth="2.2"
              fillOpacity="0.95"
            />
          </g>

          <g className={styles.cloudDrift2}>
            <path
              d="M 450 50 C 450 38 462 30 476 30 C 486 20 508 18 522 30 C 532 24 550 28 556 38 C 568 40 576 50 572 62 C 576 72 564 80 552 80 L 462 80 C 448 80 442 64 450 50 Z"
              fill="#ffffff"
              stroke="#1e1e24"
              strokeWidth="2.2"
              fillOpacity="0.92"
            />
          </g>

          <g className={styles.cloudDrift3}>
            <path
              d="M 780 85 C 780 72 792 64 806 64 C 816 52 838 50 852 64 C 862 58 880 62 886 74 C 898 76 906 88 902 100 C 906 112 894 120 882 120 L 792 120 C 778 120 772 102 780 85 Z"
              fill="#ffffff"
              stroke="#1e1e24"
              strokeWidth="2.2"
              fillOpacity="0.95"
            />
          </g>
        </svg>
      </div>

      {/* ============================================================== */}
      {/* LAYER 1: DISTANT HILLS & PASTEL TOWN COTTAGES                 */}
      {/* ============================================================== */}
      <div
        className={styles.layerPlane}
        style={{ transform: `translate3d(${p1x}px, ${p1y}px, 0)` }}
      >
        <svg width="1000" height="600" viewBox="0 0 1000 600" fill="none">
          {/* Distant Hills Layer 1 */}
          <path
            d="M -20 250 Q 200 160 480 230 T 1020 180 L 1020 400 L -20 400 Z"
            fill="#a5df93"
            stroke="#1e1e24"
            strokeWidth="2.6"
          />

          {/* Distant cottages on hill (right) */}
          <g id="distant-town" transform="translate(620, 160)">
            {/* Cottage 1 */}
            <rect x="0" y="24" width="46" height="34" rx="3" fill="#e0f2fe" stroke="#1e1e24" strokeWidth="2.2" />
            <polygon points="-4,24 23,-2 50,24" fill="#f87171" stroke="#1e1e24" strokeWidth="2.2" strokeLinejoin="round" />
            <rect x="30" y="-8" width="8" height="18" fill="#cbd5e1" stroke="#1e1e24" strokeWidth="2" />
            {/* Chimney smoke */}
            <circle cx="34" cy="-14" r="3" fill="#ffffff" stroke="#1e1e24" strokeWidth="1.2" opacity="0.8" />
            <circle cx="38" cy="-22" r="4.5" fill="#ffffff" stroke="#1e1e24" strokeWidth="1.2" opacity="0.6" />
            <rect x="16" y="34" width="12" height="14" rx="2" fill="#38bdf8" stroke="#1e1e24" strokeWidth="1.8" />

            {/* Cottage 2 */}
            <rect x="54" y="16" width="56" height="42" rx="3" fill="#fed7aa" stroke="#1e1e24" strokeWidth="2.2" />
            <polygon points="50,16 82,-12 114,16" fill="#fb923c" stroke="#1e1e24" strokeWidth="2.2" strokeLinejoin="round" />
            <rect x="66" y="26" width="12" height="12" rx="2" fill="#fef08a" stroke="#1e1e24" strokeWidth="1.8" />
            <rect x="86" y="26" width="12" height="12" rx="2" fill="#fef08a" stroke="#1e1e24" strokeWidth="1.8" />
          </g>

          {/* Distant hill Layer 2 */}
          <path
            d="M -20 280 Q 250 200 600 270 T 1020 220 L 1020 450 L -20 450 Z"
            fill="#8ece7a"
            stroke="#1e1e24"
            strokeWidth="2.8"
          />
        </svg>
      </div>

      {/* ============================================================== */}
      {/* LAYER 2: LUSH LAWN, PATHS, POND, CAFE & PARK PROPS             */}
      {/* ============================================================== */}
      <div
        className={styles.layerPlane}
        style={{ transform: `translate3d(${p2x}px, ${p2y}px, 0)` }}
      >
        <svg width="1000" height="600" viewBox="0 0 1000 600" fill="none">
          {/* Main Rolling Lawn Base */}
          <path
            d="M -10 270 C 260 210 440 260 700 230 C 850 210 960 230 1010 240 L 1010 610 L -10 610 Z"
            fill="#9ad85f"
            stroke="#1e1e24"
            strokeWidth="3.2"
          />

          {/* Subtle darker grass shaded banks */}
          <path
            d="M -10 320 C 180 290 340 330 520 310 C 720 290 890 320 1010 300 L 1010 610 L -10 610 Z"
            fill="#90cf54"
            opacity="0.35"
          />

          {/* Winding Cobblestone Pathway (from cafe down through park) */}
          <path
            d="M 590 230 Q 530 290 640 370 Q 750 450 630 540 Q 560 590 520 610 L 390 610 Q 450 540 500 480 Q 560 410 460 340 Q 420 310 520 230 Z"
            fill="#f7edd5"
            stroke="#1e1e24"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />

          {/* Stepping flagstones detail along the path */}
          <g id="flagstones" opacity="0.45" stroke="#1e1e24" strokeWidth="1.8">
            <ellipse cx="550" cy="260" rx="14" ry="7" fill="#ebdcb7" />
            <ellipse cx="510" cy="310" rx="18" ry="9" fill="#ebdcb7" />
            <ellipse cx="570" cy="350" rx="16" ry="8" fill="#ebdcb7" />
            <ellipse cx="660" cy="410" rx="22" ry="11" fill="#ebdcb7" />
            <ellipse cx="610" cy="460" rx="20" ry="10" fill="#ebdcb7" />
            <ellipse cx="540" cy="510" rx="24" ry="12" fill="#ebdcb7" />
            <ellipse cx="460" cy="560" rx="26" ry="13" fill="#ebdcb7" />
          </g>

          {/* -------------------------------------------------------- */}
          {/* THE SERENE DUCK POND (Left)                              */}
          {/* -------------------------------------------------------- */}
          <g id="pond-group">
            {/* Pond Stone border / bank */}
            <path
              d="M 40 340 C 35 290 120 270 230 280 C 340 290 380 340 350 380 C 310 430 180 430 80 410 C 30 400 45 370 40 340 Z"
              fill="#e2d4b7"
              stroke="#1e1e24"
              strokeWidth="3"
            />
            {/* Water surface */}
            <path
              d="M 48 340 C 44 298 124 278 226 288 C 328 298 368 342 340 378 C 302 422 178 422 86 402 C 40 392 52 366 48 340 Z"
              fill="#52bce8"
              stroke="#1e1e24"
              strokeWidth="2.5"
            />
            {/* Water reflections / ripples */}
            <ellipse cx="160" cy="320" rx="60" ry="12" fill="#7ed4f5" opacity="0.6" />
            <ellipse cx="260" cy="350" rx="45" ry="9" fill="#7ed4f5" opacity="0.5" />

            {/* Lily pad 1 with pink water lily */}
            <g transform="translate(130, 310)">
              <ellipse cx="0" cy="0" rx="14" ry="7" fill="#4ade80" stroke="#1e1e24" strokeWidth="1.8" />
              <polygon points="0,0 8,-5 12,0" fill="#52bce8" stroke="#1e1e24" strokeWidth="1.2" />
              {/* Pink Flower */}
              <circle cx="2" cy="-2" r="4.5" fill="#f472b6" stroke="#1e1e24" strokeWidth="1.5" />
              <circle cx="2" cy="-2" r="2" fill="#fef08a" />
            </g>

            {/* Lily pad 2 */}
            <g transform="translate(260, 320)">
              <ellipse cx="0" cy="0" rx="12" ry="6" fill="#4ade80" stroke="#1e1e24" strokeWidth="1.8" />
              <polygon points="0,0 -6,-4 -10,0" fill="#52bce8" stroke="#1e1e24" strokeWidth="1.2" />
            </g>

            {/* Animated Swimming Ducklings */}
            <g className={styles.duckGroup} transform="translate(170, 340)">
              {/* Mama Duck */}
              <g transform="translate(0, 0)">
                <ellipse cx="0" cy="0" rx="13" ry="8" fill="#facc15" stroke="#1e1e24" strokeWidth="2.2" />
                <circle cx="9" cy="-8" r="7" fill="#facc15" stroke="#1e1e24" strokeWidth="2.2" />
                {/* Orange Beak */}
                <polygon points="14,-9 22,-7 15,-5" fill="#f97316" stroke="#1e1e24" strokeWidth="1.8" />
                {/* Eye */}
                <circle cx="11" cy="-9" r="1.5" fill="#1e1e24" />
                {/* Wing */}
                <path d="M -4 -1 Q 2 5 0 2" stroke="#eab308" strokeWidth="2" fill="none" strokeLinecap="round" />
              </g>

              {/* Baby Duckling 1 */}
              <g transform="translate(-24, 6) scale(0.65)">
                <ellipse cx="0" cy="0" rx="11" ry="7" fill="#fde047" stroke="#1e1e24" strokeWidth="2.2" />
                <circle cx="7" cy="-7" r="6" fill="#fde047" stroke="#1e1e24" strokeWidth="2.2" />
                <polygon points="11,-8 18,-6 12,-4" fill="#fb923c" stroke="#1e1e24" strokeWidth="1.8" />
                <circle cx="9" cy="-8" r="1.3" fill="#1e1e24" />
              </g>

              {/* Baby Duckling 2 */}
              <g transform="translate(-42, 12) scale(0.55)">
                <ellipse cx="0" cy="0" rx="11" ry="7" fill="#fde047" stroke="#1e1e24" strokeWidth="2.2" />
                <circle cx="7" cy="-7" r="6" fill="#fde047" stroke="#1e1e24" strokeWidth="2.2" />
                <polygon points="11,-8 18,-6 12,-4" fill="#fb923c" stroke="#1e1e24" strokeWidth="1.8" />
                <circle cx="9" cy="-8" r="1.3" fill="#1e1e24" />
              </g>
            </g>
          </g>

          {/* -------------------------------------------------------- */}
          {/* THE WOODEN SWING SET (Upper Left)                        */}
          {/* -------------------------------------------------------- */}
          <g id="swing-set" transform="translate(180, 160)">
            {/* Top beam */}
            <rect x="0" y="8" width="130" height="9" rx="3" fill="#b45309" stroke="#1e1e24" strokeWidth="2.6" />
            {/* Left A-frame poles */}
            <line x1="12" y1="12" x2="-8" y2="90" stroke="#1e1e24" strokeWidth="5" strokeLinecap="round" />
            <line x1="12" y1="12" x2="-8" y2="90" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
            <line x1="18" y1="12" x2="36" y2="90" stroke="#1e1e24" strokeWidth="5" strokeLinecap="round" />
            <line x1="0" y1="56" x2="28" y2="56" stroke="#1e1e24" strokeWidth="2.4" />

            {/* Right A-frame poles */}
            <line x1="112" y1="12" x2="94" y2="90" stroke="#1e1e24" strokeWidth="5" strokeLinecap="round" />
            <line x1="112" y1="12" x2="94" y2="90" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
            <line x1="118" y1="12" x2="138" y2="90" stroke="#1e1e24" strokeWidth="5" strokeLinecap="round" />
            <line x1="118" y1="12" x2="138" y2="90" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
            <line x1="102" y1="56" x2="130" y2="56" stroke="#1e1e24" strokeWidth="2.4" />

            {/* Swing 1 (swaying) */}
            <g className={styles.swingSway}>
              <line x1="42" y1="16" x2="40" y2="68" stroke="#1e1e24" strokeWidth="1.8" strokeDasharray="3 2" />
              <line x1="56" y1="16" x2="54" y2="68" stroke="#1e1e24" strokeWidth="1.8" strokeDasharray="3 2" />
              <rect x="36" y="68" width="22" height="6" rx="2" fill="#78350f" stroke="#1e1e24" strokeWidth="2" />
            </g>

            {/* Swing 2 (swaying offset) */}
            <g className={styles.swingSway} style={{ animationDelay: '1.2s' }}>
              <line x1="76" y1="16" x2="74" y2="68" stroke="#1e1e24" strokeWidth="1.8" strokeDasharray="3 2" />
              <line x1="90" y1="16" x2="88" y2="68" stroke="#1e1e24" strokeWidth="1.8" strokeDasharray="3 2" />
              <rect x="70" y="68" width="22" height="6" rx="2" fill="#78350f" stroke="#1e1e24" strokeWidth="2" />
            </g>
          </g>

          {/* Midground Wooden Bench */}
          <g id="midground-bench" transform="translate(380, 210)">
            {/* Backrest */}
            <rect x="0" y="0" width="58" height="6" rx="2" fill="#b45309" stroke="#1e1e24" strokeWidth="2.2" />
            <rect x="0" y="8" width="58" height="6" rx="2" fill="#b45309" stroke="#1e1e24" strokeWidth="2.2" />
            {/* Seat */}
            <rect x="-4" y="18" width="66" height="8" rx="2" fill="#d97706" stroke="#1e1e24" strokeWidth="2.2" />
            {/* Legs */}
            <line x1="4" y1="26" x2="2" y2="38" stroke="#1e1e24" strokeWidth="3" />
            <line x1="54" y1="26" x2="56" y2="38" stroke="#1e1e24" strokeWidth="3" />
          </g>

          {/* -------------------------------------------------------- */}
          {/* THE COZY CAFÉ (Right Building & Terrace)                 */}
          {/* -------------------------------------------------------- */}
          <g id="cozy-cafe-building" transform="translate(680, 120)">
            {/* Main Cafe wooden wall */}
            <rect x="20" y="60" width="280" height="150" rx="6" fill="#fef3c7" stroke="#1e1e24" strokeWidth="3.2" />

            {/* Roof timber shingles */}
            <polygon points="10,60 160,0 310,60" fill="#b45309" stroke="#1e1e24" strokeWidth="3.2" strokeLinejoin="round" />
            <polygon points="24,60 160,8 296,60" fill="#d97706" opacity="0.6" />

            {/* "COZY CAFÉ" Signboard */}
            <rect x="90" y="14" width="140" height="34" rx="8" fill="#fffbeb" stroke="#1e1e24" strokeWidth="2.8" />
            <text x="160" y="36" fontFamily="var(--font-heading, 'Fredoka')" fontSize="14" fontWeight="bold" fill="#78350f" textAnchor="middle">
              COZY CAFÉ ☕
            </text>

            {/* Striped Mint & Cream Awning */}
            <g id="cafe-awning" transform="translate(10, 60)">
              {/* Awning stripes */}
              {['#34d399', '#fffbeb', '#34d399', '#fffbeb', '#34d399', '#fffbeb', '#34d399', '#fffbeb', '#34d399'].map((col, idx) => (
                <rect key={idx} x={idx * 33} y="0" width="34" height="28" fill={col} stroke="#1e1e24" strokeWidth="2.4" />
              ))}
              {/* Scalloped frill bottom */}
              {Array.from({ length: 9 }).map((_, idx) => (
                <path
                  key={idx}
                  d={`M ${idx * 33} 28 Q ${idx * 33 + 16.5} 36 ${idx * 33 + 33} 28 Z`}
                  fill={idx % 2 === 0 ? '#34d399' : '#fffbeb'}
                  stroke="#1e1e24"
                  strokeWidth="2.2"
                />
              ))}
            </g>

            {/* Cafe Windows with warm amber interior glow & mullions */}
            <g transform="translate(40, 106)">
              <rect x="0" y="0" width="56" height="60" rx="4" fill="#fef08a" stroke="#1e1e24" strokeWidth="2.6" />
              <line x1="28" y1="0" x2="28" y2="60" stroke="#1e1e24" strokeWidth="2" />
              <line x1="0" y1="30" x2="56" y2="30" stroke="#1e1e24" strokeWidth="2" />
            </g>
            <g transform="translate(204, 106)">
              <rect x="0" y="0" width="56" height="60" rx="4" fill="#fef08a" stroke="#1e1e24" strokeWidth="2.6" />
              <line x1="28" y1="0" x2="28" y2="60" stroke="#1e1e24" strokeWidth="2" />
              <line x1="0" y1="30" x2="56" y2="30" stroke="#1e1e24" strokeWidth="2" />
            </g>

            {/* Cafe Door */}
            <rect x="122" y="106" width="56" height="104" rx="4" fill="#92400e" stroke="#1e1e24" strokeWidth="2.8" />
            <rect x="132" y="118" width="36" height="42" rx="3" fill="#fef08a" stroke="#1e1e24" strokeWidth="2" />
            <circle cx="168" cy="164" r="3" fill="#fbbf24" stroke="#1e1e24" strokeWidth="1.5" />

            {/* Outdoor Cafe Chalkboard Menu */}
            <g transform="translate(-14, 140)">
              <polygon points="0,0 24,0 28,40 22,40 20,4 4,4 2,40 -4,40" fill="#78350f" stroke="#1e1e24" strokeWidth="2" />
              <rect x="2" y="4" width="20" height="30" rx="2" fill="#1e293b" stroke="#1e1e24" strokeWidth="1.5" />
              <text x="12" y="14" fill="#f8fafc" fontSize="6" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">COZY</text>
              <text x="12" y="22" fill="#facc15" fontSize="5" fontFamily="sans-serif" textAnchor="middle">CAFE</text>
              <text x="12" y="29" fill="#38bdf8" fontSize="4.5" fontFamily="sans-serif" textAnchor="middle">☕ LATTE</text>
            </g>

            {/* Outdoor Round Bistro Table & Coffee */}
            <g transform="translate(24, 180)">
              {/* Table top */}
              <ellipse cx="40" cy="18" rx="24" ry="10" fill="#f8fafc" stroke="#1e1e24" strokeWidth="2.4" />
              <line x1="40" y1="28" x2="40" y2="48" stroke="#1e1e24" strokeWidth="3" />
              <line x1="32" y1="48" x2="48" y2="48" stroke="#1e1e24" strokeWidth="3.2" strokeLinecap="round" />
              {/* Steaming Coffee Mug */}
              <rect x="36" y="8" width="8" height="8" rx="2" fill="#ef4444" stroke="#1e1e24" strokeWidth="1.6" />
              <g className={styles.steamPuff}>
                <path d="M 40 6 Q 42 2 40 -1" stroke="#94a3b8" strokeWidth="1.4" fill="none" strokeLinecap="round" />
              </g>
            </g>
          </g>

          {/* Classic Park Street Lamp */}
          <g id="park-lamp" transform="translate(480, 160)">
            {/* Pole */}
            <line x1="10" y1="0" x2="10" y2="60" stroke="#1e1e24" strokeWidth="3.6" />
            <rect x="6" y="58" width="8" height="6" fill="#1e1e24" />
            {/* Lantern top */}
            <polygon points="4,0 16,0 18,-18 2,-18" fill="#fef08a" stroke="#1e1e24" strokeWidth="2.2" />
            <polygon points="0,-18 20,-18 10,-26" fill="#1e1e24" stroke="#1e1e24" strokeWidth="2" strokeLinejoin="round" />
            {/* Lamp glow halo */}
            <circle cx="10" cy="-9" r="16" fill="#fef08a" opacity="0.35" />
          </g>

          {/* Lush Green Oak Tree (Left Edge) */}
          <g className={styles.treeSway} transform="translate(10, 100)">
            {/* Tree Trunk */}
            <path
              d="M 50 160 Q 65 100 55 60 Q 75 60 85 160 Z"
              fill="#78350f"
              stroke="#1e1e24"
              strokeWidth="3.4"
            />
            {/* Foliage clumps */}
            <circle cx="40" cy="50" r="44" fill="#65a30d" stroke="#1e1e24" strokeWidth="3" />
            <circle cx="85" cy="40" r="48" fill="#84cc16" stroke="#1e1e24" strokeWidth="3" />
            <circle cx="60" cy="15" r="42" fill="#4d7c0f" stroke="#1e1e24" strokeWidth="3" />
            <circle cx="30" cy="8" r="32" fill="#65a30d" stroke="#1e1e24" strokeWidth="2.8" />
          </g>

          {/* Colorful Park Wildflowers (Daisies, Buttercups, Lavender) */}
          <g id="flower-clusters">
            {/* Cluster 1 (near pond) */}
            <g transform="translate(100, 430)">
              <circle cx="0" cy="0" r="4" fill="#f43f5e" stroke="#1e1e24" strokeWidth="1.5" />
              <circle cx="12" cy="-4" r="5" fill="#facc15" stroke="#1e1e24" strokeWidth="1.5" />
              <circle cx="22" cy="2" r="4" fill="#a855f7" stroke="#1e1e24" strokeWidth="1.5" />
              <circle cx="8" cy="8" r="3.5" fill="#ffffff" stroke="#1e1e24" strokeWidth="1.5" />
            </g>

            {/* Cluster 2 (center grass) */}
            <g transform="translate(360, 480)">
              <circle cx="0" cy="0" r="5" fill="#ffffff" stroke="#1e1e24" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="2" fill="#facc15" />
              <circle cx="14" cy="6" r="4.5" fill="#fb7185" stroke="#1e1e24" strokeWidth="1.5" />
              <circle cx="-12" cy="8" r="4" fill="#38bdf8" stroke="#1e1e24" strokeWidth="1.5" />
            </g>

            {/* Cluster 3 (near path) */}
            <g transform="translate(710, 470)">
              <circle cx="0" cy="0" r="5" fill="#facc15" stroke="#1e1e24" strokeWidth="1.5" />
              <circle cx="12" cy="-5" r="4" fill="#ec4899" stroke="#1e1e24" strokeWidth="1.5" />
              <circle cx="8" cy="8" r="4" fill="#a855f7" stroke="#1e1e24" strokeWidth="1.5" />
            </g>
          </g>
        </svg>
      </div>

      {/* ============================================================== */}
      {/* LAYER 3: FOREGROUND BENCH, FRAMING FOLIAGE & SHADOWS           */}
      {/* ============================================================== */}
      <div
        className={styles.layerPlane}
        style={{ transform: `translate3d(${p3x}px, ${p3y}px, 0)` }}
      >
        <svg width="1000" height="600" viewBox="0 0 1000 600" fill="none">
          {/* Foreground Bench (Bottom Right - matching toon-world.jpg!) */}
          <g id="foreground-bench" transform="translate(820, 470)">
            {/* Ground shadow for bench */}
            <ellipse cx="60" cy="62" rx="66" ry="12" fill="rgba(30, 27, 36, 0.25)" />
            {/* Slats */}
            <rect x="0" y="0" width="115" height="10" rx="3" fill="#b45309" stroke="#1e1e24" strokeWidth="2.8" />
            <rect x="0" y="14" width="115" height="10" rx="3" fill="#b45309" stroke="#1e1e24" strokeWidth="2.8" />
            {/* Seat platform */}
            <rect x="-6" y="28" width="128" height="13" rx="4" fill="#d97706" stroke="#1e1e24" strokeWidth="3" />
            {/* Sturdy Curved Cast Iron Legs */}
            <path d="M 10 40 L 4 60" stroke="#1e1e24" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M 105 40 L 112 60" stroke="#1e1e24" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M 10 40 L 18 60" stroke="#1e1e24" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M 105 40 L 98 60" stroke="#1e1e24" strokeWidth="3.5" strokeLinecap="round" />
          </g>

          {/* Foreground Flower Bushes (Right framing) */}
          <g transform="translate(860, 530)">
            <circle cx="0" cy="15" r="30" fill="#15803d" stroke="#1e1e24" strokeWidth="3" />
            <circle cx="40" cy="10" r="36" fill="#16a34a" stroke="#1e1e24" strokeWidth="3" />
            <circle cx="85" cy="20" r="40" fill="#15803d" stroke="#1e1e24" strokeWidth="3" />
            {/* Pink and purple floral blooms */}
            <circle cx="10" cy="5" r="7" fill="#f43f5e" stroke="#1e1e24" strokeWidth="2" />
            <circle cx="36" cy="-4" r="8" fill="#fb7185" stroke="#1e1e24" strokeWidth="2" />
            <circle cx="65" cy="6" r="7.5" fill="#c084fc" stroke="#1e1e24" strokeWidth="2" />
            <circle cx="95" cy="10" r="7" fill="#f472b6" stroke="#1e1e24" strokeWidth="2" />
          </g>

          {/* Overhanging canopy framing branches (top left & top right) */}
          <g transform="translate(-10, -20)">
            <path
              d="M 0 0 C 40 40 80 30 140 20 C 180 14 200 40 240 25 C 220 80 120 90 0 80 Z"
              fill="#166534"
              stroke="#1e1e24"
              strokeWidth="3.2"
            />
            <circle cx="110" cy="35" r="25" fill="#15803d" stroke="#1e1e24" strokeWidth="2.6" />
          </g>
        </svg>
      </div>
    </>
  );
});
