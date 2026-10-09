/**
 * Native (Android) sharing: the system share sheet for invites and save codes. The web build uses share.web.ts.
 */
import { Share } from "react-native";
import { APP_LINK, INVITE_TEXT } from "./invite";

export type ShareResult = "shared" | "copied" | "downloaded" | "dismissed" | "failed";

export async function inviteFriend(): Promise<ShareResult> {
  try {
    const r = await Share.share({ message: `${INVITE_TEXT}\n${APP_LINK}`, title: "Пригласить друга в Buzzle" });
    return r.action === Share.dismissedAction ? "dismissed" : "shared";
  } catch { return "failed"; }
}

/** export: share the code as text (save it in notes, send it to yourself in a messenger, …) */
export async function exportSaveCode(code: string): Promise<ShareResult> {
  try {
    const r = await Share.share({ message: code, title: "Сохранение Buzzle" });
    return r.action === Share.dismissedAction ? "dismissed" : "shared";
  } catch { return "failed"; }
}

/** Android: the code is pasted into the import field (no file picker needed) */
export const CAN_PICK_FILE = false;
export async function pickSaveFile(): Promise<string | null> { return null; }
