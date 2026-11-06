import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AvatarCategory, AvatarSubcategory } from '../registry/types';
import { type AvatarConfig, DEFAULT_AVATAR_CONFIG } from '../types';
import { CATEGORY_DEFINITIONS, COLOR_SLOTS } from '../registry';
import {
  useUpdateAvatarConfig,
  generateRandomAvatar,
  avatarService,
} from '../api/avatarService';
import { useAuth } from '@/features/auth/context/useAuth';
import { AvatarStage } from '../components/AvatarStage';
import { CategoryTabs } from '../components/CategoryTabs';
import { SubcategoryNav } from '../components/SubcategoryNav';
import { PartGrid } from '../components/PartGrid';
import { ColorPickerRow } from '../components/ColorPickerRow';
import { ActionBar } from '../components/ActionBar';
import { ConfirmModal } from '../components/ConfirmModal';
import { showToast } from '@/shared/ui/Toast';
import { ArrowLeft, Sparkles } from 'lucide-react';
import styles from './AvatarCreatorPage.module.css';

export default function AvatarCreatorPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const updateMutation = useUpdateAvatarConfig(user?.id);

  // Working config
  const [config, setConfig] = useState<AvatarConfig>(
    () => avatarService.getAvatar(user?.id) || DEFAULT_AVATAR_CONFIG
  );

  // History stack for Undo / Redo
  const [history, setHistory] = useState<AvatarConfig[]>([config]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Navigation state
  const [activeCategory, setActiveCategory] = useState<AvatarCategory>('face');
  const [activeSubcategory, setActiveSubcategory] = useState<AvatarSubcategory>('headShape');

  // Confirmation modals state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Push new config onto history stack
  const applyConfigChange = useCallback((newConfig: AvatarConfig) => {
    setConfig(newConfig);
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, newConfig].slice(-30); // Max 30 states
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }, [historyIndex]);

  const updatePartial = useCallback(
    (partial: Partial<AvatarConfig>) => {
      const next = { ...config, ...partial };
      applyConfigChange(next);
    },
    [config, applyConfigChange]
  );

  // Undo / Redo handlers
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = useCallback(() => {
    if (canUndo) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setConfig(history[prevIdx]);
    }
  }, [canUndo, historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (canRedo) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setConfig(history[nextIdx]);
    }
  }, [canRedo, historyIndex, history]);

  // Keyboard shortcuts (Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Category switch
  const handleSelectCategory = (cat: AvatarCategory) => {
    setActiveCategory(cat);
    const def = CATEGORY_DEFINITIONS.find((c) => c.id === cat);
    if (def && def.subcategories.length > 0) {
      setActiveSubcategory(def.subcategories[0].id);
    }
  };

  // Randomizer
  const handleRandomize = () => {
    const random = generateRandomAvatar(config);
    applyConfigChange(random);
    showToast('Spun the randomizer wheel! 🎲✨', 'info');
  };

  // Reset
  const handleConfirmReset = () => {
    setShowResetConfirm(false);
    const resetConfig = avatarService.resetAvatar(user?.id);
    applyConfigChange(resetConfig);
    showToast('Avatar reset to default! 🔄', 'info');
  };

  // Save
  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(config);
      showToast(`${config.name || 'Your avatar'} saved successfully! 🎉✨`, 'success');
    } catch {
      showToast('Could not save avatar changes.', 'error');
    }
  };

  // Unsaved changes detection
  const isDirty = useMemo(() => {
    const saved = avatarService.getAvatar(user?.id) || DEFAULT_AVATAR_CONFIG;
    return JSON.stringify(saved) !== JSON.stringify(config);
  }, [config, user?.id]);

  const handleBack = () => {
    if (isDirty) {
      setShowLeaveConfirm(true);
    } else {
      navigate(-1);
    }
  };

  // Determine which color slots to show
  const relevantColorSlots = useMemo(() => {
    if (activeCategory === 'colors') {
      return Object.values(COLOR_SLOTS);
    }
    // Per subcategory color rows
    switch (activeSubcategory) {
      case 'skinTone':
      case 'headShape':
        return [COLOR_SLOTS.skinTone];
      case 'hairStyle':
        return [COLOR_SLOTS.hairColor];
      case 'facialHair':
        return [COLOR_SLOTS.facialHairColor];
      case 'eyes':
        return [COLOR_SLOTS.eyeColor];
      case 'eyebrows':
        return [COLOR_SLOTS.eyebrowColor];
      case 'outfit':
        return [COLOR_SLOTS.outfitPrimaryColor, COLOR_SLOTS.outfitSecondaryColor];
      case 'glasses':
        return config.glasses !== 'none' ? [COLOR_SLOTS.glassesColor] : [];
      case 'hat':
        return config.hat !== 'none' ? [COLOR_SLOTS.hatColor] : [];
      case 'earrings':
        return config.earrings !== 'none' ? [COLOR_SLOTS.earringsColor] : [];
      case 'headphones':
        return config.headphones !== 'none' ? [COLOR_SLOTS.headphonesColor] : [];
      case 'background':
        return [COLOR_SLOTS.backgroundColor];
      default:
        return [];
    }
  }, [activeCategory, activeSubcategory, config]);

  return (
    <main className={styles.pageContainer}>
      {/* Top Header */}
      <header className={styles.topBar}>
        <div className={styles.titleArea}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={handleBack}
            aria-label="Back to previous page"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          <h1 className={styles.pageHeading}>
            <span>Avatar Studio</span>
            <Sparkles size={24} color="#a855f7" />
          </h1>
        </div>
      </header>

      {/* Main Studio Layout */}
      <div className={styles.desktopLayout}>
        {/* Left / Center Preview Stage */}
        <section className={styles.previewColumn} aria-label="Avatar live preview stage">
          <AvatarStage config={config} onUpdateConfig={updatePartial} />
        </section>

        {/* Right / Bottom Customization Controls */}
        <section className={styles.controlsColumn} aria-label="Avatar customization panel">
          {/* Category Tabs */}
          <CategoryTabs
            activeCategory={activeCategory}
            onSelectCategory={handleSelectCategory}
          />

          {/* Subcategory Pills */}
          <SubcategoryNav
            category={activeCategory}
            activeSubcategory={activeSubcategory}
            onSelectSubcategory={setActiveSubcategory}
          />

          {/* Color Palettes Row (if applicable) */}
          {relevantColorSlots.map((slot) => {
            const currentColor =
              (config as Record<string, unknown>)[slot.id] as string || slot.defaultColor;
            return (
              <ColorPickerRow
                key={slot.id}
                colorSlot={slot}
                currentColor={currentColor}
                onSelectColor={(color) => updatePartial({ [slot.id]: color })}
              />
            );
          })}

          {/* Part Thumbnails Grid */}
          {activeCategory !== 'colors' && (
            <PartGrid
              subcategory={activeSubcategory}
              currentConfig={config}
              onSelectPart={(partId) => updatePartial({ [activeSubcategory]: partId })}
            />
          )}

          {/* Desktop Action Bar */}
          <ActionBar
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onRandomize={handleRandomize}
            onReset={() => setShowResetConfirm(true)}
            onSave={handleSave}
            isSaving={updateMutation.isPending}
          />
        </section>
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="Reset Avatar to Default?"
        description="All your current edits will be replaced with the default character look. You can still undo this with Ctrl+Z."
        confirmLabel="Reset Look"
        cancelLabel="Keep Editing"
        onConfirm={handleConfirmReset}
        onCancel={() => setShowResetConfirm(false)}
      />

      {/* Unsaved Changes Confirmation Dialog */}
      <ConfirmModal
        isOpen={showLeaveConfirm}
        title="Unsaved Changes!"
        description="You have customized your avatar but haven't saved yet. Do you want to leave without saving?"
        confirmLabel="Discard & Leave"
        cancelLabel="Stay & Save"
        onConfirm={() => {
          setShowLeaveConfirm(false);
          navigate(-1);
        }}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </main>
  );
}
