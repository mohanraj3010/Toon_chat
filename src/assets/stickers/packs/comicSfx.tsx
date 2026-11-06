import React, { type SVGProps } from 'react';
import type { StickerData } from '../types';

const defaultProps = {
  width: 120,
  height: 120,
  viewBox: '0 0 120 120',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
};

// 1. BOOM!
export const SfxBoom: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Outer orange burst */}
    <polygon
      points="60,6 74,32 104,20 96,48 118,62 94,76 106,104 76,94 62,118 46,94 16,106 24,76 2,60 24,46 14,18 44,30"
      fill="#f97316"
      stroke="#1e293b"
      strokeWidth="4"
      strokeLinejoin="round"
    />
    {/* Inner yellow burst */}
    <polygon
      points="60,18 70,38 92,30 86,52 102,62 84,72 92,92 72,84 62,102 50,84 28,92 34,72 18,60 34,50 26,30 48,38"
      fill="#fde047"
    />
    {/* BOOM text */}
    <text
      x="60"
      y="70"
      fontSize="26"
      fontWeight="900"
      fontFamily="var(--font-display, Fredoka, impact, cursive)"
      textAnchor="middle"
      fill="#dc2626"
      stroke="#1e293b"
      strokeWidth="2.5"
      paintOrder="stroke fill"
    >
      BOOM!
    </text>
  </svg>
);

// 2. WOW!
export const SfxWow: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Cyan sunburst badge */}
    <polygon
      points="60,8 72,26 94,14 92,36 112,42 98,58 114,74 94,80 96,102 74,94 62,112 48,94 26,102 28,80 8,74 24,58 10,42 30,36 28,14 50,26"
      fill="#38bdf8"
      stroke="#1e293b"
      strokeWidth="4"
      strokeLinejoin="round"
    />
    <circle cx="60" cy="60" r="34" fill="#ffffff" stroke="#1e293b" strokeWidth="3" />
    <text
      x="60"
      y="69"
      fontSize="26"
      fontWeight="900"
      fontFamily="var(--font-display, Fredoka, cursive)"
      textAnchor="middle"
      fill="#ea580c"
      stroke="#1e293b"
      strokeWidth="2"
      paintOrder="stroke fill"
    >
      WOW!
    </text>
  </svg>
);

// 3. POP!
export const SfxPop: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Popping droplet burst */}
    <circle cx="60" cy="60" r="44" fill="#a855f7" stroke="#1e293b" strokeWidth="4" />
    <circle cx="60" cy="60" r="34" fill="#fbcfe8" />
    {/* Tiny pop droplets */}
    <circle cx="20" cy="30" r="5" fill="#a855f7" stroke="#1e293b" strokeWidth="2" />
    <circle cx="100" cy="24" r="6" fill="#a855f7" stroke="#1e293b" strokeWidth="2" />
    <circle cx="106" cy="80" r="4" fill="#a855f7" stroke="#1e293b" strokeWidth="2" />
    <circle cx="18" cy="86" r="5" fill="#a855f7" stroke="#1e293b" strokeWidth="2" />
    <text
      x="60"
      y="70"
      fontSize="30"
      fontWeight="900"
      fontFamily="var(--font-display, Fredoka, cursive)"
      textAnchor="middle"
      fill="#ffffff"
      stroke="#1e293b"
      strokeWidth="3.5"
      paintOrder="stroke fill"
    >
      POP!
    </text>
  </svg>
);

