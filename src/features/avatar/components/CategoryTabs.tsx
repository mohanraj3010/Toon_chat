import type { AvatarCategory } from '../registry/types';
import { CATEGORY_DEFINITIONS } from '../registry';
import { Smile, Scissors, Shirt, Glasses, Palette, Sparkles } from 'lucide-react';
import styles from './CategoryTabs.module.css';

interface CategoryTabsProps {
  activeCategory: AvatarCategory;
  onSelectCategory: (category: AvatarCategory) => void;
}

const CATEGORY_ICONS: Record<AvatarCategory, React.ReactNode> = {
  face: <Smile size={20} />,
  hair: <Scissors size={20} />,
  outfit: <Shirt size={20} />,
  accessories: <Glasses size={20} />,
  colors: <Palette size={20} />,
  background: <Sparkles size={20} />,
};

export const CategoryTabs = ({ activeCategory, onSelectCategory }: CategoryTabsProps) => {
  return (
    <div className={styles.tabsContainer} role="tablist" aria-label="Avatar customization categories">
      {CATEGORY_DEFINITIONS.map((cat) => {
        const isActive = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onSelectCategory(cat.id)}
            className={`${styles.tabItem} ${isActive ? styles.tabItemActive : ''}`}
          >
            <span className={styles.tabIcon}>{CATEGORY_ICONS[cat.id]}</span>
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
};
