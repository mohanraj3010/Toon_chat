import type { AvatarPart, RenderContext } from './types';

export const HAIRSTYLES: AvatarPart[] = [
  // 1. Luna Signature Bob with Bangs
  {
    id: 'hair-bob-bangs',
    category: 'hair',
    subcategory: 'hairStyle',
    label: 'Luna Bob',
    unlockedByDefault: true,
    renderBack: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 44 80 C 30 110 32 158 56 166 C 70 170 82 166 100 166 C 118 166 130 170 144 166 C 168 158 170 110 156 80 Z"
          fill={hairColor}
          stroke={outlineColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
    },
    render: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="hair-bob-front">
          {/* Top Crown Volume */}
          <path
            d="M 48 90 C 44 50 68 34 100 34 C 132 34 156 50 152 90 C 146 64 128 46 100 46 C 72 46 54 64 48 90 Z"
            fill={hairColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Front Bangs & Side Tufts */}
          <path
            d="M 52 76 C 50 110 44 134 52 144 C 55 130 62 100 66 94 C 70 94 76 86 86 88 C 88 88 94 78 100 84 C 106 78 112 88 114 88 C 124 86 130 94 134 94 C 138 100 145 130 148 144 C 156 134 150 110 148 76 C 138 52 118 42 100 42 C 82 42 62 52 52 76 Z"
            fill={hairColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Highlights */}
          <path
            d="M 72 56 Q 84 50 96 52"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 104 52 Q 116 50 128 56"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );
    },
  },

  // 2. Anime Spiky
  {
    id: 'hair-anime-spiky',
    category: 'hair',
    subcategory: 'hairStyle',
    label: 'Anime Spikes',
    unlockedByDefault: true,
    renderBack: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 40 76 L 24 64 L 38 50 L 30 32 L 52 30 L 64 12 L 84 22 L 100 8 L 116 22 L 136 12 L 148 30 L 170 32 L 162 50 L 176 64 L 160 76 Z"
          fill={hairColor}
          stroke={outlineColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
    },
    render: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 46 86 C 42 60 56 46 76 56 C 82 46 92 50 100 58 C 108 50 118 46 124 56 C 144 46 158 60 154 86 C 146 74 136 78 126 84 C 118 78 112 80 100 86 C 88 80 82 78 74 84 C 64 78 54 74 46 86 Z"
          fill={hairColor}
          stroke={outlineColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
    },
  },

  // 3. Long Wavy
  {
    id: 'hair-long-wavy',
    category: 'hair',
    subcategory: 'hairStyle',
    label: 'Long Waves',
    unlockedByDefault: true,
    renderBack: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 44 80 C 24 116 16 160 32 192 C 40 208 54 204 60 188 C 66 172 74 162 82 170 C 90 178 110 178 118 170 C 126 162 134 172 140 188 C 146 204 160 208 168 192 C 184 160 176 116 156 80 Z"
          fill={hairColor}
          stroke={outlineColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
    },
    render: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 50 78 C 46 44 70 34 100 34 C 130 34 154 44 150 78 C 144 94 140 134 148 152 C 142 136 136 100 132 86 C 120 78 110 82 100 86 C 90 82 80 78 68 86 C 64 100 58 136 52 152 C 60 134 56 94 50 78 Z"
          fill={hairColor}
          stroke={outlineColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
    },
  },

  // 4. Curly Afro Puffs
  {
    id: 'hair-curly-afro',
    category: 'hair',
    subcategory: 'hairStyle',
    label: 'Curly Afro Puff',
    unlockedByDefault: true,
    renderBack: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="afro-back">
          <circle cx="58" cy="74" r="34" fill={hairColor} stroke={outlineColor} strokeWidth={strokeWidth} />
          <circle cx="100" cy="54" r="36" fill={hairColor} stroke={outlineColor} strokeWidth={strokeWidth} />
          <circle cx="142" cy="74" r="34" fill={hairColor} stroke={outlineColor} strokeWidth={strokeWidth} />
          <circle cx="48" cy="106" r="28" fill={hairColor} stroke={outlineColor} strokeWidth={strokeWidth} />
          <circle cx="152" cy="106" r="28" fill={hairColor} stroke={outlineColor} strokeWidth={strokeWidth} />
        </g>
      );
    },
    render: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="afro-front">
          <path
            d="M 52 90 C 56 70 74 62 100 62 C 126 62 144 70 148 90 C 140 82 130 84 120 86 C 110 82 90 82 80 86 C 70 84 60 82 52 90 Z"
            fill={hairColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
        </g>
      );
    },
  },

  // 5. Twin Pigtails
  {
    id: 'hair-twin-pigtails',
    category: 'hair',
    subcategory: 'hairStyle',
    label: 'Twin Pigtails',
    unlockedByDefault: true,
    renderBack: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="pigtails-back">
          {/* Left Pigtail */}
          <path
            d="M 44 94 C 20 106 14 140 24 168 C 30 184 44 176 46 160 C 48 140 46 116 52 102 Z"
            fill={hairColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Hair ties */}
          <circle cx="46" cy="100" r="6" fill="#f43f5e" stroke={outlineColor} strokeWidth={1.5} />
          {/* Right Pigtail */}
          <path
            d="M 156 94 C 180 106 186 140 176 168 C 170 184 156 176 154 160 C 152 140 154 116 148 102 Z"
            fill={hairColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          <circle cx="154" cy="100" r="6" fill="#f43f5e" stroke={outlineColor} strokeWidth={1.5} />
        </g>
      );
    },
    render: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 52 82 C 50 48 70 38 100 38 C 130 38 150 48 148 82 C 140 70 130 84 122 84 C 114 78 108 80 100 84 C 92 80 86 78 78 84 C 70 84 60 70 52 82 Z"
          fill={hairColor}
          stroke={outlineColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
    },
  },

  // 6. Space Buns
  {
    id: 'hair-space-buns',
    category: 'hair',
    subcategory: 'hairStyle',
    label: 'Space Buns',
    unlockedByDefault: true,
    renderBack: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="space-buns">
          <circle cx="48" cy="46" r="22" fill={hairColor} stroke={outlineColor} strokeWidth={strokeWidth} />
          <circle cx="152" cy="46" r="22" fill={hairColor} stroke={outlineColor} strokeWidth={strokeWidth} />
        </g>
      );
    },
    render: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 52 86 C 50 54 72 44 100 44 C 128 44 150 54 148 86 C 144 94 140 114 144 126 C 142 110 136 86 128 86 C 118 78 112 82 100 86 C 88 82 82 78 72 86 C 64 86 58 110 56 126 C 60 114 56 94 52 86 Z"
          fill={hairColor}
          stroke={outlineColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
    },
  },

  // 7. Slick Undercut
  {
    id: 'hair-slick-undercut',
    category: 'hair',
    subcategory: 'hairStyle',
    label: 'Slick Undercut',
    unlockedByDefault: true,
    renderBack: () => null,
    render: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="hair-undercut">
          {/* Shaved fade sides */}
          <path d="M 52 92 C 50 82 52 74 58 68 L 60 92 Z" fill="rgba(0,0,0,0.15)" />
          <path d="M 148 92 C 150 82 148 74 142 68 L 140 92 Z" fill="rgba(0,0,0,0.15)" />
          {/* Voluminous slicked top */}
          <path
            d="M 54 72 C 50 36 74 24 104 24 C 134 24 152 38 146 72 C 136 60 118 56 100 58 C 82 56 64 60 54 72 Z"
            fill={hairColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Texture lines */}
          <path d="M 80 40 Q 95 36 110 38" stroke="rgba(255,255,255,0.25)" strokeWidth={2} fill="none" />
        </g>
      );
    },
  },

  // 8. Messy Bedhead
  {
    id: 'hair-messy-bedhead',
    category: 'hair',
    subcategory: 'hairStyle',
    label: 'Messy Bedhead',
    unlockedByDefault: true,
    renderBack: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 44 80 L 32 70 L 40 58 L 28 44 L 46 38 L 44 26 L 62 26 L 70 14 L 88 20 L 100 12 L 112 20 L 130 14 L 138 26 L 156 26 L 154 38 L 172 44 L 160 58 L 168 70 L 156 80 Z"
          fill={hairColor}
          stroke={outlineColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
    },
    render: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 50 86 C 46 64 60 50 78 62 C 84 54 94 56 100 64 C 108 56 118 54 124 64 C 140 52 154 66 150 86 C 142 78 132 80 122 86 C 114 78 106 80 100 86 C 94 80 86 78 78 86 C 68 80 58 78 50 86 Z"
          fill={hairColor}
          stroke={outlineColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
    },
  },

  // 9. Shaggy Wolf Cut
  {
    id: 'hair-shaggy-wolf',
    category: 'hair',
    subcategory: 'hairStyle',
    label: 'Wolf Cut',
    unlockedByDefault: true,
    renderBack: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 46 80 L 34 104 L 46 116 L 36 138 L 52 146 L 46 168 L 64 164 L 76 180 L 100 174 L 124 180 L 136 164 L 154 168 L 148 146 L 164 138 L 154 116 L 166 104 L 154 80 Z"
          fill={hairColor}
          stroke={outlineColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
    },
    render: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 50 78 C 48 50 70 38 100 38 C 130 38 152 50 150 78 C 142 66 132 82 124 80 C 116 72 108 76 100 82 C 92 76 84 72 76 80 C 68 82 58 66 50 78 Z"
          fill={hairColor}
          stroke={outlineColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
    },
  },

  // 10. High Ponytail
  {
    id: 'hair-high-ponytail',
    category: 'hair',
    subcategory: 'hairStyle',
    label: 'High Ponytail',
    unlockedByDefault: true,
    renderBack: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="ponytail-back">
          {/* Swishing tail */}
          <path
            d="M 116 34 C 146 18 174 44 176 86 C 178 126 156 156 164 176 C 154 164 148 132 152 100 C 154 68 136 50 124 44 Z"
            fill={hairColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Scrunchie */}
          <ellipse cx="120" cy="38" rx="8" ry="6" fill="#38bdf8" stroke={outlineColor} strokeWidth={1.5} />
        </g>
      );
    },
    render: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 52 86 C 48 50 72 40 100 40 C 128 40 152 50 148 86 C 142 74 130 84 120 84 C 112 78 106 80 100 84 C 94 80 88 78 80 84 C 70 84 58 74 52 86 Z"
          fill={hairColor}
          stroke={outlineColor}
          strokeWidth={strokeWidth}
        />
      );
    },
  },

  // 11. Dreadlocks / Braids
  {
    id: 'hair-dreadlocks',
    category: 'hair',
    subcategory: 'hairStyle',
    label: 'Locs & Braids',
    unlockedByDefault: true,
    renderBack: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="locs-back">
          {/* Long hanging locs */}
          <path d="M 44 80 L 36 170 Q 42 174 48 170 L 52 90 Z" fill={hairColor} stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
          <path d="M 56 90 L 52 180 Q 58 184 64 180 L 64 100 Z" fill={hairColor} stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
          <path d="M 144 90 L 148 180 Q 142 184 136 180 L 136 100 Z" fill={hairColor} stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
          <path d="M 156 80 L 164 170 Q 158 174 152 170 L 148 90 Z" fill={hairColor} stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
          {/* Gold beads on locs */}
          <rect x="36" y="140" width="12" height="6" rx="2" fill="#fbbf24" stroke={outlineColor} strokeWidth={1} />
          <rect x="152" y="130" width="12" height="6" rx="2" fill="#fbbf24" stroke={outlineColor} strokeWidth={1} />
        </g>
      );
    },
    render: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="locs-front">
          <path
            d="M 50 82 C 48 48 72 36 100 36 C 128 36 152 48 150 82 C 142 74 136 84 126 84 C 118 76 108 80 100 84 C 92 80 82 76 74 84 C 64 84 58 74 50 82 Z"
            fill={hairColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
          {/* Loc strands on front */}
          <line x1="68" y1="48" x2="72" y2="78" stroke={outlineColor} strokeWidth={1.5} />
          <line x1="100" y1="42" x2="100" y2="76" stroke={outlineColor} strokeWidth={1.5} />
          <line x1="132" y1="48" x2="128" y2="78" stroke={outlineColor} strokeWidth={1.5} />
        </g>
      );
    },
  },

  // 12. Chic Pixie
  {
    id: 'hair-pixie-side',
    category: 'hair',
    subcategory: 'hairStyle',
    label: 'Chic Pixie',
    unlockedByDefault: true,
    renderBack: () => null,
    render: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 52 86 C 48 54 70 38 100 38 C 130 38 152 54 148 86 C 144 76 138 68 126 70 C 110 72 90 84 70 92 C 60 96 54 94 52 86 Z"
          fill={hairColor}
          stroke={outlineColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
    },
  },

  // 13. K-pop Curtain Hair
  {
    id: 'hair-curtain-kpop',
    category: 'hair',
    subcategory: 'hairStyle',
    label: 'K-Pop Curtains',
    unlockedByDefault: true,
    renderBack: () => null,
    render: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="hair-curtains">
          {/* Left curtain */}
          <path
            d="M 100 46 C 86 46 64 52 56 82 C 64 78 74 72 86 78 C 96 82 98 62 100 46 Z"
            fill={hairColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Right curtain */}
          <path
            d="M 100 46 C 114 46 136 52 144 82 C 136 78 126 72 114 78 C 104 82 102 62 100 46 Z"
            fill={hairColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Top Volume */}
          <path
            d="M 54 78 C 50 48 72 36 100 36 C 128 36 150 48 146 78 C 134 46 118 42 100 42 C 82 42 66 46 54 78 Z"
            fill={hairColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
        </g>
      );
    },
  },

  // 14. Emo Side Swept
  {
    id: 'hair-side-swept',
    category: 'hair',
    subcategory: 'hairStyle',
    label: 'Side-Swept Fringe',
    unlockedByDefault: true,
    renderBack: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 44 80 C 34 110 38 140 48 160 C 58 130 52 100 52 90 Z"
          fill={hairColor}
          stroke={outlineColor}
          strokeWidth={strokeWidth}
        />
      );
    },
    render: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 50 82 C 48 46 72 36 100 36 C 132 36 152 50 148 84 C 142 74 130 76 116 78 C 96 82 78 100 66 114 C 60 98 54 90 50 82 Z"
          fill={hairColor}
          stroke={outlineColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
    },
  },

  // 15. Curly Halo
  {
    id: 'hair-curly-halo',
    category: 'hair',
    subcategory: 'hairStyle',
    label: 'Bouncy Ringlets',
    unlockedByDefault: true,
    renderBack: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="curly-halo-back">
          <circle cx="50" cy="80" r="16" fill={hairColor} stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
          <circle cx="44" cy="106" r="16" fill={hairColor} stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
          <circle cx="48" cy="132" r="15" fill={hairColor} stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
          <circle cx="150" cy="80" r="16" fill={hairColor} stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
          <circle cx="156" cy="106" r="16" fill={hairColor} stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
          <circle cx="152" cy="132" r="15" fill={hairColor} stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
        </g>
      );
    },
    render: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="curly-halo-front">
          <circle cx="68" cy="50" r="15" fill={hairColor} stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
          <circle cx="92" cy="42" r="16" fill={hairColor} stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
          <circle cx="116" cy="44" r="15" fill={hairColor} stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
          <circle cx="136" cy="54" r="14" fill={hairColor} stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
          <path d="M 64 74 Q 80 66 94 72 Q 108 66 124 72 Q 134 76 140 84 Q 126 80 114 84 Q 98 78 86 84 Q 74 80 64 74 Z" fill={hairColor} />
        </g>
      );
    },
  },

  // 16. Buzz Fade
  {
    id: 'hair-buzz-fade',
    category: 'hair',
    subcategory: 'hairStyle',
    label: 'Clean Fade',
    unlockedByDefault: true,
    renderBack: () => null,
    render: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="buzz-fade">
          {/* Clean hairline */}
          <path
            d="M 56 86 C 54 62 70 48 100 48 C 130 48 146 62 144 86 C 138 74 126 70 100 70 C 74 70 62 74 56 86 Z"
            fill={hairColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
        </g>
      );
    },
  },

  // 17. Half-Up Topknot
  {
    id: 'hair-half-up-bun',
    category: 'hair',
    subcategory: 'hairStyle',
    label: 'Half-Up Topknot',
    unlockedByDefault: true,
    renderBack: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 44 86 C 36 120 38 160 52 180 C 64 168 76 160 100 162 C 124 160 136 168 148 180 C 162 160 164 120 156 86 Z"
          fill={hairColor}
          stroke={outlineColor}
          strokeWidth={strokeWidth}
        />
      );
    },
    render: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="topknot">
          {/* Bun on top */}
          <circle cx="100" cy="30" r="16" fill={hairColor} stroke={outlineColor} strokeWidth={strokeWidth} />
          {/* Front bangs */}
          <path
            d="M 52 82 C 50 48 70 40 100 40 C 130 40 150 48 148 82 C 140 72 130 84 120 82 C 110 76 100 80 90 76 C 80 82 70 72 52 82 Z"
            fill={hairColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
        </g>
      );
    },
  },

  // 18. Side Braid
  {
    id: 'hair-side-braid',
    category: 'hair',
    subcategory: 'hairStyle',
    label: 'Side Braid',
    unlockedByDefault: true,
    renderBack: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="side-braid">
          {/* Braided strand falling on right */}
          <path
            d="M 144 94 C 160 114 162 136 156 156 C 152 170 146 186 142 200 Q 138 204 134 200 C 138 186 142 168 144 154 C 148 136 142 114 134 98 Z"
            fill={hairColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Braid bands */}
          <ellipse cx="149" cy="140" rx="5" ry="3" fill="#38bdf8" stroke={outlineColor} strokeWidth={1} />
          <ellipse cx="142" cy="180" rx="4" ry="2.5" fill="#38bdf8" stroke={outlineColor} strokeWidth={1} />
        </g>
      );
    },
    render: (ctx: RenderContext) => {
      const { hairColor } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 52 82 C 48 48 72 38 100 38 C 128 38 150 48 148 82 C 140 72 128 84 120 84 C 112 78 104 80 100 84 C 92 80 84 78 76 84 C 68 84 58 72 52 82 Z"
          fill={hairColor}
          stroke={outlineColor}
          strokeWidth={strokeWidth}
        />
      );
    },
  },
];
