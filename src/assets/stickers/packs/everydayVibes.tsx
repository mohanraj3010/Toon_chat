import React, { type SVGProps } from 'react';
import type { StickerData } from '../types';

const defaultProps = {
  width: 120,
  height: 120,
  viewBox: '0 0 120 120',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
};

// 1. Coffee Mug
export const VibeCoffee: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Steam wisps */}
    <path d="M48,22 Q52,14 48,6" stroke="#d97706" strokeWidth="3" strokeLinecap="round" fill="none" />
    <path d="M60,20 Q64,10 60,4" stroke="#d97706" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    <path d="M72,22 Q76,14 72,6" stroke="#d97706" strokeWidth="3" strokeLinecap="round" fill="none" />
    {/* Mug Handle */}
    <path d="M84,48 C102,48 102,76 84,76" stroke="#1e293b" strokeWidth="4" fill="#fb923c" />
    {/* Mug Body */}
    <rect x="28" y="32" width="58" height="62" rx="10" fill="#f97316" stroke="#1e293b" strokeWidth="4" />
    {/* Eyes & Smile on mug */}
    <ellipse cx="46" cy="56" rx="4" ry="6" fill="#1e293b" />
    <circle cx="47" cy="54" r="1.5" fill="#ffffff" />
    <ellipse cx="68" cy="56" rx="4" ry="6" fill="#1e293b" />
    <circle cx="69" cy="54" r="1.5" fill="#ffffff" />
    <path d="M50,70 Q57,78 64,70" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" fill="none" />
    {/* Cheeks */}
    <circle cx="38" cy="64" r="4" fill="#f43f5e" opacity="0.6" />
    <circle cx="76" cy="64" r="4" fill="#f43f5e" opacity="0.6" />
  </svg>
);

// 2. Party Popper
export const VibeParty: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Popper Cone */}
    <polygon points="16,104 60,60 36,44" fill="#ec4899" stroke="#1e293b" strokeWidth="4" strokeLinejoin="round" />
    <polygon points="26,88 44,70 52,78 34,96" fill="#fde047" stroke="#1e293b" strokeWidth="2" />
    {/* Confetti Explosion */}
    <circle cx="70" cy="40" r="5" fill="#3b82f6" stroke="#1e293b" strokeWidth="2" />
    <rect x="80" y="24" width="8" height="8" rx="2" transform="rotate(25 80 24)" fill="#f97316" stroke="#1e293b" strokeWidth="2" />
    <circle cx="94" cy="50" r="6" fill="#22c55e" stroke="#1e293b" strokeWidth="2" />
    <rect x="62" y="16" width="9" height="7" rx="2" transform="rotate(-30 62 16)" fill="#a855f7" stroke="#1e293b" strokeWidth="2" />
    <circle cx="106" cy="28" r="4" fill="#ef4444" stroke="#1e293b" strokeWidth="1.5" />
    {/* Streamers */}
    <path d="M52,44 Q68,24 88,34 T110,18" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" fill="none" />
    <path d="M58,54 Q82,60 98,78" stroke="#facc15" strokeWidth="3" strokeLinecap="round" fill="none" />
  </svg>
);

// 3. Laptop Typing
export const VibeLaptop: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Screen */}
    <rect x="22" y="22" width="76" height="52" rx="6" fill="#38bdf8" stroke="#1e293b" strokeWidth="4" />
    <rect x="28" y="28" width="64" height="40" rx="3" fill="#0f172a" />
    {/* Cartoon face on screen */}
    <circle cx="48" cy="46" r="4" fill="#38bdf8" />
    <circle cx="72" cy="46" r="4" fill="#38bdf8" />
    <path d="M54,56 Q60,62 66,56" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    {/* Keyboard base */}
    <polygon points="12,86 108,86 98,74 22,74" fill="#94a3b8" stroke="#1e293b" strokeWidth="4" strokeLinejoin="round" />
    <rect x="44" y="78" width="32" height="4" rx="2" fill="#1e293b" />
    {/* Motion speed sparks */}
    <line x1="8" y1="68" x2="18" y2="72" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
    <line x1="102" y1="72" x2="112" y2="68" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// 4. High Five
