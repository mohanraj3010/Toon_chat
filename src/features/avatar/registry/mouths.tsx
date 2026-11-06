import type { AvatarPart, RenderContext } from './types';

export const MOUTHS: AvatarPart[] = [
  {
    id: 'mouth-open-happy',
    category: 'face',
    subcategory: 'mouth',
    label: 'Open Happy',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor, strokeWidth, expression } = ctx;
      if (expression === 'surprised') {
        return (
          <ellipse cx="100" cy="135" rx="6" ry="8" fill="#a82338" stroke={outlineColor} strokeWidth={strokeWidth} />
        );
      }
      if (expression === 'sleepy') {
        return (
          <path d="M 94 133 Q 100 135 106 133" stroke={outlineColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
        );
      }
      return (
        <g id="mouth-open">
          <path
            d="M 90 128 Q 100 148 110 128 Z"
            fill="#e11d48"
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Tongue */}
          <path
            d="M 94 137 Q 100 133 106 137 Q 100 146 94 137 Z"
            fill="#fda4af"
          />
        </g>
      );
    },
  },
  {
    id: 'mouth-cat-w',
    category: 'face',
    subcategory: 'mouth',
    label: 'Kitty :3',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 92 131 Q 96 137 100 132 Q 104 137 108 131"
          stroke={outlineColor}
          strokeWidth={strokeWidth + 0.3}
          fill="none"
          strokeLinecap="round"
        />
      );
    },
  },
  {
    id: 'mouth-smirk',
    category: 'face',
    subcategory: 'mouth',
    label: 'Side Smirk',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 93 134 Q 101 135 109 130"
          stroke={outlineColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
      );
    },
  },
  {
    id: 'mouth-fang-grin',
    category: 'face',
    subcategory: 'mouth',
    label: 'Anime Fang',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="mouth-fang">
          <path
            d="M 91 129 Q 100 146 109 129 Z"
            fill="#9f1239"
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Fang on top left */}
          <polygon points="94,129 97,129 95.5,134" fill="#ffffff" stroke={outlineColor} strokeWidth={1} />
        </g>
      );
    },
  },
  {
    id: 'mouth-toothy-beam',
    category: 'face',
    subcategory: 'mouth',
    label: 'Toothy Beam',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="mouth-beam">
          <path
            d="M 89 129 Q 100 146 111 129 Z"
            fill="#e11d48"
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Top Teeth */}
          <path d="M 90 129 Q 100 135 110 129 L 109 133 Q 100 137 91 133 Z" fill="#ffffff" />
        </g>
      );
    },
  },
  {
    id: 'mouth-pout',
    category: 'face',
    subcategory: 'mouth',
    label: 'Cute Pout',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="mouth-pout">
          <path
            d="M 95 135 Q 100 131 105 135"
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
          <ellipse cx="100" cy="136.5" rx="3.5" ry="2" fill="#fb7185" />
        </g>
      );
    },
  },
  {
    id: 'mouth-bubblegum-o',
    category: 'face',
    subcategory: 'mouth',
    label: 'Bubblegum O',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="mouth-o">
          <circle cx="100" cy="134" r="5" fill="#e11d48" stroke={outlineColor} strokeWidth={strokeWidth} />
          <circle cx="103" cy="131" r="9" fill="#f472b6" stroke={outlineColor} strokeWidth={strokeWidth} />
          <circle cx="106" cy="128" r="2.5" fill="#ffffff" />
        </g>
      );
    },
  },
  {
    id: 'mouth-cute-line',
    category: 'face',
    subcategory: 'mouth',
    label: 'Sweet Smile',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 93 131 Q 100 137 107 131"
          stroke={outlineColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
      );
    },
  },
  {
    id: 'mouth-lipstick-pout',
    category: 'face',
    subcategory: 'mouth',
    label: 'Glossy Berry',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="mouth-lipstick">
          <path
            d="M 92 133 C 95 129 98 131 100 132 C 102 131 105 129 108 133 C 104 138 96 138 92 133 Z"
            fill="#e11d48"
            stroke={outlineColor}
            strokeWidth={strokeWidth - 0.5}
            strokeLinejoin="round"
          />
          <ellipse cx="97" cy="132" rx="2" ry="1" fill="#ffffff" opacity={0.6} />
        </g>
      );
    },
  },
  {
    id: 'mouth-wavy-nervous',
    category: 'face',
    subcategory: 'mouth',
    label: 'Wavy :S',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 92 133 Q 96 130 99 133 Q 102 136 105 132 Q 108 130 110 134"
          stroke={outlineColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
      );
    },
  },
  {
    id: 'mouth-shocked-o',
    category: 'face',
    subcategory: 'mouth',
    label: 'Shocked :O',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor, strokeWidth } = ctx;
      return (
        <ellipse
          cx="100"
          cy="135"
          rx="6"
          ry="9"
          fill="#9f1239"
          stroke={outlineColor}
          strokeWidth={strokeWidth}
        />
      );
    },
  },
  {
    id: 'mouth-tongue-out',
    category: 'face',
    subcategory: 'mouth',
    label: 'Cheeky :P',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="mouth-tongue">
          <path d="M 92 130 L 108 130" stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path
            d="M 98 130 C 98 138 106 138 106 130 Z"
            fill="#fb7185"
            stroke={outlineColor}
            strokeWidth={strokeWidth - 0.5}
          />
          <line x1="102" y1="130" x2="102" y2="135" stroke={outlineColor} strokeWidth={1} />
        </g>
      );
    },
  },
  {
    id: 'mouth-whistling',
    category: 'face',
    subcategory: 'mouth',
    label: 'Whistle ~',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor, strokeWidth } = ctx;
      return (
        <ellipse
          cx="104"
          cy="132"
          rx="3.5"
          ry="4.5"
          fill="#f43f5e"
          stroke={outlineColor}
          strokeWidth={strokeWidth}
        />
      );
    },
  },
  {
    id: 'mouth-confident-grin',
    category: 'face',
    subcategory: 'mouth',
    label: 'Confident Grin',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 90 130 Q 100 142 110 130 Q 100 134 90 130 Z"
          fill="#ffffff"
          stroke={outlineColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
    },
  },
];
