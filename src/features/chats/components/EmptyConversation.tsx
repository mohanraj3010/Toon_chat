import { Button } from '@/design-system/primitives';
import { Character } from '@/assets/characters/Character';

interface Props {
  base: 1|2|3|4|5|6|7|8;
  onAction?: (text: string, type: 'text' | 'sticker') => void;
}

export const EmptyConversation = ({ base, onAction }: Props) => {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24 }}>
      <div style={{ width: 120, height: 120, borderRadius: '50%', backgroundColor: 'var(--color-bg-surface)', overflow: 'hidden', position: 'relative', border: '3px solid var(--color-outline)' }}>
        <Character 
          base={base} 
          expression="happy" 
          size={120} 
          style={{ transform: 'scale(1.2) translateY(12px)' }}
        />
      </div>
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8 }}>Say hi!</h3>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>Start the conversation with a greeting.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button variant="secondary" style={{ borderRadius: 20 }} onClick={() => onAction?.('Wave 👋', 'text')}>
            Wave 👋
          </Button>
          <Button variant="secondary" style={{ borderRadius: 20 }} onClick={() => onAction?.('sticker-1', 'sticker')}>
            Send a sticker 🎉
          </Button>
          <Button variant="secondary" style={{ borderRadius: 20 }} onClick={() => onAction?.('How are you?', 'text')}>
            How are you?
          </Button>
        </div>
      </div>
    </div>
  );
};
