import React, { type SVGProps } from 'react';
import type { StickerData } from '../types';

const defaultProps = {
  width: 120,
  height: 120,
  viewBox: '0 0 120 120',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
};

// 1. Grinning Toon
export const ToonGrinning: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    <circle cx="60" cy="60" r="50" fill="#fde047" stroke="#1e293b" strokeWidth="4" />
    {/* Highlights */}
    <ellipse cx="40" cy="30" rx="12" ry="6" fill="#fef08a" opacity="0.6" />
    {/* Cheeks */}
    <ellipse cx="28" cy="64" rx="8" ry="5" fill="#f43f5e" opacity="0.5" />
    <ellipse cx="92" cy="64" rx="8" ry="5" fill="#f43f5e" opacity="0.5" />
    {/* Eyes */}
    <ellipse cx="42" cy="46" rx="6" ry="10" fill="#1e293b" />
    <circle cx="44" cy="42" r="3" fill="#ffffff" />
    <ellipse cx="78" cy="46" rx="6" ry="10" fill="#1e293b" />
    <circle cx="80" cy="42" r="3" fill="#ffffff" />
    {/* Big smile with teeth */}
    <path
      d="M32,66 Q60,102 88,66 Z"
      fill="#dc2626"
      stroke="#1e293b"
      strokeWidth="4"
      strokeLinejoin="round"
    />
    <path d="M38,68 Q60,78 82,68" stroke="#1e293b" strokeWidth="3" fill="#ffffff" />
    <path d="M48,82 Q60,76 72,82 Q60,94 48,82 Z" fill="#fb7185" />
  </svg>
);

// 2. Star Eyes Toon
export const ToonStarEyes: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    <circle cx="60" cy="60" r="50" fill="#fde047" stroke="#1e293b" strokeWidth="4" />
    <ellipse cx="40" cy="30" rx="12" ry="6" fill="#fef08a" opacity="0.6" />
    {/* Star Eyes */}
    <polygon
      points="42,32 45,41 54,42 47,48 49,57 42,52 35,57 37,48 30,42 39,41"
      fill="#38bdf8"
      stroke="#1e293b"
      strokeWidth="3"
    />
    <polygon
      points="78,32 81,41 90,42 83,48 85,57 78,52 71,57 73,48 66,42 75,41"
      fill="#38bdf8"
      stroke="#1e293b"
      strokeWidth="3"
    />
    {/* Open mouth */}
    <ellipse cx="26" cy="65" rx="8" ry="5" fill="#f43f5e" opacity="0.4" />
    <ellipse cx="94" cy="65" rx="8" ry="5" fill="#f43f5e" opacity="0.4" />
    <path d="M40,70 Q60,96 80,70 Z" fill="#b91c1c" stroke="#1e293b" strokeWidth="4" />
    <path d="M48,82 Q60,78 72,82 Q60,92 48,82" fill="#fb7185" />
  </svg>
);

// 3. Crying Laughing Toon
export const ToonCryingLaughing: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    <circle cx="60" cy="60" r="50" fill="#fde047" stroke="#1e293b" strokeWidth="4" />
    {/* Squint Eyes */}
    <path d="M30,48 Q42,38 52,48" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
    <path d="M68,48 Q78,38 90,48" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
    {/* Teardrops */}
    <path d="M22,46 C12,46 14,34 22,30 C30,34 32,46 22,46 Z" fill="#38bdf8" stroke="#1e293b" strokeWidth="3" />
    <path d="M98,46 C88,46 90,34 98,30 C106,34 108,46 98,46 Z" fill="#38bdf8" stroke="#1e293b" strokeWidth="3" />
    {/* Wide open grin */}
    <path d="M32,60 Q60,105 88,60 Z" fill="#991b1b" stroke="#1e293b" strokeWidth="4" />
    <path d="M36,63 Q60,72 84,63" fill="#ffffff" stroke="#1e293b" strokeWidth="3" />
    <ellipse cx="60" cy="85" rx="14" ry="9" fill="#fb7185" />
  </svg>
);

