/**
 * Web preview switches: `?event=1` runs the seasonal event outside its dates, `?dev=1` shows the dev switches. They are
 * honoured only on a local preview (localhost / 127.0.0.1) or in the dev build, never on the public site / Telegram.
 */
export const isLocalHost = (host: string): boolean => host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
export function webFlags(search: string, host: string, devBuild: boolean): { event: boolean; dev: boolean } {
  const allowed = devBuild || isLocalHost(host);
  return {
    event: allowed && /[?&]event=1(&|$)/.test(search),
    dev: devBuild || (allowed && /[?&]dev=1(&|$)/.test(search)),
  };
}