export const VibeHighFive: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Left hand */}
    <path
      d="M14,84 C20,70 30,52 38,40 C42,34 46,38 44,46 L42,56 C46,46 52,42 54,48 L50,60 C54,52 60,50 60,56 L52,74 C48,84 36,92 22,94 Z"
      fill="#fde047"
      stroke="#1e293b"
      strokeWidth="3.5"
      strokeLinejoin="round"
    />
    {/* Right hand */}
    <path
      d="M106,84 C100,70 90,52 82,40 C78,34 74,38 76,46 L78,56 C74,46 68,42 66,48 L70,60 C66,52 60,50 60,56 L68,74 C72,84 84,92 98,94 Z"
      fill="#fb923c"
      stroke="#1e293b"
      strokeWidth="3.5"
      strokeLinejoin="round"
    />
    {/* Impact star in middle */}
    <polygon
      points="60,24 64,34 74,36 66,42 68,52 60,46 52,52 54,42 46,36 56,34"
      fill="#f43f5e"
      stroke="#1e293b"
      strokeWidth="2.5"
    />
  </svg>
);

// 5. Pizza Slice
export const VibePizza: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Crust */}
    <path d="M20,28 Q60,18 100,28 Q96,36 94,40 Q60,30 26,40 Z" fill="#d97706" stroke="#1e293b" strokeWidth="4" />
    {/* Cheese slice */}
    <polygon points="26,38 94,38 60,108" fill="#facc15" stroke="#1e293b" strokeWidth="4" strokeLinejoin="round" />
    {/* Pepperonis with face */}
    <circle cx="50" cy="54" r="7" fill="#dc2626" stroke="#1e293b" strokeWidth="2.5" />
    <circle cx="72" cy="58" r="8" fill="#dc2626" stroke="#1e293b" strokeWidth="2.5" />
    <circle cx="60" cy="82" r="6" fill="#dc2626" stroke="#1e293b" strokeWidth="2.5" />
    {/* Smiling eyes & mouth */}
    <circle cx="52" cy="68" r="3" fill="#1e293b" />
    <circle cx="68" cy="68" r="3" fill="#1e293b" />
    <path d="M56,73 Q60,78 64,73" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
  </svg>
);

// 6. Ice Cream Cone
export const VibeIceCream: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Cone */}
    <polygon points="36,66 84,66 60,116" fill="#f59e0b" stroke="#1e293b" strokeWidth="4" strokeLinejoin="round" />
    <line x1="44" y1="78" x2="76" y2="78" stroke="#d97706" strokeWidth="2" />
    <line x1="50" y1="94" x2="70" y2="94" stroke="#d97706" strokeWidth="2" />
    {/* Ice cream swirls */}
    <circle cx="44" cy="56" r="16" fill="#f472b6" stroke="#1e293b" strokeWidth="3.5" />
    <circle cx="76" cy="56" r="16" fill="#f472b6" stroke="#1e293b" strokeWidth="3.5" />
    <circle cx="60" cy="42" r="20" fill="#fbcfe8" stroke="#1e293b" strokeWidth="4" />
    {/* Cherry on top */}
    <circle cx="60" cy="20" r="9" fill="#dc2626" stroke="#1e293b" strokeWidth="3" />
    <path d="M60,14 Q70,4 74,8" stroke="#1e293b" strokeWidth="2.5" fill="none" />
    {/* Happy face */}
    <circle cx="54" cy="42" r="3" fill="#1e293b" />
    <circle cx="66" cy="42" r="3" fill="#1e293b" />
    <path d="M57,48 Q60,52 63,48" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

// 7. Eureka Lightbulb
export const VibeEureka: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Glow rays */}
    <line x1="60" y1="8" x2="60" y2="18" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
    <line x1="24" y1="28" x2="32" y2="34" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
    <line x1="96" y1="28" x2="88" y2="34" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
    <line x1="14" y1="58" x2="24" y2="58" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
    <line x1="106" y1="58" x2="96" y2="58" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
    {/* Bulb body */}
    <path
      d="M36,54 C36,40 46,30 60,30 C74,30 84,40 84,54 C84,66 74,74 74,82 L46,82 C46,74 36,66 36,54 Z"
      fill="#fde047"
      stroke="#1e293b"
      strokeWidth="4"
    />
    {/* Smiling face on bulb */}
    <circle cx="52" cy="52" r="3.5" fill="#1e293b" />
    <circle cx="68" cy="52" r="3.5" fill="#1e293b" />
    <path d="M54,62 Q60,68 66,62" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    {/* Screw base */}
    <rect x="48" y="84" width="24" height="6" rx="2" fill="#94a3b8" stroke="#1e293b" strokeWidth="3" />
    <rect x="52" y="92" width="16" height="5" rx="2" fill="#64748b" stroke="#1e293b" strokeWidth="2.5" />
  </svg>
);

