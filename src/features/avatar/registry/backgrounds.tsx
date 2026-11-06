import type { AvatarPart, RenderContext } from './types';

export const BACKGROUNDS: AvatarPart[] = [
  // 1. Pastel Rainbow Swirl (Reference match)
  {
    id: 'bg-pastel-swirl',
    category: 'background',
    subcategory: 'background',
    label: 'Pastel Dream',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { backgroundColor = '#f3e8ff' } = ctx.config;
      return (
        <g id="bg-swirl">
          <defs>
            <radialGradient id="grad-swirl" cx="50%" cy="40%" r="65%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.7" />
              <stop offset="45%" stopColor="#fed7aa" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#fbcfe8" stopOpacity="0.6" />
              <stop offset="100%" stopColor={backgroundColor} />
            </radialGradient>
          </defs>
          <rect width="200" height="240" fill="url(#grad-swirl)" />
          {/* Floating Confetti / Sparkles */}
          <polygon points="35,45 37,50 42,51 38,55 39,60 35,57 31,60 32,55 28,51 33,50" fill="#f472b6" opacity={0.6} />
          <polygon points="165,65 167,70 172,71 168,75 169,80 165,77 161,80 162,75 158,71 163,70" fill="#38bdf8" opacity={0.7} />
          <circle cx="48" cy="88" r="3" fill="#fde047" opacity={0.8} />
          <circle cx="152" cy="110" r="3.5" fill="#f472b6" opacity={0.7} />
          <circle cx="140" cy="40" r="2.5" fill="#a7f3d0" opacity={0.8} />
          <circle cx="28" cy="120" r="2.5" fill="#c084fc" opacity={0.8} />
          <rect x="52" y="32" width="6" height="3" rx="1.5" fill="#38bdf8" transform="rotate(25 52 32)" opacity={0.7} />
          <rect x="156" y="140" width="7" height="3" rx="1.5" fill="#fde047" transform="rotate(-30 156 140)" opacity={0.7} />
        </g>
      );
    },
  },

  // 2. Maple Park Afternoon
  {
    id: 'bg-maple-park',
    category: 'background',
    subcategory: 'background',
    label: 'Maple Park Day',
    unlockedByDefault: true,
    render: () => {
      return (
        <g id="bg-maple">
          <defs>
            <linearGradient id="grad-sky" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="65%" stopColor="#e0f2fe" />
              <stop offset="100%" stopColor="#d1fae5" />
            </linearGradient>
          </defs>
          <rect width="200" height="240" fill="url(#grad-sky)" />
          {/* Fluffy clouds */}
          <circle cx="40" cy="50" r="16" fill="#ffffff" opacity={0.85} />
          <circle cx="56" cy="46" r="20" fill="#ffffff" opacity={0.85} />
          <circle cx="72" cy="50" r="14" fill="#ffffff" opacity={0.85} />
          <circle cx="150" cy="38" r="14" fill="#ffffff" opacity={0.8} />
          <circle cx="166" cy="36" r="18" fill="#ffffff" opacity={0.8} />
          {/* Golden sun */}
          <circle cx="100" cy="20" r="16" fill="#fde047" opacity={0.65} />
        </g>
      );
    },
  },

  // 3. Sunset Glow
  {
    id: 'bg-sunset-glow',
    category: 'background',
    subcategory: 'background',
    label: 'Sunset Horizon',
    unlockedByDefault: true,
    render: () => {
      return (
        <g id="bg-sunset">
          <defs>
            <linearGradient id="grad-sunset" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fda4af" />
              <stop offset="50%" stopColor="#f472b6" />
              <stop offset="80%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#fde047" />
            </linearGradient>
          </defs>
          <rect width="200" height="240" fill="url(#grad-sunset)" />
          <polygon points="40,60 42,65 47,66 43,70 44,75 40,72 36,75 37,70 33,66 38,65" fill="#ffffff" opacity={0.8} />
          <polygon points="160,80 162,85 167,86 163,90 164,95 160,92 156,95 157,90 153,86 158,85" fill="#ffffff" opacity={0.8} />
        </g>
      );
    },
  },

  // 4. Kawaii Grid
  {
    id: 'bg-kawaii-grid',
    category: 'background',
    subcategory: 'background',
    label: 'Kawaii Grid',
    unlockedByDefault: true,
    render: () => {
      return (
        <g id="bg-grid">
          <rect width="200" height="240" fill="#fdf4ff" />
          <defs>
            <pattern id="pattern-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0abfc" strokeWidth="0.8" opacity={0.5} />
            </pattern>
          </defs>
          <rect width="200" height="240" fill="url(#pattern-grid)" />
          <circle cx="50" cy="50" r="4" fill="#ec4899" opacity={0.4} />
          <circle cx="150" cy="70" r="5" fill="#a855f7" opacity={0.4} />
        </g>
      );
    },
  },

  // 5. Starry Galaxy
  {
    id: 'bg-starry-galaxy',
    category: 'background',
    subcategory: 'background',
    label: 'Midnight Galaxy',
    unlockedByDefault: true,
    render: () => {
      return (
        <g id="bg-galaxy">
          <defs>
            <radialGradient id="grad-galaxy" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#4338ca" />
              <stop offset="60%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
          </defs>
          <rect width="200" height="240" fill="url(#grad-galaxy)" />
          {/* Crescent Moon */}
          <path d="M 160 26 A 12 12 0 0 0 168 46 A 10 10 0 0 1 160 26 Z" fill="#fde047" />
          {/* Stars */}
          <circle cx="36" cy="44" r="1.5" fill="#ffffff" />
          <circle cx="58" cy="28" r="1.2" fill="#ffffff" />
          <circle cx="130" cy="54" r="1.8" fill="#ffffff" />
          <circle cx="48" cy="90" r="1.4" fill="#ffffff" />
          <circle cx="170" cy="110" r="1.6" fill="#ffffff" />
        </g>
      );
    },
  },

  // 6. Bubblegum Clouds
  {
    id: 'bg-bubblegum-clouds',
    category: 'background',
    subcategory: 'background',
    label: 'Cotton Candy',
    unlockedByDefault: true,
    render: () => {
      return (
        <g id="bg-bubblegum">
          <rect width="200" height="240" fill="#fce7f3" />
          <circle cx="40" cy="60" r="28" fill="#fbcfe8" opacity={0.7} />
          <circle cx="80" cy="40" r="32" fill="#bae6fd" opacity={0.6} />
          <circle cx="130" cy="45" r="30" fill="#ddd6fe" opacity={0.6} />
          <circle cx="170" cy="70" r="26" fill="#fbcfe8" opacity={0.7} />
        </g>
      );
    },
  },

  // 7. Retro Synthwave Arcade
  {
    id: 'bg-retro-arcade',
    category: 'background',
    subcategory: 'background',
    label: 'Neon Arcade',
    unlockedByDefault: true,
    render: () => {
      return (
        <g id="bg-arcade">
          <rect width="200" height="240" fill="#090514" />
          <circle cx="100" cy="90" r="45" fill="#f43f5e" opacity={0.4} />
          <circle cx="100" cy="90" r="35" fill="#f59e0b" opacity={0.5} />
          <line x1="20" y1="160" x2="180" y2="160" stroke="#06b6d4" strokeWidth={1.5} opacity={0.8} />
          <line x1="10" y1="180" x2="190" y2="180" stroke="#06b6d4" strokeWidth={1.5} opacity={0.8} />
          <line x1="0" y1="210" x2="200" y2="210" stroke="#06b6d4" strokeWidth={1.5} opacity={0.8} />
        </g>
      );
    },
  },

  // 8. Sakura Blossom
  {
    id: 'bg-sakura-blossom',
    category: 'background',
    subcategory: 'background',
    label: 'Sakura Petals',
    unlockedByDefault: true,
    render: () => {
      return (
        <g id="bg-sakura">
          <rect width="200" height="240" fill="#fff1f2" />
          {/* Floating petals */}
          <path d="M 36 40 C 38 35 44 38 46 44 C 44 50 38 48 36 40 Z" fill="#fda4af" opacity={0.8} transform="rotate(20 36 40)" />
          <path d="M 160 52 C 162 47 168 50 170 56 C 168 62 162 60 160 52 Z" fill="#fb7185" opacity={0.7} transform="rotate(-35 160 52)" />
          <path d="M 50 100 C 52 95 58 98 60 104 C 58 110 52 108 50 100 Z" fill="#fda4af" opacity={0.7} transform="rotate(45 50 100)" />
          <path d="M 152 130 C 154 125 160 128 162 134 C 160 140 154 138 152 130 Z" fill="#fda4af" opacity={0.8} transform="rotate(15 152 130)" />
        </g>
      );
    },
  },

  // 9. Minty Chevrons
  {
    id: 'bg-minty-chevrons',
    category: 'background',
    subcategory: 'background',
    label: 'Mint Chevron',
    unlockedByDefault: true,
    render: () => {
      return (
        <g id="bg-chevrons">
          <rect width="200" height="240" fill="#ecfdf5" />
          <path d="M 0 40 L 100 80 L 200 40" fill="none" stroke="#a7f3d0" strokeWidth={5} opacity={0.6} />
          <path d="M 0 90 L 100 130 L 200 90" fill="none" stroke="#a7f3d0" strokeWidth={5} opacity={0.6} />
          <path d="M 0 140 L 100 180 L 200 140" fill="none" stroke="#a7f3d0" strokeWidth={5} opacity={0.6} />
        </g>
      );
    },
  },

  // 10. Golden Sunshine Aura
  {
    id: 'bg-golden-aura',
    category: 'background',
    subcategory: 'background',
    label: 'Golden Sunshine',
    unlockedByDefault: true,
    render: () => {
      return (
        <g id="bg-sunshine">
          <defs>
            <radialGradient id="grad-gold" cx="50%" cy="40%" r="65%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="60%" stopColor="#fed7aa" />
              <stop offset="100%" stopColor="#fef3c7" />
            </radialGradient>
          </defs>
          <rect width="200" height="240" fill="url(#grad-gold)" />
          <circle cx="100" cy="90" r="60" fill="rgba(255,255,255,0.3)" />
          <circle cx="100" cy="90" r="45" fill="rgba(255,255,255,0.4)" />
        </g>
      );
    },
  },

  // 11. Clean Sticker White
  {
    id: 'bg-clean-sticker',
    category: 'background',
    subcategory: 'background',
    label: 'Sticker Studio',
    unlockedByDefault: true,
    render: () => {
      return (
        <g id="bg-white">
          <rect width="200" height="240" fill="#ffffff" />
          {/* Subtle polka dots */}
          <circle cx="30" cy="30" r="2" fill="#e2e8f0" />
          <circle cx="70" cy="30" r="2" fill="#e2e8f0" />
          <circle cx="110" cy="30" r="2" fill="#e2e8f0" />
          <circle cx="150" cy="30" r="2" fill="#e2e8f0" />
          <circle cx="50" cy="70" r="2" fill="#e2e8f0" />
          <circle cx="90" cy="70" r="2" fill="#e2e8f0" />
          <circle cx="130" cy="70" r="2" fill="#e2e8f0" />
          <circle cx="170" cy="70" r="2" fill="#e2e8f0" />
        </g>
      );
    },
  },

  // 12. Candy Hearts
  {
    id: 'bg-candy-hearts',
    category: 'background',
    subcategory: 'background',
    label: 'Candy Hearts',
    unlockedByDefault: true,
    render: () => {
      return (
        <g id="bg-hearts">
          <rect width="200" height="240" fill="#fff1f2" />
          <path d="M 36 46 C 33 40 25 42 25 48 C 25 54 36 62 36 62 C 36 62 47 54 47 48 C 47 42 39 40 36 46 Z" fill="#fda4af" opacity={0.6} />
          <path d="M 164 56 C 161 50 153 52 153 58 C 153 64 164 72 164 72 C 164 72 175 64 175 58 C 175 52 167 50 164 56 Z" fill="#f472b6" opacity={0.6} />
          <path d="M 44 116 C 42 112 36 113 36 117 C 36 121 44 127 44 127 C 44 127 52 121 52 117 C 52 113 46 112 44 116 Z" fill="#fbcfe8" opacity={0.8} />
          <path d="M 156 126 C 154 122 148 123 148 127 C 148 131 156 137 156 137 C 156 137 164 131 164 127 C 164 123 158 122 156 126 Z" fill="#fda4af" opacity={0.7} />
        </g>
      );
    },
  },

  // 13. Music Beats
  {
    id: 'bg-music-beats',
    category: 'background',
    subcategory: 'background',
    label: 'Music Vibe',
    unlockedByDefault: true,
    render: () => {
      return (
        <g id="bg-music">
          <rect width="200" height="240" fill="#eff6ff" />
          {/* Musical Notes */}
          <g fill="#3b82f6" opacity={0.65}>
            <circle cx="36" cy="54" r="3.5" />
            <line x1="39" y1="54" x2="39" y2="38" stroke="#3b82f6" strokeWidth={2} />
            <path d="M 39 38 Q 46 36 48 42" stroke="#3b82f6" strokeWidth={2} fill="none" />
            <circle cx="160" cy="64" r="3.5" />
            <line x1="163" y1="64" x2="163" y2="48" stroke="#3b82f6" strokeWidth={2} />
            <circle cx="174" cy="60" r="3.5" />
            <line x1="177" y1="60" x2="177" y2="44" stroke="#3b82f6" strokeWidth={2} />
            <line x1="163" y1="48" x2="177" y2="44" stroke="#3b82f6" strokeWidth={3} />
          </g>
        </g>
      );
    },
  },

  // 14. Cozy Coffee
  {
    id: 'bg-cozy-coffee',
    category: 'background',
    subcategory: 'background',
    label: 'Cozy Cafe',
    unlockedByDefault: true,
    render: () => {
      return (
        <g id="bg-coffee">
          <defs>
            <radialGradient id="grad-coffee" cx="50%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffedd5" />
              <stop offset="65%" stopColor="#fed7aa" />
              <stop offset="100%" stopColor="#e2d2be" />
            </radialGradient>
          </defs>
          <rect width="200" height="240" fill="url(#grad-coffee)" />
          {/* Coffee steam curves */}
          <path d="M 40 60 Q 44 48 40 40 Q 36 32 40 24" stroke="#b45309" strokeWidth={1.8} fill="none" strokeLinecap="round" opacity={0.5} />
          <path d="M 160 60 Q 164 48 160 40 Q 156 32 160 24" stroke="#b45309" strokeWidth={1.8} fill="none" strokeLinecap="round" opacity={0.5} />
        </g>
      );
    },
  },
];
