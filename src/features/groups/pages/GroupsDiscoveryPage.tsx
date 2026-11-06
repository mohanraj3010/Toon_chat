import { useState, useMemo } from 'react';
import type { GroupCategory } from '../types';
import {
  CURRENT_USER_ID,
  useGroups,
  useJoinGroup,
} from '../api/groupsService';
import { GroupCard } from '../components/GroupCard';
import { CreateGroupModal } from '../components/CreateGroupModal';
import { Character } from '@/assets/characters/Character';
import { showToast } from '@/shared/ui/Toast';
import { Plus, Search, Sparkles } from 'lucide-react';
import styles from './GroupsDiscoveryPage.module.css';

const CATEGORY_FILTERS: { id: 'all' | GroupCategory; label: string }[] = [
  { id: 'all', label: 'All Squads' },
  { id: 'skate', label: '🛹 Skate' },
  { id: 'art', label: '🎨 Art' },
  { id: 'gaming', label: '🎮 Gaming' },
  { id: 'music', label: '🎵 Music' },
  { id: 'hangout', label: '☕ Hangout' },
];

export default function GroupsDiscoveryPage() {
  const { data: groups, isLoading } = useGroups();
  const joinMutation = useJoinGroup();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | GroupCategory>('all');
  const [viewTab, setViewTab] = useState<'all' | 'mine'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    return groups.filter((g) => {
      const isMine = g.members.some((m) => m.id === CURRENT_USER_ID);
      if (viewTab === 'mine' && !isMine) return false;

      if (selectedCategory !== 'all' && g.category !== selectedCategory) return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = g.name.toLowerCase().includes(query);
        const matchesDesc = g.description.toLowerCase().includes(query);
        const matchesEmblem = g.avatar.emblem.includes(query);
        return matchesName || matchesDesc || matchesEmblem;
      }

      return true;
    });
  }, [groups, search, selectedCategory, viewTab]);

  const handleJoin = (groupId: string) => {
    joinMutation.mutate({ groupId });
    showToast('You joined the squad! 🎉', 'success');
  };

  const handleRequestJoin = (_groupId: string) => {
    showToast('Join request sent to group admins! ⏳', 'info');
  };

  return (
    <div className={styles.pageContainer}>
      {/* Cartoon Hero Banner */}
      <div className={styles.heroBanner}>
        <div>
          <h1 className={styles.heroTitle}>
            <Sparkles size={28} color="#f97316" />
            <span>Toon Squads & Clubs</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Find your crew, share cartoon moments, and chat with friends in shared group spaces.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className={styles.createBtn}
        >
          <Plus size={20} strokeWidth={3} />
          <span>New Squad</span>
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className={styles.controlsRow}>
        <div className={styles.searchBar}>
          <Search size={18} color="var(--color-text-muted)" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search squads by name, description, or emblem..."
            className={styles.searchInput}
          />
        </div>

        <div className={styles.tabsRow}>
          {/* Category chips */}
          <div className={styles.categoryChips} role="tablist">
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`${styles.chip} ${selectedCategory === cat.id ? styles.active : ''}`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* All vs Mine view toggle */}
          <div className={styles.viewToggle}>
            <button
              type="button"
              onClick={() => setViewTab('all')}
              className={`${styles.toggleBtn} ${viewTab === 'all' ? styles.active : ''}`}
            >
              Discover
            </button>
            <button
              type="button"
              onClick={() => setViewTab('mine')}
              className={`${styles.toggleBtn} ${viewTab === 'mine' ? styles.active : ''}`}
            >
              My Squads
            </button>
          </div>
        </div>
      </div>

      {/* Groups Grid */}
      {isLoading ? (
        <div className={styles.groupsGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 220,
                backgroundColor: 'var(--color-bg-surface, #ffffff)',
                borderRadius: 24,
                border: '3.5px solid #1e293b',
                boxShadow: '0 6px 0 #1e293b',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
              }}
            >
              <div className="skeleton" style={{ height: 64, width: '100%', borderRadius: 0 }} />
              <div style={{ padding: '24px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="skeleton" style={{ width: '60%', height: 18, borderRadius: 6 }} />
                <div className="skeleton" style={{ width: '90%', height: 14, borderRadius: 6 }} />
                <div className="skeleton" style={{ width: '40%', height: 14, borderRadius: 6 }} />
              </div>
            </div>
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className={styles.emptyState}>
          <Character base={3} expression="surprised" size={110} />
          <h3 className={styles.emptyTitle}>No squads found!</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Try a different search term or be the first to create one!
          </p>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className={styles.createBtn}
            style={{ marginTop: 12 }}
          >
            <Plus size={18} />
            <span>Create a Squad</span>
          </button>
        </div>
      ) : (
        <div className={styles.groupsGrid}>
          {filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onJoin={handleJoin}
              onRequestJoin={handleRequestJoin}
            />
          ))}
        </div>
      )}

      {/* Create Group Stepper Modal */}
      <CreateGroupModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
