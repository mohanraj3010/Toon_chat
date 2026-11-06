import { useToastStore, type ToastType } from './toastStore';
import styles from './Toast.module.css';

const ICONS: Record<ToastType, string> = {
  success: '✨',
  error: '💥',
  warning: '⚠️',
  info: '💬',
};

export const ToastContainer = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <aside
      className={styles.container}
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[`toast-${toast.type}`]}`}
          role="status"
        >
          <span className={styles.icon} aria-hidden="true">
            {ICONS[toast.type]}
          </span>
          <span className={styles.message}>{toast.message}</span>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => removeToast(toast.id)}
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      ))}
    </aside>
  );
};
