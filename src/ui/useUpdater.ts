/** v1.4 update state shared by the gear badge and the Settings → Update page. */
import { useCallback, useEffect, useState } from "react";
import { isNewer, ReleaseInfo, shouldAutoCheck } from "../logic/update";
import { fetchLatest, loadCache, UPDATER_ENABLED } from "../platform/updater";
import { APP_VERSION, APP_VERSION_CODE } from "../version";

export interface Updater {
  enabled: boolean;
  latest: ReleaseInfo | null;
  available: boolean;
  checking: boolean;
  error: boolean;
  check: () => Promise<ReleaseInfo | null>;
}
export function useUpdater(auto: boolean, ready: boolean): Updater {
  const [latest, setLatest] = useState<ReleaseInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(false);
  const check = useCallback(async () => {
    setChecking(true); setError(false);
    try { const r = await fetchLatest(Date.now()); setLatest(r); return r; }
    catch { setError(true); return null; }
    finally { setChecking(false); }
  }, []);
  useEffect(() => {
    if (!UPDATER_ENABLED || !ready) return;
    let alive = true;
    loadCache().then((c) => {
      if (!alive) return;
      setLatest(c.latest);
      // quiet daily check: no spinner, no error message
      if (auto && shouldAutoCheck(c.checkedAt, Date.now())) fetchLatest(Date.now()).then((r) => alive && setLatest(r)).catch(() => {});
    });
    return () => { alive = false; };
  }, [auto, ready]);
  const available = !!latest && isNewer(latest, APP_VERSION, APP_VERSION_CODE);
  return { enabled: UPDATER_ENABLED, latest, available, checking, error, check };
}
