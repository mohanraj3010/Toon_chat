import { useState, useEffect, useCallback } from 'react';
import { ChatBubble } from '@/design-system/primitives';
import type { Message } from '@/shared/types';
import { VoiceMessage } from './VoiceMessage';
import { Check, CheckCheck, Clock, FileText, Download, Image as ImageIcon, AlertCircle, Loader2, SmilePlus } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import styles from './Chats.module.css';
import { STICKER_COMPONENTS } from '@/assets/stickers';
import { mediaService } from '@/services/api/mediaService';
import { formatBytes, sanitizeClientFilename } from '../hooks/useMediaUpload';
import { isDirectMediaUrl } from '../hooks/useResolvedMediaUrl';
import { ImageLightbox } from './ImageLightbox';
import { ReactionBar } from './ReactionBar';
import { ReactionPills } from './ReactionPills';
import reactionStyles from './ReactionBar.module.css';

interface Props {
  message: Message;
  isMine: boolean;
  showTail?: boolean;
  showSender?: boolean;
  senderName?: string;
  senderAvatar?: React.ReactNode;
  isSystemMessage?: boolean;
  onRetry?: (clientMessageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  currentUserId?: string;
}

function getFileBadgeColor(filename: string): { bg: string; color: string; label: string } {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  switch (ext) {
    case '.pdf':
      return { bg: '#fee2e2', color: '#dc2626', label: 'PDF' };
    case '.zip':
      return { bg: '#fef3c7', color: '#d97706', label: 'ZIP' };
    case '.doc':
    case '.docx':
      return { bg: '#e0f2fe', color: '#0284c7', label: 'DOC' };
    case '.txt':
      return { bg: '#f1f5f9', color: '#475569', label: 'TXT' };
    default:
      return { bg: 'var(--color-brand-100, #ffedd5)', color: 'var(--color-brand-600, #ea580c)', label: 'FILE' };
  }
}

export const MessageBubble = ({
  message,
  isMine,
  showTail = true,
  showSender = false,
  senderName,
  senderAvatar,
  isSystemMessage = false,
  onRetry,
  onReact,
  currentUserId,
}: Props) => {
  const variant = isMine ? 'sent' : 'received';
  const [showReactionBar, setShowReactionBar] = useState(false);

  // Validate whether initial mediaUrl is already a direct playable/viewable URL
  const isDirect = isDirectMediaUrl(message.mediaUrl);

  // State for resolved download / preview URL
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(isDirect ? message.mediaUrl! : null);
  const [isLoadingMedia, setIsLoadingMedia] = useState<boolean>(() =>
    Boolean(message.type === 'image' && message.mediaId && !isDirect)
  );
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [hasAutoRetried, setHasAutoRetried] = useState<boolean>(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Lazy-resolve short-lived authorized download URL if only mediaId was given or if mediaUrl is missing
  useEffect(() => {
    let isMounted = true;

    if (message.type === 'image' && message.mediaId && !resolvedUrl) {
      mediaService
        .getMediaUrl(message.mediaId)
        .then((res) => {
          if (isMounted) {
            setResolvedUrl(res.download_url);
            setIsLoadingMedia(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setMediaError('Image unavailable or expired');
            setIsLoadingMedia(false);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [message.type, message.mediaId, resolvedUrl]);

  // Auto-retry once on image load error before declaring unavailable
  const handleImageError = useCallback(() => {
    if (!hasAutoRetried && message.mediaId) {
      setHasAutoRetried(true);
      setIsLoadingMedia(true);
      setMediaError(null);
      mediaService
        .getMediaUrl(message.mediaId, { forceRefresh: true })
        .then((res) => {
          setResolvedUrl(res.download_url);
        })
        .catch(() => {
          setMediaError('Image unavailable');
        })
        .finally(() => {
          setIsLoadingMedia(false);
        });
    } else {
      setMediaError('Image unavailable');
    }
  }, [hasAutoRetried, message.mediaId]);

  // Handle file download using authorized signed URL
  const handleDownloadFile = useCallback(async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      let downloadUrl = resolvedUrl;
      if (message.mediaId) {
        const urlRes = await mediaService.getMediaUrl(message.mediaId);
        downloadUrl = urlRes.download_url;
      }

      if (!downloadUrl) {
        throw new Error('Download URL could not be resolved');
      }

      // Security check: strictly validate URL scheme to prevent javascript: or unsafe protocols
      const isSafeProtocol =
        downloadUrl.startsWith('/') ||
        downloadUrl.startsWith('http://') ||
        downloadUrl.startsWith('https://') ||
        downloadUrl.startsWith('blob:');

      if (!isSafeProtocol) {
        throw new Error('Unsafe download URL protocol rejected');
      }

      const cleanFilename = sanitizeClientFilename(message.fileName || message.content);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = cleanFilename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      setMediaError('Failed to download file');
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading, resolvedUrl, message.mediaId, message.fileName, message.content]);

  if (isSystemMessage || (message as any).type === 'system') {
    return (
      <div
        style={{
          alignSelf: 'center',
          margin: '10px 0',
          padding: '6px 16px',
          background: 'var(--color-bg-surface, #ffffff)',
          border: '1.5px solid var(--color-neutral-300, #cbd5e1)',
          borderRadius: 16,
          fontSize: '0.82rem',
          fontFamily: 'var(--font-display, Fredoka, cursive)',
          color: 'var(--color-text-muted, #64748b)',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
        }}
      >
        {message.content}
      </div>
    );
  }

  const renderContent = () => {
    switch (message.type) {
      case 'voice':
        return (
          <VoiceMessage
            messageId={message.id || message.clientMessageId}
            mediaId={message.mediaId}
            mediaUrl={resolvedUrl || message.mediaUrl}
            fileName={message.fileName}
            fileSize={message.fileSize}
            mimeType={message.mimeType}
            duration={
              message.content?.startsWith('Voice note (')
                ? message.content.replace(/^Voice note \((.*?)\)$/, '$1')
                : undefined
            }
            isMine={isMine}
            status={message.status}
            onRetry={() => onRetry?.(message.clientMessageId || message.id)}
          />
        );

      case 'sticker':
        const StickerComp = STICKER_COMPONENTS[message.content] || STICKER_COMPONENTS['sticker-1'];
        return (
          <div
            style={{
              filter: 'drop-shadow(var(--shadow-sticker))',
              animation: 'popIn var(--motion-duration-fast) var(--motion-easing-bounce)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <StickerComp width={128} height={128} />
          </div>
        );

      case 'image':
        const displayCaption = message.content && message.content !== message.fileName ? message.content : null;

        return (
          <div>
            <div
              className={styles['image-bubble-container']}
              onClick={() => {
                if (resolvedUrl && !mediaError) {
                  setIsLightboxOpen(true);
                }
              }}
              title="Click to view full image"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (resolvedUrl && !mediaError) setIsLightboxOpen(true);
                }
              }}
            >
              {isLoadingMedia ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)' }}>
                  <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>Loading image...</span>
                </div>
              ) : mediaError ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 12, textAlign: 'center', color: '#ef4444' }}>
                  <AlertCircle size={24} />
                  <span style={{ fontSize: '0.74rem', fontWeight: 700 }}>{mediaError}</span>
                  {message.mediaId && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsLoadingMedia(true);
                        setMediaError(null);
                        mediaService
                          .getMediaUrl(message.mediaId!, { forceRefresh: true })
                          .then((res) => {
                            setResolvedUrl(res.download_url);
                          })
                          .catch(() => {
                            setMediaError('Image unavailable');
                          })
                          .finally(() => {
                            setIsLoadingMedia(false);
                          });
                      }}
                      style={{
                        marginTop: 4,
                        padding: '2px 8px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        borderRadius: 9999,
                        border: '1.5px solid #ef4444',
                        background: '#fff',
                        color: '#ef4444',
                        cursor: 'pointer',
                      }}
                    >
                      Retry ↺
                    </button>
                  )}
                </div>
              ) : resolvedUrl ? (
                <img
                  src={resolvedUrl}
                  alt={displayCaption || message.fileName || 'Cartoon chat image'}
                  loading="lazy"
                  className={styles['image-bubble-img']}
                  onError={handleImageError}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-muted)' }}>
                  <ImageIcon size={24} />
                </div>
              )}
            </div>

