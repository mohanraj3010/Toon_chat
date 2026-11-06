import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWorldPlaces } from '../api/worldQueries';
import { mockWorldService } from '../api/mockWorldService';
import { WORLD_PLACES } from '../config/scenes';
import type {
  WorldPlaceId,
  WorldCharacterState,
  WorldHotspot,
  WorldActivityItem,
} from '../types';
import { useWorldEngine } from '../hooks/useWorldEngine';
import { WorldCanvas } from '../components/WorldCanvas';
import { WorldLanding } from '../components/WorldLanding';
import { PlaceSwitcher } from '../components/PlaceSwitcher';
import { MiniMap } from '../components/MiniMap';
import { AvatarRenderer } from '@/features/avatar/components/AvatarRenderer';
import { useConversations } from '@/features/chats/api/useChats';
import { showToast } from '@/shared/ui/Toast';
import styles from './WorldPage.module.css';

export default function WorldPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Current Place (park, cafe, plaza)
  const initialPlaceId = (searchParams.get('place') as WorldPlaceId) || 'park';
  const [currentPlaceId, setCurrentPlaceId] = useState<WorldPlaceId>(
    WORLD_PLACES[initialPlaceId] ? initialPlaceId : 'park'
  );

  // Landing view vs Live World view
  const initialEnter = searchParams.get('enter') === 'true';
  const [hasEntered, setHasEntered] = useState<boolean>(initialEnter);

  // UI Dialog & Overlay States
  const [isPlaceSwitcherOpen, setIsPlaceSwitcherOpen] = useState(false);
  const [isFriendsDrawerOpen, setIsFriendsDrawerOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [speechInputText, setSpeechInputText] = useState('');

  // Initial characters fetched for this place
  const [initialCharacters, setInitialCharacters] = useState<WorldCharacterState[]>([]);
  const [activities, setActivities] = useState<WorldActivityItem[]>([]);

  // Real conversations for friend-to-conversation resolution (Quality Gate 3)
  const { data: conversations = [] } = useConversations();
  const { data: availablePlaces = Object.values(WORLD_PLACES) } = useWorldPlaces();

  const sceneConfig = WORLD_PLACES[currentPlaceId];

  // Fetch initial presence & activities for the active place
  useEffect(() => {
    let isCancelled = false;
    mockWorldService.getPresence(currentPlaceId).then((chars) => {
      if (!isCancelled) {
        setInitialCharacters(chars);
      }
    });

    mockWorldService.getActivityFeed().then((acts) => {
      if (!isCancelled) {
        setActivities(acts);
      }
    });

    // Real-time presence & activity subscription
    const unsubscribe = mockWorldService.subscribe(currentPlaceId, (event) => {
      if (isCancelled) return;
      if (event.type === 'activity' && event.data) {
        setActivities((prev) => [event.data as WorldActivityItem, ...prev.slice(0, 19)]);
      }
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [currentPlaceId]);

  // World Simulation Engine (single rAF loop)
  const {
    characters,
    fps,
    walkRipple,
    walkPlayerTo,
    triggerPlayerEmote,
    triggerPlayerSpeech,
    waveAt,
    emoteAt,
  } = useWorldEngine({
    sceneConfig,
    initialCharacters,
    onPlayerMoved: (target) => {
      mockWorldService.movePlayer(currentPlaceId, target);
    },
    onActivityTriggered: (action, detail) => {
      if (action === 'waved') {
        mockWorldService.sendSpeech(currentPlaceId, `Waved to ${detail || 'a friend'}! 👋`);
      } else if (action === 'emoted') {
        mockWorldService.sendEmote(currentPlaceId, detail || '✨');
      }
    },
  });

  // Handle entering world from landing screen
  const handleEnterWorld = (placeId: WorldPlaceId = 'park') => {
    setCurrentPlaceId(placeId);
    setHasEntered(true);
    setSearchParams({ place: placeId, enter: 'true' });
  };

  // Switch place with smooth visual transition
  const handleSelectPlace = useCallback(
    (newPlaceId: WorldPlaceId) => {
      if (newPlaceId === currentPlaceId) return;
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentPlaceId(newPlaceId);
        setSearchParams({ place: newPlaceId, enter: 'true' });
        setTimeout(() => setIsTransitioning(false), 250);
      }, 150);
    },
    [currentPlaceId, setSearchParams]
  );

  // Return to Direct Chats
  const handleBackToChat = () => {
    navigate('/');
  };

  // Hotspot interaction handler
  const handleHotspotClick = (hotspot: WorldHotspot) => {
    // 1. Walk towards hotspot position
    walkPlayerTo({
      x: hotspot.position.x,
      y: hotspot.position.y + 20,
    });

    // 2. Action logic
    if (hotspot.action === 'visit_place' && hotspot.targetPlaceId) {
      showToast(`Entering ${WORLD_PLACES[hotspot.targetPlaceId]?.name || 'new area'}...`, 'info', 1800);
      setTimeout(() => {
        handleSelectPlace(hotspot.targetPlaceId!);
      }, 500);
    } else if (hotspot.message) {
      // Show speech bubble over player
      triggerPlayerSpeech(hotspot.message);
      showToast(hotspot.message, 'success', 3200);
    }
  };

  // Quick reaction emote buttons
  const handleQuickEmote = (emoji: string) => {
    triggerPlayerEmote(emoji);
    mockWorldService.sendEmote(currentPlaceId, emoji);
  };

  // Speech bubble form submit
  const handleSpeechSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!speechInputText.trim()) return;
    triggerPlayerSpeech(speechInputText.trim());
    mockWorldService.sendSpeech(currentPlaceId, speechInputText.trim());
    setSpeechInputText('');
  };

  // Wave at another character
  const handleWave = (char: WorldCharacterState) => {
    waveAt(char.id);
    showToast(`You waved at ${char.displayName}! 👋`, 'info', 2000);
  };

  // Emote reaction at character
  const handleEmoteAt = (char: WorldCharacterState) => {
    const emojis = ['🌸', '✨', '💖', '🎉', '☕', '🌟'];
    const chosen = emojis[Math.floor(Math.random() * emojis.length)];
    emoteAt(char.id, chosen);
    showToast(`Sent ${chosen} reaction to ${char.displayName}!`, 'info', 1800);
  };

  // Chat with character: Quality Gate 3 resolution
  const handleChatWithCharacter = (char: WorldCharacterState) => {
    // 1. Look for existing direct conversation with this user
    const directChat = conversations.find((c) => {
      if (c.type !== 'direct') return false;
      return c.participants?.some(
        (p) =>
          p.username === char.username ||
          p.displayName.toLowerCase() === char.displayName.toLowerCase()
      );
    });

    if (directChat) {
      navigate(`/chat/${directChat.id}`);
      return;
    }

    // 2. Look for any existing conversation (e.g. group)
    const anyChat = conversations.find((c) => {
      return c.participants?.some(
        (p) =>
          p.username === char.username ||
          p.displayName.toLowerCase() === char.displayName.toLowerCase()
      );
    });

    if (anyChat) {
      navigate(`/chat/${anyChat.id}`);
      return;
    }

    // 3. Explicit handling when no conversation exists: Never invent fake conversation IDs!
    showToast(
      `No active chat with ${char.displayName} yet! Say hi in Maple Park or connect via Friends ✨`,
      'info',
      4000
    );
  };

  // View character profile
  const handleProfile = (char: WorldCharacterState) => {
    navigate(`/profile/${char.username}`);
  };

  const friendsInPark = useMemo(() => {
    return characters.filter((c) => !c.isCurrentUser);
  }, [characters]);

  // If on landing screen, show WorldLanding
  if (!hasEntered) {
    return (
      <WorldLanding
        characters={characters.length > 0 ? characters : initialCharacters}
        onEnter={handleEnterWorld}
        onBackToChat={handleBackToChat}
      />
    );
  }

  return (
    <div
      className={styles.pageContainer}
      style={{
        background: `radial-gradient(circle at 50% 30%, ${sceneConfig.skyGradient[0]} 0%, ${sceneConfig.skyGradient[1]} 100%)`,
      }}
    >
      {/* Scene transition flash */}
      {isTransitioning && <div className={styles.sceneTransitionOverlay} />}

      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER OVERLAY (matching toon-world.jpg!)              */}
      {/* ------------------------------------------------------------- */}
      <header className={styles.worldHeader}>
        <div className={styles.headerLeft}>
          <button
            className={styles.btnBack}
            onClick={handleBackToChat}
            aria-label="Back to Direct Chats"
          >
            <span>‹</span>
            <span>Back</span>
          </button>
        </div>

        <div className={styles.headerCenter}>
          <h1 className={styles.worldTitle}>
            {sceneConfig.name} Social
          </h1>
        </div>

        <div className={styles.headerRight}>
          <button
            className={styles.btnFriends}
            onClick={() => setIsFriendsDrawerOpen(!isFriendsDrawerOpen)}
            aria-label={`Friends in park (${friendsInPark.length})`}
          >
            <span>👥</span>
            <span>Friends ({friendsInPark.length})</span>
          </button>

          <button
            className={styles.btnMenu}
            onClick={() => setIsPlaceSwitcherOpen(true)}
            title="Travel to another place"
            aria-label="Travel Map & Places"
          >
            🗺️
          </button>
        </div>
      </header>

      {/* Discreet floating live FPS badge */}
      <div className={styles.fpsFloatingBadge} title="Real-time measured frame rate">
        <span className={styles.fpsDot} />
        {fps} FPS
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. COLLAPSIBLE WORLD ACTIVITY FEED (desktop / tablet)         */}
      {/* ------------------------------------------------------------- */}
      {isActivityOpen && activities.length > 0 && (
        <aside className={styles.activityFeedWrapper} aria-label="World Activity Feed">
          <div className={styles.activityFeedCard}>
            <div className={styles.activityFeedHeader}>
              <span>Park Live Activity</span>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}
                onClick={() => setIsActivityOpen(false)}
                title="Hide Activity Feed"
              >
                ✕
              </button>
            </div>
            <div className={styles.activityFeedList}>
              {activities.slice(0, 4).map((act) => (
                <div key={act.id} className={styles.activityItem}>
                  <span className={styles.activityUser}>{act.displayName}</span>
                  <span className={styles.activityText}>
                    {act.text || (act.emoji ? `reacted ${act.emoji}` : `entered ${act.placeName}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. INTERACTIVE WORLD CANVAS                                   */}
      {/* ------------------------------------------------------------- */}
      <WorldCanvas
        sceneConfig={sceneConfig}
        characters={characters}
        walkRipple={walkRipple}
        onGroundClick={walkPlayerTo}
        onHotspotClick={handleHotspotClick}
        onWaveAtCharacter={handleWave}
        onChatWithCharacter={handleChatWithCharacter}
        onProfileCharacter={handleProfile}
        onEmoteAtCharacter={handleEmoteAt}
      />

      {/* ------------------------------------------------------------- */}
      {/* 4. BOTTOM FLOATING ACTION BAR & QUICK EMOTES                  */}
      {/* ------------------------------------------------------------- */}
      <footer className={styles.bottomControls}>
        <div className={styles.actionPillContainer}>
          {/* Quick Emotes */}
          {['👋', '🌸', '☕', '✨', '❤️', '🎉'].map((emoji) => (
            <button
              key={emoji}
              className={styles.btnQuickEmote}
              onClick={() => handleQuickEmote(emoji)}
              title={`Send ${emoji} emote`}
              aria-label={`Send ${emoji} emote`}
            >
              {emoji}
            </button>
          ))}

          <div className={styles.divider} />

          {/* Say something input */}
          <form className={styles.speechInputForm} onSubmit={handleSpeechSubmit}>
            <input
              type="text"
              className={styles.speechInput}
              placeholder="Say something in park..."
              value={speechInputText}
              onChange={(e) => setSpeechInputText(e.target.value)}
              maxLength={40}
              aria-label="Say something in the park"
            />
            <button type="submit" className={styles.btnSendSpeech}>
              Say
            </button>
          </form>
        </div>

        {/* Travel Signpost Button */}
        <button
          className={styles.btnTravel}
          onClick={() => setIsPlaceSwitcherOpen(true)}
          aria-label="Travel to another place"
        >
          <span>📍</span>
          <span>Travel</span>
        </button>

        {/* Mini-Map */}
        <MiniMap sceneConfig={sceneConfig} characters={characters} />
      </footer>

      {/* ------------------------------------------------------------- */}
      {/* 5. PLACE SWITCHER MODAL                                       */}
      {/* ------------------------------------------------------------- */}
      {isPlaceSwitcherOpen && (
        <PlaceSwitcher
          places={availablePlaces}
          currentPlaceId={currentPlaceId}
          onSelectPlace={handleSelectPlace}
          onClose={() => setIsPlaceSwitcherOpen(false)}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. FRIENDS NEARBY DRAWER / BOTTOM SHEET                       */}
      {/* ------------------------------------------------------------- */}
      {isFriendsDrawerOpen && (
        <div
          className={styles.drawerOverlay}
          onClick={() => setIsFriendsDrawerOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className={styles.friendsDrawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div className={styles.drawerTitle}>
                <span>🌳</span>
                <span>Friends in {sceneConfig.name} ({friendsInPark.length})</span>
              </div>
              <button
                className={styles.btnCloseDrawer}
                onClick={() => setIsFriendsDrawerOpen(false)}
                aria-label="Close Friends Drawer"
              >
                ✕
              </button>
            </div>

            <div className={styles.drawerFriendsList}>
              {friendsInPark.map((friend) => (
                <div
                  key={friend.id}
                  className={styles.drawerFriendItem}
                  onClick={() => {
                    walkPlayerTo({ x: friend.position.x - 30, y: friend.position.y });
                    setIsFriendsDrawerOpen(false);
                    showToast(`Walking towards ${friend.displayName}...`, 'info', 1600);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Walk to ${friend.displayName}`}
                >
                  <div className={styles.drawerFriendAvatar}>
                    <AvatarRenderer config={friend.avatarConfig} size={42} />
                  </div>
                  <div className={styles.drawerFriendInfo}>
                    <span className={styles.drawerFriendName}>{friend.displayName}</span>
                    <span className={styles.drawerFriendStatus}>{friend.statusText}</span>
                  </div>
                  <button
                    className={styles.btnSendSpeech}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWave(friend);
                    }}
                    title={`Wave to ${friend.displayName}`}
                  >
                    👋
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