// 4. ZZZ
export const SfxZzz: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Cloud shape */}
    <path
      d="M36,78 C22,78 14,66 22,54 C16,42 28,28 42,32 C50,20 70,18 80,30 C94,24 106,38 100,52 C110,64 100,78 88,78 Z"
      fill="#c7d2fe"
      stroke="#1e293b"
      strokeWidth="4"
    />
    <text
      x="42"
      y="62"
      fontSize="24"
      fontWeight="900"
      fontFamily="var(--font-display, Fredoka, cursive)"
      fill="#4338ca"
      stroke="#1e293b"
      strokeWidth="2"
      paintOrder="stroke fill"
    >
      Z
    </text>
    <text
      x="62"
      y="52"
      fontSize="28"
      fontWeight="900"
      fontFamily="var(--font-display, Fredoka, cursive)"
      fill="#6366f1"
      stroke="#1e293b"
      strokeWidth="2"
      paintOrder="stroke fill"
    >
      Z
    </text>
    <text
      x="82"
      y="42"
      fontSize="32"
      fontWeight="900"
      fontFamily="var(--font-display, Fredoka, cursive)"
      fill="#4f46e5"
      stroke="#1e293b"
      strokeWidth="2"
      paintOrder="stroke fill"
    >
      z
    </text>
  </svg>
);

// 5. OOPS!
export const SfxOops: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Wobbly oval pill */}
    <rect
      x="12"
      y="26"
      width="96"
      height="68"
      rx="34"
      fill="#fb7185"
      stroke="#1e293b"
      strokeWidth="4"
    />
    <circle cx="94" cy="22" r="8" fill="#38bdf8" stroke="#1e293b" strokeWidth="2.5" />
    <text
      x="60"
      y="70"
      fontSize="26"
      fontWeight="900"
      fontFamily="var(--font-display, Fredoka, cursive)"
      textAnchor="middle"
      fill="#ffffff"
      stroke="#1e293b"
      strokeWidth="3"
      paintOrder="stroke fill"
    >
      OOPS!
    </text>
  </svg>
);

// 6. BANG!
export const SfxBang: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    <polygon
      points="60,8 78,32 108,18 94,48 116,68 88,78 98,110 70,92 56,116 44,88 14,102 28,74 6,56 32,46 18,20 48,32"
      fill="#ef4444"
      stroke="#1e293b"
      strokeWidth="4"
      strokeLinejoin="round"
    />
    <polygon
      points="60,20 74,38 96,28 86,50 102,64 82,72 88,94 68,82 58,98 48,78 28,88 38,68 22,54 40,46 30,28 50,38"
      fill="#fde047"
    />
    <text
      x="60"
      y="70"
      fontSize="26"
      fontWeight="900"
      fontFamily="var(--font-display, Fredoka, cursive)"
      textAnchor="middle"
      fill="#0f172a"
      stroke="#ffffff"
      strokeWidth="2"
      paintOrder="stroke fill"
    >
      BANG!
    </text>
  </svg>
);

// 7. YAY!
export const SfxYay: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Rainbow burst arches */}
    <path d="M16,84 C16,40 104,40 104,84" stroke="#f43f5e" strokeWidth="12" strokeLinecap="round" fill="none" />
    <path d="M26,84 C26,50 94,50 94,84" stroke="#facc15" strokeWidth="10" strokeLinecap="round" fill="none" />
    <path d="M34,84 C34,60 86,60 86,84" stroke="#38bdf8" strokeWidth="8" strokeLinecap="round" fill="none" />
    {/* Sparkles */}
    <circle cx="28" cy="30" r="4" fill="#facc15" />
    <circle cx="92" cy="28" r="5" fill="#f43f5e" />
    <circle cx="60" cy="20" r="4" fill="#38bdf8" />
    <text
      x="60"
      y="90"
      fontSize="30"
      fontWeight="900"
      fontFamily="var(--font-display, Fredoka, cursive)"
      textAnchor="middle"
      fill="#ffffff"
      stroke="#1e293b"
      strokeWidth="4"
      paintOrder="stroke fill"
    >
      YAY!
    </text>
  </svg>
);

