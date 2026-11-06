import type { SVGProps } from 'react';

export interface CharacterProps extends SVGProps<SVGSVGElement> {
  base?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  expression?: 'happy' | 'wink' | 'surprised' | 'sleepy';
  skinTone?: string;
  hairColor?: string;
  clothingColor?: string;
  size?: number;
}

export const Character = ({
  base = 1,
  expression = 'happy',
  skinTone,
  hairColor,
  clothingColor,
  size = 120,
  ...props
}: CharacterProps) => {
  const defaultSkins = ['#ffe0cd', '#ffdfc4', '#f1c27d', '#e0ac69', '#8d5524', '#c68642', '#3d2218', '#fadcbc'];
  const defaultHairs = ['#2b2b2b', '#7c3f00', '#f5a623', '#d0021b', '#4a90e2', '#9013fe', '#417505', '#9b9b9b'];
  const defaultClothes = ['#e0f2fe', '#fbcfe8', '#fef08a', '#d1fae5', '#ffedd5', '#c7d2fe', '#bae6fd', '#fecaca'];
  
  const skin = skinTone || defaultSkins[base - 1];
  const hair = hairColor || defaultHairs[base - 1];
  const clothes = clothingColor || defaultClothes[base - 1];
  const outline = "var(--color-ink)";
  const strokeW = 3;

  // Render eyes based on expression
  const renderEyes = () => {
    switch (expression) {
      case 'happy':
        return (
          <g stroke={outline} strokeWidth={strokeW} fill="none" strokeLinecap="round">
            <path d="M 40 48 Q 45 42 50 48" />
            <path d="M 70 48 Q 75 42 80 48" />
            {/* eyebrows */}
            <path d="M 38 40 Q 45 36 52 40" strokeWidth="2.5" />
            <path d="M 68 40 Q 75 36 82 40" strokeWidth="2.5" />
          </g>
        );
      case 'wink':
        return (
          <g stroke={outline} strokeWidth={strokeW} fill="none" strokeLinecap="round">
            <ellipse cx="45" cy="48" rx="4" ry="6" fill={outline} />
            <path d="M 70 48 Q 75 42 80 48" />
            <path d="M 38 38 Q 45 34 52 38" strokeWidth="2.5" />
            <path d="M 68 40 Q 75 36 82 40" strokeWidth="2.5" />
          </g>
        );
      case 'surprised':
        return (
          <g fill={outline}>
            <circle cx="45" cy="46" r="5" />
            <circle cx="75" cy="46" r="5" />
            <g stroke={outline} strokeWidth="2.5" fill="none" strokeLinecap="round">
              <path d="M 40 35 Q 45 32 50 35" />
              <path d="M 70 35 Q 75 32 80 35" />
            </g>
          </g>
        );
      case 'sleepy':
        return (
          <g stroke={outline} strokeWidth={strokeW} fill="none" strokeLinecap="round">
            <line x1="40" y1="48" x2="50" y2="48" />
            <line x1="70" y1="48" x2="80" y2="48" />
            <path d="M 38 42 Q 45 40 52 42" strokeWidth="2.5" />
            <path d="M 68 42 Q 75 40 82 42" strokeWidth="2.5" />
          </g>
        );
    }
  };

  // Render mouth based on expression
  const renderMouth = () => {
    switch (expression) {
      case 'happy':
      case 'wink':
        return (
          <g>
            <path d="M 50 62 Q 60 76 70 62 Z" fill="#ef4444" stroke={outline} strokeWidth={strokeW} strokeLinejoin="round" />
            <path d="M 55 68 Q 60 72 65 68 Z" fill="#fca5a5" />
          </g>
        );
      case 'surprised':
        return <ellipse cx="60" cy="68" rx="5" ry="7" fill={outline} />;
      case 'sleepy':
        return <path d="M 54 66 Q 60 68 66 66" fill="none" stroke={outline} strokeWidth={strokeW} strokeLinecap="round" />;
    }
  };

  // Render hair based on base
  const renderHair = () => {
    switch (base) {
      case 1: return <path d="M 28 45 Q 35 15 60 20 Q 85 15 92 45 Q 75 25 60 28 Q 45 25 28 45 Z" fill={hair} stroke={outline} strokeWidth={strokeW} strokeLinejoin="round" />;
      case 2: return <path d="M 22 65 Q 20 20 60 20 Q 100 20 98 65 Q 85 45 60 40 Q 35 45 22 65 Z" fill={hair} stroke={outline} strokeWidth={strokeW} strokeLinejoin="round" />;
      case 3: return <path d="M 25 50 C 15 30 40 10 60 20 C 80 10 105 30 95 50 C 85 35 60 35 60 35 C 60 35 35 35 25 50 Z" fill={hair} stroke={outline} strokeWidth={strokeW} strokeLinejoin="round" />;
      case 4: return <path d="M 25 55 L 35 25 L 50 32 L 65 18 L 80 32 L 95 25 L 95 55 Q 75 40 60 40 Q 45 40 25 55 Z" fill={hair} stroke={outline} strokeWidth={strokeW} strokeLinejoin="round" />;
      case 5: return <path d="M 25 45 Q 60 15 95 45 M 95 45 Q 115 50 105 75 Q 95 85 95 45" fill={hair} stroke={outline} strokeWidth={strokeW} strokeLinejoin="round" />;
      case 6: return <path d="M 25 45 Q 60 20 95 45 Q 60 35 25 45 Z" fill={hair} stroke={outline} strokeWidth={strokeW} strokeLinejoin="round" />;
      case 7: return <path d="M 25 50 A 35 35 0 1 1 95 50 Q 80 35 60 35 Q 40 35 25 50 Z" fill={hair} stroke={outline} strokeWidth={strokeW} strokeLinejoin="round" />;
      case 8: return <path d="M 25 45 Q 60 20 95 45 L 105 90 Q 80 100 85 70 Q 60 45 45 70 Q 40 100 15 90 Z" fill={hair} stroke={outline} strokeWidth={strokeW} strokeLinejoin="round" />;
    }
  };

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M 25 115 Q 30 85 60 85 Q 90 85 95 115 Z" fill={clothes} stroke={outline} strokeWidth={strokeW} strokeLinejoin="round" />
      <rect x="52" y="70" width="16" height="20" fill={skin} stroke={outline} strokeWidth={strokeW} />
      <rect x="52" y="70" width="16" height="8" fill="#000000" opacity="0.1" />
      <rect x="30" y="30" width="60" height="55" rx="25" fill={skin} stroke={outline} strokeWidth={strokeW} />
      <path d="M 35 45 A 20 20 0 0 1 55 33" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
      <path d="M 30 50 A 8 8 0 0 0 30 65" fill={skin} stroke={outline} strokeWidth={strokeW} />
      <path d="M 90 50 A 8 8 0 0 1 90 65" fill={skin} stroke={outline} strokeWidth={strokeW} />
      {renderEyes()}
      {renderMouth()}
      {(expression === 'happy' || expression === 'wink') && (
        <g fill="#ff9999" opacity="0.5">
          <circle cx="40" cy="56" r="4.5" />
          <circle cx="80" cy="56" r="4.5" />
        </g>
      )}
      {renderHair()}
    </svg>
  );
};
