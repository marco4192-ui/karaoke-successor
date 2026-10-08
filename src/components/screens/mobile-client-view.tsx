'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { StorageKeys, setItem, setJson, removeItem } from '@/lib/storage';
import { useTranslation } from '@/lib/i18n/translations';
import { tOr } from '@/lib/i18n/t-or';

// Types & constants
import type { MobileProfile } from './mobile/mobile-types';
import { screenToMirrorId, type MirrorScreenId } from './mobile/mobile-types';
import type { BrSingingEvent } from '@/lib/socketio-events';
import { MobileChat } from './mobile/mobile-chat';
import { PROFILE_COLORS } from './mobile/mobile-types';

// R54-Auslagerungen (Refactoring: „mobile-client-view.tsx extrem groß")
import { isDesktopPartyScreen, isGameFlowScreen, NON_CONTROLLING_LOCKED_NAV, isLockedForNonControlling } from './mobile/mobile-nav-rules';
import { ToastBar, type MobileToastItem } from './mobile/mobile-toast-bar';
import { MicStatusCard } from './mobile/mobile-mic-status-card';
import { SingalongOverlay, CptmBlinkOverlay, CptmYourTurnOverlay } from './mobile/mobile-turn-overlays';
import { MobileHeader } from './mobile/mobile-header';
import { MobileTournamentVote, MobileSongRunningOverlay } from './mobile/mobile-participation-overlays';
import { MobileCertSetup } from './mobile/mobile-cert-setup';
import { useScreenWakeLock } from '@/hooks/use-screen-wake-lock';

// Mirror view
import { MirrorView } from './mobile/mirror-views/mirror-view';

// View components
import {
  MobileProfileCreateView,
  MobileProfileEditView,
  MobileBottomNav,
} from './mobile/mobile-views';
import { MobileOfflineIndicator } from './mobile/mobile-offline-indicator';

// R33/P19: Hilfe-Reader (rein lokal — keine Commands, keine Desktop-Tutorials)
import { MobileHelpView } from './mobile/mobile-help-view';

// Error boundary
import { MobileErrorBoundary } from './mobile/mobile-error-boundary';

// Hooks
import { useMobileConnection } from '@/hooks/use-mobile-connection';
import { useMobilePitchDetection } from '@/hooks/use-mobile-pitch-detection';
import { useMobileData } from '@/hooks/use-mobile-data';
import { initCompanionHttpsInfo } from '@/lib/qr-code';

// ===================== MOBILE CLIENT VIEW =====================
interface MobileClientViewProps {
  profileId?: string;
}

