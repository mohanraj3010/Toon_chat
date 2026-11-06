import { useState } from 'react';
import type { GroupItem, GroupRole } from '../types';
import { getGroupPermissions } from '../types';
import {
  CURRENT_USER_ID,
  useRemoveMember,
  usePromoteDemoteMember,
  useToggleMuteMember,
  useLeaveGroup,
  useDeleteGroup,
  usePinMessage,
  useDebugUserRole,
} from '../api/groupsService';
import { GroupAvatarView } from './GroupAvatarView';
import { Character } from '@/assets/characters/Character';
import { AvatarRenderer } from '@/features/avatar/components/AvatarRenderer';
import { showToast } from '@/shared/ui/Toast';
import { X, Shield, UserMinus, VolumeX, Volume2, LogOut, Trash2 } from 'lucide-react';
import styles from './GroupDetailsDrawer.module.css';

interface GroupDetailsDrawerProps {
  group: GroupItem;
  isOpen: boolean;
  onClose: () => void;
}

export const GroupDetailsDrawer = ({ group, isOpen, onClose }: GroupDetailsDrawerProps) => {
  const currentMember = group.members.find((m) => m.id === CURRENT_USER_ID);
  const myRole = currentMember?.role || 'member';
  const permissions = getGroupPermissions(myRole);

  const removeMemberMutation = useRemoveMember();
  const roleMutation = usePromoteDemoteMember();
  const muteMutation = useToggleMuteMember();
  const leaveMutation = useLeaveGroup();
  const deleteMutation = useDeleteGroup();
  const pinMutation = usePinMessage();
  const debugRoleMutation = useDebugUserRole();

  const [pinInput, setPinInput] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!isOpen) return null;

  const handleLeave = () => {
    if (myRole === 'owner' && group.members.length > 1) {
      const nextOwner = group.members.find((m) => m.id !== CURRENT_USER_ID);
      leaveMutation.mutate({ groupId: group.id, newOwnerId: nextOwner?.id });
      showToast(`Ownership transferred to ${nextOwner?.displayName}. You left the squad.`, 'info');
    } else {
      leaveMutation.mutate({ groupId: group.id });
      showToast('You left the squad.', 'info');
    }
    onClose();
  };

  const handleDelete = () => {
    if (deleteConfirmText.trim().toLowerCase() !== group.name.trim().toLowerCase()) {
      showToast('Group name did not match', 'error');
      return;
    }
    deleteMutation.mutate(group.id);
    showToast('Group deleted.', 'info');
    onClose();
  };

  const handleSetPin = () => {
    if (!pinInput.trim()) return;
    pinMutation.mutate({ groupId: group.id, content: pinInput.trim() });
    showToast('Message pinned to group header! 📌', 'success');
    setPinInput('');
    setShowPinInput(false);
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Group details">
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        {/* Banner with Emblem */}
        <div className={styles.banner} style={{ backgroundColor: group.bannerColor || '#ffedd5' }}>
          <div className={styles.avatarPosition}>
            <GroupAvatarView avatar={group.avatar} size={58} />
          </div>
          <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close details">
            <X size={16} />
          </button>
        </div>

        <div className={styles.body}>
          {/* Identity info */}
          <div className={styles.groupInfo}>
            <h2 className={styles.groupTitle}>{group.name}</h2>
            <p className={styles.description}>{group.description || 'Welcome to our ToonChat squad!'}</p>
          </div>

          {/* Dev Debug Role Switcher */}
          <div className={styles.debugCard}>
            <span className={styles.debugLabel}>⚡ Dev Role Switcher (Test Permissions)</span>
            <div className={styles.debugRoles}>
              {(['owner', 'admin', 'member'] as GroupRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => debugRoleMutation.mutate({ groupId: group.id, role: r })}
                  className={`${styles.roleBtn} ${myRole === r ? styles.active : ''}`}
                >
                  {r === 'owner' ? '👑 Owner' : r === 'admin' ? '⭐ Admin' : '🎈 Member'}
                </button>
              ))}
            </div>
          </div>

          {/* Pinned Message Admin Controls */}
          {permissions.canPin && (
            <div>
              <div className={styles.sectionTitle}>
                <span>📌 Pinned Message</span>
                <button
                  type="button"
                  onClick={() => setShowPinInput((p) => !p)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-brand-600)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}
                >
                  {showPinInput ? 'Cancel' : group.pinnedMessage ? 'Change Pin' : '+ Pin Message'}
                </button>
              </div>

              {showPinInput ? (
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <input
                    type="text"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Enter message to pin..."
                    style={{ flex: 1, padding: '6px 12px', borderRadius: 12, border: '2px solid #cbd5e1' }}
                  />
                  <button type="button" onClick={handleSetPin} style={{ padding: '6px 12px', background: '#f97316', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700 }}>
                    Pin
                  </button>
                </div>
              ) : group.pinnedMessage ? (
                <div style={{ padding: 10, background: '#fff7ed', borderRadius: 12, border: '1.5px solid #fed7aa', fontSize: '0.85rem' }}>
                  <strong>{group.pinnedMessage.pinnedBy}:</strong> {group.pinnedMessage.content}
                </div>
              ) : null}
            </div>
          )}

          {/* Members List with Role Badges */}
          <div>
            <div className={styles.sectionTitle}>
              <span>Members ({group.members.length})</span>
            </div>

            <div className={styles.memberList}>
              {group.members.map((member) => (
                <div key={member.id} className={styles.memberRow}>
                  <div className={styles.memberLeft}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', border: '1.5px solid #1e293b' }}>
                      {member.avatarConfig ? (
                        <AvatarRenderer config={member.avatarConfig} size={34} />
                      ) : (
                        <Character base={(member.themeBase || 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8} size={34} />
                      )}
                    </div>
                    <div>
                      <div className={styles.memberName}>{member.displayName}</div>
                      <span className={`${styles.roleTag} ${styles[`role-${member.role}`]}`}>
                        {member.role === 'owner' ? '👑 Owner' : member.role === 'admin' ? '⭐ Admin' : 'Member'}
                      </span>
                    </div>
                  </div>

                  {/* Actions for other members */}
                  {member.id !== CURRENT_USER_ID && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      {permissions.canPromoteDemote && member.role !== 'owner' && (
                        <button
                          type="button"
                          onClick={() =>
                            roleMutation.mutate({
                              groupId: group.id,
                              userId: member.id,
                              newRole: member.role === 'admin' ? 'member' : 'admin',
                            })
                          }
                          className={styles.actionIconBtn}
                          title={member.role === 'admin' ? 'Demote to Member' : 'Promote to Admin'}
                        >
                          <Shield size={16} />
                        </button>
                      )}

                      {permissions.canRemove && member.role !== 'owner' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              muteMutation.mutate({ groupId: group.id, userId: member.id });
                              showToast(member.isMuted ? `${member.displayName} unmuted` : `${member.displayName} muted`, 'info');
                            }}
                            className={styles.actionIconBtn}
                            title={member.isMuted ? 'Unmute member' : 'Mute member'}
                            aria-label={member.isMuted ? 'Unmute member' : 'Mute member'}
                          >
                            {member.isMuted ? <Volume2 size={16} /> : <VolumeX size={16} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to remove ${member.displayName} from this squad?`)) {
                                removeMemberMutation.mutate({ groupId: group.id, userId: member.id });
                                showToast(`${member.displayName} removed`, 'info');
                              }
                            }}
                            className={styles.actionIconBtn}
                            title="Remove member"
                          >
                            <UserMinus size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone: Leave / Delete */}
          <div className={styles.dangerArea}>
            <button type="button" onClick={handleLeave} className={styles.leaveBtn}>
              <LogOut size={16} />
              <span>Leave Squad</span>
            </button>

            {permissions.canDelete && (
              <>
                {showDeleteModal ? (
                  <div style={{ padding: 12, background: '#fee2e2', borderRadius: 14, border: '2px solid #ef4444', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#991b1b' }}>
                      Type "{group.name}" to confirm:
                    </span>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder={group.name}
                      style={{ padding: '6px 10px', borderRadius: 10, border: '1.5px solid #ef4444' }}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: 6, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 10 }}>
                        Cancel
                      </button>
                      <button type="button" onClick={handleDelete} style={{ flex: 1, padding: 6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700 }}>
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className={styles.leaveBtn}
                    style={{ background: '#fef2f2', borderColor: '#fca5a5' }}
                  >
                    <Trash2 size={16} />
                    <span>Delete Squad</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
