import { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import styles from './Chats.module.css';

export interface LightboxImage {
  url: string;
  alt?: string;
  filename?: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (newIndex: number) => void;
}

export const ImageLightbox = ({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
}: ImageLightboxProps) => {
  const currentImage = images[currentIndex];
  const hasMultiple = images.length > 1;

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate?.(currentIndex - 1);
    } else {
      onNavigate?.(images.length - 1);
    }
  }, [currentIndex, images.length, onNavigate]);

  const handleNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      onNavigate?.(currentIndex + 1);
    } else {
      onNavigate?.(0);
    }
  }, [currentIndex, images.length, onNavigate]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasMultiple) {
        handlePrev();
      } else if (e.key === 'ArrowRight' && hasMultiple) {
        handleNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext, hasMultiple]);

  if (!isOpen || !currentImage) return null;

  return (
    <div
      className={styles['lightbox-overlay']}
      role="dialog"
      aria-label="Image preview lightbox"
      onClick={onClose}
    >
      {/* Top Bar with counter, download, and close */}
      <div
        className={styles['lightbox-top-bar']}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles['lightbox-counter']}>
          {hasMultiple ? `${currentIndex + 1} / ${images.length}` : 'Image Preview'}
        </div>

        <div className={styles['lightbox-actions']}>
          <a
            href={currentImage.url}
            download={currentImage.filename || 'toonchat-image.png'}
            target="_blank"
            rel="noopener noreferrer"
            className={styles['lightbox-btn']}
            title="Download image"
            aria-label="Download image"
          >
            <Download size={20} />
          </a>
          <button
            type="button"
            className={styles['lightbox-btn']}
            onClick={onClose}
            title="Close (Esc)"
            aria-label="Close image lightbox"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div
        className={styles['lightbox-content']}
        onClick={(e) => e.stopPropagation()}
      >
        {hasMultiple && (
          <button
            type="button"
            className={`${styles['lightbox-nav-btn']} ${styles['lightbox-nav-prev']}`}
            onClick={handlePrev}
            aria-label="Previous image"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        <img
          src={currentImage.url}
          alt={currentImage.alt || 'Full size preview'}
          className={styles['lightbox-image']}
        />

        {hasMultiple && (
          <button
            type="button"
            className={`${styles['lightbox-nav-btn']} ${styles['lightbox-nav-next']}`}
            onClick={handleNext}
            aria-label="Next image"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>
    </div>
  );
};

