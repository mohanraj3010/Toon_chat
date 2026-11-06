import type { AvatarPart, RenderContext } from './types';

export const BLUSHES: AvatarPart[] = [
  {
    id: 'blush-soft-pink',
    category: 'face',
    subcategory: 'blush',
    label: 'Soft Pink',
    unlockedByDefault: true,
    render: () => {
      return (
        <g id="blush-soft">
          <ellipse cx="68" cy="118" rx="8" ry="4.5" fill="#fb7185" opacity={0.45} />
          <ellipse cx="132" cy="118" rx="8" ry="4.5" fill="#fb7185" opacity={0.45} />
        </g>
      );
    },
  },
  {
    id: 'blush-anime-dashes',
    category: 'face',
    subcategory: 'blush',
    label: 'Anime Lines',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { strokeWidth } = ctx;
      return (
        <g id="blush-dashes" stroke="#f43f5e" strokeWidth={strokeWidth - 1} strokeLinecap="round" opacity={0.75}>
          {/* Left cheek */}
          <line x1="64" y1="120" x2="68" y2="114" />
          <line x1="68" y1="120" x2="72" y2="114" />
          <line x1="72" y1="120" x2="76" y2="114" />
          {/* Right cheek */}
          <line x1="124" y1="120" x2="128" y2="114" />
          <line x1="128" y1="120" x2="132" y2="114" />
          <line x1="132" y1="120" x2="136" y2="114" />
        </g>
      );
    },
  },
  {
    id: 'blush-peach-glow',
    category: 'face',
    subcategory: 'blush',
    label: 'Peach Glow',
    unlockedByDefault: true,
    render: () => {
      return (
        <g id="blush-peach">
          <circle cx="68" cy="119" r="9" fill="#fb923c" opacity={0.35} />
          <circle cx="132" cy="119" r="9" fill="#fb923c" opacity={0.35} />
        </g>
      );
    },
  },
  {
    id: 'blush-freckles',
    category: 'face',
    subcategory: 'blush',
    label: 'Cute Freckles',
    unlockedByDefault: true,
    render: () => {
      return (
        <g id="blush-freckles">
          {/* Soft base */}
          <ellipse cx="68" cy="119" rx="7" ry="4" fill="#fb7185" opacity={0.3} />
          <ellipse cx="132" cy="119" rx="7" ry="4" fill="#fb7185" opacity={0.3} />
          {/* Freckle dots */}
          <g fill="#92400e" opacity={0.75}>
            <circle cx="65" cy="118" r="1" />
            <circle cx="69" cy="117" r="1.1" />
            <circle cx="72" cy="120" r="0.9" />
            <circle cx="67" cy="122" r="1" />
            <circle cx="128" cy="120" r="0.9" />
            <circle cx="131" cy="117" r="1.1" />
            <circle cx="135" cy="118" r="1" />
            <circle cx="133" cy="122" r="1" />
          </g>
        </g>
      );
    },
  },
  {
    id: 'blush-hearts',
    category: 'face',
    subcategory: 'blush',
    label: 'Heart Stamps',
    unlockedByDefault: true,
    render: () => {
      return (
        <g id="blush-hearts" fill="#ec4899" opacity={0.7}>
          <path d="M 68 116 C 66 113 62 115 62 118 C 62 121 68 124 68 124 C 68 124 74 121 74 118 C 74 115 70 113 68 116 Z" />
          <path d="M 132 116 C 130 113 126 115 126 118 C 126 121 132 124 132 124 C 132 124 138 121 138 118 C 138 115 134 113 132 116 Z" />
        </g>
      );
    },
  },
  {
    id: 'blush-stars',
    category: 'face',
    subcategory: 'blush',
    label: 'Sparkle Stars',
    unlockedByDefault: true,
    render: () => {
      return (
        <g id="blush-stars" fill="#fbbf24" opacity={0.8}>
          <polygon points="68,114 69.5,117.5 73,118.5 70.5,121 71,124.5 68,122.5 65,124.5 65.5,121 63,118.5 66.5,117.5" />
          <polygon points="132,114 133.5,117.5 137,118.5 134.5,121 135,124.5 132,122.5 129,124.5 129.5,121 127,118.5 130.5,117.5" />
        </g>
      );
    },
  },
];
