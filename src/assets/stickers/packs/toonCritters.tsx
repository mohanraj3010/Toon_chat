import React, { type SVGProps } from 'react';
import type { StickerData } from '../types';

const defaultProps = {
  width: 120,
  height: 120,
  viewBox: '0 0 120 120',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
};

// 1. Cat
export const CritterCat: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Ears */}
    <polygon points="26,22 46,46 20,48" fill="#fb923c" stroke="#1e293b" strokeWidth="4" strokeLinejoin="round" />
    <polygon points="30,28 42,44 26,46" fill="#fecdd3" />
    <polygon points="94,22 74,46 100,48" fill="#fb923c" stroke="#1e293b" strokeWidth="4" strokeLinejoin="round" />
    <polygon points="90,28 78,44 94,46" fill="#fecdd3" />
    {/* Head */}
    <circle cx="60" cy="64" r="44" fill="#fb923c" stroke="#1e293b" strokeWidth="4" />
    <ellipse cx="60" cy="80" rx="22" ry="14" fill="#fff7ed" />
    {/* Eyes */}
    <ellipse cx="44" cy="54" rx="6" ry="9" fill="#1e293b" />
    <circle cx="46" cy="51" r="3" fill="#ffffff" />
    <ellipse cx="76" cy="54" rx="6" ry="9" fill="#1e293b" />
    <circle cx="78" cy="51" r="3" fill="#ffffff" />
    {/* Nose & Mouth */}
    <polygon points="60,66 55,62 65,62" fill="#f43f5e" />
    <path d="M52,70 Q60,76 60,67 Q60,76 68,70" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" fill="none" />
    {/* Whiskers */}
    <line x1="22" y1="62" x2="38" y2="65" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
    <line x1="20" y1="72" x2="36" y2="71" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
    <line x1="98" y1="62" x2="82" y2="65" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
    <line x1="100" y1="72" x2="84" y2="71" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// 2. Dog
export const CritterDog: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Floppy ears */}
    <path d="M26,36 C10,48 12,82 24,86 C32,88 34,70 30,50 Z" fill="#92400e" stroke="#1e293b" strokeWidth="4" />
    <path d="M94,36 C110,48 108,82 96,86 C88,88 86,70 90,50 Z" fill="#92400e" stroke="#1e293b" strokeWidth="4" />
    {/* Head */}
    <circle cx="60" cy="62" r="42" fill="#d97706" stroke="#1e293b" strokeWidth="4" />
    {/* Snout */}
    <ellipse cx="60" cy="74" rx="20" ry="14" fill="#fef3c7" stroke="#1e293b" strokeWidth="3.5" />
    {/* Eyes */}
    <circle cx="44" cy="52" r="7" fill="#1e293b" />
    <circle cx="46" cy="50" r="2.5" fill="#ffffff" />
    <circle cx="76" cy="52" r="7" fill="#1e293b" />
    <circle cx="78" cy="50" r="2.5" fill="#ffffff" />
    {/* Nose & Tongue */}
    <ellipse cx="60" cy="68" rx="8" ry="5" fill="#1e293b" />
    <path d="M54,80 Q60,98 66,80 Z" fill="#f43f5e" stroke="#1e293b" strokeWidth="3" />
    <line x1="60" y1="80" x2="60" y2="92" stroke="#1e293b" strokeWidth="2" />
  </svg>
);

// 3. Duck
export const CritterDuck: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Feathers tuft */}
    <path d="M56,16 Q60,24 62,28 Q68,20 64,16" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" fill="#fde047" />
    {/* Head */}
    <circle cx="60" cy="60" r="42" fill="#fde047" stroke="#1e293b" strokeWidth="4" />
    {/* Cheeks */}
    <ellipse cx="34" cy="64" rx="6" ry="4" fill="#fb923c" opacity="0.5" />
    <ellipse cx="86" cy="64" rx="6" ry="4" fill="#fb923c" opacity="0.5" />
    {/* Eyes */}
    <circle cx="42" cy="48" r="6" fill="#1e293b" />
    <circle cx="44" cy="46" r="2" fill="#ffffff" />
    <circle cx="78" cy="48" r="6" fill="#1e293b" />
    <circle cx="80" cy="46" r="2" fill="#ffffff" />
    {/* Big Orange Bill */}
    <path
      d="M36,66 C36,58 84,58 84,66 C84,78 68,84 60,84 C52,84 36,78 36,66 Z"
      fill="#f97316"
      stroke="#1e293b"
      strokeWidth="4"
    />
    <circle cx="54" cy="67" r="1.5" fill="#1e293b" />
    <circle cx="66" cy="67" r="1.5" fill="#1e293b" />
  </svg>
);

