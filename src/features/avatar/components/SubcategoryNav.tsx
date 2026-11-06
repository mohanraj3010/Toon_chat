import type { AvatarCategory, AvatarSubcategory } from '../registry/types';
import { CATEGORY_DEFINITIONS } from '../registry';
import styles from './SubcategoryNav.module.css';

interface SubcategoryNavProps {
  category: AvatarCategory;
  activeSubcategory: AvatarSubcategory;
  onSelectSubcategory: (subcat: AvatarSubcategory) => void;
}

export const SubcategoryNav = ({
  category,
  activeSubcategory,
  onSelectSubcategory,
}: SubcategoryNavProps) => {
  const catDef = CATEGORY_DEFINITIONS.find((c) => c.id === category);
  if (!catDef || catDef.subcategories.length <= 1) return null;

  return (
    <div className={styles.subcatContainer} role="tablist" aria-label={`${catDef.label} subcategories`}>
      {catDef.subcategories.map((subcat) => {
        const isActive = activeSubcategory === subcat.id;
        return (
          <button
            key={subcat.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onSelectSubcategory(subcat.id)}
            className={`${styles.subcatChip} ${isActive ? styles.subcatChipActive : ''}`}
          >
            {subcat.label}
          </button>
        );
      })}
    </div>
  );
};