            {displayCaption && (
              <div className={styles['image-bubble-caption']}>
                {displayCaption}
              </div>
            )}

            {/* Lightbox for Image Inspection */}
            {resolvedUrl && (
              <ImageLightbox
                isOpen={isLightboxOpen}
                currentIndex={0}
                images={[{ url: resolvedUrl, filename: message.fileName || 'photo.png', alt: displayCaption || 'Image' }]}
                onClose={() => setIsLightboxOpen(false)}
              />
            )}
          </div>
        );

      case 'file':
        const filename = sanitizeClientFilename(message.fileName || message.content);
        const badge = getFileBadgeColor(filename);

        return (
          <div className={styles['file-bubble-card']}>
            <div className={styles['file-bubble-icon']} style={{ backgroundColor: badge.bg, color: badge.color }}>
              <FileText size={22} />
            </div>

            <div className={styles['file-bubble-info']}>
              <span className={styles['file-bubble-name']} title={filename}>
                {filename}
              </span>
              <span className={styles['file-bubble-meta']}>
                {badge.label} {message.fileSize ? `• ${formatBytes(message.fileSize)}` : ''}
              </span>
            </div>

            <button
              type="button"
              className={styles['file-bubble-download']}
              onClick={handleDownloadFile}
              disabled={isDownloading}
              title="Download file"
              aria-label={`Download ${filename}`}
            >
              {isDownloading ? (
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Download size={16} />
              )}
            </button>
          </div>
        );

      default:
        // Highlight @mentions in cartoon style
        const textContent = message.content ?? (message as { body?: string }).body ?? '';
        const parts = textContent.split(/(@\w+)/g);
        return (
          <span>
            {parts.map((part, idx) =>
              part.startsWith('@') ? (
                <span
                  key={idx}
                  style={{
                    backgroundColor: 'var(--color-brand-100, #ffedd5)',
                    color: 'var(--color-brand-600, #ea580c)',
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: 8,
                  }}
                >
                  {part}
                </span>
              ) : (
                part
              )
            )}
          </span>
        );
    }
  };

  const handleSelectReaction = (emoji: string) => {
    onReact?.(message.id, emoji);
    setShowReactionBar(false);
  };

  const isSticker = message.type === 'sticker';
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isSticker) {
    return (
      <div
        id={`message-${message.id}`}
        className={styles['message-wrapper']}
        style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', alignItems: isMine ? 'flex-end' : 'flex-start' }}
      >
        {showSender && !isMine && senderName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, marginLeft: 6 }}>
            {senderAvatar && (
              <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', border: '1.5px solid #1e293b' }}>
                {senderAvatar}
              </div>
            )}
            <span style={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-display, Fredoka, cursive)', color: 'var(--color-brand-600, #ea580c)' }}>
              {senderName}
            </span>
          </div>
        )}

        {/* Borderless prominent sticker container */}
        <div className={reactionStyles['message-bubble-wrapper']}>
          {showReactionBar && (
            <ReactionBar
              onSelectReaction={handleSelectReaction}
              onClose={() => setShowReactionBar(false)}
              isMine={isMine}
            />
          )}

          <button
            type="button"
            className={cn(
              reactionStyles['reaction-trigger-btn'],
              isMine ? reactionStyles['reaction-trigger-btn-mine'] : reactionStyles['reaction-trigger-btn-theirs'],
              showReactionBar && reactionStyles['reaction-trigger-btn-active']
            )}
            onClick={() => setShowReactionBar((prev) => !prev)}
            title="Add cartoon reaction"
            aria-label="Add cartoon reaction"
          >
            <SmilePlus size={14} />
          </button>

          {renderContent()}
        </div>

        {/* Reaction pills aggregator */}
        <ReactionPills
          reactions={message.reactions}
          currentUserId={currentUserId}
          onReact={(emoji) => onReact?.(message.id, emoji)}
          isMine={isMine}
        />

        {isMine && (
          <div className={styles['message-status']}>
            {time}
            {message.status === 'uploading' && <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />}
            {message.status === 'sending' && <Clock size={10} />}
            {message.status === 'sent' && <Check size={12} />}
            {message.status === 'delivered' && <CheckCheck size={12} />}
            {message.status === 'read' && <CheckCheck size={12} color="var(--color-brand-500)" />}
            {message.status === 'failed' && (
              <button
                type="button"
                onClick={() => onRetry?.(message.clientMessageId || message.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: '#ef4444',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 2,
                }}
                title="Send failed. Click to retry."
              >
                <span>Retry ↺</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      id={`message-${message.id}`}
      className={styles['message-wrapper']}
      style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', alignItems: isMine ? 'flex-end' : 'flex-start' }}
    >
      {showSender && !isMine && senderName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, marginLeft: 6 }}>
          {senderAvatar && (
            <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', border: '1.5px solid #1e293b' }}>
              {senderAvatar}
            </div>
          )}
          <span style={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-display, Fredoka, cursive)', color: 'var(--color-brand-600, #ea580c)' }}>
            {senderName}
          </span>
        </div>
      )}

      {/* Bubble container with reaction popup */}
      <div className={reactionStyles['message-bubble-wrapper']}>
        {showReactionBar && (
          <ReactionBar
            onSelectReaction={handleSelectReaction}
            onClose={() => setShowReactionBar(false)}
            isMine={isMine}
          />
        )}

        <button
          type="button"
          className={cn(
            reactionStyles['reaction-trigger-btn'],
            isMine ? reactionStyles['reaction-trigger-btn-mine'] : reactionStyles['reaction-trigger-btn-theirs'],
            showReactionBar && reactionStyles['reaction-trigger-btn-active']
          )}
          onClick={() => setShowReactionBar((prev) => !prev)}
          title="Add cartoon reaction"
          aria-label="Add cartoon reaction"
        >
          <SmilePlus size={14} />
        </button>

        <ChatBubble 
          variant={variant} 
          showTail={showTail}
          className={styles['message-bubble-chat']}
        >
          {message.replyToId && (
            <div 
              className={cn(styles['reply-quote'], isMine && styles['reply-quote-mine'])}
              onClick={() => {
                const el = document.getElementById(`message-${message.replyToId}`);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // Flash effect to highlight jumped message
                  el.style.backgroundColor = 'var(--color-brand-100)';
                  el.style.borderRadius = '8px';
                  setTimeout(() => el.style.backgroundColor = 'transparent', 1500);
                }
              }}
              style={{ cursor: 'pointer', transition: 'background-color 1s ease' }}
            >
              <div className={styles['reply-quote-text']}>Replying to a message...</div>
            </div>
          )}
          {renderContent()}
        </ChatBubble>
      </div>

      {/* Reaction pills aggregator */}
      <ReactionPills
        reactions={message.reactions}
        currentUserId={currentUserId}
        onReact={(emoji) => onReact?.(message.id, emoji)}
        isMine={isMine}
      />

      {isMine && (
        <div className={styles['message-status']}>
          {time}
          {message.status === 'uploading' && <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />}
          {message.status === 'sending' && <Clock size={10} />}
          {message.status === 'sent' && <Check size={12} />}
          {message.status === 'delivered' && <CheckCheck size={12} />}
          {message.status === 'read' && <CheckCheck size={12} color="var(--color-brand-500)" />}
          {message.status === 'failed' && (
            <button
              type="button"
              onClick={() => onRetry?.(message.clientMessageId || message.id)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: '#ef4444',
                fontSize: '0.7rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
              }}
              title="Send failed. Click to retry."
            >
              <span>Retry ↺</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