export function MobileClientView({ profileId }: MobileClientViewProps) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileColor, setProfileColor] = useState('#06B6D4');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatPopupMessage, setChatPopupMessage] = useState<{ fromName: string; text: string; isHost: boolean } | null>(null);
  const chatMessageCountRef = useRef(0);
  const [showProfile, setShowProfile] = useState(false);
  const [votedMatchIds, setVotedMatchIds] = useState<Set<string>>(new Set());
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // R33/P1: menuScreen = aktuell angezeigter MENÜ-Screen.
  //  - steuernder Companion: bidirektional — Tabs senden remote_command UND
  //    gameState.currentScreen schreibt zurück (Desktop→Companion).
  //  - nicht-steuernder Companion: wird NUR durch eigene Nav-Taps geschrieben
  //    (er folgt dem Desktop-Screen nie — siehe P1). Aktive Spiel-Screens
  //    (Game-Mirror) kommen separat als forcedGameScreen dazu.
  const [menuScreen, setMenuScreen] = useState<string>('home');

  // R39/P1: Von der Startseiten-Spielmodus-Kachel gewählter Modus. Wird an
  // MirrorLibraryLite als initialGameMode durchgereicht — der Tap auf eine
  // Kachel navigiert lokal zur Bibliothek UND wählt den Modus vor.
  const [libraryPresetMode, setLibraryPresetMode] = useState<'single' | 'duel' | 'duet' | null>(null);
  const handleLaunchMode = useCallback((mode: 'single' | 'duel' | 'duet') => {
    setLibraryPresetMode(mode);
    setMenuScreen('library');
  }, []);

  // R33/P19: Hilfe-Overlay (für jeden jederzeit verfügbar)
  const [showHelp, setShowHelp] = useState(false);

  // Connection
  // R34: adoption ref — the socket callback is registered BEFORE pushToast
  // exists, so it dispatches through this ref (set below once adoptServerProfile
  // is defined).
  const adoptServerProfileRef = useRef<(_p: import('./mobile/mobile-types').MobileProfile | null) => void>(() => {});
  const { clientId, connectionCode, isConnected, gameState, settingsSnapshot, connect, disconnect, syncProfile, cleanup, sendPitch } = useMobileConnection({
    onProfileLoaded: (p) => setProfile(p),
    onProfileFieldsLoaded: (name, color, avatar) => { setProfileName(name); setProfileColor(color); setAvatarPreview(avatar); },
    onProfileAssigned: (p) => adoptServerProfileRef.current(p),
    // R35: server recreated our purged client record (standby > 5 min) —
    // the profile claim was lost with the record. Re-claim our local profile
    // so the desktop recognizes this phone as "via Companion" again.
    onClientRestored: () => {
      if (profileRef.current) {
        markLocalProfileMutation();
        syncProfile(profileRef.current);
      }
    },
    onGameStateUpdate: (_state) => {
      // R33/P16: Difficulty-Default kommt jetzt aus dem Settings-Snapshot
      // (Pull bei (Re)Connect + Push-on-Change) — KEIN Sync mehr über den
      // 2s-Gamestate (der würde die Nutzerwahl alle 2 s zerschießen).
      // Drop the live singing monitor as soon as the BR round stops playing
      // (keeps stale ghost/hit data from bleeding into other mirror views).
      if (!_state.brGameData || _state.brGameData.status !== 'playing') {
        setBrSinging(null);
      }
    },
    onError: setError,
    onSongEnd: () => { data.loadGameResults(); data.loadQueue(); },
    onBrSinging: (payload) => setBrSinging(payload),
  });

  // ── Live Battle-Royale singing monitor (per-player pitch/hit/ghost data
  // pushed by the desktop at ~2 Hz while a BR round plays) ──
  const [brSinging, setBrSinging] = useState<BrSingingEvent | null>(null);

  // Pitch detection — prefers the Socket.IO push path (sendPitch) for
  // instant delivery to the desktop; HTTP batch_pitch stays as fallback.
  // R52 — audioSuspended/hasSignal/resumeAudioContext speisen die Mic-Status-
  // Karte: Sie zeigt dem Nutzer erstmals sichtbar, OB das Handy-Mikro läuft
  // (iOS: ohne Geste gestarteter AudioContext bleibt suspended → kein Ton),
  // und ein Tap auf die Karte startet/resumed das Mikro GESTE-sicher.
  const {
    isListening, currentPitch, startMicrophone, stopMicrophone,
    audioSuspended, hasSignal, resumeAudioContext, micPermissionDenied,
  } = useMobilePitchDetection({
    clientId, isPlaying: gameState.isPlaying, songEnded: gameState.songEnded, onError: setError,
    sendSocketPitch: sendPitch,
  });

  // ── R53: Unsicherer Kontext (http://<LAN-IP>) ──
  // getUserMedia ist auf unsicheren Ursprüngen KOMPLETT blockiert — der
  // Nutzer sah bisher nur „Mikrofon wird gestartet…" und einen englischen
  // Fehler. Jetzt erkennt die Karte den Zustand, zeigt eine klare deutsche
  // Meldung und ein Tap navigiert auf den HTTPS-Port des Servers (dort
  // Zertifikats-Warnung 1× bestätigen → Mikrofon funktioniert).
  const [micInsecure, setMicInsecure] = useState(false);
  const [micHttpsPort, setMicHttpsPort] = useState<number | null>(null);
  // R55: DuckDNS-Domain mit aktivem ECHTEM Zertifikat (Let's Encrypt) —
  // dann unterbleibt das Zertifikats-Banner komplett und der HTTPS-Wechsel
  // führt direkt auf die vertrauenswürdige Domain statt auf die IP.
  const [micTrustedDomain, setMicTrustedDomain] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // R53: Unsicherer Kontext (http://<LAN-IP>) → Mic blockiert, Karte zeigt
    // den HTTPS-Wechsel. R54: Der HTTPS-Port wird jetzt IMMER gezogen — auch
    // im secure-Kontext braucht ihn das Zertifikats-Banner (MobileCertSetup).
    // R55: initCompanionHttpsInfo liefert Port + Domain + Quelle in einem
    // Abfrage (bei aktivem LE-Zertifikat trustedDomain ≠ null → kein Banner).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time state sync (insecure context never changes without navigation)
    if (!window.isSecureContext) setMicInsecure(true);
    initCompanionHttpsInfo().then(info => {
      if (!info) return;
      setMicHttpsPort(info.port);
      setMicTrustedDomain(info.source === 'letsencrypt' ? info.domain : null);
    }).catch(() => { /* Hint bleibt */ });
  }, []);
  const openHttpsCompanionUrl = useCallback(() => {
    if (typeof window === 'undefined') return;
    // R55: Vertrauenswürdige Domain hat Vorrang — echtes Zertifikat, keine
    // Warnung, stabil über IP-Wechsel. Fallback: IP + HTTPS-Port (lokale CA).
    if (micTrustedDomain) {
      const portPart = micHttpsPort && micHttpsPort !== 443 ? ':' + micHttpsPort : '';
      window.location.href = `https://${micTrustedDomain}${portPart}${window.location.pathname}${window.location.search}`;
      return;
    }
    const port = micHttpsPort ? ':' + micHttpsPort : '';
    window.location.href = 'https://' + window.location.hostname + port + window.location.pathname + window.location.search;
  }, [micHttpsPort, micTrustedDomain]);

  // Data (songs, queue, jukebox, results, partners)
  // R51/Bug8: Difficulty-Vorauswahl folgt jetzt dem LIVE-Gamestate des
  // Desktops (gameState.difficulty, 2s-Push — immer der aktuelle Store-Wert,
  // inkl. Änderungen über Settings ODER Party-Setup), mit dem Settings-
  // Snapshot als Fallback. Der 2s-Strom zerschießt die Nutzerwahl NICHT:
  // use-mobile-data hört nach der ersten eigenen Wahl auf zu folgen
  // (difficultyTouchedRef). Bisher folgte die App nur dem Snapshot (localStorage),
  // der vom aktiven Store-Wert divergieren konnte → Companion „übernahm"
  // den globalen Schwierigkeitsgrad nicht.
  const data = useMobileData({
    clientId,
    profile,
    onNavigateToProfile: () => setShowProfile(true),
    defaultDifficulty: gameState.difficulty || settingsSnapshot?.defaultDifficulty,
  });

  // ===================== TOASTS (P7/P18) =====================
  const [toasts, setToasts] = useState<MobileToastItem[]>([]);
  const toastIdRef = useRef(0);
  const pushToast = useCallback((text: string, kind: MobileToastItem['kind'] = 'info', detail?: string) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev.slice(-2), { id, text, kind, detail }]); // max. 3 gestapelt
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // ===================== R34: SERVER-SEITIGE PROFIL-ÜBERNAHME =====================
  // Der Desktop kann ein Profil an dieses Handy zuweisen (Party-Setup-
  // Zuweisungspanel, Settings) oder es nach einem Namens-Dedup-Rebind
  // umziehen. Das Handy übernimmt es SOFORT (Socket-Push) bzw. spätestens
  // über den 8s-Reconcile-Poll — vorher war das Handy "verbunden, aber
  // unsichtbar", weil seine Profil-ID zu keinem Spieler passte.
  const profileRef = useRef<MobileProfile | null>(null);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  // Guard: lokale Profil-Änderungen haben 5s Vorrang, damit der Reconcile-Poll
  // die eigene (noch nicht synchronisierte) Wahl nicht mit einem stale
  // Server-Stand überschreibt.
  const lastProfileMutationRef = useRef(0);
  const markLocalProfileMutation = useCallback(() => {
    lastProfileMutationRef.current = Date.now();
  }, []);

  const adoptServerProfile = useCallback((p: MobileProfile | null) => {
    if (!p || !p.id) {
      // Profile was cleared server-side (e.g. another device took over this
      // profile via the assign panel) → drop back to the profile selection
      // screen so this phone can't silently sing as the wrong player.
      if (profileRef.current) {
        profileRef.current = null;
        setProfile(null);
        setProfileName('');
        setAvatarPreview(null);
        removeItem(StorageKeys.MOBILE_PROFILE);
        pushToast(tOr(t, 'mobile.profileClearedToast', 'Profil freigegeben — ein anderes Gerät hat es übernommen'), 'info');
      }
      return;
    }
    if (profileRef.current?.id === p.id) return; // already singing as this profile
    profileRef.current = p;
    setProfile(p);
    setProfileName(p.name);
    setProfileColor(p.color);
    setAvatarPreview(p.avatar || null);
    setJson(StorageKeys.MOBILE_PROFILE, p);
    setShowProfile(false);
    pushToast(tOr(t, 'mobile.profileAssignedToast', `Du singst jetzt als ${p.name} 🎤`).replace('{name}', p.name), 'success');
  }, [pushToast, t]);
  useEffect(() => { adoptServerProfileRef.current = adoptServerProfile; }, [adoptServerProfile]);

  // Fallback-Reconcile: falls der Socket-Push verpasst wurde (z. B. genau im
  // Reconnect-Moment zugewiesen), holt das Handy sein serverseitiges Profil
  // selbstständig — dann stimmt die Zuordnung spätestens vor Spielstart.
  // R35: ein 404 bedeutet, dass der Server unseren Client-Datensatz gelöscht
  // hat (5-Min-Inaktivitäts-Cleanup im Standby) — dann verbinden wir uns
  // komplett neu (der Fresh-Connect stellt den Profil-Claim über die
  // localStorage-Restore-Logik wieder her).
  useEffect(() => {
    if (!isConnected || !clientId) return;
    let cancelled = false;
    const reconcile = async () => {
      if (Date.now() - lastProfileMutationRef.current < 5000) return; // local change syncing
      try {
        const res = await fetch(`/api/mobile?action=profile&clientId=${encodeURIComponent(clientId)}`);
        if (res.status === 404) {
          // R35: client record purged server-side → full reconnect. The fresh
          // connect re-creates the record AND re-claims our local profile,
          // so the desktop recognizes this phone as connected again.
          connect().catch(() => { /* next cycle retries */ });
          return;
        }
        if (!res.ok) return;
        const d = await res.json();
        if (cancelled || !d.success) return;
        const serverProfile = (d.profile ?? null) as MobileProfile | null;
        if (!serverProfile?.id) return;
        if (profileRef.current?.id === serverProfile.id) return;
        adoptServerProfileRef.current(serverProfile);
      } catch { /* ignore */ }
    };
    reconcile();
    const iv = setInterval(reconcile, 8000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [isConnected, clientId, connect]);

  // Queue-Fehler → Toast (der Hook räumt queueError nach 3 s selbst ab)
  useEffect(() => {
    if (data.queueError) pushToast(data.queueError, 'error');
  }, [data.queueError, pushToast]);

  // Verbindungs-/Sonstige Fehler → Toast (nur im verbundenen Zustand;
  // beim Verbinden bleibt die Inline-Anzeige im Ladebildschirm)
  useEffect(() => {
    if (error && isConnected) {
      pushToast(error, 'error');
      setError(null);
    }
  }, [error, isConnected, pushToast]);

  // Chat-Popup (P18): neue Nachricht von anderen → schlanke Toast-Leiste
  // über der Menüleiste (statt Popup oben am Bildschirmrand).
  useEffect(() => {
    if (chatPopupMessage) {
      pushToast(
        chatPopupMessage.text,
        'chat',
        chatPopupMessage.isHost ? `Host · ${chatPopupMessage.fromName}` : chatPopupMessage.fromName,
      );
      setChatPopupMessage(null);
    }
  }, [chatPopupMessage, pushToast]);

  // ===================== CHAT NOTIFICATION POLLING =====================
  useEffect(() => {
    if (!isConnected || !clientId || showChat) return;
    const pollChat = async () => {
      try {
        const res = await fetch(`/api/mobile?action=getchat&clientId=${encodeURIComponent(clientId)}`);
        if (!res.ok) return;
        const d = await res.json();
        if (d.success && Array.isArray(d.messages)) {
          const msgs = d.messages as Array<{ id: string; fromName: string; text: string; isHost: boolean; timestamp: number }>;
          // Zeige Popup nur für neue Nachrichten von anderen
          if (msgs.length > chatMessageCountRef.current && msgs.length > 0) {
            const latest = msgs[msgs.length - 1];
            // Nicht anzeigen wenn die eigene Nachricht die letzte ist
            if (latest.fromName !== profile?.name) {
              setChatPopupMessage({ fromName: latest.fromName, text: latest.text, isHost: latest.isHost });
            }
          }
          chatMessageCountRef.current = msgs.length;
        }
      } catch { /* ignore */ }
    };
    pollChat();
    const iv = setInterval(pollChat, 4000);
    return () => clearInterval(iv);
  }, [isConnected, clientId, showChat, profile?.name]);

  // Stop mic when game stops or song ends
  useEffect(() => {
    if (isListening && (!gameState.isPlaying || gameState.songEnded)) stopMicrophone();
  }, [gameState.isPlaying, gameState.songEnded, isListening, stopMicrophone]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopMicrophone(); cleanup(); };
  }, [stopMicrophone, cleanup]);

  // Persist clientId to localStorage
  useEffect(() => {
    if (clientId) setItem(StorageKeys.CLIENT_ID, clientId);
  }, [clientId]);

  // Auto-adopt host profile from QR ?profile= param
  const autoAdoptDoneRef = useRef(false);
  useEffect(() => {
    if (!profileId || !isConnected || !clientId || autoAdoptDoneRef.current) return;
    autoAdoptDoneRef.current = true;
    fetch('/api/mobile?action=hostprofiles&clientId=' + clientId)
      .then(r => r.json())
      .then(d => {
        if (!d.success || !Array.isArray(d.profiles)) return;
        const match = d.profiles.find((p: { id: string }) => p.id === profileId);
        if (match) {
          const hostProfile: import('./mobile/mobile-types').MobileProfile = {
            id: match.id, name: match.name,
            avatar: match.avatar || undefined,
            color: match.color, createdAt: match.createdAt || Date.now(),
          };
          markLocalProfileMutation(); // R34: local change takes precedence over server reconcile
          setProfile(hostProfile); setProfileName(hostProfile.name);
          setProfileColor(hostProfile.color); setAvatarPreview(hostProfile.avatar || null);
          setJson(StorageKeys.MOBILE_PROFILE, hostProfile); syncProfile(hostProfile);
        }
      })
      // eslint-disable-next-line no-console
      .catch(() => { console.warn('Failed to auto-adopt profile'); });
  }, [profileId, isConnected, clientId, syncProfile, markLocalProfileMutation]);

  // Profile callbacks
  const handleCreateProfile = useCallback((hostProfile?: MobileProfile) => {
    if (!profileName.trim()) return;
    const newProfile: MobileProfile = hostProfile
      ? { id: hostProfile.id, name: hostProfile.name, avatar: hostProfile.avatar || avatarPreview || undefined, color: hostProfile.color, createdAt: hostProfile.createdAt || Date.now() }
      : { id: `profile-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`, name: profileName.trim(), avatar: avatarPreview || undefined, color: profileColor, createdAt: Date.now() };
    markLocalProfileMutation(); // R34: local change takes precedence over server reconcile
    setProfile(newProfile); setJson(StorageKeys.MOBILE_PROFILE, newProfile); syncProfile(newProfile);
    setShowProfile(false);
  }, [profileName, avatarPreview, profileColor, syncProfile, markLocalProfileMutation]);

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleSaveProfile = useCallback(() => {
    if (!profile) return;
    const updated = { ...profile, name: profileName, color: profileColor, avatar: avatarPreview || undefined };
    markLocalProfileMutation(); // R34: local change takes precedence over server reconcile
    setProfile(updated); setJson(StorageKeys.MOBILE_PROFILE, updated); syncProfile(updated);
    setShowProfile(false);
  }, [profile, profileName, profileColor, avatarPreview, syncProfile, markLocalProfileMutation]);

  const handleSwitchToHostProfile = useCallback((hostProfile: MobileProfile) => {
    const switchedProfile: MobileProfile = { id: hostProfile.id, name: hostProfile.name, avatar: hostProfile.avatar || undefined, color: hostProfile.color, createdAt: hostProfile.createdAt || Date.now() };
    markLocalProfileMutation(); // R34: local change takes precedence over server reconcile
    setProfile(switchedProfile); setProfileName(switchedProfile.name); setProfileColor(switchedProfile.color);
    setAvatarPreview(switchedProfile.avatar || null); setJson(StorageKeys.MOBILE_PROFILE, switchedProfile); syncProfile(switchedProfile);
    setShowProfile(false);
  }, [syncProfile, markLocalProfileMutation]);

  const handleDisconnect = useCallback(async () => {
    await disconnect();
    setProfile(null); setProfileName(''); setProfileColor('#06B6D4'); setAvatarPreview(null);
    removeItem(StorageKeys.MOBILE_PROFILE); removeItem(StorageKeys.CLIENT_ID);
    setMenuScreen('home');
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = setTimeout(() => connect(), 500);
  }, [disconnect, connect]);

  // Effects for lazy loading
  useEffect(() => {
    return () => { if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current); };
  }, []);

  useEffect(() => {
    if (isConnected) {
      queueMicrotask(() => data.loadQueue());
      queueMicrotask(() => data.loadSongs());
      const interval = setInterval(() => data.loadQueue(), 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected, data.loadQueue, data.loadSongs]);

  // Auto-Sing: Wenn man aktiver Spieler im aktuellen Spiel ist, Mikrofon automatisch starten
  // R52 — Die Soll-ich-singen?-Bedingung ist jetzt ein useMemo (shouldSingNow):
  // Der Auto-Sing-Effekt UND die Mic-Status-Karte nutzen dieselbe Logik.
  const singalongTurn = gameState.singalongTurn;
  const cptmTurn = gameState.cptmTurn;
  const brGameData = gameState.brGameData;
  const medleyGameData = gameState.medleyGameData;
  const deviceAssignment = gameState.deviceAssignment;
  const gamePlayers = gameState.players;
  const shouldSingNow = useMemo(() => {
    if (!profile || !gameState.isPlaying || !isConnected) return false;
    // Prüfe ob dieser Companion-Player der aktive Spieler ist
    const isMyTurn =
      singalongTurn?.isActive && singalongTurn.profileId === profile.id && singalongTurn.countdown === null ||
      cptmTurn?.isActive && cptmTurn.profileId === profile.id && cptmTurn.countdown === null ||
      // R60: Während der CPTM-Blink-Warnung (3-2-1 vor dem Segmentwechsel) ist
      // profileId null — der AKTUELLE Sänger singt aber bis zum Segmentende
      // weiter. Ohne diesen Zweig flackerten Mikro-/Wake-Lock-Status in jedem
      // Blink-Fenster (currentPlayerId wird seit R60 vom Desktop mitgeschickt).
      (cptmTurn?.isActive && cptmTurn.profileId === null &&
        cptmTurn.currentPlayerId === profile.id);
    // Item 8.1: Battle Royale — alle (Companion-)Spieler singen GLEICHZEITIG
    // (nicht eliminierte Profile).
    const isBrActivePlayer =
      !!brGameData &&
      brGameData.status === 'playing' &&
      (brGameData.players ?? []).some(p => p.id === profile.id && !p.eliminated);
    // R36: Medley Contest — aktives Snippet (FFA alle, Team Duell-Paar,
    // Eliminierung alle Nicht-Ausgeschiedenen).
    const isMedleyActivePlayer =
      !!medleyGameData &&
      medleyGameData.phase === 'playing' &&
      (medleyGameData.activeProfileIds ?? []).includes(profile.id);
    // R51/Bug11 — Standard-Spiel (Single/Duell/Duett) mit Companion-Eingabe-
    // quelle: Mein Profil ist P1/P2 UND für meinen Platz wurde „Companion-App"
    // als Gesangs-Gerät gewählt (deviceAssignment, 2s-Push). R52: greift jetzt
    // tatsächlich — parseGameState überträgt players+deviceAssignment erstmals.
    const isStandardCompanionSinger =
      !!gamePlayers?.length &&
      ((!!deviceAssignment?.p1Companion && gamePlayers[0]?.id === profile.id) ||
       (!!deviceAssignment?.p2Companion && gamePlayers[1]?.id === profile.id));
    return isMyTurn || isBrActivePlayer || isMedleyActivePlayer || isStandardCompanionSinger;
  }, [profile, gameState.isPlaying, isConnected, singalongTurn, cptmTurn, brGameData, medleyGameData, deviceAssignment, gamePlayers]);

  const autoSingDoneRef = useRef(false);
  useEffect(() => {
    // Eliminated BR players no longer need the mic — stop it so the phone
    // doesn't keep capturing/sending pitch for a player that is out.
    if (brGameData?.status === 'playing' && isListening) {
      const brMe = (brGameData.players ?? []).find(p => p.id === profile?.id);
      if (brMe?.eliminated) stopMicrophone();
    }
    // Auch im Medley: eliminierte Spieler (Eliminierungs-Modus) brauchen das
    // Mikro nicht mehr — aktiv stoppen wie bei BR.
    if (medleyGameData?.phase === 'playing' && isListening) {
      const medleyMe = (medleyGameData.players ?? []).find(p => p.id === profile?.id);
      if (medleyMe?.eliminated) stopMicrophone();
    }
    if (shouldSingNow && !isListening && !autoSingDoneRef.current) {
      autoSingDoneRef.current = true;
      // 500ms Delay: gibt dem Countdown-Overlay der Turn-Modi einen Moment
      // und fängt gameState-Flattern beim Songwechsel ab. iOS-Hinweis: Dieser
      // programmatische Start kann am suspended AudioContext scheitern —
      // die Mic-Status-Karte bietet den Geste-freien Tap-Fallback.
      setTimeout(() => startMicrophone(), 500);
    }
    if (!shouldSingNow) autoSingDoneRef.current = false;
  }, [shouldSingNow, profile, brGameData, medleyGameData, isListening, startMicrophone, stopMicrophone]);

  // R60 — MIC-STOP BEI TURN-WECHSEL (CPTM/Singalong): Der VORHERIGE Sänger
  // streamte nach dem Wechsel munter weiter (30 Hz Pitch-Frames über Socket,
  // Mikro offen, Akku-Verbrauch) — das Spiel ignorierte die Daten nur. Ein
  // eindeutiges Stop-Signal: cptmTurn/singalongTurn zeigt auf einen ANDEREN
  // Spieler (der Wechsel-Post setzt profileId explizit). Blink-Warnungen
  // (profileId null) und Lücken stopen NICHT.
  useEffect(() => {
    if (!isListening || !profile || !gameState.isPlaying || gameState.songEnded) return;
    const foreignCptmSinger =
      cptmTurn?.isActive && !!cptmTurn.profileId && cptmTurn.profileId !== profile.id;
    const foreignSingalongSinger =
      singalongTurn?.isActive && !!singalongTurn.profileId && singalongTurn.profileId !== profile.id;
    if (foreignCptmSinger || foreignSingalongSinger) {
      stopMicrophone();
    }
  }, [cptmTurn, singalongTurn, isListening, profile, gameState.isPlaying, gameState.songEnded, stopMicrophone]);

  // ── R54: Screen Wake Lock — Standby-Schutz für die Pitch-Erkennung ──
  // Der Pitch-Loop läuft über requestAnimationFrame, das bei ausgeblendetem
  // Display EINFRIERT (Nutzer-Feedback: nach Standby kamen hohe/tiefe Töne
  // nicht mehr an, die Linie blieb flach). Solange dieses Handy singt
  // (shouldSingNow), halten wir den Bildschirm aktiv. Die MicStatusCard
  // zeigt den Zustand (☀️) bzw. einen Hinweis bei fehlender Unterstützung.
  // Zusätzlich (R54b): Der Lock wird SCHON während des Countdowns meines
  // Turns geholt UND solange das Mikro aktiv mithört — geht das Display
  // erst im Countdown aus, kann der Lock beim Sing-Start nicht mehr
  // angefordert werden (Seite unsichtbar → SecurityError) und die Auto-
  // Sing-Geste ist ebenfalls weg. isListening ist sicher begrenzt: das Mic
  // stoppt automatisch, sobald nicht mehr gespielt wird (siehe Effect oben).
  const isMyUpcomingTurn =
    (singalongTurn?.isActive && singalongTurn.profileId === profile?.id && singalongTurn.countdown !== null) ||
    (cptmTurn?.isActive && cptmTurn.profileId === profile?.id && cptmTurn.countdown !== null) ||
    // R60: Die CPTM-Blink-Warnung IST der Countdown des NÄCHSTEN Sängers
    // (nextProfileId + countdown 3-2-1) — das Display muss auch dann wach
    // bleiben, damit der Blink-Overlay sichtbar ist und der Auto-Sing-Start
    // beim Wechsel nicht am ausgeblendeten Display hängt.
    (cptmTurn?.isActive && cptmTurn.nextProfileId === profile?.id && cptmTurn.countdown !== null);
  const wakeLock = useScreenWakeLock(
    !gameState.songEnded && (shouldSingNow || isMyUpcomingTurn || isListening),
  );

  // ===================== DESKTOP COMMANDS =====================
  // Wird von steuernden Companions für CONTROL-Commands genutzt (Nav) UND
  // von ALLEN Companions für PARTICIPATION-Commands (companion_pause,
  // party_leave_*, br_vote …) — der Server klassifiziert und lehnt
  // Control-Commands ohne Lock mit 403 ab (R33/P1-Serverseite).
  const handleSendDesktopCommand = useCallback((screen: string, data?: unknown) => {
    if (!clientId || !profile) return;
    fetch('/api/mobile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'remote_command', clientId, payload: { command: screen, data } }),
    }).catch(() => { /* ignore */ });
  }, [clientId, profile]);

  // ===================== REMOTE LOCK STATE =====================
  const [remoteLock, setRemoteLock] = useState<{
    isLocked: boolean;
    lockedByMe: boolean;
    lockedByName: string | null;
  }>({ isLocked: false, lockedByMe: false, lockedByName: null });

  // ===================== CONTROL STATE (P1 — KERNPUNKT) =====================
  // isControlling = GENAU remoteLock.lockedByMe. Ohne Lock ist ein Companion
  // NICHT steuernd und spiegelt den Desktop nicht (die alte
  // `controlled = !isLocked || lockedByMe`-Logik ist ENTFERNT).
  const isControlling = remoteLock.lockedByMe;

  // ===================== SONG-RUNNING WARNING (Issue 11) =====================
  const [showSongRunningOverlay, setShowSongRunningOverlay] = useState(false);
  const isSongRunning = gameState.isPlaying && !!gameState.currentSong;

  // ===================== SCREEN SYNC (desktop → companion) =====================
  // R27: Local-navigation grace window. When the user taps a footer tab, the
  // companion switches locally and sends a remote_command to the desktop.
  // Until the desktop processes it (~1-2 gamestate beats), the 2s pushes
  // still carry the OLD screen — without this window the mirror view bounced
  // local → stale → confirmed (= two full remounts per navigation).
  // While `localNav` is active (≤ 3,5 s), locally chosen screens take
  // priority over contradicting sync pushes. Party screens are exempt: the
  // desktop MUST always win there (game flow).
  const [localNav, setLocalNav] = useState<{ screen: string; at: number } | null>(null);
  useEffect(() => {
    if (!localNav) return;
    const remaining = Math.max(0, 3500 - (Date.now() - localNav.at));
    // Self-healing expiry: if the desktop never confirms (command lost),
    // the grace window closes and the next sync push wins again.
    const timer = setTimeout(() => setLocalNav(null), remaining);
    return () => clearTimeout(timer);
  }, [localNav]);

  // R33/P1: Nur der STEUERnde Companion folgt gameState.currentScreen
  // (Desktop→Companion). Nicht-steuernde Companion schreiben menuScreen
  // ausschließlich durch eigene Nav-Taps — Spiel-Screens kommen separat
  // über forcedGameScreen (Partizipation via Game-Mirror-Overlays).
  useEffect(() => {
    const desktop = gameState.currentScreen;
    if (!desktop || !isControlling) return;
    if (localNav) {
      if (desktop === localNav.screen) {
        // Desktop confirmed our navigation → close the grace window early
        setLocalNav(null);
      } else if (!isDesktopPartyScreen(desktop)) {
        // Stale push inside the grace window (desktop hasn't processed our
        // remote_command yet) — ignore it, keep the locally chosen view.
        return;
      }
    }
    setMenuScreen(desktop);
  }, [gameState.currentScreen, isControlling, localNav]);

  // ===================== EFFEKTIVER BILDSCHIRM =====================
  // localNav (Grace-Window) gewinnt für steuernde Companion, außer der
  // Desktop ist in einem Party-/Game-Flow-Screen (dort gewinnt der Desktop).
  const localNavEffective = useMemo(() => {
    if (!localNav) return null;
    const desktop = gameState.currentScreen;
    if (desktop && isDesktopPartyScreen(desktop)) return null;
    return localNav.screen;
  }, [localNav, gameState.currentScreen]);

  // R33/P1: Nicht-steuernde Companion: erzwungener Game-Mirror während eines
  // aktiven Spiels (game / *-game / song-voting / results) — dort laufen die
  // Partizipations-Overlays. Menü-Screens werden NIEMALS erzwungen.
  const forcedGameScreen = useMemo(() => {
    if (isControlling) return null;
    const desktop = gameState.currentScreen;
    return desktop && isGameFlowScreen(desktop) ? desktop : null;
  }, [isControlling, gameState.currentScreen]);

  // Der tatsächlich gespiegelte Screen (Grundlage für MirrorView + isSinging).
  const displayScreen = localNavEffective ?? forcedGameScreen ?? menuScreen ?? 'home';

  // ===================== SINGING STATE =====================
  // Whether this companion user is the active singer OR in an active game screen
  // (header/footer must be hidden during any game to prevent accidental
  // navigation). Basiert auf displayScreen — das erfasst sowohl die Desktop-
  // Spiegelung des steuernden Companion als auch den erzwungenen Game-Mirror
  // des nicht-steuernden (forcedGameScreen, P1).
  const isDesktopGameScreen = displayScreen === 'game' || !!displayScreen?.endsWith('-game');
  const isSinging = profile && (
    (gameState.singalongTurn?.isActive && gameState.singalongTurn.profileId === profile.id && gameState.singalongTurn.countdown === null) ||
    (gameState.cptmTurn?.isActive && gameState.cptmTurn.profileId === profile.id && gameState.cptmTurn.countdown === null) ||
    // Also disable during any active game when this companion is participating
    (gameState.isPlaying && !!gameState.currentSong && gameState.isPartyModeActive) ||
    // Disable during any game screen (ptm-intro, game) regardless of singing state
    isDesktopGameScreen
  ) ? true : false;

  // ===================== COMPUTED MIRROR ID =====================
  const mirrorScreenId = useMemo((): MirrorScreenId => {
    const screen = displayScreen;
    const base = screenToMirrorId(screen);
    // When Desktop is in a party game intro phase, show the mode-specific intro screen.
    // Check BOTH displayScreen and gameState.currentScreen to handle
    // the one-render delay where the synced screen hasn't updated yet.
    const currentScreen = gameState.currentScreen || '';
    const isPartyGameScreen = screen === 'pass-the-mic-game' || screen === 'companion-singalong-game'
      || screen === 'medley-game' || screen === 'battle-royale-game'
      || screen === 'tournament-game' || screen === 'missing-words-game'
      || screen === 'blind-game' || screen === 'rate-my-song-game'
      || currentScreen === 'pass-the-mic-game' || currentScreen === 'companion-singalong-game'
      || currentScreen === 'medley-game' || currentScreen === 'battle-royale-game'
      || currentScreen === 'tournament-game' || currentScreen === 'missing-words-game'
      || currentScreen === 'blind-game' || currentScreen === 'rate-my-song-game';

    if (isPartyGameScreen && gameState.ptmPhase === 'intro') {
      // Route to mode-specific intro screen based on current screen
      const effectiveScreen = screen || currentScreen;
      if (effectiveScreen === 'medley-game') return 'medley-intro';
      if (effectiveScreen === 'battle-royale-game') return 'battle-intro';
      if (effectiveScreen === 'tournament-game') {
        // Pending duel → starting-screen mirror. Otherwise, when the bracket
        // itself is on the big screen, show the open-duels list with start
        // buttons (companion-driven match starts).
        if (gameState.ptmIntroData?.startPlayerName && gameState.ptmIntroData?.vsPlayerName) {
          return 'tournament-intro';
        }
        if (gameState.tournamentBracketData?.visible) return 'tournament-bracket';
        return 'tournament-intro';
      }
      if (effectiveScreen === 'missing-words-game' || effectiveScreen === 'blind-game') return 'competitive-intro';
      if (effectiveScreen === 'rate-my-song-game') return 'rate-my-song-intro';
      // Default: PTM/CPTM intro
      return 'ptm-intro';
    }
    return base;
  }, [displayScreen, gameState.currentScreen, gameState.ptmPhase, gameState.ptmIntroData, gameState.tournamentBracketData]);

  // Aktiver Footer-Tab: priorisiere lokalen State fuer sofortiges Highlight
  const activeFooterScreen = localNavEffective ?? menuScreen;

  // ===================== KONTROLL-WECHSEL (P7/P18 + P14) =====================
  const prevControllingRef = useRef<boolean | null>(null);
  const releasedByMeRef = useRef(false);
  useEffect(() => {
    const prev = prevControllingRef.current;
    prevControllingRef.current = isControlling;
    if (prev === null || prev === isControlling) return;

    if (isControlling) {
      // Steuerung übernommen → sofort auf den Desktop-Screen spiegeln
      pushToast(tOr(t, 'mobile.toastControlAcquired', 'Steuerung übernommen'), 'success');
      setMenuScreen(gameState.currentScreen || 'home');
      return;
    }

    // Steuerung abgegeben (selbst) oder verloren (Lock weggenommen)
    const releasedByMe = releasedByMeRef.current;
    releasedByMeRef.current = false;
    pushToast(
      releasedByMe
        ? tOr(t, 'mobile.toastControlReleased', 'Steuerung abgegeben')
        : tOr(t, 'mobile.toastControlLost', 'Steuerung verloren'),
      releasedByMe ? 'info' : 'error',
    );
    // Offenes Grace-Window schließen (gehört zur Steuerung)
    setLocalNav(null);
    // P14 Auto-Redirect: Ist der aktuelle Menü-Screen für nicht-steuernde
    // Companion gesperrt (Settings/Party/…), geht es zurück zur Startseite.
    // Reine Game-Flow-Screens ('game', '*-game', 'song-voting', 'results')
    // werden ebenfalls auf 'home' zurückgesetzt — der laufende Game-Mirror
    // bleibt davon unberührt (forcedGameScreen hat Vorrang), aber nach dem
    // Spielende landet der Companion sauber auf seiner Startseite.
    setMenuScreen(current => (isLockedForNonControlling(current) || isGameFlowScreen(current) ? 'home' : current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControlling]);

  // ===================== FOOTER NAVIGATION (P2/P14) =====================
  const handleFooterNavigate = useCallback((screen: string) => {
    if (!isControlling) {
      // Nicht-steuernd: gesperrte Tabs nur ankündigen, erlaubte lokal
      // navigieren (KEIN remote_command — kein Desktop-Einfluss).
      if (isLockedForNonControlling(screen)) {
        pushToast(tOr(t, 'mobile.toastLockedNav', 'Nur mit Fernsteuerung'), 'info');
        return;
      }
      setMenuScreen(screen);
      return;
    }
    // Issue 11: Song läuft und User navigiert weg → Overlay zeigen
    // But exempt party-setup: going back to setup doesn't leave the party
    if (isSongRunning && screen !== 'game' && screen !== 'party-setup' && screen !== menuScreen) {
      setShowSongRunningOverlay(true);
      return;
    }
    // R27: open the local-navigation grace window — locally chosen screens
    // take priority over contradicting 2s sync pushes for ≤ 3.5 s (see above).
    setLocalNav({ screen, at: Date.now() });
    // Steuernd: lokal umschalten UND remote_command an den Desktop senden
    // (bidirektionale Synchronisation, P1).
    setMenuScreen(screen);
    handleSendDesktopCommand(screen);
  }, [isControlling, isSongRunning, menuScreen, handleSendDesktopCommand, pushToast, t]);

  // ===================== REMOTE LOCK POLLING =====================
  const isMountedRef2 = useRef(true);
  useEffect(() => {
    if (!isConnected || !clientId) return;
    const pollLock = async () => {
      try {
        const res = await fetch(`/api/mobile?action=remotecontrol&clientId=${clientId}`);
        if (!res.ok) return;
        const d = await res.json();
        if (d.success && isMountedRef2.current) {
          setRemoteLock({
            isLocked: !!d.remoteControl?.lockedBy,
            lockedByMe: !!d.remoteControl?.iHaveControl,
            lockedByName: d.remoteControl?.lockedByName || null,
          });
        }
      } catch { /* ignore */ }
    };
    pollLock();
    const iv = setInterval(pollLock, 3000);
    return () => { clearInterval(iv); isMountedRef2.current = false; };
  }, [isConnected, clientId]);

  const handleAcquireRemote = useCallback(async () => {
    if (!clientId) return;
    try {
      const res = await fetch('/api/mobile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'remote_acquire', clientId }),
      });
      const d = await res.json().catch(() => null);
      if (d?.success) {
        // Optimistisch übernehmen — der 3s-Poll korrigiert bei Abweichung.
        setRemoteLock({ isLocked: true, lockedByMe: true, lockedByName: profile?.name || null });
      } else {
        // Ein anderes Gerät hält die Steuerung — Status übernehmen (kein
        // optimistisches "lockedByMe" mehr, das war der alte Inversions-Bug).
        setRemoteLock({ isLocked: true, lockedByMe: false, lockedByName: d?.lockedBy || null });
        pushToast(
          tOr(t, 'mobile.toastControlTaken', 'Steuerung bereits vergeben') + (d?.lockedBy ? ` (${d.lockedBy})` : ''),
          'error',
        );
      }
    } catch { /* ignore */ }
  }, [clientId, profile?.name, pushToast, t]);

  const handleReleaseRemote = useCallback(async () => {
    if (!clientId) return;
    releasedByMeRef.current = true;
    try {
      await fetch('/api/mobile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'remote_release', clientId }),
      });
    } catch { /* ignore */ }
    setRemoteLock({ isLocked: false, lockedByMe: false, lockedByName: null });
  }, [clientId]);

  // ===================== LAZY LOADS FÜR R33-MIRRORS =====================
  // Highscores/Daily/Jukebox werden gezogen, sobald der Screen betreten wird
  // (die Lite-Views können zusätzlich selbst laden — Loader sind idempotent).
  useEffect(() => {
    if (displayScreen === 'highscores') data.loadHighscores();
    else if (displayScreen === 'dailyChallenge') data.loadDailyState();
    else if (displayScreen === 'jukebox') { data.loadJukeboxState(); data.loadJukeboxWishlist(); }
  }, [displayScreen, data.loadHighscores, data.loadDailyState, data.loadJukeboxState, data.loadJukeboxWishlist]);

  // ===================== RENDER =====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <MobileOfflineIndicator />
      <MobileErrorBoundary>

      {/* ====== HEADER ====== */}
      {isConnected && profile && !isSinging && (
        <MobileHeader
          profile={profile}
          connectionCode={connectionCode}
          isConnected={isConnected}
          isListening={isListening}
          currentPitch={currentPitch}
          currentSong={gameState.currentSong}
          isPlaying={gameState.isPlaying}
          gameMode={gameState.gameMode ?? null}
          showChat={showChat}
          onOpenProfile={() => setShowProfile(true)}
          onOpenHelp={() => setShowHelp(true)}
          onOpenChat={() => setShowChat(true)}
          onDisconnect={handleDisconnect}
        />
      )}

      {/* ====== MAIN CONTENT (scrollt; Menüleiste fixiert unten) ====== */}
      {!isConnected ? (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mb-4" />
          <p className="text-white/60 mb-4">{t('mobileClient.connecting')}</p>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <Button onClick={connect} className="bg-cyan-500 hover:bg-cyan-400">{t('mobileClient.retryConnection')}</Button>
        </div>
      ) : !profile ? (
        <MobileProfileCreateView
          profileName={profileName} onProfileNameChange={setProfileName}
          profileColor={profileColor} onProfileColorChange={setProfileColor}
          avatarPreview={avatarPreview} profileColors={PROFILE_COLORS}
          fileInputRef={fileInputRef} onCreateProfile={handleCreateProfile} onPhotoUpload={handlePhotoUpload}
        />
      ) : showProfile ? (
        <div className="pb-20">
          <MobileProfileEditView
            profile={profile} profileName={profileName} onProfileNameChange={setProfileName}
            profileColor={profileColor} onProfileColorChange={setProfileColor}
            avatarPreview={avatarPreview} connectionCode={connectionCode}
            profileColors={PROFILE_COLORS} fileInputRef={fileInputRef}
            onSave={handleSaveProfile} onPhotoUpload={handlePhotoUpload}
            onSwitchToHostProfile={handleSwitchToHostProfile}
          />
          <div className="sticky bottom-16 left-0 right-0 px-4 py-2 bg-gradient-to-t from-black/80 to-transparent">
            <button
              onClick={() => setShowProfile(false)}
              className="w-full py-3 rounded-xl bg-white/10 border border-white/20 text-white/70 font-medium active:scale-[0.98] transition-transform"
            >
              {t('companion.backToParty') || '← Zurück'}
            </button>
          </div>
        </div>
      ) : (
        <div className="pb-16">
          {/* R54: Einmalige Zertifikats-Einrichtung — sichtbar, solange der
              Server HTTPS anbietet und der Nutzer das Banner nicht weggeklickt
              hat (Details: mobile-cert-setup.tsx). */}
          <MobileCertSetup httpsPort={micHttpsPort} insecureContext={micInsecure} trustedDomain={micTrustedDomain} />

          {/* MirrorView — steuernd UND nicht-steuernd (P1): Der Dispatcher
              erhält isControlling + den vollen R33-Datenvertrag. */}
          <MirrorView
            mirrorScreenId={mirrorScreenId}
            gameState={gameState}
            clientId={clientId}
            profileName={profile?.name || ''}
            profileId={profile?.id || null}
            profile={profile}
            currentPitch={currentPitch}
            isMicListening={isListening}
            brSinging={brSinging}
            queue={data.queue}
            slotsRemaining={data.slotsRemaining}
            onRemoveFromQueue={data.removeFromQueue}
            onReorderQueue={data.reorderQueue}
            songSearch={data.songSearch}
            onSongSearchChange={data.setSongSearch}
            songsLoading={data.songsLoading}
            songsError={data.songsError}
            songs={data.songs}
            filteredSongs={data.filteredSongs}
            showSongOptions={data.showSongOptions}
            selectedGameMode={data.selectedGameMode}
            selectedPartner={data.selectedPartner}
            availablePartners={data.availablePartners}
            opponents={data.opponents}
            availableProfiles={data.availableProfiles}
            onShowSongOptions={data.setShowSongOptions}
            onSelectGameMode={data.setSelectedGameMode}
            onSelectPartner={data.setSelectedPartner}
            onAddToQueue={data.addToQueue}
            onLoadPartners={data.loadAvailablePartners}
            onLoadOpponents={data.loadOpponents}
            onRefreshSongs={data.loadSongs}
            formatDuration={data.formatDuration}
            difficulty={data.difficulty}
            onDifficultyChange={data.setDifficulty}
            playerMicSource={data.playerMicSource}
            onPlayerMicSourceChange={data.setPlayerMicSource}
            partnerMicSource={data.partnerMicSource}
            onPartnerMicSourceChange={data.setPartnerMicSource}
            duetPartsSwapped={data.duetPartsSwapped}
            onDuetPartsSwappedChange={data.setDuetPartsSwapped}
            addedQueuePosition={data.addedQueuePosition}
            jukeboxWishlist={data.jukeboxWishlist}
            onRemoveFromJukebox={data.removeFromJukeboxWishlist}
            onRefreshJukebox={data.loadJukeboxWishlist}
            gameResults={data.gameResults}
            onNavigate={() => {}}
            onOpenChat={() => setShowChat(true)}
            isRemoteLocked={remoteLock.isLocked && !remoteLock.lockedByMe}
            remoteLockedBy={remoteLock.lockedByName}
            isControlling={isControlling}
            onAcquireRemote={handleAcquireRemote}
            onReleaseRemote={handleReleaseRemote}
            onSendDesktopCommand={handleSendDesktopCommand}
            onLocalNavigate={handleFooterNavigate}
            onOpenProfile={() => setShowProfile(true)}
            onLaunchMode={handleLaunchMode}
            libraryPresetMode={libraryPresetMode}
            ownCompanionCode={connectionCode || null}
            settingsSnapshot={settingsSnapshot}
            highscores={data.highscores}
            onLoadHighscores={data.loadHighscores}
            dailyState={data.dailyState}
            onLoadDailyState={data.loadDailyState}
            jukeboxState={data.jukeboxState}
            onLoadJukeboxState={data.loadJukeboxState}
          />
        </div>
      )}

      {/* ====== FOOTER: Horiz. scrollbar Navigation ====== */}
      {isConnected && profile && !showProfile && !isSinging && (
        <MobileBottomNav
          activeScreen={activeFooterScreen}
          onNavigate={handleFooterNavigate}
          lockedScreens={isControlling ? [] : NON_CONTROLLING_LOCKED_NAV}
          onLockedTap={() => pushToast(tOr(t, 'mobile.toastLockedNav', 'Nur mit Fernsteuerung'), 'info')}
        />
      )}

      {/* ====== TOAST-LEISTE (P7/P18 — direkt über der Menüleiste) ====== */}
      <ToastBar toasts={toasts} onDismiss={dismissToast} />

      {/* ====== CHAT OVERLAY ====== */}
      {showChat && clientId && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
          <MobileChat clientId={clientId} onClose={() => setShowChat(false)} />
        </div>
      )}

      {/* ====== HILFE-OVERLAY (P19 — rein lokal, keine Commands) ====== */}
      {showHelp && (
        <MobileHelpView onClose={() => setShowHelp(false)} />
      )}

      {/* ====== SINGALONG OVERLAY ====== */}
      {(isConnected && profile && gameState.singalongTurn?.isActive && gameState.singalongTurn.profileId === profile.id) ? (
        <SingalongOverlay
          isMyTurn={gameState.singalongTurn.countdown === null}
          countdown={gameState.singalongTurn.countdown}
        />
      ) : null}

      {/* ====== CPTM OVERLAY ====== */}
      {(isConnected && profile && gameState.cptmTurn?.isActive) ? (
        (gameState.cptmTurn.countdown !== null && gameState.cptmTurn.nextProfileId === profile.id) ? (
          <CptmBlinkOverlay countdown={gameState.cptmTurn.countdown} playerColor={profile.color} />
        ) : (gameState.cptmTurn.profileId === profile.id && gameState.cptmTurn.countdown === null) ? (
          <CptmYourTurnOverlay playerName={profile.name} playerColor={profile.color} />
        ) : null
      ) : null}

      {/* ====== R52: MIC-STATUS-KARTE (alle Companion-Sing-Modi) ====== */}
      {/* Zeigt erstmals SICHTBAR, ob das Handy-Mikro wirklich läuft (grün =
          Signal da), startet (gelb pulsierend) oder kein Signal liefert
          (rot/amber — iOS: ohne Geste bleibt der AudioContext suspended).
          R54: zusätzlich ☀️ Wake-Lock-Status (Bildschirm bleibt an) bzw.
          Warnhinweis bei fehlender Unterstützung. Die GESAMTE Karte ist
          tappbar: Der Tap läuft in einer echten Nutzer-Geste und resumed/
          started das Mikro zuverlässig. z-[55] liegt ÜBER den Turn-Overlays
          (z-50, pointer-events-none), damit der Tap immer erreichbar ist. */}
      {(isConnected && profile && shouldSingNow) ? (
        <MicStatusCard
          isListening={isListening}
          audioSuspended={audioSuspended}
          hasSignal={hasSignal}
          micPermissionDenied={micPermissionDenied}
          insecureContext={micInsecure}
          httpsAvailable={micHttpsPort !== null}
          volume={currentPitch.volume}
          note={currentPitch.note}
          wakeLockHeld={wakeLock.held}
          wakeLockSupported={wakeLock.supported}
          wakeLockActive={!gameState.songEnded && (shouldSingNow || isMyUpcomingTurn || isListening)}
          onActivate={() => {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(10);
            // R53: Im unsicheren Kontext ist KEIN Mikrostart möglich — der
            // Tap wechselt stattdessen auf die HTTPS-Verbindung.
            if (micInsecure) { openHttpsCompanionUrl(); return; }
            void resumeAudioContext();
          }}
        />
      ) : null}

      {/* ====== TOURNAMENT VOTE OVERLAY ====== */}
      {isConnected && profile && gameState.isPlaying && gameState.gameMode === 'duel' && gameState.tournamentMatchId && !votedMatchIds.has(gameState.tournamentMatchId) && (
        <MobileTournamentVote
          onVote={(side) => {
            if (!clientId || !gameState.tournamentMatchId) return;
            setVotedMatchIds(prev => new Set(prev).add(gameState.tournamentMatchId!));
            fetch('/api/mobile', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'tournament_crowd_vote', payload: { matchId: gameState.tournamentMatchId, playerSide: side }, clientId }),
            // eslint-disable-next-line no-console
            }).catch(() => { console.warn(`Failed to cast tournament vote for P${side}`); });
          }}
        />
      )}
      {/* ====== SONG-RUNNING WARNING OVERLAY (Issue 11) ====== */}
      {showSongRunningOverlay ? (
        <MobileSongRunningOverlay
          currentSong={gameState.currentSong}
          onEndSong={() => {
            setShowSongRunningOverlay(false);
            handleSendDesktopCommand('quit');
          }}
          onReleaseControl={() => {
            setShowSongRunningOverlay(false);
            handleReleaseRemote();
            // Navigate to home locally so the user can use free functions
            setMenuScreen('home');
          }}
          onClose={() => setShowSongRunningOverlay(false)}
        />
      ) : null}

      </MobileErrorBoundary>
    </div>
  );
}
MobileClientView.displayName = 'MobileClientView';
