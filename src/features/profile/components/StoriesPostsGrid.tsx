import { useState } from 'react';
import type { ProfilePost } from '../api/types';
import { EmptyState } from '@/design-system/primitives/EmptyState';
import { Button } from '@/design-system/primitives/Button';
import { Character } from '@/assets/characters/Character';
import { Heart, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './StoriesPostsGrid.module.css';

interface StoriesPostsGridProps {
  posts: ProfilePost[];
  isOwnProfile: boolean;
  onPostLike?: (postId: string) => void;
}

export const StoriesPostsGrid = ({
  posts,
  isOwnProfile,
}: StoriesPostsGridProps) => {
  const [activeTab, setActiveTab] = useState<'posts' | 'stories'>('posts');
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  const toggleLike = (id: string) => {
    setLikedPosts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const hasItems = posts.length > 0 && activeTab === 'posts';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Cartoon Stories & Moments</h2>
        <div className={styles.tabGroup}>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'posts' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            Posts ({posts.length})
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'stories' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('stories')}
          >
            Stories (Active)
          </button>
        </div>
      </div>

      {hasItems ? (
        <div className={styles.grid}>
          {posts.map((post) => {
            const isLiked = likedPosts[post.id];
            const currentLikes = post.likesCount + (isLiked ? 1 : 0);

            return (
              <article key={post.id} className={styles.postCard}>
                <div className={styles.postHeader}>
                  <div
                    className={styles.postEmojiBadge}
                    style={{ backgroundColor: post.themeColor }}
                  >
                    <span>{post.emoji}</span>
                  </div>
                  <div className={styles.postMeta}>
                    {post.tag && <span className={styles.postTag}>{post.tag}</span>}
                    <span className={styles.postTime}>{post.createdAt}</span>
                  </div>
                </div>

                <p className={styles.postCaption}>{post.caption}</p>

                <div className={styles.postFooter}>
                  <button
                    type="button"
                    onClick={() => toggleLike(post.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 6px',
                      borderRadius: 'var(--radius-pill)',
                    }}
                    aria-label={`Like post (${currentLikes} likes)`}
                  >
                    <Heart
                      size={16}
                      color={isLiked ? 'var(--color-danger)' : 'var(--color-ink-muted)'}
                      fill={isLiked ? 'var(--color-danger)' : 'none'}
                    />
                    <span
                      className={styles.likeCount}
                      style={{ color: isLiked ? 'var(--color-danger)' : undefined }}
                    >
                      {currentLikes}
                    </span>
                  </button>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    ToonChat Post 🌟
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyStateContainer}>
          <EmptyState
            illustration={
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-pastel-pink)',
                  border: 'var(--border-width-base) solid var(--color-outline)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-sticker)',
                  margin: '0 auto',
                }}
              >
                <Character base={3} expression="sleepy" size={100} />
              </div>
            }
            title={activeTab === 'posts' ? 'No posts yet!' : 'No active stories!'}
            description={
              isOwnProfile
                ? 'Your cartoon journal is empty! Share what is happening in your cartoon universe.'
                : 'This user has not posted any cartoon stories or moments yet.'
            }
            action={
              isOwnProfile ? (
                <Link to="/avatar" style={{ textDecoration: 'none' }}>
                  <Button variant="primary" size="md">
                    <Sparkles size={16} style={{ marginRight: 6 }} />
                    Customize Your Avatar
                  </Button>
                </Link>
              ) : (
                <Button variant="secondary" size="sm" disabled>
                  <ImageIcon size={16} style={{ marginRight: 6 }} />
                  Check back soon
                </Button>
              )
            }
          />
        </div>
      )}
    </div>
  );
};
