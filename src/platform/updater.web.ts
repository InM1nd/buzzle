/** Web / Telegram: the game updates itself; only the screenshot harness can force the dialog (window.__BZZ_DEMO_UPDATE). */
import { ReleaseInfo } from "../logic/update";
const demo = () => (typeof window !== "undefined" ? (window as unknown as { __BZZ_DEMO_UPDATE?: ReleaseInfo }).__BZZ_DEMO_UPDATE ?? null : null);
export const UPDATER_ENABLED = !!demo();
export interface UpdateCache { checkedAt: number; latest: ReleaseInfo | null }
export async function loadCache(): Promise<UpdateCache> { return { checkedAt: Date.now(), latest: demo() }; }
export async function fetchLatest(): Promise<ReleaseInfo | null> { await new Promise((r) => setTimeout(r, 300)); return demo(); }
export async function downloadApk(_rel: ReleaseInfo, onProgress: (p: number) => void): Promise<string> {
  for (let i = 1; i <= 10; i++) { await new Promise((r) => setTimeout(r, 120)); onProgress(i / 10); }
  return "demo.apk";
}
export async function installApk(): Promise<void> {}
export async function openInstallPermission(): Promise<void> {}
