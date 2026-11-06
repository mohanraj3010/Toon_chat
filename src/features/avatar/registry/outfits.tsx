import type { AvatarPart, RenderContext } from './types';

export const OUTFITS: AvatarPart[] = [
  // 1. Luna Signature Hoodie
  {
    id: 'outfit-hoodie',
    category: 'outfit',
    subcategory: 'outfit',
    label: 'Cozy Hoodie',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outfitPrimaryColor = '#a7f3d0', outfitSecondaryColor = '#34d399' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="outfit-hoodie">
          {/* Shoulders / Torso */}
          <path
            d="M 50 178 Q 42 220 40 240 L 160 240 Q 158 220 150 178 Q 128 174 100 174 Q 72 174 50 178 Z"
            fill={outfitPrimaryColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Kangaroo Pocket */}
          <path
            d="M 74 212 L 126 212 L 132 238 L 68 238 Z"
            fill={outfitSecondaryColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth - 0.5}
            strokeLinejoin="round"
          />
          {/* Hoodie Collar / Neck Ring */}
          <path
            d="M 74 176 C 70 196 130 196 126 176 C 118 184 82 184 74 176 Z"
            fill={outfitSecondaryColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Drawstrings */}
          <path d="M 88 184 L 88 206" stroke={outlineColor} strokeWidth={2} strokeLinecap="round" />
          <circle cx="88" cy="207" r="2.5" fill="#ffffff" stroke={outlineColor} strokeWidth={1} />
          <path d="M 112 184 L 112 206" stroke={outlineColor} strokeWidth={2} strokeLinecap="round" />
          <circle cx="112" cy="207" r="2.5" fill="#ffffff" stroke={outlineColor} strokeWidth={1} />
        </g>
      );
    },
  },

  // 2. Graphic Tee
  {
    id: 'outfit-graphic-tee',
    category: 'outfit',
    subcategory: 'outfit',
    label: 'Graphic Tee',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outfitPrimaryColor = '#ddd6fe', outfitSecondaryColor = '#8b5cf6' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="outfit-tee">
          <path
            d="M 50 178 Q 42 220 40 240 L 160 240 Q 158 220 150 178 Q 128 174 100 174 Q 72 174 50 178 Z"
            fill={outfitPrimaryColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Crew neck collar */}
          <path
            d="M 82 174 C 82 188 118 188 118 174 Z"
            fill="none"
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
          {/* Star Graphic on Chest */}
          <polygon
            points="100,196 103,204 111,204 105,209 107,217 100,212 93,217 95,209 89,204 97,204"
            fill={outfitSecondaryColor}
            stroke={outlineColor}
            strokeWidth={1.2}
          />
        </g>
      );
    },
  },

  // 3. Knitted Sweater
  {
    id: 'outfit-sweater',
    category: 'outfit',
    subcategory: 'outfit',
    label: 'Knitted Sweater',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outfitPrimaryColor = '#fed7aa', outfitSecondaryColor = '#f97316' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="outfit-sweater">
          <path
            d="M 48 180 Q 40 220 38 240 L 162 240 Q 160 220 152 180 Q 128 174 100 174 Q 72 174 48 180 Z"
            fill={outfitPrimaryColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Ribbed turtleneck collar */}
          <rect
            x="78"
            y="170"
            width="44"
            height="14"
            rx="5"
            fill={outfitSecondaryColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
          {/* Texture lines */}
          <line x1="88" y1="170" x2="88" y2="184" stroke={outlineColor} strokeWidth={1} />
          <line x1="100" y1="170" x2="100" y2="184" stroke={outlineColor} strokeWidth={1} />
          <line x1="112" y1="170" x2="112" y2="184" stroke={outlineColor} strokeWidth={1} />
        </g>
      );
    },
  },

  // 4. Denim Jacket
  {
    id: 'outfit-denim-jacket',
    category: 'outfit',
    subcategory: 'outfit',
    label: 'Denim Jacket',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outfitPrimaryColor = '#1d4ed8' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="outfit-denim">
          {/* White inner shirt */}
          <path d="M 80 176 L 120 176 L 115 240 L 85 240 Z" fill="#ffffff" stroke={outlineColor} strokeWidth={strokeWidth} />
          {/* Left Jacket side */}
          <path
            d="M 50 178 L 84 186 L 86 240 L 40 240 Q 42 220 50 178 Z"
            fill={outfitPrimaryColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Left Lapel */}
          <polygon points="76,178 92,188 84,204 76,188" fill="#3b82f6" stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
          {/* Right Jacket side */}
          <path
            d="M 150 178 L 116 186 L 114 240 L 160 240 Q 158 220 150 178 Z"
            fill={outfitPrimaryColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Right Lapel */}
          <polygon points="124,178 108,188 116,204 124,188" fill="#3b82f6" stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
        </g>
      );
    },
  },

  // 5. Streetwear Bomber
  {
    id: 'outfit-streetwear-bomber',
    category: 'outfit',
    subcategory: 'outfit',
    label: 'Street Bomber',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outfitPrimaryColor = '#334155', outfitSecondaryColor = '#f97316' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="outfit-bomber">
          {/* Inner bright shirt */}
          <path d="M 82 176 L 118 176 L 112 240 L 88 240 Z" fill={outfitSecondaryColor} stroke={outlineColor} strokeWidth={strokeWidth} />
          {/* Outer Bomber */}
          <path
            d="M 48 180 L 84 188 L 86 240 L 38 240 Z"
            fill={outfitPrimaryColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          <path
            d="M 152 180 L 116 188 L 114 240 L 162 240 Z"
            fill={outfitPrimaryColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Ribbed neck band */}
          <path d="M 80 174 Q 100 182 120 174" stroke={outlineColor} strokeWidth={strokeWidth + 1} fill="none" strokeLinecap="round" />
          {/* Zipper details */}
          <line x1="100" y1="184" x2="100" y2="240" stroke="#cbd5e1" strokeWidth={2} />
        </g>
      );
    },
  },

  // 6. Sailor Top
  {
    id: 'outfit-sailor',
    category: 'outfit',
    subcategory: 'outfit',
    label: 'Sailor Uniform',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outfitPrimaryColor = '#f8fafc', outfitSecondaryColor = '#1d4ed8' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="outfit-sailor">
          <path
            d="M 50 178 Q 42 220 40 240 L 160 240 Q 158 220 150 178 Z"
            fill={outfitPrimaryColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
          {/* Navy Sailor Flap Collar */}
          <polygon
            points="70,176 130,176 142,204 118,204 100,214 82,204 58,204"
            fill={outfitSecondaryColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Red Tie / Ribbon */}
          <polygon points="96,212 104,212 108,226 100,234 92,226" fill="#f43f5e" stroke={outlineColor} strokeWidth={1.5} />
        </g>
      );
    },
  },

  // 7. Button-up Shirt & Tie
  {
    id: 'outfit-button-shirt-tie',
    category: 'outfit',
    subcategory: 'outfit',
    label: 'Shirt & Necktie',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outfitPrimaryColor = '#f8fafc', outfitSecondaryColor = '#f43f5e' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="outfit-tie">
          <path
            d="M 50 178 Q 42 220 40 240 L 160 240 Q 158 220 150 178 Z"
            fill={outfitPrimaryColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
          {/* Collars */}
          <polygon points="76,176 96,186 94,176" fill="#e2e8f0" stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
          <polygon points="124,176 104,186 106,176" fill="#e2e8f0" stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
          {/* Tie Knot & Body */}
          <polygon points="96,185 104,185 106,192 94,192" fill={outfitSecondaryColor} stroke={outlineColor} strokeWidth={1.5} />
          <polygon points="94,192 106,192 108,230 100,238 92,230" fill={outfitSecondaryColor} stroke={outlineColor} strokeWidth={1.5} />
        </g>
      );
    },
  },

  // 8. Overall Dungarees
  {
    id: 'outfit-dungarees',
    category: 'outfit',
    subcategory: 'outfit',
    label: 'Overall Dungarees',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outfitPrimaryColor = '#1d4ed8', outfitSecondaryColor = '#fef08a' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="outfit-dungarees">
          {/* Striped shirt underneath */}
          <path
            d="M 50 178 Q 42 220 40 240 L 160 240 Q 158 220 150 178 Z"
            fill={outfitSecondaryColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
          {/* Dungaree Bib */}
          <path
            d="M 74 198 L 126 198 L 134 240 L 66 240 Z"
            fill={outfitPrimaryColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Straps with brass buttons */}
          <line x1="78" y1="176" x2="78" y2="198" stroke={outfitPrimaryColor} strokeWidth={8} strokeLinecap="square" />
          <line x1="78" y1="176" x2="78" y2="198" stroke={outlineColor} strokeWidth={strokeWidth} fill="none" />
          <circle cx="78" cy="198" r="3" fill="#fbbf24" stroke={outlineColor} strokeWidth={1} />
          <line x1="122" y1="176" x2="122" y2="198" stroke={outfitPrimaryColor} strokeWidth={8} strokeLinecap="square" />
          <line x1="122" y1="176" x2="122" y2="198" stroke={outlineColor} strokeWidth={strokeWidth} fill="none" />
          <circle cx="122" cy="198" r="3" fill="#fbbf24" stroke={outlineColor} strokeWidth={1} />
        </g>
      );
    },
  },

  // 9. Baseball Jersey
  {
    id: 'outfit-baseball-jersey',
    category: 'outfit',
    subcategory: 'outfit',
    label: 'Baseball Jersey',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outfitPrimaryColor = '#f8fafc', outfitSecondaryColor = '#dc2626' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="outfit-baseball">
          <path
            d="M 50 178 Q 42 220 40 240 L 160 240 Q 158 220 150 178 Z"
            fill={outfitPrimaryColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
          {/* Contrast raglan stripes */}
          <path d="M 64 178 L 52 240" stroke={outfitSecondaryColor} strokeWidth={3} />
          <path d="M 136 178 L 148 240" stroke={outfitSecondaryColor} strokeWidth={3} />
          {/* V-neck placket & buttons */}
          <path d="M 86 174 L 100 190 L 114 174" stroke={outlineColor} strokeWidth={strokeWidth} fill="none" />
          <line x1="100" y1="190" x2="100" y2="240" stroke={outlineColor} strokeWidth={2} />
          <circle cx="100" cy="202" r="2" fill={outfitSecondaryColor} />
          <circle cx="100" cy="216" r="2" fill={outfitSecondaryColor} />
          <circle cx="100" cy="230" r="2" fill={outfitSecondaryColor} />
        </g>
      );
    },
  },

  // 10. Kimono / Yukata
  {
    id: 'outfit-kimono',
    category: 'outfit',
    subcategory: 'outfit',
    label: 'Yukata Kimono',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outfitPrimaryColor = '#ddd6fe', outfitSecondaryColor = '#ec4899' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="outfit-kimono">
          <path
            d="M 50 178 Q 42 220 40 240 L 160 240 Q 158 220 150 178 Z"
            fill={outfitPrimaryColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
          {/* Overlapping crossed lapels */}
          <line x1="68" y1="174" x2="116" y2="216" stroke={outfitSecondaryColor} strokeWidth={5} />
          <line x1="68" y1="174" x2="116" y2="216" stroke={outlineColor} strokeWidth={strokeWidth} />
          <line x1="132" y1="174" x2="84" y2="216" stroke={outfitSecondaryColor} strokeWidth={5} />
          <line x1="132" y1="174" x2="84" y2="216" stroke={outlineColor} strokeWidth={strokeWidth} />
          {/* Obi Sash */}
          <rect x="70" y="216" width="60" height="24" fill={outfitSecondaryColor} stroke={outlineColor} strokeWidth={strokeWidth} />
        </g>
      );
    },
  },

  // 11. Punk Leather Jacket
  {
    id: 'outfit-leather-jacket',
    category: 'outfit',
    subcategory: 'outfit',
    label: 'Biker Leather',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="outfit-leather">
          {/* Inner skull/red tee */}
          <path d="M 80 176 L 120 176 L 115 240 L 85 240 Z" fill="#e11d48" stroke={outlineColor} strokeWidth={strokeWidth} />
          {/* Leather Body */}
          <path d="M 48 180 L 82 188 L 84 240 L 38 240 Z" fill="#1e293b" stroke={outlineColor} strokeWidth={strokeWidth} />
          <path d="M 152 180 L 118 188 L 116 240 L 162 240 Z" fill="#1e293b" stroke={outlineColor} strokeWidth={strokeWidth} />
          {/* Asymmetric Lapels */}
          <polygon points="76,178 94,196 82,212 72,192" fill="#334155" stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
          <polygon points="124,178 106,196 118,212 128,192" fill="#334155" stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
          {/* Silver studs */}
          <circle cx="86" cy="188" r="2" fill="#f1f5f9" stroke={outlineColor} strokeWidth={1} />
          <circle cx="114" cy="188" r="2" fill="#f1f5f9" stroke={outlineColor} strokeWidth={1} />
        </g>
      );
    },
  },

  // 12. Retro Tracksuit
  {
    id: 'outfit-tracksuit',
    category: 'outfit',
    subcategory: 'outfit',
    label: 'Retro Tracksuit',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outfitPrimaryColor = '#06b6d4', outfitSecondaryColor = '#fef08a' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="outfit-tracksuit">
          <path
            d="M 50 178 Q 42 220 40 240 L 160 240 Q 158 220 150 178 Z"
            fill={outfitPrimaryColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
          {/* Chevron stripe across chest */}
          <polygon
            points="48,198 100,214 152,198 154,208 100,224 46,208"
            fill={outfitSecondaryColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth - 0.5}
          />
          {/* High zip collar */}
          <rect x="80" y="172" width="40" height="12" rx="4" fill={outfitPrimaryColor} stroke={outlineColor} strokeWidth={strokeWidth} />
          <line x1="100" y1="172" x2="100" y2="184" stroke="#ffffff" strokeWidth={2} />
        </g>
      );
    },
  },

  // 13. Peter-Pan Collar Dress
  {
    id: 'outfit-cute-dress',
    category: 'outfit',
    subcategory: 'outfit',
    label: 'Doll Dress',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outfitPrimaryColor = '#fbcfe8', outfitSecondaryColor = '#ffffff' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="outfit-dress">
          <path
            d="M 50 178 Q 40 220 36 240 L 164 240 Q 160 220 150 178 Z"
            fill={outfitPrimaryColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
          {/* Rounded Peter-Pan Collars */}
          <ellipse cx="88" cy="180" rx="14" ry="8" fill={outfitSecondaryColor} stroke={outlineColor} strokeWidth={strokeWidth - 0.5} transform="rotate(-10 88 180)" />
          <ellipse cx="112" cy="180" rx="14" ry="8" fill={outfitSecondaryColor} stroke={outlineColor} strokeWidth={strokeWidth - 0.5} transform="rotate(10 112 180)" />
          {/* Center Bow */}
          <polygon points="100,183 94,180 94,186" fill="#f43f5e" />
          <polygon points="100,183 106,180 106,186" fill="#f43f5e" />
          <circle cx="100" cy="183" r="2" fill="#be123c" />
        </g>
      );
    },
  },

  // 14. Chef Apron
  {
    id: 'outfit-chef-apron',
    category: 'outfit',
    subcategory: 'outfit',
    label: 'Baker Apron',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outfitPrimaryColor = '#f8fafc', outfitSecondaryColor = '#dc2626' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="outfit-apron">
          {/* Inner Shirt */}
          <path d="M 50 178 Q 42 220 40 240 L 160 240 Q 158 220 150 178 Z" fill="#fed7aa" stroke={outlineColor} strokeWidth={strokeWidth} />
          {/* White Apron Bib */}
          <path
            d="M 72 188 L 128 188 L 136 240 L 64 240 Z"
            fill={outfitPrimaryColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Neck strap */}
          <path d="M 80 188 Q 100 174 120 188" stroke={outfitSecondaryColor} strokeWidth={3} fill="none" />
          {/* Apron Pocket */}
          <rect x="85" y="212" width="30" height="20" rx="3" fill="#ffffff" stroke={outlineColor} strokeWidth={1.5} />
        </g>
      );
    },
  },

  // 15. Mage Robe
  {
    id: 'outfit-mage-robe',
    category: 'outfit',
    subcategory: 'outfit',
    label: 'Mage Robe',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outfitPrimaryColor = '#581c87', outfitSecondaryColor = '#fbbf24' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="outfit-mage">
          <path
            d="M 48 178 Q 38 220 34 240 L 166 240 Q 162 220 152 178 Z"
            fill={outfitPrimaryColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
          {/* Gold trim V-neck */}
          <polygon points="76,176 100,214 124,176 116,176 100,202 84,176" fill={outfitSecondaryColor} stroke={outlineColor} strokeWidth={1} />
          {/* Moon brooch */}
          <path d="M 98 198 A 5 5 0 0 0 102 208 A 4 4 0 0 1 98 198 Z" fill={outfitSecondaryColor} stroke={outlineColor} strokeWidth={1} />
        </g>
      );
    },
  },

  // 16. Preppy Polo
  {
    id: 'outfit-polo',
    category: 'outfit',
    subcategory: 'outfit',
    label: 'Preppy Polo',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outfitPrimaryColor = '#15803d', outfitSecondaryColor = '#ffffff' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="outfit-polo">
          <path
            d="M 50 178 Q 42 220 40 240 L 160 240 Q 158 220 150 178 Z"
            fill={outfitPrimaryColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
          {/* White polo collar */}
          <polygon points="76,174 96,188 98,176" fill={outfitSecondaryColor} stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
          <polygon points="124,174 104,188 102,176" fill={outfitSecondaryColor} stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
          <line x1="100" y1="188" x2="100" y2="210" stroke={outlineColor} strokeWidth={strokeWidth - 1} />
          <circle cx="100" cy="196" r="1.5" fill="#ffffff" />
        </g>
      );
    },
  },
];
