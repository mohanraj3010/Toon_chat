import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { Button } from '@/design-system/primitives';
import { Mic, Send, Paperclip, Smile, X, FileText, RotateCcw } from 'lucide-react';
import type { Message } from '@/shared/types';
import styles from './Chats.module.css';
import { StickerPicker } from './StickerPicker';
import { AttachmentMenu } from './AttachmentMenu';
import { useMediaUpload, formatBytes } from '../hooks/useMediaUpload';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { VoiceRecorderBar, type VoiceMetadata } from './VoiceRecorderBar';

interface ComposerProps {
  conversationId?: string;
  onSend: (
    text: string,
    type?: Message['type'],
    mediaInfo?: {
      mediaId: string;
      mediaUrl?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
    }
  ) => void;
  onSendVoice?: (blob: Blob, meta: VoiceMetadata) => void;
  onTyping?: (isTyping: boolean) => void;
}

export const Composer = ({ conversationId, onSend, onSendVoice, onTyping }: ComposerProps) => {
  const [text, setText] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const micButtonRef = useRef<HTMLButtonElement>(null);

  const recorder = useVoiceRecorder();

  const {
    uploads,
    isUploadingAny,
    readyUploads,
    addFiles,
    cancelUpload,
    retryUpload,
    removeUpload,
    clearCompleted,
  } = useMediaUpload(conversationId);

  // Clean up any ongoing recording strictly when conversation changes (not on re-renders)
  const cancelRecordingRef = useRef(recorder.cancelRecording);
  useEffect(() => {
    cancelRecordingRef.current = recorder.cancelRecording;
  }, [recorder.cancelRecording]);

  useEffect(() => {
    cancelRecordingRef.current();
  }, [conversationId]);

  const handleVoiceCancel = useCallback(() => {
    setTimeout(() => {
      if (textareaRef.current && text.trim().length > 0) {
        textareaRef.current.focus();
      } else {
        micButtonRef.current?.focus();
      }
    }, 50);
  }, [text]);

  // Auto-grow
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSend = () => {
    if (isUploadingAny) return;

    if (readyUploads.length > 0) {
      onTyping?.(false);
      // Dispatch ready media attachments
      readyUploads.forEach((item, idx) => {
        const caption = idx === 0 && text.trim() ? text.trim() : item.name;
        onSend(caption, item.mediaType, {
          mediaId: item.mediaId!,
          fileName: item.name,
          fileSize: item.size,
          mimeType: item.mimeType,
        });
      });
      clearCompleted();
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '40px';
        textareaRef.current.focus();
      }
      return;
    }

    if (text.trim()) {
      onTyping?.(false);
      onSend(text.trim(), 'text');
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '40px';
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing) return; // IME composition safety
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (val: string) => {
    setText(val);
    if (val.trim().length > 0) {
      onTyping?.(true);
    } else {
      onTyping?.(false);
    }
  };

  const hasText = text.trim().length > 0;
  const canSend = (hasText || readyUploads.length > 0) && !isUploadingAny;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', position: 'relative' }}>
      {/* Pending Attachments Preview Tray */}
      {uploads.length > 0 && (
        <div className={styles['composer-preview-tray']} role="region" aria-label="Attachments pending send">
          {uploads.map((item) => {
            const isFailed = item.status === 'failed' || item.status === 'cancelled';
            const isUploading = item.status === 'uploading' || item.status === 'confirming';

            return (
              <div key={item.id} className={styles['composer-preview-card']}>
                {/* Remove button */}
                <button
                  type="button"
                  className={styles['composer-preview-remove']}
                  onClick={() => (isUploading ? cancelUpload(item.id) : removeUpload(item.id))}
                  title={isUploading ? 'Cancel upload' : 'Remove attachment'}
                  aria-label={isUploading ? 'Cancel upload' : 'Remove attachment'}
                >
                  <X size={12} />
                </button>

                {/* Thumbnail / File Card */}
                {item.mediaType === 'image' && item.previewUrl ? (
                  <img src={item.previewUrl} alt={item.name} className={styles['composer-preview-card-image']} />
                ) : (
                  <div className={styles['composer-preview-card-file']}>
                    <FileText size={22} color="var(--color-brand-600, #ea580c)" />
                    <span className={styles['composer-preview-filename']}>{item.name}</span>
                    <span className={styles['composer-preview-size']}>{formatBytes(item.size)}</span>
                  </div>
                )}

                {/* Progress bar */}
                {isUploading && (
                  <>
                    <div
                      className={styles['composer-preview-progress']}
                      style={{ width: `${item.progress}%` }}
                    />
                    <div className={styles['composer-preview-badge-status']}>
                      {item.status === 'confirming' ? 'Verifying...' : `${item.progress}%`}
                    </div>
                  </>
                )}

                {/* Error overlay with retry */}
                {isFailed && (
                  <div className={styles['composer-preview-error']}>
                    <span className={styles['composer-preview-error-text']} title={item.error}>
                      {item.status === 'cancelled' ? 'Cancelled' : 'Failed'}
                    </span>
                    {!item.requiresReSelection && item.file && (
                      <button
                        type="button"
                        className={styles['composer-preview-retry-btn']}
                        onClick={() => retryUpload(item.id)}
                      >
                        <RotateCcw size={10} style={{ display: 'inline', marginRight: 2 }} />
                        Retry
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Main Composer Row or Voice Recorder Bar */}
      {recorder.state !== 'idle' || recorder.isRequestingPermission || recorder.error ? (
        <VoiceRecorderBar
          recorder={recorder}
          onSend={onSendVoice}
          onCancel={handleVoiceCancel}
        />
      ) : (
        <div className={styles['composer-container']}>
            {showStickers && (
              <StickerPicker
                onSelect={(id) => onSend(id, 'sticker')}
                onClose={() => setShowStickers(false)}
              />
            )}

            {showAttachmentMenu && (
              <AttachmentMenu
                isOpen={showAttachmentMenu}
                onClose={() => setShowAttachmentMenu(false)}
                onSelectFiles={(files, preferredType) => addFiles(files, preferredType)}
              />
            )}

            <Button
              variant="ghost"
              className={styles['composer-action']}
              title="Attach photo or document"
              aria-label="Attach photo or document"
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            >
              <Paperclip size={20} color={showAttachmentMenu ? 'var(--color-brand-500)' : 'var(--color-text-muted)'} />
            </Button>

            <div className={styles['composer-input-wrapper']}>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => handleChange(e.target.value)}
                onBlur={() => onTyping?.(false)}
                onKeyDown={handleKeyDown}
                placeholder={readyUploads.length > 0 ? 'Add a caption...' : 'Type a message...'}
                className={styles['composer-textarea']}
                rows={1}
              />
              <Button
                variant="ghost"
                className={styles['composer-emoji']}
                onClick={() => setShowStickers(!showStickers)}
                aria-label="Toggle stickers tray"
              >
                <Smile size={20} color={showStickers ? 'var(--color-brand-500)' : 'var(--color-text-muted)'} />
              </Button>
            </div>

            {canSend ? (
              <Button
                variant="primary"
                className={styles['composer-send']}
                onClick={handleSend}
                disabled={isUploadingAny}
                aria-label="Send message"
              >
                <Send size={18} color="white" />
              </Button>
            ) : (
              <Button
                ref={micButtonRef}
                variant="ghost"
                className={styles['composer-action']}
                title={
                  recorder.permissionStatus === 'unsupported'
                    ? 'Voice recording is not supported in this browser'
                    : 'Record voice message'
                }
                aria-label="Record voice message"
                disabled={recorder.permissionStatus === 'unsupported' || recorder.isRequestingPermission}
                onClick={() => recorder.startRecording()}
              >
                <Mic
                  size={20}
                  color={
                    recorder.permissionStatus === 'unsupported'
                      ? 'var(--color-text-muted)'
                      : 'var(--color-brand-600, #ea580c)'
                  }
                />
              </Button>
            )}
          </div>
      )}
    </div>
  );
};