// 4. Bear
export const CritterBear: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Round ears */}
    <circle cx="28" cy="34" r="18" fill="#b45309" stroke="#1e293b" strokeWidth="4" />
    <circle cx="28" cy="34" r="10" fill="#fcd34d" />
    <circle cx="92" cy="34" r="18" fill="#b45309" stroke="#1e293b" strokeWidth="4" />
    <circle cx="92" cy="34" r="10" fill="#fcd34d" />
    {/* Head */}
    <circle cx="60" cy="64" r="44" fill="#b45309" stroke="#1e293b" strokeWidth="4" />
    {/* Muzzle */}
    <ellipse cx="60" cy="74" rx="22" ry="16" fill="#fef3c7" stroke="#1e293b" strokeWidth="3.5" />
    {/* Eyes */}
    <ellipse cx="44" cy="52" rx="5" ry="7" fill="#1e293b" />
    <circle cx="46" cy="50" r="2" fill="#ffffff" />
    <ellipse cx="76" cy="52" rx="5" ry="7" fill="#1e293b" />
    <circle cx="78" cy="50" r="2" fill="#ffffff" />
    {/* Nose & Smile */}
    <ellipse cx="60" cy="68" rx="8" ry="6" fill="#1e293b" />
    <path d="M52,78 Q60,86 68,78" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" fill="none" />
  </svg>
);

// 5. Bunny
export const CritterBunny: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Tall ears */}
    <path d="M38,54 C26,30 24,6 38,4 C50,2 48,26 44,54 Z" fill="#ffffff" stroke="#1e293b" strokeWidth="4" />
    <path d="M36,44 C30,26 30,12 38,10 C44,9 44,24 42,44 Z" fill="#fbcfe8" />
    <path d="M82,54 C70,30 72,6 84,4 C96,2 96,26 88,54 Z" fill="#ffffff" stroke="#1e293b" strokeWidth="4" />
    <path d="M80,44 C76,26 76,12 84,10 C90,9 90,24 84,44 Z" fill="#fbcfe8" />
    {/* Head */}
    <circle cx="60" cy="72" r="40" fill="#ffffff" stroke="#1e293b" strokeWidth="4" />
    {/* Cheeks */}
    <circle cx="34" cy="74" r="8" fill="#fbcfe8" opacity="0.6" />
    <circle cx="86" cy="74" r="8" fill="#fbcfe8" opacity="0.6" />
    {/* Eyes */}
    <circle cx="44" cy="62" r="6" fill="#1e293b" />
    <circle cx="46" cy="60" r="2" fill="#ffffff" />
    <circle cx="76" cy="62" r="6" fill="#1e293b" />
    <circle cx="78" cy="60" r="2" fill="#ffffff" />
    {/* Nose & Buck teeth */}
    <polygon points="60,72 56,68 64,68" fill="#f43f5e" />
    <path d="M54,76 Q60,82 66,76" stroke="#1e293b" strokeWidth="3" fill="none" />
    <rect x="56" y="78" width="8" height="6" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
  </svg>
);