// 4. Mischief Smirk Toon
export const ToonMischief: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    <circle cx="60" cy="60" r="50" fill="#a78bfa" stroke="#1e293b" strokeWidth="4" />
    {/* Eyebrows */}
    <path d="M34,36 Q44,32 52,40" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
    <path d="M68,40 Q78,32 86,34" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
    {/* Sly Eyes */}
    <ellipse cx="44" cy="48" rx="7" ry="9" fill="#ffffff" stroke="#1e293b" strokeWidth="3" />
    <circle cx="46" cy="48" r="4" fill="#1e293b" />
    <path d="M72,49 Q80,44 86,49" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
    {/* Smirk */}
    <path d="M44,74 Q68,78 82,62" stroke="#1e293b" strokeWidth="4.5" strokeLinecap="round" />
    <path d="M80,60 Q86,63 83,68" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
  </svg>
);

// 5. Heart Eyes Toon
export const ToonHeartEyes: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    <circle cx="60" cy="60" r="50" fill="#fde047" stroke="#1e293b" strokeWidth="4" />
    {/* Heart eyes */}
    <path
      d="M34,42 C30,34 20,38 24,48 C28,54 40,64 40,64 C40,64 52,54 56,48 C60,38 50,34 46,42 C44,45 42,46 40,46 C38,46 36,45 34,42 Z"
      fill="#ef4444"
      stroke="#1e293b"
      strokeWidth="3.5"
    />
    <path
      d="M74,42 C70,34 60,38 64,48 C68,54 80,64 80,64 C80,64 92,54 96,48 C100,38 90,34 86,42 C84,45 82,46 80,46 C78,46 76,45 74,42 Z"
      fill="#ef4444"
      stroke="#1e293b"
      strokeWidth="3.5"
    />
    {/* Open happy mouth */}
    <path d="M42,75 Q60,95 78,75 Z" fill="#991b1b" stroke="#1e293b" strokeWidth="4" />
    <ellipse cx="60" cy="85" rx="8" ry="5" fill="#fb7185" />
  </svg>
);

// 6. Shocked Toon
export const ToonShocked: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    <circle cx="60" cy="60" r="50" fill="#67e8f9" stroke="#1e293b" strokeWidth="4" />
    {/* Big round eyes */}
    <circle cx="42" cy="46" r="14" fill="#ffffff" stroke="#1e293b" strokeWidth="3.5" />
    <circle cx="42" cy="46" r="4" fill="#1e293b" />
    <circle cx="78" cy="46" r="14" fill="#ffffff" stroke="#1e293b" strokeWidth="3.5" />
    <circle cx="78" cy="46" r="4" fill="#1e293b" />
    {/* O-Mouth */}
    <ellipse cx="60" cy="82" rx="12" ry="16" fill="#1e293b" stroke="#1e293b" strokeWidth="3" />
    <ellipse cx="60" cy="86" rx="8" ry="8" fill="#991b1b" />
    {/* Shock lines */}
    <path d="M18,36 L10,32" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
    <path d="M102,36 L110,32" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// 7. Cool Sunglasses Toon
export const ToonCool: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    <circle cx="60" cy="60" r="50" fill="#fde047" stroke="#1e293b" strokeWidth="4" />
    {/* Sunglasses */}
    <path
      d="M20,44 C20,38 34,36 54,38 L54,54 C54,62 38,62 26,58 C21,55 20,49 20,44 Z"
      fill="#0f172a"
      stroke="#1e293b"
      strokeWidth="3.5"
    />
    <path
      d="M66,38 C86,36 100,38 100,44 C100,49 99,55 94,58 C82,62 66,62 66,54 Z"
      fill="#0f172a"
      stroke="#1e293b"
      strokeWidth="3.5"
    />
    <path d="M52,44 L68,44" stroke="#1e293b" strokeWidth="4" />
    {/* Sheen lines */}
    <line x1="26" y1="42" x2="42" y2="56" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
    <line x1="72" y1="42" x2="88" y2="56" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
    {/* Confident smirk */}
    <path d="M42,76 Q62,86 78,74" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

// 8. Hypnotic Dizzy Toon
export const ToonDizzy: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    <circle cx="60" cy="60" r="50" fill="#f472b6" stroke="#1e293b" strokeWidth="4" />
    {/* Spirals for eyes */}
    <circle cx="42" cy="46" r="12" fill="#ffffff" stroke="#1e293b" strokeWidth="3" />
    <path d="M42,46 m-6,0 a6,6 0 1,0 12,0 a3,3 0 1,0 -6,0" stroke="#1e293b" strokeWidth="2.5" fill="none" />
    <circle cx="78" cy="46" r="12" fill="#ffffff" stroke="#1e293b" strokeWidth="3" />
    <path d="M78,46 m-6,0 a6,6 0 1,0 12,0 a3,3 0 1,0 -6,0" stroke="#1e293b" strokeWidth="2.5" fill="none" />
    {/* Wobbly mouth */}
    <path d="M38,78 Q48,72 58,78 T78,78" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" fill="none" />
  </svg>
);

