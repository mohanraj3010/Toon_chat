import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  STICKER_PACKS,
  ALL_STICKERS,
  STICKERS_MAP,
  STICKER_COMPONENTS,
} from '@/assets/stickers';
import { StickerPicker } from '../components/StickerPicker';
import { ReactionBar } from '../components/ReactionBar';
import { ReactionPills } from '../components/ReactionPills';
import { CARTOON_REACTIONS } from '../components/reactionData';
import { MessageBubble } from '../components/MessageBubble';
import type { Message, Reaction } from '@/shared/types';

describe('Phase 13.3+: Stickers & Cartoon Reactions', () => {
  beforeEach(() => {
    // Clear localStorage simulation if present
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('1. Original SVG Sticker Packs Catalogue', () => {
    it('provides 4 thematic packs with at least 40 total original stickers', () => {
      expect(STICKER_PACKS).toHaveLength(4);
      expect(STICKER_PACKS.map((p) => p.id)).toEqual([
        'classic-toons',
        'toon-critters',
        'comic-sfx',
        'everyday-vibes',
      ]);
      expect(ALL_STICKERS.length).toBeGreaterThanOrEqual(40);
    });

    it('each pack contains exactly 10 distinct, fully tagged cartoon stickers', () => {
      STICKER_PACKS.forEach((pack) => {
        expect(pack.stickers).toHaveLength(10);
        pack.stickers.forEach((sticker) => {
          expect(sticker.id).toBeTruthy();
          expect(sticker.name).toBeTruthy();
          expect(sticker.packId).toBe(pack.id);
          expect(sticker.tags.length).toBeGreaterThanOrEqual(3);
          expect(typeof sticker.Component).toBe('function');
        });
      });
    });

    it('indexes every sticker in STICKERS_MAP and STICKER_COMPONENTS', () => {
      ALL_STICKERS.forEach((sticker) => {
        expect(STICKERS_MAP[sticker.id]).toBeDefined();
        expect(STICKER_COMPONENTS[sticker.id]).toBeDefined();
      });

      // Backwards-compatible legacy sticker IDs
      for (let i = 1; i <= 12; i++) {
        expect(STICKER_COMPONENTS[`sticker-${i}`]).toBeDefined();
      }
    });

    it('renders pure SVG elements with bold cartoon outlines for every pack', () => {
      const sampleStickers = [
        STICKERS_MAP['toon-star-eyes'],
        STICKERS_MAP['critter-cat'],
        STICKERS_MAP['sfx-boom'],
        STICKERS_MAP['vibe-coffee'],
      ];

      sampleStickers.forEach((stk) => {
        const Comp = stk.Component;
        const html = renderToStaticMarkup(React.createElement(Comp, { width: 80, height: 80 }));
        expect(html).toContain('<svg');
        expect(html).toContain('viewBox="0 0 120 120"');
        expect(html).toContain('stroke="#1e293b"');
      });
    });
  });

  describe('2. StickerPicker & Tray Component', () => {
    it('renders search input and pack tabs markup', () => {
      const html = renderToStaticMarkup(
        React.createElement(StickerPicker, {
          onSelect: () => {},
          onClose: () => {},
        })
      );

      expect(html).toContain('placeholder="Search stickers by name or mood..."');
      expect(html).toContain('Recents');
      expect(html).toContain('Favorites');
      expect(html).toContain('Classic Toons');
      expect(html).toContain('Toon Critters');
      expect(html).toContain('Comic SFX');
      expect(html).toContain('Everyday Vibes');
      expect(html).toContain('role="dialog"');
    });

    it('renders sticker items with preview SVGs and favorite buttons', () => {
      const html = renderToStaticMarkup(
        React.createElement(StickerPicker, {
          onSelect: () => {},
          onClose: () => {},
        })
      );

      // Should render sticker previews
      expect(html).toContain('favorite-star-btn');
      expect(html).toContain('sticker-preview');
      expect(html).toContain('sticker-item');
    });
  });

  describe('3. Standalone Large Borderless Sticker Message Rendering', () => {
    const mockStickerMessage: Message = {
      id: 'msg-sticker-1',
      conversationId: 'conv-123',
      senderId: 'user-sender',
      type: 'sticker',
      content: 'toon-heart-eyes',
      createdAt: '2026-11-05T12:00:00Z',
      status: 'sent',
    };

    it('renders sticker message borderless without speech bubble background card', () => {
      const html = renderToStaticMarkup(
        React.createElement(MessageBubble, {
          message: mockStickerMessage,
          isMine: false,
          currentUserId: 'user-receiver',
        })
      );

      // Must not contain chat-bubble container classes
      expect(html).not.toContain('chat-bubble-received');
      expect(html).not.toContain('chat-bubble-sent');

      // Prominently sized ~128x128px
      expect(html).toContain('width="128"');
      expect(html).toContain('height="128"');
      expect(html).toContain('drop-shadow(var(--shadow-sticker))');
    });

    it('includes hover reaction trigger button on sticker messages', () => {
      const html = renderToStaticMarkup(
        React.createElement(MessageBubble, {
          message: mockStickerMessage,
          isMine: true,
          currentUserId: 'user-sender',
        })
      );

      expect(html).toContain('aria-label="Add cartoon reaction"');
      expect(html).toContain('title="Add cartoon reaction"');
      expect(html).toContain('reaction-trigger-btn');
    });
  });

  describe('4. Animated Cartoon Reactions & ReactionBar', () => {
    it('defines 6 core cartoon animated reactions with icons and animation classes', () => {
      expect(CARTOON_REACTIONS).toHaveLength(6);
      expect(CARTOON_REACTIONS.map((r) => r.emoji)).toEqual(['❤️', '😂', '😮', '😢', '🔥', '🎉']);
      expect(CARTOON_REACTIONS.map((r) => r.label)).toEqual([
        'Heart pop',
        'Laugh bounce',
        'Wow burst',
        'Cry tear',
        'Fire flame',
        'Party confetti',
      ]);
    });

    it('renders toolbar with all 6 animated cartoon reaction buttons', () => {
      const html = renderToStaticMarkup(
        React.createElement(ReactionBar, {
          onSelectReaction: () => {},
          onClose: () => {},
          isMine: true,
        })
      );

      expect(html).toContain('role="toolbar"');
      expect(html).toContain('React with Heart pop');
      expect(html).toContain('React with Laugh bounce');
      expect(html).toContain('React with Wow burst');
      expect(html).toContain('React with Cry tear');
      expect(html).toContain('React with Fire flame');
      expect(html).toContain('React with Party confetti');
      expect(html).toContain('anim-heart');
      expect(html).toContain('anim-laugh');
      expect(html).toContain('anim-wow');
      expect(html).toContain('anim-cry');
      expect(html).toContain('anim-fire');
      expect(html).toContain('anim-party');
    });
  });

  describe('5. Reaction Pills Aggregator', () => {
    it('aggregates counts and displays active user reaction state', () => {
      const mockReactions: Reaction[] = [
        { id: 'r1', messageId: 'm1', userId: 'user-1', emoji: '❤️' },
        { id: 'r2', messageId: 'm1', userId: 'user-2', emoji: '❤️' },
        { id: 'r3', messageId: 'm1', userId: 'user-current', emoji: '🔥' },
      ];

      const html = renderToStaticMarkup(
        React.createElement(ReactionPills, {
          reactions: mockReactions,
          currentUserId: 'user-current',
          onReact: () => {},
          isMine: false,
        })
      );

      // Heart count 2
      expect(html).toContain('❤️');
      expect(html).toContain('reaction-pill-count');
      expect(html).toContain('>2</span>');

      // Fire count 1 + active state for user-current
      expect(html).toContain('🔥');
      expect(html).toContain('>1</span>');
      expect(html).toContain('reaction-pill-active');
      expect(html).toContain('You reacted with 🔥');
    });

    it('returns empty when there are no reactions', () => {
      const html = renderToStaticMarkup(
        React.createElement(ReactionPills, {
          reactions: [],
          currentUserId: 'user-current',
          onReact: () => {},
        })
      );
      expect(html).toBe('');
    });

    it('renders reaction pills underneath MessageBubble when reactions are present', () => {
      const messageWithReactions: Message = {
        id: 'msg-with-reactions',
        conversationId: 'conv-123',
        senderId: 'user-1',
        content: 'Check out this cartoon!',
        type: 'text',
        createdAt: '2026-11-05T12:00:00Z',
        status: 'sent',
        reactions: [
          { id: 'r1', messageId: 'msg-with-reactions', userId: 'user-1', emoji: '🎉' },
        ],
      };

      const html = renderToStaticMarkup(
        React.createElement(MessageBubble, {
          message: messageWithReactions,
          isMine: false,
          currentUserId: 'user-2',
        })
      );

      expect(html).toContain('reaction-pills-container');
      expect(html).toContain('🎉');
      expect(html).toContain('reaction-pill-count');
    });
  });
});
