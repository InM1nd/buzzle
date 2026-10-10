/**
 * v1.4 in-app update (Android, GitHub Releases): pure helpers — parse the latest release, compare versions.
 * The network/installer side lives in src/platform/updater.ts.
 */
export interface ReleaseInfo {
  version: string;        // "1.4.1" (tag without the v)
  code: number | null;    // versionCode if the release says it ("versionCode: 7"), else null
  body: string;           // changelog (markdown-ish)
  apkUrl: string | null;
  apkSize: number;        // bytes, 0 if unknown
  page: string;           // html_url of the release
  publishedAt: string;
}

/** semver-ish compare: 1.10.0 > 1.9.3; pre-release tags (1.4.0-beta) sort below the release */
export function compareVersions(a: string, b: string): number {
  const norm = (v: string) => v.trim().replace(/^v/i, "");
  const [ma, pa = ""] = norm(a).split("-", 2);
  const [mb, pb = ""] = norm(b).split("-", 2);
  const xa = ma.split(".").map((n) => parseInt(n, 10) || 0), xb = mb.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(xa.length, xb.length, 3); i++) {
    const d = (xa[i] ?? 0) - (xb[i] ?? 0);
    if (d) return d > 0 ? 1 : -1;
  }
  if (pa === pb) return 0;
  if (!pa) return 1;
  if (!pb) return -1;
  return pa > pb ? 1 : -1;
}

/** release body may carry "versionCode: 7" / "versionCode 7" / "(versionCode 7)" */
export function parseVersionCode(body: string): number | null {
  const m = /versionCode[\s:=(]*(\d+)/i.exec(body || "");
  return m ? parseInt(m[1], 10) : null;
}

/** GitHub /releases/latest JSON → ReleaseInfo (null when it doesn't look like a Buzzle release) */
export function parseRelease(json: unknown): ReleaseInfo | null {
  const r = json as Record<string, any> | null;
  if (!r || typeof r.tag_name !== "string" || r.draft || r.prerelease) return null;
  const version = r.tag_name.replace(/^v/i, "");
  if (!/^\d+\.\d+(\.\d+)?/.test(version)) return null;
  const assets: any[] = Array.isArray(r.assets) ? r.assets : [];
  const apk = assets.find((a) => typeof a?.name === "string" && a.name.toLowerCase().endsWith(".apk") && typeof a.browser_download_url === "string");
  const body = typeof r.body === "string" ? r.body : "";
  return {
    version, code: parseVersionCode(body), body,
    apkUrl: apk ? apk.browser_download_url : null, apkSize: apk && typeof apk.size === "number" ? apk.size : 0,
    page: typeof r.html_url === "string" ? r.html_url : "", publishedAt: typeof r.published_at === "string" ? r.published_at : "",
  };
}

/** is the release newer than what's installed? versionCode wins when both sides know it */
export function isNewer(rel: ReleaseInfo, curVersion: string, curCode: number): boolean {
  if (rel.code !== null) {
    if (rel.code !== curCode) return rel.code > curCode;
  }
  return compareVersions(rel.version, curVersion) > 0;
}

/** the changelog for the dialog: the English part of a release body, without markdown noise, capped */
export function changelogText(body: string, max = 1200): string {
  let s = (body || "").replace(/\r/g, "");
  // our release bodies end with "---" and a short ru/uk summary: keep the main part
  const cut = s.search(/^\s*---\s*$/m);
  if (cut > 0) s = s.slice(0, cut);
  s = s.replace(/^#+\s*/gm, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/^\s*[-*]\s+/gm, "• ").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  s = s.replace(/\n{3,}/g, "\n\n").trim();
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

export const DAY_MS = 86_400_000;
/** quiet auto-check: at most once a day */
export const shouldAutoCheck = (lastCheck: number, now: number) => !lastCheck || now - lastCheck >= DAY_MS || now < lastCheck;
