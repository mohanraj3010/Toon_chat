import { memo, useMemo } from 'react';
import type { AvatarConfig, AvatarExpression } from '../types';
import type { RenderContext } from '../registry/types';
import { getPartById } from '../registry';
import styles from './AvatarRenderer.module.css';

export interface AvatarRendererProps {
  config: AvatarConfig;
  size?: number | string;
  expression?: AvatarExpression;
  showBackground?: boolean;
  animated?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const AvatarRenderer = memo(function AvatarRenderer({
  config,
  size = 160,
  expression: expressionProp,
  showBackground = true,
  animated = false,
  className = '',
  style,
}: AvatarRendererProps) {
  const activeExpression = expressionProp || config.expression || 'happy';

  const renderContext: RenderContext = useMemo(
    () => ({
      config,
      expression: activeExpression,
      outlineColor: 'var(--color-ink, #1f1b24)',
      strokeWidth: 2.8,
    }),
    [config, activeExpression]
  );

  // Retrieve parts from registry
  const bgPart = useMemo(() => getPartById(config.background, 'background'), [config.background]);
  const headPart = useMemo(() => getPartById(config.headShape, 'headShape'), [config.headShape]);
  const eyesPart = useMemo(() => getPartById(config.eyes, 'eyes'), [config.eyes]);
  const browsPart = useMemo(() => getPartById(config.eyebrows, 'eyebrows'), [config.eyebrows]);
  const nosePart = useMemo(() => getPartById(config.nose, 'nose'), [config.nose]);
  const mouthPart = useMemo(() => getPartById(config.mouth, 'mouth'), [config.mouth]);
  const blushPart = useMemo(() => getPartById(config.blush, 'blush'), [config.blush]);
  const hairPart = useMemo(() => getPartById(config.hairStyle, 'hairStyle'), [config.hairStyle]);
  const facialHairPart = useMemo(() => getPartById(config.facialHair, 'facialHair'), [config.facialHair]);
  const outfitPart = useMemo(() => getPartById(config.outfit, 'outfit'), [config.outfit]);
  const glassesPart = useMemo(() => getPartById(config.glasses, 'glasses'), [config.glasses]);
  const hatPart = useMemo(() => getPartById(config.hat, 'hat'), [config.hat]);
  const earringsPart = useMemo(() => getPartById(config.earrings, 'earrings'), [config.earrings]);
  const headphonesPart = useMemo(() => getPartById(config.headphones, 'headphones'), [config.headphones]);

  const dimension = typeof size === 'number' ? `${size}px` : size;

  return (
    <svg
      viewBox="0 0 200 240"
      width={dimension}
      height={dimension}
      className={`${styles.avatarSvg} ${className}`}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${config.name || 'Character'}'s avatar`}
    >
      {/* 1. Background layer */}
      {showBackground && bgPart && (
        <g id="layer-bg">{bgPart.render(renderContext)}</g>
      )}

      {/* Main Avatar Character Group (with optional breathing animation) */}
      <g id="layer-character" className={animated ? styles.avatarBreathe : undefined}>
        {/* 2. Hair Back layer */}
        {hairPart?.renderBack && (
          <g id="layer-hair-back">{hairPart.renderBack(renderContext)}</g>
        )}

        {/* 3. Head & Ears (Skin) layer */}
        {headPart && (
          <g id="layer-head">{headPart.render(renderContext)}</g>
        )}

        {/* 4. Blush layer */}
        {blushPart && (
          <g id="layer-blush">{blushPart.render(renderContext)}</g>
        )}

        {/* 5. Outfit / Torso layer */}
        {outfitPart && (
          <g id="layer-outfit">{outfitPart.render(renderContext)}</g>
        )}

        {/* 6. Eyes layer (with optional blink animation) */}
        {eyesPart && (
          <g id="layer-eyes" className={animated ? styles.avatarBlink : undefined}>
            {eyesPart.render(renderContext)}
          </g>
        )}

        {/* 7. Eyebrows layer */}
        {browsPart && (
          <g id="layer-eyebrows">{browsPart.render(renderContext)}</g>
        )}

        {/* 8. Nose layer */}
        {nosePart && (
          <g id="layer-nose">{nosePart.render(renderContext)}</g>
        )}

        {/* 9. Mouth layer */}
        {mouthPart && (
          <g id="layer-mouth">{mouthPart.render(renderContext)}</g>
        )}

        {/* 10. Facial Hair layer */}
        {facialHairPart && (
          <g id="layer-facial-hair">{facialHairPart.render(renderContext)}</g>
        )}

        {/* 11. Hair Front layer */}
        {hairPart && (
          <g id="layer-hair-front">{hairPart.render(renderContext)}</g>
        )}

        {/* 12. Earrings layer */}
        {earringsPart && (
          <g id="layer-earrings">{earringsPart.render(renderContext)}</g>
        )}

        {/* 13. Glasses layer */}
        {glassesPart && (
          <g id="layer-glasses">{glassesPart.render(renderContext)}</g>
        )}

        {/* 14. Hat / Headwear layer */}
        {hatPart && (
          <g id="layer-hat">{hatPart.render(renderContext)}</g>
        )}

        {/* 15. Headphones layer */}
        {headphonesPart && (
          <g id="layer-headphones">{headphonesPart.render(renderContext)}</g>
        )}
      </g>
    </svg>
  );
});
