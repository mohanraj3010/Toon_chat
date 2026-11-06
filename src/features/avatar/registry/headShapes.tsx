import type { AvatarPart, RenderContext } from './types';

export const HEAD_SHAPES: AvatarPart[] = [
  {
    id: 'head-chubby',
    category: 'face',
    subcategory: 'headShape',
    label: 'Chubby Cheeks',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { skinTone } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="head-base">
          {/* Neck */}
          <path
            d="M 90 148 L 90 178 Q 100 185 110 178 L 110 148 Z"
            fill={skinTone}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
          {/* Neck shadow */}
          <path
            d="M 90 148 Q 100 156 110 148 L 110 155 Q 100 162 90 155 Z"
            fill="rgba(0,0,0,0.08)"
          />
          {/* Left Ear */}
          <g>
            <path
              d="M 52 108 C 42 108 42 126 54 128"
              fill={skinTone}
              stroke={outlineColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <path
              d="M 48 114 Q 45 120 50 122"
              fill="none"
              stroke={outlineColor}
              strokeWidth={strokeWidth - 1}
              strokeLinecap="round"
            />
          </g>
          {/* Right Ear */}
          <g>
            <path
              d="M 148 108 C 158 108 158 126 146 128"
              fill={skinTone}
              stroke={outlineColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <path
              d="M 152 114 Q 155 120 150 122"
              fill="none"
              stroke={outlineColor}
              strokeWidth={strokeWidth - 1}
              strokeLinecap="round"
            />
          </g>
          {/* Head & Cheeks */}
          <path
            d="M 54 100 C 50 60 70 42 100 42 C 130 42 150 60 146 100 C 146 122 150 136 136 148 C 122 160 114 162 100 162 C 86 162 78 160 64 148 C 50 136 54 122 54 100 Z"
            fill={skinTone}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </g>
      );
    },
  },
  {
    id: 'head-oval',
    category: 'face',
    subcategory: 'headShape',
    label: 'Soft Oval',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { skinTone } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="head-base">
          <path d="M 91 146 L 91 176 Q 100 182 109 176 L 109 146 Z" fill={skinTone} stroke={outlineColor} strokeWidth={strokeWidth} />
          {/* Ears */}
          <path d="M 54 106 C 44 106 44 124 55 126" fill={skinTone} stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M 146 106 C 156 106 156 124 145 126" fill={skinTone} stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          {/* Head */}
          <path
            d="M 56 98 C 52 58 72 42 100 42 C 128 42 148 58 144 98 C 144 125 132 156 100 162 C 68 156 56 125 56 98 Z"
            fill={skinTone}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
        </g>
      );
    },
  },
  {
    id: 'head-round',
    category: 'face',
    subcategory: 'headShape',
    label: 'Cute Button',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { skinTone } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="head-base">
          <path d="M 90 148 L 90 178 Q 100 185 110 178 L 110 148 Z" fill={skinTone} stroke={outlineColor} strokeWidth={strokeWidth} />
          <path d="M 50 108 C 40 108 40 126 52 128" fill={skinTone} stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M 150 108 C 160 108 160 126 148 128" fill={skinTone} stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <circle cx="100" cy="104" r="50" fill={skinTone} stroke={outlineColor} strokeWidth={strokeWidth} />
        </g>
      );
    },
  },
  {
    id: 'head-heart',
    category: 'face',
    subcategory: 'headShape',
    label: 'Heart Anime',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { skinTone } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="head-base">
          <path d="M 91 146 L 91 176 Q 100 182 109 176 L 109 146 Z" fill={skinTone} stroke={outlineColor} strokeWidth={strokeWidth} />
          <path d="M 52 104 C 42 104 42 122 53 124" fill={skinTone} stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M 148 104 C 158 104 158 122 147 124" fill={skinTone} stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path
            d="M 52 94 C 50 56 70 42 100 42 C 130 42 150 56 148 94 C 146 124 125 152 100 164 C 75 152 54 124 52 94 Z"
            fill={skinTone}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
        </g>
      );
    },
  },
  {
    id: 'head-square-soft',
    category: 'face',
    subcategory: 'headShape',
    label: 'Square Soft',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { skinTone } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="head-base">
          <path d="M 89 148 L 89 178 Q 100 185 111 178 L 111 148 Z" fill={skinTone} stroke={outlineColor} strokeWidth={strokeWidth} />
          <path d="M 51 108 C 41 108 41 126 53 128" fill={skinTone} stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M 149 108 C 159 108 159 126 147 128" fill={skinTone} stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path
            d="M 54 94 C 52 58 72 42 100 42 C 128 42 148 58 146 94 C 146 128 142 154 128 158 C 114 162 86 162 72 158 C 58 154 54 128 54 94 Z"
            fill={skinTone}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
        </g>
      );
    },
  },
  {
    id: 'head-pear',
    category: 'face',
    subcategory: 'headShape',
    label: 'Pear Soft',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { skinTone } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="head-base">
          <path d="M 90 150 L 90 180 Q 100 186 110 180 L 110 150 Z" fill={skinTone} stroke={outlineColor} strokeWidth={strokeWidth} />
          <path d="M 49 114 C 39 114 39 132 51 134" fill={skinTone} stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M 151 114 C 161 114 161 132 149 134" fill={skinTone} stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path
            d="M 60 84 C 58 54 74 42 100 42 C 126 42 142 54 140 84 C 140 105 154 124 146 146 C 138 164 120 166 100 166 C 80 166 62 164 54 146 C 46 124 60 105 60 84 Z"
            fill={skinTone}
            stroke={outlineColor}
            strokeWidth={strokeWidth}
          />
        </g>
      );
    },
  },
];