// 8. Champion Trophy
export const VibeTrophy: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Handles */}
    <path d="M30,34 C16,34 16,62 34,64" stroke="#1e293b" strokeWidth="4" fill="none" />
    <path d="M90,34 C104,34 104,62 86,64" stroke="#1e293b" strokeWidth="4" fill="none" />
    {/* Cup */}
    <path
      d="M30,24 L90,24 C90,56 76,70 60,70 C44,70 30,56 30,24 Z"
      fill="#facc15"
      stroke="#1e293b"
      strokeWidth="4"
    />
    {/* Star emblem */}
    <polygon
      points="60,34 63,42 72,43 65,49 67,58 60,53 53,58 55,49 48,43 57,42"
      fill="#ea580c"
    />
    {/* Stem & Base */}
    <rect x="54" y="70" width="12" height="18" fill="#eab308" stroke="#1e293b" strokeWidth="3" />
    <rect x="38" y="88" width="44" height="16" rx="4" fill="#92400e" stroke="#1e293b" strokeWidth="4" />
  </svg>
);

// 9. Rocket Blastoff
export const VibeRocket: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Exhaust flame */}
    <polygon points="52,86 60,114 68,86" fill="#f97316" stroke="#1e293b" strokeWidth="3" />
    <polygon points="56,86 60,102 64,86" fill="#fde047" />
    {/* Side fins */}
    <polygon points="34,80 46,62 46,84" fill="#ef4444" stroke="#1e293b" strokeWidth="3.5" />
    <polygon points="86,80 74,62 74,84" fill="#ef4444" stroke="#1e293b" strokeWidth="3.5" />
    {/* Rocket body */}
    <path
      d="M46,84 L46,44 C46,24 60,10 60,10 C60,10 74,24 74,44 L74,84 Z"
      fill="#ffffff"
      stroke="#1e293b"
      strokeWidth="4"
    />
    {/* Porthole */}
    <circle cx="60" cy="44" r="10" fill="#38bdf8" stroke="#1e293b" strokeWidth="3" />
    <circle cx="62" cy="42" r="3" fill="#ffffff" />
  </svg>
);

// 10. Chill Music Headphones
export const VibeMusic: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Headband */}
    <path d="M26,64 C26,30 94,30 94,64" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" fill="none" />
    {/* Earcups */}
    <rect x="18" y="54" width="16" height="30" rx="8" fill="#8b5cf6" stroke="#1e293b" strokeWidth="4" />
    <rect x="86" y="54" width="16" height="30" rx="8" fill="#8b5cf6" stroke="#1e293b" strokeWidth="4" />
    {/* Musical notes */}
    <path d="M46,80 L46,62 L66,54 L66,74" stroke="#ec4899" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    <ellipse cx="40" cy="80" rx="6" ry="4" fill="#ec4899" />
    <ellipse cx="60" cy="74" rx="6" ry="4" fill="#ec4899" />
  </svg>
);

export const EVERYDAY_VIBES_STICKERS: StickerData[] = [
  { id: 'vibe-coffee', name: 'Coffee Cup', packId: 'everyday-vibes', tags: ['coffee', 'mug', 'morning', 'work'], Component: VibeCoffee },
  { id: 'vibe-party', name: 'Party Popper', packId: 'everyday-vibes', tags: ['party', 'celebrate', 'popper', 'confetti'], Component: VibeParty },
  { id: 'vibe-laptop', name: 'Laptop Work', packId: 'everyday-vibes', tags: ['laptop', 'code', 'work', 'typing'], Component: VibeLaptop },
  { id: 'vibe-highfive', name: 'High Five', packId: 'everyday-vibes', tags: ['highfive', 'clap', 'team', 'cheers'], Component: VibeHighFive },
  { id: 'vibe-pizza', name: 'Pizza Slice', packId: 'everyday-vibes', tags: ['pizza', 'food', 'snack', 'cheese'], Component: VibePizza },
  { id: 'vibe-icecream', name: 'Ice Cream', packId: 'everyday-vibes', tags: ['icecream', 'sweet', 'summer', 'treat'], Component: VibeIceCream },
  { id: 'vibe-eureka', name: 'Eureka Bulb', packId: 'everyday-vibes', tags: ['idea', 'bulb', 'light', 'eureka'], Component: VibeEureka },
  { id: 'vibe-trophy', name: 'Winner Trophy', packId: 'everyday-vibes', tags: ['trophy', 'win', 'gold', 'champion'], Component: VibeTrophy },
  { id: 'vibe-rocket', name: 'Rocket Blast', packId: 'everyday-vibes', tags: ['rocket', 'launch', 'space', 'blastoff'], Component: VibeRocket },
  { id: 'vibe-music', name: 'Chill Tunes', packId: 'everyday-vibes', tags: ['music', 'headphones', 'chill', 'beats'], Component: VibeMusic },
];

