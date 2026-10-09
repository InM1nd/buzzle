/**
 * Web / Telegram Mini App sharing (v1.3).
 * Invite: inside Telegram → openTelegramLink(t.me/share/url…) (Telegram's chat picker); in a browser → Web Share
 * API or the same t.me link in a new tab. Save export: copy the code to the clipboard and, outside the Telegram
 * mobile apps (no file downloads there), also download it as a .txt file. Import can read such a file.
 */
import { tg } from "./telegram";
import { APP_LINK, INVITE_TEXT, telegramShareUrl } from "./invite";

export type ShareResult = "shared" | "copied" | "downloaded" | "dismissed" | "failed";

export async function inviteFriend(): Promise<ShareResult> {
  const w = tg();
  const url = telegramShareUrl();
  try {
    if (w?.openTelegramLink) { w.openTelegramLink(url); return "shared"; }
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; url?: string }) => Promise<void> };
    if (nav.share) { await nav.share({ title: "Buzzle", text: INVITE_TEXT, url: APP_LINK }); return "shared"; }
    window.open(url, "_blank", "noopener");
    return "shared";
  } catch (e) {
    return (e as { name?: string })?.name === "AbortError" ? "dismissed" : "failed";
  }
}

async function copy(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* no permission / old webview */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}
const mobileTelegram = () => { const p = tg()?.platform ?? ""; return p === "android" || p === "ios" || p === "android_x"; };
function download(code: string): boolean {
  try {
    const d = new Date();
    const name = `buzzle-save-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.txt`;
    const url = URL.createObjectURL(new Blob([code + "\n"], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  } catch { return false; }
}

export async function exportSaveCode(code: string): Promise<ShareResult> {
  const copied = await copy(code);
  const downloaded = !mobileTelegram() && download(code);
  return downloaded ? "downloaded" : copied ? "copied" : "failed";
}

export const CAN_PICK_FILE = true;
/** let the player pick a saved .txt file; resolves with its text (null if cancelled) */
export function pickSaveFile(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const input = document.createElement("input");
      input.type = "file"; input.accept = ".txt,text/plain";
      input.onchange = () => {
        const f = input.files?.[0];
        if (!f || f.size > 2_000_000) { resolve(null); return; }
        const r = new FileReader();
        r.onload = () => resolve(typeof r.result === "string" ? r.result : null);
        r.onerror = () => resolve(null);
        r.readAsText(f);
      };
      input.click();
    } catch { resolve(null); }
  });
}
