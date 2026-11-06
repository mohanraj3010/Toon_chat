import React, { useRef, useState, useEffect, useCallback, memo } from 'react';
import type {
  WorldPlaceConfig,
  WorldCharacterState,
  Vector2D,
  WorldHotspot,
} from '../types';
import { MapleParkScene } from './scenes/MapleParkScene';
import { CozyCafeScene } from './scenes/CozyCafeScene';
import { TownPlazaScene } from './scenes/TownPlazaScene';
import { WorldCharacter } from './WorldCharacter';
import { RadialInteractionMenu } from './RadialInteractionMenu';
import styles from './WorldCanvas.module.css';

interface WorldCanvasProps {
  sceneConfig: WorldPlaceConfig;
  characters: WorldCharacterState[];
  walkRipple: { x: number; y: number; id: number } | null;
  onGroundClick: (point: Vector2D) => void;
  onHotspotClick: (hotspot: WorldHotspot) => void;
  onWaveAtCharacter: (character: WorldCharacterState) => void;
  onChatWithCharacter: (character: WorldCharacterState) => void;
  onProfileCharacter: (character: WorldCharacterState) => void;
  onEmoteAtCharacter: (character: WorldCharacterState) => void;
}

export const WorldCanvas: React.FC<WorldCanvasProps> = memo(({
  sceneConfig,
  characters,
  walkRipple,
  onGroundClick,
  onHotspotClick,
  onWaveAtCharacter,
  onChatWithCharacter,
  onProfileCharacter,
  onEmoteAtCharacter,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [parallax, setParallax] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [scale, setScale] = useState<number>(1);
  const [selectedCharacter, setSelectedCharacter] = useState<WorldCharacterState | null>(null);

  // Responsive canvas scale & fit
  const updateDimensions = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const scaleX = clientWidth / 1000;
    const scaleY = clientHeight / 600;
    // Scale scene to fill viewport fully in both dimensions
    const calculatedScale = Math.max(scaleX, scaleY);
    setScale(calculatedScale);
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  // Pointer move handler for Desktop Parallax (disabled on touch devices & reduced motion)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width - 0.5;
    const normY = (e.clientY - rect.top) / rect.height - 0.5;
    setParallax({ x: normX, y: normY });
  };

  const handlePointerLeave = () => {
    setParallax({ x: 0, y: 0 });
  };

  // Compute camera center (centers on player on mobile, stays 500/300 on desktop)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const player = characters.find((c) => c.isCurrentUser);
  const cameraCenterX = isMobile && player ? Math.max(360, Math.min(640, player.position.x)) : 500;
  const cameraCenterY = isMobile && player ? Math.max(280, Math.min(420, player.position.y)) : 300;
  const offsetX = 500 - cameraCenterX;
  const offsetY = 300 - cameraCenterY;

  // Convert click coordinates to virtual (1000 x 600) scene coordinates
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selectedCharacter) {
      setSelectedCharacter(null);
      return;
    }
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Center offset
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const virtualX = (clickX - centerX) / scale + cameraCenterX;
    const virtualY = (clickY - centerY) / scale + cameraCenterY;

    onGroundClick({ x: Math.round(virtualX), y: Math.round(virtualY) });
  };

  const handleCharacterSelect = (char: WorldCharacterState, e: React.MouseEvent) => {
    e.stopPropagation();
    if (char.isCurrentUser) return;
    setSelectedCharacter(char);
  };

  // Render scene environment based on scene ID
  const renderSceneLayers = () => {
    switch (sceneConfig.id) {
      case 'cafe':
        return <CozyCafeScene parallaxOffset={parallax} />;
      case 'plaza':
        return <TownPlazaScene parallaxOffset={parallax} />;
      case 'park':
      default:
        return <MapleParkScene parallaxOffset={parallax} />;
    }
  };

  return (
    <div
      ref={containerRef}
      className={styles.canvasContainer}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleCanvasClick}
      role="region"
      aria-label={`${sceneConfig.name} Interactive World View. Tap or click anywhere on the path to walk.`}
    >
      <div
        className={styles.viewport}
        style={{
          transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${scale})`,
        }}
      >
        {/* 1. Layered SVG Environment */}
        {renderSceneLayers()}

        {/* 2. Walk Ripple Target Marker */}
        {walkRipple && (
          <div
            key={walkRipple.id}
            className={styles.walkRippleTarget}
            style={{
              left: `${walkRipple.x}px`,
              top: `${walkRipple.y}px`,
            }}
          >
            <div className={styles.rippleRing} />
          </div>
        )}

        {/* 3. Interactive Scene Hotspots */}
        {sceneConfig.hotspots.map((hotspot) => (
          <button
            key={hotspot.id}
            className={styles.hotspotPin}
            style={{
              left: `${hotspot.position.x}px`,
              top: `${hotspot.position.y}px`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onHotspotClick(hotspot);
            }}
            title={hotspot.tooltip}
            aria-label={`${hotspot.name}: ${hotspot.tooltip}`}
          >
            <div className={styles.hotspotBadge}>
              {hotspot.icon}
            </div>
            <span className={styles.hotspotTooltip}>
              {hotspot.name}
            </span>
          </button>
        ))}

        {/* 4. Living Characters (Y-Depth Sorted) */}
        {characters.map((char) => (
          <WorldCharacter
            key={char.id}
            character={char}
            onSelect={handleCharacterSelect}
          />
        ))}

        {/* 5. Radial Interaction Menu for Selected Friend */}
        {selectedCharacter && (
          <RadialInteractionMenu
            character={selectedCharacter}
            position={{
              x: selectedCharacter.position.x,
              y: selectedCharacter.position.y - 45,
            }}
            onWave={onWaveAtCharacter}
            onChat={onChatWithCharacter}
            onProfile={onProfileCharacter}
            onEmote={onEmoteAtCharacter}
            onClose={() => setSelectedCharacter(null)}
          />
        )}
      </div>
    </div>
  );
});
