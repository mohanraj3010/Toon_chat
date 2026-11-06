import { useRef, useEffect } from 'react';
import { Image, FileText, X } from 'lucide-react';
import styles from './Chats.module.css';

interface AttachmentMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFiles: (files: FileList, preferredType: 'image' | 'file') => void;
}

export const AttachmentMenu = ({ isOpen, onClose, onSelectFiles }: AttachmentMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onSelectFiles(e.target.files, 'image');
      onClose();
    }
    e.target.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onSelectFiles(e.target.files, 'file');
      onClose();
    }
    e.target.value = '';
  };

  return (
    <div
      ref={menuRef}
      className={styles['attachment-menu']}
      role="dialog"
      aria-label="Attachment options"
    >
      <div className={styles['attachment-menu-header']}>
        <span className={styles['attachment-menu-title']}>Add to chat 📎</span>
        <button
          type="button"
          onClick={onClose}
          className={styles['attachment-menu-close']}
          aria-label="Close attachment menu"
        >
          <X size={16} />
        </button>
      </div>

      {/* Hidden native file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        style={{ display: 'none' }}
        onChange={handleImageChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.zip,.doc,.docx,application/pdf,text/plain,application/zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className={styles['attachment-menu-items']}>
        <button
          type="button"
          className={styles['attachment-menu-btn']}
          onClick={() => imageInputRef.current?.click()}
        >
          <div className={styles['attachment-icon-wrapper']} style={{ backgroundColor: 'var(--color-brand-100, #ffedd5)', color: 'var(--color-brand-600, #ea580c)' }}>
            <Image size={22} />
          </div>
          <div className={styles['attachment-btn-text']}>
            <span className={styles['attachment-btn-label']}>Photo & Image</span>
            <span className={styles['attachment-btn-hint']}>PNG, JPEG, WebP (up to 10MB)</span>
          </div>
        </button>

        <button
          type="button"
          className={styles['attachment-menu-btn']}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className={styles['attachment-icon-wrapper']} style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
            <FileText size={22} />
          </div>
          <div className={styles['attachment-btn-text']}>
            <span className={styles['attachment-btn-label']}>File & Document</span>
            <span className={styles['attachment-btn-hint']}>PDF, TXT, ZIP, DOC, DOCX (up to 25MB)</span>
          </div>
        </button>
      </div>
    </div>
  );
};

