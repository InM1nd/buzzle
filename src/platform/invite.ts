/** Shared texts for «Пригласить друга» (v1.3). */
export const APP_LINK = "https://t.me/Buzzle_game_bot/Buzzle";
export const INVITE_TEXT = "Залетай ко мне в Buzzle 🐝 Уютный улей, сад и медовая головоломка дня — играем прямо в Telegram! Собирай соты-сюрпризы и наряжай пчёл 🍯";
/** Telegram's own share sheet: pick a chat, the link and text are prefilled */
export const telegramShareUrl = () => `https://t.me/share/url?url=${encodeURIComponent(APP_LINK)}&text=${encodeURIComponent(INVITE_TEXT)}`;
