import type { AvatarPart, RenderContext } from './types';

export const ACCESSORIES: AvatarPart[] = [
  // GLASSES
  {
    id: 'none',
    category: 'accessories',
    subcategory: 'glasses',
    label: 'No Glasses',
    unlockedByDefault: true,
    render: () => null,
  },
  {
    id: 'glasses-round-retro',
    category: 'accessories',
    subcategory: 'glasses',
    label: 'Retro Round',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { glassesColor = '#1f2937' } = ctx.config;
      const { strokeWidth } = ctx;
      return (
        <g id="glasses-round">
          {/* Bridge */}
          <path d="M 92 101 Q 100 98 108 101" stroke={glassesColor} strokeWidth={strokeWidth} fill="none" />
          {/* Left Lens */}
          <circle cx="80" cy="103" r="14" fill="rgba(255,255,255,0.2)" stroke={glassesColor} strokeWidth={strokeWidth + 0.5} />
          <path d="M 72 96 Q 78 92 82 93" stroke="#ffffff" strokeWidth={2} fill="none" strokeLinecap="round" />
          {/* Right Lens */}
          <circle cx="120" cy="103" r="14" fill="rgba(255,255,255,0.2)" stroke={glassesColor} strokeWidth={strokeWidth + 0.5} />
          <path d="M 112 96 Q 118 92 122 93" stroke="#ffffff" strokeWidth={2} fill="none" strokeLinecap="round" />
          {/* Temples */}
          <line x1="66" y1="102" x2="52" y2="105" stroke={glassesColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <line x1="134" y1="102" x2="148" y2="105" stroke={glassesColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        </g>
      );
    },
  },
  {
    id: 'glasses-chunky-square',
    category: 'accessories',
    subcategory: 'glasses',
    label: 'Chunky Square',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { glassesColor = '#1f2937' } = ctx.config;
      const { strokeWidth } = ctx;
      return (
        <g id="glasses-square">
          <rect x="66" y="92" width="28" height="22" rx="4" fill="rgba(255,255,255,0.15)" stroke={glassesColor} strokeWidth={strokeWidth + 1} />
          <rect x="106" y="92" width="28" height="22" rx="4" fill="rgba(255,255,255,0.15)" stroke={glassesColor} strokeWidth={strokeWidth + 1} />
          <line x1="94" y1="99" x2="106" y2="99" stroke={glassesColor} strokeWidth={strokeWidth + 1} />
        </g>
      );
    },
  },
  {
    id: 'glasses-heart',
    category: 'accessories',
    subcategory: 'glasses',
    label: 'Heart Sunnies',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { glassesColor = '#ec4899' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="glasses-heart">
          <line x1="92" y1="100" x2="108" y2="100" stroke={outlineColor} strokeWidth={strokeWidth} />
          <path
            d="M 80 94 C 74 88 64 92 64 100 C 64 108 80 118 80 118 C 80 118 96 108 96 100 C 96 92 86 88 80 94 Z"
            fill={glassesColor}
            opacity={0.8}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
          <path
            d="M 120 94 C 114 88 104 92 104 100 C 104 108 120 118 120 118 C 120 118 136 108 136 100 C 136 92 126 88 120 94 Z"
            fill={glassesColor}
            opacity={0.8}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
        </g>
      );
    },
  },
  {
    id: 'glasses-star',
    category: 'accessories',
    subcategory: 'glasses',
    label: 'Star Sunnies',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { glassesColor = '#fbbf24' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="glasses-star">
          <line x1="94" y1="102" x2="106" y2="102" stroke={outlineColor} strokeWidth={strokeWidth} />
          <polygon
            points="80,90 84,98 93,99 87,106 89,115 80,110 71,115 73,106 67,99 76,98"
            fill={glassesColor}
            opacity={0.85}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
          <polygon
            points="120,90 124,98 133,99 127,106 129,115 120,110 111,115 113,106 107,99 116,98"
            fill={glassesColor}
            opacity={0.85}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
        </g>
      );
    },
  },
  {
    id: 'glasses-cat-eye',
    category: 'accessories',
    subcategory: 'glasses',
    label: 'Cat-Eye Frames',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { glassesColor = '#1f2937' } = ctx.config;
      const { strokeWidth } = ctx;
      return (
        <g id="glasses-cat-eye">
          <path d="M 64 94 Q 80 89 94 98 L 92 112 Q 80 116 66 108 Z" fill="rgba(255,255,255,0.15)" stroke={glassesColor} strokeWidth={strokeWidth + 0.5} strokeLinejoin="round" />
          <path d="M 136 94 Q 120 89 106 98 L 108 112 Q 120 116 134 108 Z" fill="rgba(255,255,255,0.15)" stroke={glassesColor} strokeWidth={strokeWidth + 0.5} strokeLinejoin="round" />
          <line x1="94" y1="99" x2="106" y2="99" stroke={glassesColor} strokeWidth={strokeWidth} />
        </g>
      );
    },
  },
  {
    id: 'glasses-aviator',
    category: 'accessories',
    subcategory: 'glasses',
    label: 'Cool Aviators',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { strokeWidth } = ctx;
      return (
        <g id="glasses-aviator">
          {/* Double Top Brow Bar */}
          <line x1="68" y1="94" x2="132" y2="94" stroke="#d97706" strokeWidth={2} />
          <path d="M 93 100 Q 100 97 107 100" stroke="#d97706" strokeWidth={2} fill="none" />
          {/* Teardrop Lenses with amber tint */}
          <path d="M 67 96 L 93 96 Q 93 118 80 120 Q 67 118 67 96 Z" fill="rgba(217,119,6,0.4)" stroke="#d97706" strokeWidth={strokeWidth} />
          <path d="M 107 96 L 133 96 Q 133 118 120 120 Q 107 118 107 96 Z" fill="rgba(217,119,6,0.4)" stroke="#d97706" strokeWidth={strokeWidth} />
        </g>
      );
    },
  },
  {
    id: 'glasses-pixel-thug',
    category: 'accessories',
    subcategory: 'glasses',
    label: 'Pixel Shades',
    unlockedByDefault: true,
    render: () => {
      return (
        <g id="glasses-pixel" fill="#111827">
          <rect x="66" y="96" width="30" height="12" />
          <rect x="70" y="108" width="22" height="6" />
          <rect x="104" y="96" width="30" height="12" />
          <rect x="108" y="108" width="22" height="6" />
          <rect x="96" y="98" width="8" height="6" />
          {/* White pixel glares */}
          <rect x="70" y="98" width="4" height="4" fill="#ffffff" />
          <rect x="74" y="102" width="4" height="4" fill="#ffffff" />
          <rect x="108" y="98" width="4" height="4" fill="#ffffff" />
          <rect x="112" y="102" width="4" height="4" fill="#ffffff" />
        </g>
      );
    },
  },

  // HATS & HEADWEAR
  {
    id: 'none',
    category: 'accessories',
    subcategory: 'hat',
    label: 'No Hat',
    unlockedByDefault: true,
    render: () => null,
  },
  {
    id: 'hat-cat-ears',
    category: 'accessories',
    subcategory: 'hat',
    label: 'Cat-Ear Headband',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { hatColor = '#f472b6' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="cat-ears">
          {/* Headband Arch */}
          <path d="M 52 74 C 54 42 74 34 100 34 C 126 34 146 42 148 74" fill="none" stroke={outlineColor} strokeWidth={strokeWidth + 1} />
          {/* Left Ear */}
          <polygon points="56,52 64,22 84,40" fill={hatColor} stroke={outlineColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
          <polygon points="62,48 66,28 78,40" fill="#fbcfe8" />
          {/* Right Ear */}
          <polygon points="144,52 136,22 116,40" fill={hatColor} stroke={outlineColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
          <polygon points="138,48 134,28 122,40" fill="#fbcfe8" />
        </g>
      );
    },
  },
  {
    id: 'hat-beanie',
    category: 'accessories',
    subcategory: 'hat',
    label: 'Slouchy Beanie',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { hatColor = '#3b82f6' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="hat-beanie">
          <path
            d="M 46 76 C 42 34 68 18 100 18 C 132 18 158 34 154 76 Z"
            fill={hatColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Folded Cuff */}
          <rect x="44" y="66" width="112" height="18" rx="6" fill="#1d4ed8" stroke={outlineColor} strokeWidth={strokeWidth} />
          {/* Fluffy Pom Pom on top */}
          <circle cx="100" cy="16" r="10" fill="#ffffff" stroke={outlineColor} strokeWidth={strokeWidth} />
        </g>
      );
    },
  },
  {
    id: 'hat-snapback',
    category: 'accessories',
    subcategory: 'hat',
    label: 'Backwards Cap',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { hatColor = '#ec4899' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="hat-snapback">
          {/* Dome */}
          <path
            d="M 48 74 C 46 44 70 30 100 30 C 130 30 154 44 152 74 Z"
            fill={hatColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
          {/* Backwards Visor Brim */}
          <path
            d="M 44 68 C 34 72 32 78 40 82 L 160 82 C 168 78 166 72 156 68 Z"
            fill="#1e293b"
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
        </g>
      );
    },
  },
  {
    id: 'hat-beret',
    category: 'accessories',
    subcategory: 'hat',
    label: 'Artist Beret',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { hatColor = '#f43f5e' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="hat-beret">
          {/* Tilted Beret Body */}
          <path
            d="M 42 66 C 36 40 76 22 120 28 C 164 34 168 56 150 72 C 136 78 70 82 42 66 Z"
            fill={hatColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Little stem */}
          <line x1="102" y1="26" x2="104" y2="18" stroke={outlineColor} strokeWidth={3} strokeLinecap="round" />
        </g>
      );
    },
  },
  {
    id: 'hat-frog-bucket',
    category: 'accessories',
    subcategory: 'hat',
    label: 'Froggy Bucket',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="hat-frog">
          {/* Frog Eyes */}
          <circle cx="74" cy="38" r="12" fill="#4ade80" stroke={outlineColor} strokeWidth={strokeWidth} />
          <circle cx="74" cy="38" r="5" fill="#ffffff" />
          <circle cx="74" cy="38" r="2.5" fill="#1a1a1a" />
          <circle cx="126" cy="38" r="12" fill="#4ade80" stroke={outlineColor} strokeWidth={strokeWidth} />
          <circle cx="126" cy="38" r="5" fill="#ffffff" />
          <circle cx="126" cy="38" r="2.5" fill="#1a1a1a" />
          {/* Bucket Crown */}
          <path
            d="M 58 48 L 142 48 L 148 76 L 52 76 Z"
            fill="#4ade80"
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Flared Brim */}
          <path
            d="M 38 88 C 42 76 56 74 100 74 C 144 74 158 76 162 88 C 134 94 66 94 38 88 Z"
            fill="#22c55e"
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </g>
      );
    },
  },
  {
    id: 'hat-flower-crown',
    category: 'accessories',
    subcategory: 'hat',
    label: 'Pastel Flower Crown',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { strokeWidth } = ctx;
      return (
        <g id="hat-flowers">
          {/* Vine */}
          <path d="M 52 64 Q 100 52 148 64" stroke="#15803d" strokeWidth={strokeWidth} fill="none" />
          {/* Flowers */}
          <circle cx="68" cy="58" r="8" fill="#f472b6" />
          <circle cx="68" cy="58" r="3" fill="#fef08a" />
          <circle cx="100" cy="52" r="9" fill="#c084fc" />
          <circle cx="100" cy="52" r="3.5" fill="#fef08a" />
          <circle cx="132" cy="58" r="8" fill="#38bdf8" />
          <circle cx="132" cy="58" r="3" fill="#fef08a" />
        </g>
      );
    },
  },
  {
    id: 'hat-wizard',
    category: 'accessories',
    subcategory: 'hat',
    label: 'Mini Wizard Hat',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="hat-wizard" transform="rotate(12 100 40)">
          {/* Brim */}
          <ellipse cx="100" cy="46" rx="36" ry="10" fill="#581c87" stroke={outlineColor} strokeWidth={strokeWidth} />
          {/* Cone */}
          <path d="M 72 44 Q 96 6 122 14 Q 112 36 128 44 Z" fill="#7e22ce" stroke={outlineColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
          {/* Gold Star */}
          <polygon points="100,28 102,33 107,33 103,37 105,42 100,39 95,42 97,37 93,33 98,33" fill="#fbbf24" stroke={outlineColor} strokeWidth={1} />
        </g>
      );
    },
  },

  // EARRINGS
  {
    id: 'none',
    category: 'accessories',
    subcategory: 'earrings',
    label: 'No Earrings',
    unlockedByDefault: true,
    render: () => null,
  },
  {
    id: 'earrings-gold-hoops',
    category: 'accessories',
    subcategory: 'earrings',
    label: 'Gold Hoops',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { earringsColor = '#fbbf24' } = ctx.config;
      const { strokeWidth } = ctx;
      return (
        <g id="earrings-hoops">
          <ellipse cx="46" cy="126" rx="4" ry="7" fill="none" stroke={earringsColor} strokeWidth={strokeWidth + 0.5} />
          <ellipse cx="154" cy="126" rx="4" ry="7" fill="none" stroke={earringsColor} strokeWidth={strokeWidth + 0.5} />
        </g>
      );
    },
  },
  {
    id: 'earrings-star-drop',
    category: 'accessories',
    subcategory: 'earrings',
    label: 'Star Drops',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { earringsColor = '#fbbf24' } = ctx.config;
      const { outlineColor } = ctx;
      return (
        <g id="earrings-stars">
          <line x1="46" y1="124" x2="46" y2="132" stroke={outlineColor} strokeWidth={1.5} />
          <polygon points="46,131 47.5,134.5 51,135.5 48.5,138 49,141.5 46,139.5 43,141.5 43.5,138 41,135.5 44.5,134.5" fill={earringsColor} stroke={outlineColor} strokeWidth={1} />
          <line x1="154" y1="124" x2="154" y2="132" stroke={outlineColor} strokeWidth={1.5} />
          <polygon points="154,131 155.5,134.5 159,135.5 156.5,138 157,141.5 154,139.5 151,141.5 151.5,138 149,135.5 152.5,134.5" fill={earringsColor} stroke={outlineColor} strokeWidth={1} />
        </g>
      );
    },
  },
  {
    id: 'earrings-pearl-studs',
    category: 'accessories',
    subcategory: 'earrings',
    label: 'Pearl Studs',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor } = ctx;
      return (
        <g id="earrings-pearls">
          <circle cx="48" cy="124" r="3.5" fill="#f8fafc" stroke={outlineColor} strokeWidth={1.2} />
          <circle cx="152" cy="124" r="3.5" fill="#f8fafc" stroke={outlineColor} strokeWidth={1.2} />
        </g>
      );
    },
  },
  {
    id: 'earrings-lightning',
    category: 'accessories',
    subcategory: 'earrings',
    label: 'Neon Lightning',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor } = ctx;
      return (
        <g id="earrings-lightning">
          <polygon points="48,124 43,133 46,133 44,142 50,131 47,131" fill="#fde047" stroke={outlineColor} strokeWidth={1.2} />
          <polygon points="152,124 147,133 150,133 148,142 154,131 151,131" fill="#fde047" stroke={outlineColor} strokeWidth={1.2} />
        </g>
      );
    },
  },
  {
    id: 'earrings-gummy-bears',
    category: 'accessories',
    subcategory: 'earrings',
    label: 'Gummy Bears',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor } = ctx;
      return (
        <g id="earrings-gummy">
          {/* Left Gummy */}
          <circle cx="45" cy="130" r="2" fill="#ec4899" />
          <circle cx="49" cy="130" r="2" fill="#ec4899" />
          <rect x="43" y="131" width="8" height="10" rx="3" fill="#f472b6" stroke={outlineColor} strokeWidth={1} />
          {/* Right Gummy */}
          <circle cx="151" cy="130" r="2" fill="#ec4899" />
          <circle cx="155" cy="130" r="2" fill="#ec4899" />
          <rect x="149" y="131" width="8" height="10" rx="3" fill="#f472b6" stroke={outlineColor} strokeWidth={1} />
        </g>
      );
    },
  },

  // HEADPHONES
  {
    id: 'none',
    category: 'accessories',
    subcategory: 'headphones',
    label: 'No Headphones',
    unlockedByDefault: true,
    render: () => null,
  },
  {
    id: 'headphones-cat-ear',
    category: 'accessories',
    subcategory: 'headphones',
    label: 'Kitty Gaming Headset',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { headphonesColor = '#ec4899' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="headphones-kitty">
          {/* Headband arch */}
          <path d="M 42 110 C 36 34 164 34 158 110" fill="none" stroke={headphonesColor} strokeWidth={strokeWidth + 3} strokeLinecap="round" />
          <path d="M 42 110 C 36 34 164 34 158 110" fill="none" stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          {/* Light-up Cat Ears on Band */}
          <polygon points="62,44 72,18 90,36" fill={headphonesColor} stroke={outlineColor} strokeWidth={strokeWidth} />
          <polygon points="68,40 74,24 84,36" fill="#38bdf8" />
          <polygon points="138,44 128,18 110,36" fill={headphonesColor} stroke={outlineColor} strokeWidth={strokeWidth} />
          <polygon points="132,40 126,24 116,36" fill="#38bdf8" />
          {/* Ear Cans */}
          <rect x="36" y="100" width="14" height="26" rx="6" fill={headphonesColor} stroke={outlineColor} strokeWidth={strokeWidth} />
          <rect x="150" y="100" width="14" height="26" rx="6" fill={headphonesColor} stroke={outlineColor} strokeWidth={strokeWidth} />
        </g>
      );
    },
  },
  {
    id: 'headphones-retro-dj',
    category: 'accessories',
    subcategory: 'headphones',
    label: 'Retro DJ Cans',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="headphones-dj">
          {/* Padded Headband */}
          <path d="M 42 108 C 36 36 164 36 158 108" fill="none" stroke="#1e293b" strokeWidth={strokeWidth + 4} strokeLinecap="round" />
          <path d="M 42 108 C 36 36 164 36 158 108" fill="none" stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          {/* Big Chunky Cans */}
          <ellipse cx="44" cy="114" rx="9" ry="16" fill="#f59e0b" stroke={outlineColor} strokeWidth={strokeWidth} />
          <ellipse cx="44" cy="114" rx="4" ry="9" fill="#1e293b" />
          <ellipse cx="156" cy="114" rx="9" ry="16" fill="#f59e0b" stroke={outlineColor} strokeWidth={strokeWidth} />
          <ellipse cx="156" cy="114" rx="4" ry="9" fill="#1e293b" />
        </g>
      );
    },
  },
  {
    id: 'headphones-pastel',
    category: 'accessories',
    subcategory: 'headphones',
    label: 'Pastel Studio',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { headphonesColor = '#c084fc' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="headphones-pastel">
          <path d="M 44 110 C 38 42 162 42 156 110" fill="none" stroke={headphonesColor} strokeWidth={strokeWidth + 2} strokeLinecap="round" />
          <circle cx="44" cy="114" r="10" fill={headphonesColor} stroke={outlineColor} strokeWidth={strokeWidth} />
          <circle cx="44" cy="114" r="4" fill="#ffffff" />
          <circle cx="156" cy="114" r="10" fill={headphonesColor} stroke={outlineColor} strokeWidth={strokeWidth} />
          <circle cx="156" cy="114" r="4" fill="#ffffff" />
        </g>
      );
    },
  },
];
