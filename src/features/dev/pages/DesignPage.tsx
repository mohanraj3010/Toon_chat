import { Button, Input, Card, Avatar, Badge, ChatBubble, EmptyState } from '@/design-system/primitives';
import { Character } from '@/assets/characters/Character';
import { IllustrationEmptyInbox, IllustrationNoFriends, IllustrationError } from '@/assets/illustrations/EmptyStates';

export default function DesignPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem', width: '100%' }}>
      <h1>ToonChat Design System</h1>
      
      <section>
        <h2>Tokens (Colors)</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <div style={{ width: 64, height: 64, backgroundColor: 'var(--color-brand-500)', borderRadius: 8 }} title="Brand 500" />
          <div style={{ width: 64, height: 64, backgroundColor: 'var(--color-success)', borderRadius: 8 }} title="Success" />
          <div style={{ width: 64, height: 64, backgroundColor: 'var(--color-warn)', borderRadius: 8 }} title="Warn" />
          <div style={{ width: 64, height: 64, backgroundColor: 'var(--color-danger)', borderRadius: 8 }} title="Danger" />
          <div style={{ width: 64, height: 64, backgroundColor: 'var(--color-pastel-mint)', borderRadius: 8 }} title="Mint" />
          <div style={{ width: 64, height: 64, backgroundColor: 'var(--color-pastel-pink)', borderRadius: 8 }} title="Pink" />
          <div style={{ width: 64, height: 64, backgroundColor: 'var(--color-bg-surface)', borderRadius: 8, border: '1px solid var(--color-outline)' }} title="Surface" />
        </div>
      </section>

      <section>
        <h2>Buttons</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
          <Button isLoading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section>
        <h2>Inputs</h2>
        <div style={{ maxWidth: 300, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input placeholder="Type a message..." />
          <Input disabled placeholder="Disabled input" />
        </div>
      </section>

      <section>
        <h2>Avatars & Badges</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Avatar size="sm" initials="S" />
          <Avatar size="md" initials="M" isOnline />
          <Avatar size="lg" initials="L" />
          <Badge>New</Badge>
          <Badge variant="danger">99+</Badge>
        </div>
      </section>

      <section>
        <h2>Cards & Chat Bubbles</h2>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Card raised style={{ width: 200 }}>
            <h3>Raised Card</h3>
            <p style={{ color: 'var(--color-text-muted)' }}>Sticker shadow effect</p>
          </Card>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <ChatBubble variant="received">Hey Mohan! 👋</ChatBubble>
            <ChatBubble variant="sent" reaction="❤️">I just got the job!!! 🎉</ChatBubble>
          </div>
        </div>
      </section>

      <section>
        <h2>Characters (8 Bases x 4 Expressions)</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', background: 'var(--color-pastel-blue)', padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
          <Character base={1} expression="happy" />
          <Character base={2} expression="wink" />
          <Character base={3} expression="surprised" />
          <Character base={4} expression="sleepy" />
          <Character base={5} expression="happy" />
          <Character base={6} expression="wink" />
          <Character base={7} expression="surprised" />
          <Character base={8} expression="sleepy" />
        </div>
      </section>

      <section>
        <h2>Empty States</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Card style={{ flex: 1, minWidth: 280 }}>
            <EmptyState 
              illustration={<IllustrationEmptyInbox />}
              title="No new messages"
              description="You're all caught up! Why not say hi to someone?"
              action={<Button>Start Chat</Button>}
            />
          </Card>
          <Card style={{ flex: 1, minWidth: 280 }}>
            <EmptyState 
              illustration={<IllustrationNoFriends />}
              title="It's quiet here"
              description="Add some friends to start chatting and sharing stories."
              action={<Button variant="secondary">Find Friends</Button>}
            />
          </Card>
          <Card style={{ flex: 1, minWidth: 280 }}>
            <EmptyState 
              illustration={<IllustrationError />}
              title="Oops, something broke"
              description="We couldn't load this page. Give it another try?"
              action={<Button variant="danger">Retry</Button>}
            />
          </Card>
        </div>
      </section>
    </div>
  );
}
