/** Shared texts for «Пригласить друга» (v1.3; localized in v1.4). */
import { t } from "../i18n";
export const APP_LINK = "https://t.me/Buzzle_game_bot/Buzzle";
export const inviteText = () => t("inv.text");
/** Telegram's own share sheet: pick a chat, the link and text are prefilled */
export const telegramShareUrl = () => `https://t.me/share/url?url=${encodeURIComponent(APP_LINK)}&text=${encodeURIComponent(inviteText())}`;
