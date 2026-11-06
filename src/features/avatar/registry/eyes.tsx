import type { AvatarPart, RenderContext } from './types';

export const EYES: AvatarPart[] = [
  {
    id: 'eyes-sparkle',
    category: 'face',
    subcategory: 'eyes',
    label: 'Anime Sparkle',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { eyeColor = '#49255a' } = ctx.config;
      const { outlineColor, strokeWidth, expression } = ctx;

      if (expression === 'happy' || expression === 'laughing') {
        return (
          <g id="eyes-happy" stroke={outlineColor} strokeWidth={strokeWidth + 0.5} fill="none" strokeLinecap="round">
            <path d="M 72 104 Q 81 94 90 104" />
            <path d="M 110 104 Q 119 94 128 104" />
          </g>
        );
      }
      if (expression === 'wink') {
        return (
          <g id="eyes-wink">
            {/* Left open eye */}
            <g>
              <ellipse cx="80" cy="103" rx="10" ry="12" fill={eyeColor} />
              <circle cx="77" cy="99" r="4" fill="#ffffff" />
              <circle cx="83" cy="107" r="2.2" fill="#ffffff" />
              <path d="M 68 97 Q 80 91 91 97" stroke={outlineColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
            </g>
            {/* Right winking eye */}
            <path d="M 110 103 Q 120 95 129 104" stroke={outlineColor} strokeWidth={strokeWidth + 0.8} fill="none" strokeLinecap="round" />
            <path d="M 127 101 L 131 99" stroke={outlineColor} strokeWidth={strokeWidth - 0.5} strokeLinecap="round" />
          </g>
        );
      }
      if (expression === 'sleepy') {
        return (
          <g id="eyes-sleepy" stroke={outlineColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round">
            <path d="M 71 106 Q 81 109 90 106" />
            <path d="M 110 106 Q 119 109 129 106" />
          </g>
        );
      }
      if (expression === 'surprised') {
        return (
          <g id="eyes-surprised">
            <circle cx="81" cy="102" r="9" fill={eyeColor} />
            <circle cx="78" cy="99" r="3.5" fill="#ffffff" />
            <circle cx="119" cy="102" r="9" fill={eyeColor} />
            <circle cx="116" cy="99" r="3.5" fill="#ffffff" />
          </g>
        );
      }

      // Default Neutral
      return (
        <g id="eyes-sparkle-default">
          {/* Left Eye */}
          <g>
            <ellipse cx="80" cy="103" rx="10.5" ry="12.5" fill={eyeColor} />
            <ellipse cx="80" cy="108" rx="8" ry="6" fill="rgba(255,255,255,0.22)" />
            <circle cx="77" cy="98" r="4.2" fill="#ffffff" />
            <circle cx="84" cy="107" r="2.2" fill="#ffffff" />
            <path d="M 68 96 Q 80 90 92 97" stroke={outlineColor} strokeWidth={strokeWidth + 0.5} fill="none" strokeLinecap="round" />
            <path d="M 90 95 L 94 92" stroke={outlineColor} strokeWidth={strokeWidth - 1} strokeLinecap="round" />
          </g>
          {/* Right Eye */}
          <g>
            <ellipse cx="120" cy="103" rx="10.5" ry="12.5" fill={eyeColor} />
            <ellipse cx="120" cy="108" rx="8" ry="6" fill="rgba(255,255,255,0.22)" />
            <circle cx="117" cy="98" r="4.2" fill="#ffffff" />
            <circle cx="124" cy="107" r="2.2" fill="#ffffff" />
            <path d="M 108 97 Q 120 90 132 96" stroke={outlineColor} strokeWidth={strokeWidth + 0.5} fill="none" strokeLinecap="round" />
            <path d="M 130 95 L 134 92" stroke={outlineColor} strokeWidth={strokeWidth - 1} strokeLinecap="round" />
          </g>
        </g>
      );
    },
  },
  {
    id: 'eyes-cute-dot',
    category: 'face',
    subcategory: 'eyes',
    label: 'Chibi Dots',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor } = ctx;
      return (
        <g id="eyes-dots">
          <circle cx="80" cy="104" r="5" fill={outlineColor} />
          <circle cx="120" cy="104" r="5" fill={outlineColor} />
          <circle cx="78.5" cy="102.5" r="1.8" fill="#ffffff" />
          <circle cx="118.5" cy="102.5" r="1.8" fill="#ffffff" />
        </g>
      );
    },
  },
  {
    id: 'eyes-sleepy',
    category: 'face',
    subcategory: 'eyes',
    label: 'Sleepy Lids',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { eyeColor = '#49255a' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="eyes-sleepy">
          <g>
            <path d="M 70 102 Q 81 99 92 102" stroke={outlineColor} strokeWidth={strokeWidth + 0.5} fill="none" strokeLinecap="round" />
            <ellipse cx="81" cy="105" rx="7" ry="5" fill={eyeColor} />
            <circle cx="79" cy="104" r="2" fill="#ffffff" />
          </g>
          <g>
            <path d="M 108 102 Q 119 99 130 102" stroke={outlineColor} strokeWidth={strokeWidth + 0.5} fill="none" strokeLinecap="round" />
            <ellipse cx="119" cy="105" rx="7" ry="5" fill={eyeColor} />
            <circle cx="117" cy="104" r="2" fill="#ffffff" />
          </g>
        </g>
      );
    },
  },
  {
    id: 'eyes-wink-star',
    category: 'face',
    subcategory: 'eyes',
    label: 'Star Wink',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { eyeColor = '#49255a' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="eyes-wink-star">
          <g>
            <ellipse cx="80" cy="103" rx="10" ry="12" fill={eyeColor} />
            <polygon points="80,97 82,101 86,102 83,105 84,109 80,107 76,109 77,105 74,102 78,101" fill="#ffffff" />
            <path d="M 68 96 Q 80 90 92 97" stroke={outlineColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
          </g>
          <path d="M 110 104 Q 120 95 130 104" stroke={outlineColor} strokeWidth={strokeWidth + 1} fill="none" strokeLinecap="round" />
          <path d="M 129 101 L 133 99" stroke={outlineColor} strokeWidth={strokeWidth - 0.5} strokeLinecap="round" />
        </g>
      );
    },
  },
  {
    id: 'eyes-confident-lashes',
    category: 'face',
    subcategory: 'eyes',
    label: 'Glam Lashes',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { eyeColor = '#49255a' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="eyes-lashes">
          <g>
            <ellipse cx="80" cy="103" rx="9" ry="11" fill={eyeColor} />
            <circle cx="78" cy="99" r="3.5" fill="#ffffff" />
            <path d="M 67 96 Q 80 89 93 96" stroke={outlineColor} strokeWidth={strokeWidth + 1} fill="none" strokeLinecap="round" />
            <path d="M 91 93 L 96 89" stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            <path d="M 87 91 L 91 86" stroke={outlineColor} strokeWidth={strokeWidth - 0.5} strokeLinecap="round" />
          </g>
          <g>
            <ellipse cx="120" cy="103" rx="9" ry="11" fill={eyeColor} />
            <circle cx="118" cy="99" r="3.5" fill="#ffffff" />
            <path d="M 107 96 Q 120 89 133 96" stroke={outlineColor} strokeWidth={strokeWidth + 1} fill="none" strokeLinecap="round" />
            <path d="M 131 93 L 136 89" stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            <path d="M 127 91 L 131 86" stroke={outlineColor} strokeWidth={strokeWidth - 0.5} strokeLinecap="round" />
          </g>
        </g>
      );
    },
  },
  {
    id: 'eyes-big-cartoon',
    category: 'face',
    subcategory: 'eyes',
    label: 'Big Cartoon',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { eyeColor = '#49255a' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="eyes-big-cartoon">
          <ellipse cx="80" cy="102" rx="11" ry="13" fill="#ffffff" stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
          <ellipse cx="80" cy="103" rx="8" ry="10" fill={eyeColor} />
          <circle cx="77" cy="98" r="3.5" fill="#ffffff" />
          <ellipse cx="120" cy="102" rx="11" ry="13" fill="#ffffff" stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
          <ellipse cx="120" cy="103" rx="8" ry="10" fill={eyeColor} />
          <circle cx="117" cy="98" r="3.5" fill="#ffffff" />
        </g>
      );
    },
  },
  {
    id: 'eyes-smiling-arcs',
    category: 'face',
    subcategory: 'eyes',
    label: 'Happy Arcs',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="eyes-arcs" stroke={outlineColor} strokeWidth={strokeWidth + 0.8} fill="none" strokeLinecap="round">
          <path d="M 70 106 Q 80 94 90 106" />
          <path d="M 110 106 Q 120 94 130 106" />
        </g>
      );
    },
  },
  {
    id: 'eyes-kawaii-hearts',
    category: 'face',
    subcategory: 'eyes',
    label: 'Heart Eyes',
    unlockedByDefault: true,
    render: () => {
      return (
        <g id="eyes-hearts" fill="#ec4899">
          <path d="M 80 97 C 76 92 68 95 68 102 C 68 108 80 114 80 114 C 80 114 92 108 92 102 C 92 95 84 92 80 97 Z" />
          <circle cx="77" cy="99" r="2" fill="#ffffff" />
          <path d="M 120 97 C 116 92 108 95 108 102 C 108 108 120 114 120 114 C 120 114 132 108 132 102 C 132 95 124 92 120 97 Z" />
          <circle cx="117" cy="99" r="2" fill="#ffffff" />
        </g>
      );
    },
  },
  {
    id: 'eyes-intense-manga',
    category: 'face',
    subcategory: 'eyes',
    label: 'Manga Focus',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { eyeColor = '#49255a' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="eyes-manga">
          <g>
            <path d="M 68 98 L 92 95" stroke={outlineColor} strokeWidth={strokeWidth + 1} strokeLinecap="round" />
            <polygon points="73,98 88,98 84,108 77,108" fill={eyeColor} />
            <circle cx="77" cy="101" r="2" fill="#ffffff" />
            <line x1="72" y1="109" x2="88" y2="109" stroke={outlineColor} strokeWidth={strokeWidth - 0.5} strokeLinecap="round" />
          </g>
          <g>
            <path d="M 108 95 L 132 98" stroke={outlineColor} strokeWidth={strokeWidth + 1} strokeLinecap="round" />
            <polygon points="112,98 127,98 123,108 116,108" fill={eyeColor} />
            <circle cx="116" cy="101" r="2" fill="#ffffff" />
            <line x1="112" y1="109" x2="128" y2="109" stroke={outlineColor} strokeWidth={strokeWidth - 0.5} strokeLinecap="round" />
          </g>
        </g>
      );
    },
  },
  {
    id: 'eyes-cool-cat',
    category: 'face',
    subcategory: 'eyes',
    label: 'Cat-Eye Liner',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { eyeColor = '#49255a' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="eyes-cat">
          <g>
            <ellipse cx="80" cy="104" rx="8.5" ry="10.5" fill={eyeColor} />
            <circle cx="78" cy="100" r="3" fill="#ffffff" />
            <path d="M 66 99 Q 80 91 94 97 L 97 93" stroke={outlineColor} strokeWidth={strokeWidth + 0.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g>
            <ellipse cx="120" cy="104" rx="8.5" ry="10.5" fill={eyeColor} />
            <circle cx="118" cy="100" r="3" fill="#ffffff" />
            <path d="M 106 97 Q 120 91 134 99 L 137 95" stroke={outlineColor} strokeWidth={strokeWidth + 0.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      );
    },
  },
  {
    id: 'eyes-sparkle-stars',
    category: 'face',
    subcategory: 'eyes',
    label: 'Starlight Twin',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { eyeColor = '#49255a' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="eyes-stars">
          <ellipse cx="80" cy="103" rx="10" ry="12" fill={eyeColor} />
          <path d="M 80 98 Q 80 103 84 103 Q 80 103 80 108 Q 80 103 76 103 Q 80 103 80 98 Z" fill="#ffffff" />
          <path d="M 69 96 Q 80 91 91 96" stroke={outlineColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
          <ellipse cx="120" cy="103" rx="10" ry="12" fill={eyeColor} />
          <path d="M 120 98 Q 120 103 124 103 Q 120 103 120 108 Q 120 103 116 103 Q 120 103 120 98 Z" fill="#ffffff" />
          <path d="M 109 96 Q 120 91 131 96" stroke={outlineColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
        </g>
      );
    },
  },
  {
    id: 'eyes-glasses-friendly',
    category: 'face',
    subcategory: 'eyes',
    label: 'Inquisitive Round',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { eyeColor = '#49255a' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="eyes-round">
          <circle cx="80" cy="103" r="7" fill={eyeColor} />
          <circle cx="78" cy="100" r="2.5" fill="#ffffff" />
          <path d="M 72 95 Q 80 91 88 95" stroke={outlineColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
          <circle cx="120" cy="103" r="7" fill={eyeColor} />
          <circle cx="118" cy="100" r="2.5" fill="#ffffff" />
          <path d="M 112 95 Q 120 91 128 95" stroke={outlineColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
        </g>
      );
    },
  },
];