// 6. Fox
export const CritterFox: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Large ears */}
    <polygon points="20,18 52,48 18,54" fill="#ea580c" stroke="#1e293b" strokeWidth="4" strokeLinejoin="round" />
    <polygon points="26,24 46,46 22,50" fill="#ffffff" />
    <polygon points="100,18 68,48 102,54" fill="#ea580c" stroke="#1e293b" strokeWidth="4" strokeLinejoin="round" />
    <polygon points="94,24 74,46 98,50" fill="#ffffff" />
    {/* Head */}
    <circle cx="60" cy="66" r="42" fill="#ea580c" stroke="#1e293b" strokeWidth="4" />
    {/* White cheeks mask */}
    <path d="M22,66 Q38,94 60,98 Q82,94 98,66 Q60,78 22,66 Z" fill="#ffffff" stroke="#1e293b" strokeWidth="3" />
    {/* Eyes */}
    <ellipse cx="42" cy="56" rx="5" ry="8" fill="#1e293b" />
    <circle cx="44" cy="53" r="2" fill="#ffffff" />
    <ellipse cx="78" cy="56" rx="5" ry="8" fill="#1e293b" />
    <circle cx="80" cy="53" r="2" fill="#ffffff" />
    {/* Nose */}
    <circle cx="60" cy="78" r="6" fill="#1e293b" />
  </svg>
);

// 7. Frog
export const CritterFrog: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Bulging eyes */}
    <circle cx="36" cy="38" r="18" fill="#22c55e" stroke="#1e293b" strokeWidth="4" />
    <circle cx="36" cy="38" r="10" fill="#ffffff" stroke="#1e293b" strokeWidth="2.5" />
    <circle cx="36" cy="38" r="5" fill="#1e293b" />
    <circle cx="84" cy="38" r="18" fill="#22c55e" stroke="#1e293b" strokeWidth="4" />
    <circle cx="84" cy="38" r="10" fill="#ffffff" stroke="#1e293b" strokeWidth="2.5" />
    <circle cx="84" cy="38" r="5" fill="#1e293b" />
    {/* Head */}
    <ellipse cx="60" cy="68" rx="46" ry="34" fill="#22c55e" stroke="#1e293b" strokeWidth="4" />
    {/* Rosy cheeks */}
    <circle cx="28" cy="68" r="7" fill="#f43f5e" opacity="0.5" />
    <circle cx="92" cy="68" r="7" fill="#f43f5e" opacity="0.5" />
    {/* Big happy mouth */}
    <path d="M26,68 Q60,102 94,68" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" fill="none" />
  </svg>
);

// 8. Penguin
export const CritterPenguin: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Head & Body */}
    <ellipse cx="60" cy="64" rx="42" ry="46" fill="#0f172a" stroke="#1e293b" strokeWidth="4" />
    {/* White Belly */}
    <ellipse cx="60" cy="72" rx="28" ry="34" fill="#ffffff" />
    {/* Flippers */}
    <path d="M18,60 Q10,78 24,84" stroke="#1e293b" strokeWidth="4" fill="#0f172a" />
    <path d="M102,60 Q110,78 96,84" stroke="#1e293b" strokeWidth="4" fill="#0f172a" />
    {/* Big round eyes */}
    <ellipse cx="44" cy="48" rx="6" ry="8" fill="#1e293b" />
    <circle cx="46" cy="46" r="2.5" fill="#ffffff" />
    <ellipse cx="76" cy="48" rx="6" ry="8" fill="#1e293b" />
    <circle cx="78" cy="46" r="2.5" fill="#ffffff" />
    {/* Beak */}
    <polygon points="60,64 50,56 70,56" fill="#f59e0b" stroke="#1e293b" strokeWidth="3" />
    {/* Bowtie */}
    <polygon points="52,80 60,84 52,88" fill="#ef4444" />
    <polygon points="68,80 60,84 68,88" fill="#ef4444" />
    <circle cx="60" cy="84" r="3" fill="#dc2626" />
  </svg>
);

