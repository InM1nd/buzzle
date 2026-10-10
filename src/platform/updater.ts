/**
 * v1.4 Android in-app update: GitHub latest release (public API, no token) → download the APK with progress →
 * the system package installer via a FileProvider content:// URI. Android asks once for "install unknown apps"
 * (REQUEST_INSTALL_PACKAGES); we also offer a shortcut to that settings page.
 * Disabled with EXPO_PUBLIC_BZZ_UPDATER=off (a future Play Store build).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import { Platform } from "react-native";
import { parseRelease, ReleaseInfo } from "../logic/update";
import { GITHUB_REPO } from "../version";

export const UPDATER_ENABLED = Platform.OS === "android" && process.env.EXPO_PUBLIC_BZZ_UPDATER !== "off";
const PKG = "com.zabolotny.bzz";
const KEY = "bzz:update";

export interface UpdateCache { checkedAt: number; latest: ReleaseInfo | null }
export async function loadCache(): Promise<UpdateCache> {
  try { const r = await AsyncStorage.getItem(KEY); if (r) return JSON.parse(r); } catch {}
  return { checkedAt: 0, latest: null };
}
async function saveCache(c: UpdateCache) { await AsyncStorage.setItem(KEY, JSON.stringify(c)).catch(() => {}); }

export async function fetchLatest(now = Date.now()): Promise<ReleaseInfo | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, { headers: { Accept: "application/vnd.github+json" }, signal: ctl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const rel = parseRelease(await r.json());
    await saveCache({ checkedAt: now, latest: rel });
    return rel;
  } finally { clearTimeout(timer); }
}

const apkPath = (rel: ReleaseInfo) => `${FileSystem.cacheDirectory}Buzzle-v${rel.version}.apk`;

/** download (skips if a complete file is already there); onProgress 0..1 */
export async function downloadApk(rel: ReleaseInfo, onProgress: (p: number) => void): Promise<string> {
  if (!rel.apkUrl) throw new Error("no apk");
  const path = apkPath(rel);
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists && rel.apkSize && "size" in info && info.size === rel.apkSize) { onProgress(1); return path; }
  const dl = FileSystem.createDownloadResumable(rel.apkUrl, path, {}, (p) => {
    const total = p.totalBytesExpectedToWrite > 0 ? p.totalBytesExpectedToWrite : rel.apkSize;
    if (total > 0) onProgress(Math.min(1, p.totalBytesWritten / total));
  });
  const res = await dl.downloadAsync();
  if (!res || res.status < 200 || res.status >= 300) throw new Error(`download ${res?.status}`);
  onProgress(1);
  return path;
}

/** open the system installer for a downloaded APK */
export async function installApk(path: string): Promise<void> {
  const uri = await FileSystem.getContentUriAsync(path);
  await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
    data: uri, type: "application/vnd.android.package-archive",
    flags: 1 /* FLAG_GRANT_READ_URI_PERMISSION */ | 0x10000000 /* FLAG_ACTIVITY_NEW_TASK */,
  });
}

/** Settings → "Install unknown apps" → Buzzle */
export async function openInstallPermission(): Promise<void> {
  await IntentLauncher.startActivityAsync("android.settings.MANAGE_UNKNOWN_APP_SOURCES", { data: `package:${PKG}` })
    .catch(() => IntentLauncher.startActivityAsync("android.settings.SECURITY_SETTINGS"));
}
