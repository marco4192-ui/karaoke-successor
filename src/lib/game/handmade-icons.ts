// ─────────────────────────────────────────────────────────────────────────────
// HANDMADE ICONS — Registrierung der eigenen Grafiken des Nutzers (R95)
//
// Zweck: Die bunten Chat-Icon-artigen Emojis (⚔️, 👑, 🎤 …) sollen stellenweise
// durch handgemachte Grafiken ersetzt werden. Diese Datei bildet die stabile
// Spiel-ID (Achievement, Challenge, Daily-Typ, UI-Element) auf die Bilddatei
// unter /public/icons/handmade/ ab.
//
// Wichtig: Das Mapping ist ID-basiert (nicht emoji-basiert), weil viele
// Emojis in mehreren Kontexten laufen (z. B. 👑 = Diva-Modus UND Battle
// Royale). Nur die explizit gelisteten IDs bekommen eine Grafik.
//
// Pflege: Neue Grafik nach public/icons/handmade/ legen und hier mit der
// Spiel-ID registrieren. Alle Render-Stellen (GameEmoji / HandmadeIcon /
// FlagAwareEmoji mit id-Prop) zeigen sie automatisch.
// ─────────────────────────────────────────────────────────────────────────────

/** ID → Bilddatei (unter /icons/handmade/). */
export const HANDMADE_ICONS: Record<string, string> = {
  // ── Achievements (Erfolgs-Screen + Handy-Spiegel) ──
  combo_500: '/icons/handmade/combo-500.webp', // 🌋 Vulkan — „Combo 500"
  golden_40: '/icons/handmade/golden-40.webp', // 🎹 Klavier — „40 Gold-Notes"
  golden_250: '/icons/handmade/golden-250.webp', // 🌾 Weizen — „250 Gold-Notes"
  golden_1000: '/icons/handmade/golden-1000.webp', // 🌧️ Regenwolke — „1000 Gold-Notes"
  games_50: '/icons/handmade/games-50.webp', // 🕹️ Joystick — „50 Spiele"
  games_250: '/icons/handmade/games-250.webp', // 🎡 Riesenrad — „250 Spiele"
  songs_500: '/icons/handmade/songs-500.webp', // 🎖️ Rakete — „500 Songs"
  streak_365: '/icons/handmade/streak-365.webp', // 🎆 Feuerwerk/Kalender — „365 Tage Streak"
  perfect_10000: '/icons/handmade/vocal-tornado.webp', // 🌪️ Stimm-Tornado — „10.000 Perfekte Noten"

  // ── Rate-my-Song-Challenges (Bewertungs-Phase) ──
  smirk_mode: '/icons/handmade/smirk-mode.webp', // 😏 Grinsen
  air_guitar: '/icons/handmade/air-guitar.webp', // 🎸 Luftgitarre
  diva_mode: '/icons/handmade/diva-mode.webp', // 👑 Diva-Krone
  whisper_start: '/icons/handmade/whisper-start.webp', // 🤫 Flüsterstart
  disco_fever: '/icons/handmade/disco-fever.webp', // 🕺 Disko-Fieber
  emotional_rollercoaster: '/icons/handmade/emotional-rollercoaster.webp', // 😢 Achterbahn
  country_twist: '/icons/handmade/country-twist.webp', // 🤠 Cowboyhut

  // ── Live-Reaktionen (Rate-my-Song Schnellreaktionen) ──
  'reaction-applause': '/icons/handmade/reaction-applause.webp', // 👏 Applaus
  'reaction-love': '/icons/handmade/reaction-love.webp', // 😍 Herz-Augen (LIVE)

  // ── Challenge-Modi (Daily-Challenge-Screen + Handy-Spiegel) ──
  'score-titan': '/icons/handmade/score-titan.webp', // 🗿 Moai
  'score-scout': '/icons/handmade/score-scout.webp', // 🔎 Lupe
  'score-scholar': '/icons/handmade/score-scholar.webp', // 🎓 Doktorhut
  'gold-miner': '/icons/handmade/gold-miner.webp', // ⛏️ Spitzhacke
  'combo-commander': '/icons/handmade/combo-commander.webp', // 🚩 Flagge
  'memory-lane': '/icons/handmade/memory-lane.webp', // 🧩 Puzzleteil
  'note-novice': '/icons/handmade/note-novice.webp', // 🐣 Küken mit Headset
  'note-apprentice': '/icons/handmade/note-apprentice.webp', // 📗 grünes Buch
  'note-adept': '/icons/handmade/note-adept.webp', // 📘 blaues Buch
  'no-guide': '/icons/handmade/free-flight.webp', // ✈️ „Free Flight" (ID im Code: no-guide)

  // ── Daily-/Weekly-Typen (challenge-pools) ──
  combo_avalanche: '/icons/handmade/combo-avalanche.webp', // 🏔️ Combo-Lawine
  perfect_galaxy: '/icons/handmade/perfect-galaxy.webp', // 🌌 Perfekte Galaxie
  combo_tornado: '/icons/handmade/vocal-tornado.webp', // 🌪️ Combo-Tornado

  // ── Sonstige UI ──
  'fx-robot': '/icons/handmade/voice-robot.webp', // 🤖 Voice-Effekt „Roboter" (HUD)
  'settings-gear': '/icons/handmade/settings-gear.webp', // ⚙️ Einstellungen
};

/** Liefert die Grafik-URL für eine ID (oder undefined). */
export function handmadeIcon(id: string | undefined | null): string | undefined {
  return id ? HANDMADE_ICONS[id] : undefined;
}