// 9. Pig
export const CritterPig: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Pointy ears */}
    <polygon points="26,26 44,46 18,48" fill="#f472b6" stroke="#1e293b" strokeWidth="4" strokeLinejoin="round" />
    <polygon points="94,26 76,46 102,48" fill="#f472b6" stroke="#1e293b" strokeWidth="4" strokeLinejoin="round" />
    {/* Head */}
    <circle cx="60" cy="64" r="44" fill="#f472b6" stroke="#1e293b" strokeWidth="4" />
    {/* Snout */}
    <ellipse cx="60" cy="68" rx="18" ry="12" fill="#fbcfe8" stroke="#1e293b" strokeWidth="3.5" />
    <circle cx="53" cy="68" r="3.5" fill="#be185d" />
    <circle cx="67" cy="68" r="3.5" fill="#be185d" />
    {/* Eyes */}
    <ellipse cx="40" cy="50" rx="5" ry="8" fill="#1e293b" />
    <circle cx="42" cy="47" r="2" fill="#ffffff" />
    <ellipse cx="80" cy="50" rx="5" ry="8" fill="#1e293b" />
    <circle cx="82" cy="47" r="2" fill="#ffffff" />
    {/* Smile */}
    <path d="M50,86 Q60,94 70,86" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" fill="none" />
  </svg>
);

// 10. Owl
export const CritterOwl: React.FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...defaultProps} {...p}>
    {/* Head & Body */}
    <circle cx="60" cy="64" r="44" fill="#78350f" stroke="#1e293b" strokeWidth="4" />
    {/* Ear tufts */}
    <polygon points="24,20 44,38 22,44" fill="#78350f" stroke="#1e293b" strokeWidth="4" />
    <polygon points="96,20 76,38 98,44" fill="#78350f" stroke="#1e293b" strokeWidth="4" />
    {/* Giant eye discs */}
    <circle cx="42" cy="54" r="16" fill="#fde047" stroke="#1e293b" strokeWidth="3.5" />
    <circle cx="42" cy="54" r="8" fill="#1e293b" />
    <circle cx="45" cy="51" r="3" fill="#ffffff" />
    <circle cx="78" cy="54" r="16" fill="#fde047" stroke="#1e293b" strokeWidth="3.5" />
    <circle cx="78" cy="54" r="8" fill="#1e293b" />
    <circle cx="81" cy="51" r="3" fill="#ffffff" />
    {/* Beak */}
    <polygon points="60,68 54,58 66,58" fill="#f97316" stroke="#1e293b" strokeWidth="3" />
    {/* Chest feathers */}
    <path d="M48,82 Q60,88 72,82" stroke="#fef3c7" strokeWidth="3" strokeLinecap="round" fill="none" />
    <path d="M52,90 Q60,96 68,90" stroke="#fef3c7" strokeWidth="3" strokeLinecap="round" fill="none" />
  </svg>
);

export const TOON_CRITTERS_STICKERS: StickerData[] = [
  { id: 'critter-cat', name: 'Cat Smile', packId: 'toon-critters', tags: ['cat', 'kitten', 'pet', 'meow'], Component: CritterCat },
  { id: 'critter-dog', name: 'Happy Pup', packId: 'toon-critters', tags: ['dog', 'puppy', 'pet', 'woof'], Component: CritterDog },
  { id: 'critter-duck', name: 'Duckling', packId: 'toon-critters', tags: ['duck', 'quack', 'bird', 'yellow'], Component: CritterDuck },
  { id: 'critter-bear', name: 'Teddy Bear', packId: 'toon-critters', tags: ['bear', 'fuzzy', 'cute', 'hug'], Component: CritterBear },
  { id: 'critter-bunny', name: 'Bunny Hop', packId: 'toon-critters', tags: ['bunny', 'rabbit', 'carrot', 'hop'], Component: CritterBunny },
  { id: 'critter-fox', name: 'Clever Fox', packId: 'toon-critters', tags: ['fox', 'clever', 'wild', 'orange'], Component: CritterFox },
  { id: 'critter-frog', name: 'Ribbit Frog', packId: 'toon-critters', tags: ['frog', 'ribbit', 'green', 'pond'], Component: CritterFrog },
  { id: 'critter-penguin', name: 'Waddle Penguin', packId: 'toon-critters', tags: ['penguin', 'arctic', 'cold', 'bowtie'], Component: CritterPenguin },
  { id: 'critter-pig', name: 'Joyful Piggy', packId: 'toon-critters', tags: ['pig', 'piggy', 'pink', 'oink'], Component: CritterPig },
  { id: 'critter-owl', name: 'Wise Owl', packId: 'toon-critters', tags: ['owl', 'wise', 'night', 'hoot'], Component: CritterOwl },
];

