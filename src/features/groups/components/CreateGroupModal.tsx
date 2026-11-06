import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GroupCategory, GroupPrivacy } from '../types';
import { useCreateGroup } from '../api/groupsService';
import { useAvatarConfig } from '@/features/avatar/api/avatarService';
import { GroupAvatarView } from './GroupAvatarView';
import { showToast } from '@/shared/ui/Toast';
import { useModalA11y } from '@/shared/hooks/useModalA11y';
import { Users, X, ArrowRight, ArrowLeft, Check, Sparkles } from 'lucide-react';
import styles from './CreateGroupModal.module.css';

const EMBLEMS = ['🛹', '🎮', '🍕', '🎨', '🎵', '🚀', '⛺', '🐾', '⚽', '👾'];
const BG_COLORS = ['#ffedd5', '#fce7f3', '#e0f2fe', '#f3e8ff', '#dcfce7', '#fef3c7'];
const PATTERNS = ['dots', 'stars', 'stripes', 'clouds', 'solid'] as const;
const CATEGORIES: { id: GroupCategory; label: string }[] = [
  { id: 'hangout', label: '☕ Hangout' },
  { id: 'skate', label: '🛹 Skate & Park' },
  { id: 'art', label: '🎨 Art & Animation' },
  { id: 'gaming', label: '🎮 Gaming' },
  { id: 'music', label: '🎵 Music' },
  { id: 'tech', label: '💻 Tech' },
];

const FRIENDS_LIST = [
  { id: '1', name: 'Lucy Sky', emoji: '🌟' },
  { id: '2', name: 'Max Power', emoji: '⚡' },
  { id: '3', name: 'Bella B', emoji: '🎀' },
  { id: '4', name: 'Sam Smith', emoji: '🎧' },
  { id: '7', name: 'Chloe C', emoji: '🌸' },
];

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateGroupModal = ({ isOpen, onClose }: CreateGroupModalProps) => {
  const navigate = useNavigate();
  const { data: avatarConfig } = useAvatarConfig();
  const createMutation = useCreateGroup();
  const containerRef = useRef<HTMLDivElement>(null);

  useModalA11y({
    isOpen,
    onClose,
    containerRef,
  });

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GroupCategory>('hangout');
  const [privacy, setPrivacy] = useState<GroupPrivacy>('public');

  // Emblem studio
  const [emblem, setEmblem] = useState(EMBLEMS[0]);
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [pattern, setPattern] = useState<typeof PATTERNS[number]>('dots');

  // Friends invite
  const [selectedFriends, setSelectedFriends] = useState<string[]>(['1', '3']);

  const toggleFriend = (id: string) => {
    setSelectedFriends((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast('Please enter a group name', 'error');
      setStep(1);
      return;
    }

    try {
      const newGroup = await createMutation.mutateAsync({
        input: {
          name: name.trim(),
          description: description.trim(),
          category,
          privacy,
          avatar: { emblem, backgroundColor: bgColor, pattern },
          initialMemberIds: selectedFriends,
        },
        customAvatar: avatarConfig || undefined,
      });

      showToast(`Group "${newGroup.name}" created! 🎉`, 'success');
      onClose();
      navigate(`/chat/${newGroup.conversationId}`);
    } catch {
      showToast('Could not create group. Please try again.', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Create new group"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal} ref={containerRef} tabIndex={-1}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <Users size={22} color="var(--color-brand-500)" />
            <span>Create New Squad</span>
          </h2>
          <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Stepper Header */}
        <div className={styles.stepperRow}>
          <button type="button" onClick={() => setStep(1)} className={`${styles.stepPill} ${step === 1 ? styles.active : ''}`}>
            1. Info
          </button>
          <button type="button" onClick={() => setStep(2)} className={`${styles.stepPill} ${step === 2 ? styles.active : ''}`}>
            2. Emblem
          </button>
          <button type="button" onClick={() => setStep(3)} className={`${styles.stepPill} ${step === 3 ? styles.active : ''}`}>
            3. Invite
          </button>
        </div>

        <div className={styles.content}>
          {/* STEP 1: Info */}
          {step === 1 && (
            <>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Group Name *</label>
                <input
                  type="text"
                  maxLength={30}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maple Park Squad 🛹"
                  className={styles.input}
                  autoFocus
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Description</label>
                <textarea
                  maxLength={140}
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this squad all about?"
                  className={styles.input}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Category</label>
                <div className={styles.chipRow}>
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={`${styles.chip} ${category === c.id ? styles.active : ''}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Privacy</label>
                <div className={styles.chipRow}>
                  <button
                    type="button"
                    onClick={() => setPrivacy('public')}
                    className={`${styles.chip} ${privacy === 'public' ? styles.active : ''}`}
                  >
                    🌍 Public (Anyone can join)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrivacy('private')}
                    className={`${styles.chip} ${privacy === 'private' ? styles.active : ''}`}
                  >
                    🔒 Private (Request to join)
                  </button>
                </div>
              </div>
            </>
          )}

          {/* STEP 2: Emblem Studio */}
          {step === 2 && (
            <>
              <div className={styles.previewCenter}>
                <GroupAvatarView avatar={{ emblem, backgroundColor: bgColor, pattern }} size={74} />
                <span style={{ fontFamily: 'var(--font-display, Fredoka)', fontWeight: 700, fontSize: '0.9rem' }}>
                  {name || 'Squad Preview'}
                </span>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Pick Cartoon Emblem</label>
                <div className={styles.emblemGrid}>
                  {EMBLEMS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmblem(e)}
                      className={`${styles.emblemBtn} ${emblem === e ? styles.active : ''}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Background Color & Pattern</label>
                <div className={styles.chipRow} style={{ marginBottom: 6 }}>
                  {BG_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setBgColor(c)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: c,
                        border: bgColor === c ? '3px solid #1e293b' : '2px solid #cbd5e1',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
                <div className={styles.chipRow}>
                  {PATTERNS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPattern(p)}
                      className={`${styles.chip} ${pattern === p ? styles.active : ''}`}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* STEP 3: Invite Friends */}
          {step === 3 && (
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Invite Initial Friends</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {FRIENDS_LIST.map((f) => {
                  const isSelected = selectedFriends.includes(f.id);
                  return (
                    <div
                      key={f.id}
                      onClick={() => toggleFriend(f.id)}
                      className={`${styles.friendItem} ${isSelected ? styles.selected : ''}`}
                      role="checkbox"
                      aria-checked={isSelected}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{f.emoji}</span>
                        <span style={{ fontWeight: 600 }}>{f.name}</span>
                      </div>
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: isSelected ? 'var(--color-brand-500)' : '#fff',
                          border: isSelected ? '2px solid #1e293b' : '2px solid #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                        }}
                      >
                        {isSelected && <Check size={14} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className={styles.footer}>
          {step > 1 ? (
            <button type="button" onClick={() => setStep((s) => (s - 1) as 1 | 2)} className={styles.backBtn}>
              <ArrowLeft size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !name.trim()) {
                  showToast('Please enter a group name', 'error');
                  return;
                }
                setStep((s) => (s + 1) as 2 | 3);
              }}
              className={styles.submitBtn}
            >
              <span>Next</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={createMutation.isPending}
              onClick={handleSubmit}
              className={styles.submitBtn}
            >
              <Sparkles size={16} />
              <span>{createMutation.isPending ? 'Creating...' : 'Create Squad!'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