// 9. Sleeping Toon
export const ToonSleeping: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    <circle cx="60" cy="60" r="50" fill="#93c5fd" stroke="#1e293b" strokeWidth="4" />
    {/* Closed eyes */}
    <path d="M32,48 Q42,56 52,48" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M68,48 Q78,56 88,48" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" fill="none" />
    {/* Peaceful mouth + snot bubble */}
    <ellipse cx="56" cy="74" rx="8" ry="6" fill="#1e293b" />
    <circle cx="74" cy="68" r="10" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="2.5" opacity="0.85" />
    <circle cx="71" cy="65" r="3" fill="#ffffff" />
    {/* Zzz text */}
    <text x="96" y="32" fontSize="18" fontWeight="bold" fill="#3b82f6" fontFamily="var(--font-display, Fredoka, cursive)">Z</text>
    <text x="104" y="20" fontSize="12" fontWeight="bold" fill="#60a5fa" fontFamily="var(--font-display, Fredoka, cursive)">z</text>
  </svg>
);

// 10. Playful Wink Toon
export const ToonWink: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    <circle cx="60" cy="60" r="50" fill="#fde047" stroke="#1e293b" strokeWidth="4" />
    {/* Left eye open, right eye winking */}
    <ellipse cx="40" cy="46" rx="7" ry="10" fill="#1e293b" />
    <circle cx="42" cy="42" r="3" fill="#ffffff" />
    <path d="M68,46 Q78,38 88,48" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" fill="none" />
    {/* Cheeks */}
    <ellipse cx="26" cy="64" rx="7" ry="4" fill="#fb7185" opacity="0.6" />
    <ellipse cx="94" cy="64" rx="7" ry="4" fill="#fb7185" opacity="0.6" />
    {/* Smile + tongue */}
    <path d="M38,68 Q60,94 82,68" stroke="#1e293b" strokeWidth="4" fill="#991b1b" />
    <path d="M48,76 Q60,96 72,76 Z" fill="#f43f5e" stroke="#1e293b" strokeWidth="3" />
    <line x1="60" y1="76" x2="60" y2="88" stroke="#1e293b" strokeWidth="2" />
  </svg>
);

export const CLASSIC_TOONS_STICKERS: StickerData[] = [
  { id: 'toon-grinning', name: 'Grinning', packId: 'classic-toons', tags: ['smile', 'happy', 'grin', 'joy'], Component: ToonGrinning },
  { id: 'toon-star-eyes', name: 'Star Eyes', packId: 'classic-toons', tags: ['stars', 'amazed', 'excited', 'wow'], Component: ToonStarEyes },
  { id: 'toon-crying-laughing', name: 'Cry Laugh', packId: 'classic-toons', tags: ['laugh', 'lol', 'funny', 'tears'], Component: ToonCryingLaughing },
  { id: 'toon-mischief', name: 'Mischief', packId: 'classic-toons', tags: ['smirk', 'sly', 'evil', 'clever'], Component: ToonMischief },
  { id: 'toon-heart-eyes', name: 'Heart Eyes', packId: 'classic-toons', tags: ['love', 'crush', 'heart', 'adore'], Component: ToonHeartEyes },
  { id: 'toon-shocked', name: 'Shocked', packId: 'classic-toons', tags: ['shock', 'omg', 'gasp', 'surprised'], Component: ToonShocked },
  { id: 'toon-cool', name: 'Cool Shades', packId: 'classic-toons', tags: ['cool', 'shades', 'chill', 'sunglasses'], Component: ToonCool },
  { id: 'toon-dizzy', name: 'Dizzy', packId: 'classic-toons', tags: ['dizzy', 'hypnotic', 'confused', 'woah'], Component: ToonDizzy },
  { id: 'toon-sleeping', name: 'Sleeping', packId: 'classic-toons', tags: ['sleep', 'zzz', 'tired', 'rest'], Component: ToonSleeping },
  { id: 'toon-wink', name: 'Playful Wink', packId: 'classic-toons', tags: ['wink', 'tongue', 'playful', 'silly'], Component: ToonWink },
];

