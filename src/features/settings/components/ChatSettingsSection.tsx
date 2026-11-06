import type { UserSettings } from '../api/types';
import { MascotHeader } from './MascotHeader';
import { ChunkyToggle } from './ChunkyToggle';
import { showToast } from '@/shared/ui/Toast';
import styles from './Sections.module.css';

interface ChatSettingsSectionProps {
  settings: UserSettings;
  onUpdate: (data: Partial<UserSettings['chat']>) => void;
}

export const ChatSettingsSection = ({ settings, onUpdate }: ChatSettingsSectionProps) => {
  const { chat } = settings;

  const handleUpdate = (partial: Partial<UserSettings['chat']>) => {
    onUpdate(partial);
    showToast('Chat settings updated! 💬', 'success');
  };

  return (
    <div>
      <MascotHeader
        title="Chat Experience"
        subtitle="Fine-tune keyboard shortcuts, sticker suggestions, and reading indicators."
        mascotBase={3}
        expression="happy"
        backdropColor="var(--color-pastel-mint)"
        badgeText="Messaging Play"
      />

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Composing & Sending</h3>
        </div>

        <ChunkyToggle
          label="Press Enter to Send"
          description="On desktop, hitting Enter sends the message immediately. Use Shift+Enter to insert a newline."
          checked={chat.enterToSend}
          onChange={(checked) => handleUpdate({ enterToSend: checked })}
        />

        <div className={styles.divider} />

        <ChunkyToggle
          label="Expressive Sticker Suggestions"
          description="Suggest animated stickers as you type keywords like 'lol', 'happy', 'party', or 'fire'."
          checked={chat.stickerSuggestions}
          onChange={(checked) => handleUpdate({ stickerSuggestions: checked })}
        />

        <div className={styles.divider} />

        <ChunkyToggle
          label="Animated Typing Indicators"
          description="Let chat partners see when your cartoon avatar is busy typing a reply."
          checked={chat.typingIndicators}
          onChange={(checked) => handleUpdate({ typingIndicators: checked })}
        />
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Media & Read Receipts</h3>
        </div>

        <ChunkyToggle
          label="Read Receipts"
          description="Show blue double checks when your friends have opened and viewed your messages."
          checked={chat.readReceipts}
          onChange={(checked) => handleUpdate({ readReceipts: checked })}
        />

        <div className={styles.divider} />

        <ChunkyToggle
          label="Auto-Download Media & Stickers"
          description="Automatically load cartoon illustrations, voice clips, and photos without manual tapping."
          checked={chat.autoDownloadMedia}
          onChange={(checked) => handleUpdate({ autoDownloadMedia: checked })}
        />
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Keyboard Shortcuts ⌨️</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
          {[
            { key: 'Enter', desc: 'Send message in conversation' },
            { key: 'Shift + Enter', desc: 'Add new line in composer' },
            { key: 'Ctrl / Cmd + Z', desc: 'Undo avatar customizer edit' },
            { key: 'Ctrl / Cmd + Y', desc: 'Redo avatar customizer edit' },
            { key: 'Esc', desc: 'Close open dialogs, pickers, or sheets' },
            { key: 'Tab / Shift + Tab', desc: 'Navigate focusable interactive elements' },
          ].map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>{item.desc}</span>
              <kbd
                style={{
                  padding: '3px 8px',
                  borderRadius: 8,
                  backgroundColor: 'var(--color-neutral-100, #f1f5f9)',
                  border: '1.5px solid var(--color-outline, #1e293b)',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  boxShadow: '1px 1px 0 #1e293b',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