// 8. WHOOSH!
export const SfxWhoosh: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Wind motion trails */}
    <path d="M12,42 Q60,34 104,48" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" fill="none" />
    <path d="M24,62 Q70,54 110,70" stroke="#818cf8" strokeWidth="6" strokeLinecap="round" fill="none" />
    <path d="M8,82 Q50,74 96,86" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" fill="none" />
    <text
      x="58"
      y="66"
      fontSize="22"
      fontWeight="900"
      fontStyle="italic"
      fontFamily="var(--font-display, Fredoka, cursive)"
      textAnchor="middle"
      fill="#ffffff"
      stroke="#1e293b"
      strokeWidth="3.5"
      paintOrder="stroke fill"
    >
      WHOOSH!
    </text>
  </svg>
);

// 9. OUCH!
export const SfxOuch: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Band-aid shape */}
    <rect
      x="18"
      y="40"
      width="84"
      height="40"
      rx="20"
      transform="rotate(-15 60 60)"
      fill="#fdba74"
      stroke="#1e293b"
      strokeWidth="4"
    />
    <rect
      x="46"
      y="38"
      width="28"
      height="44"
      transform="rotate(-15 60 60)"
      fill="#fed7aa"
      stroke="#1e293b"
      strokeWidth="2"
    />
    <text
      x="60"
      y="68"
      fontSize="24"
      fontWeight="900"
      fontFamily="var(--font-display, Fredoka, cursive)"
      textAnchor="middle"
      fill="#dc2626"
      stroke="#1e293b"
      strokeWidth="2.5"
      paintOrder="stroke fill"
    >
      OUCH!
    </text>
  </svg>
);

// 10. LOL!
export const SfxLol: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    <circle cx="60" cy="60" r="48" fill="#facc15" stroke="#1e293b" strokeWidth="4" />
    <ellipse cx="60" cy="74" rx="28" ry="18" fill="#dc2626" stroke="#1e293b" strokeWidth="3" />
    <path d="M42,74 Q60,88 78,74" fill="#fb7185" />
    <text
      x="60"
      y="54"
      fontSize="32"
      fontWeight="900"
      fontFamily="var(--font-display, Fredoka, cursive)"
      textAnchor="middle"
      fill="#ffffff"
      stroke="#1e293b"
      strokeWidth="4"
      paintOrder="stroke fill"
    >
      LOL!
    </text>
  </svg>
);

export const COMIC_SFX_STICKERS: StickerData[] = [
  { id: 'sfx-boom', name: 'Boom Burst', packId: 'comic-sfx', tags: ['boom', 'explosion', 'sfx', 'fire'], Component: SfxBoom },
  { id: 'sfx-wow', name: 'Wow Star', packId: 'comic-sfx', tags: ['wow', 'surprise', 'star', 'amaze'], Component: SfxWow },
  { id: 'sfx-pop', name: 'Pop Burst', packId: 'comic-sfx', tags: ['pop', 'burst', 'bubble', 'fun'], Component: SfxPop },
  { id: 'sfx-zzz', name: 'Zzz Sleep', packId: 'comic-sfx', tags: ['zzz', 'sleep', 'cloud', 'tired'], Component: SfxZzz },
  { id: 'sfx-oops', name: 'Oops Drop', packId: 'comic-sfx', tags: ['oops', 'mistake', 'sorry', 'sweat'], Component: SfxOops },
  { id: 'sfx-bang', name: 'Bang Flash', packId: 'comic-sfx', tags: ['bang', 'impact', 'burst', 'loud'], Component: SfxBang },
  { id: 'sfx-yay', name: 'Yay Banner', packId: 'comic-sfx', tags: ['yay', 'hooray', 'celebrate', 'rainbow'], Component: SfxYay },
  { id: 'sfx-whoosh', name: 'Whoosh Speed', packId: 'comic-sfx', tags: ['whoosh', 'fast', 'speed', 'wind'], Component: SfxWhoosh },
  { id: 'sfx-ouch', name: 'Ouch Hurt', packId: 'comic-sfx', tags: ['ouch', 'hurt', 'pain', 'bandaid'], Component: SfxOuch },
  { id: 'sfx-lol', name: 'LOL Laugh', packId: 'comic-sfx', tags: ['lol', 'laugh', 'haha', 'funny'], Component: SfxLol },
];

