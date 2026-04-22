/**
 * TH-002 — Gecureerde emoji-shortlist voor het themes-systeem.
 *
 * De ThemeTagger kiest voor nieuwe thema-proposals exact één emoji uit deze
 * lijst. De review-UI (TH-006) rendert dezelfde lijst als picker. Kleine lijst
 * = visuele consistentie. Grote genoeg lijst (42) om alle interne JAIP-thema's
 * te dekken zonder drift.
 *
 * Clusters zijn puur voor het brein bij uitbreiden, niet functioneel in code:
 * Mensen & team / Werk & proces / Product & tech / Business / Klant & markt /
 * Operationeel. Zie PRD §7 voor de bron.
 *
 * Fallback `🏷️` is het default-icoon wanneer de tagger geen keuze maakt of
 * een reviewer visueel wil markeren "nog kiezen".
 */

export const THEME_EMOJIS = [
  // Mensen & team
  "👥",
  "🫂",
  "👩‍💻",
  "🧑‍💼",
  "🙋",
  "🎯",
  "🏆",
  // Werk & proces
  "🗂️",
  "📋",
  "📊",
  "🧭",
  "🗺️",
  "⚙️",
  "🔁",
  // Product & tech
  "💻",
  "🤖",
  "🧱",
  "🚀",
  "🛠️",
  "🐛",
  "🎨",
  "📱",
  // Business
  "💶",
  "📈",
  "📉",
  "💼",
  "🤝",
  "💡",
  "🏢",
  // Klant & markt
  "💬",
  "📢",
  "❤️",
  "🗣️",
  "🌍",
  "🧾",
  // Operationeel
  "🏠",
  "🧳",
  "📚",
  "⏱️",
  "🔐",
  "📦",
  "🛡️",
] as const;

export const THEME_EMOJI_FALLBACK = "🏷️" as const;

export type ThemeEmoji = (typeof THEME_EMOJIS)[number] | typeof THEME_EMOJI_FALLBACK;

/** All allowed values including the fallback — use for Zod enums / UI pickers. */
export const ALL_THEME_EMOJIS = [...THEME_EMOJIS, THEME_EMOJI_FALLBACK] as const;
