// Minimal mocked Telegram.WebApp (Bot API 8.0, Android) for headless tests; CloudStorage persists in localStorage "__cloud__:*".
module.exports = `(() => {
  const calls = []; const ev = {}; let backCb = [];
  const ls = window.localStorage;
  const cs = {
    setItem(k, v, cb) { calls.push("cloud.set:" + k); if (v.length > 4096) return cb && cb("VALUE_TOO_LONG"); ls.setItem("__cloud__:" + k, v); setTimeout(() => cb && cb(null, true), 30); },
    getItem(k, cb) { setTimeout(() => cb(null, ls.getItem("__cloud__:" + k) || ""), 30); },
    getItems(ks, cb) { const r = {}; ks.forEach((k) => r[k] = ls.getItem("__cloud__:" + k) || ""); setTimeout(() => cb(null, r), 30); },
    removeItems(ks, cb) { ks.forEach((k) => ls.removeItem("__cloud__:" + k)); setTimeout(() => cb && cb(null, true), 30); },
    getKeys(cb) { setTimeout(() => cb(null, Object.keys(ls).filter((k) => k.startsWith("__cloud__:")).map((k) => k.slice(10))), 30); },
  };
  const rec = (n) => (...a) => calls.push(n + (a.length ? ":" + a.join(",") : ""));
  window.Telegram = { WebApp: {
    initData: "query_id=TEST&user=%7B%22id%22%3A1%7D&auth_date=1&hash=x", platform: "android", version: "8.0",
    isVersionAtLeast: (v) => parseFloat(v) <= 8.0,
    ready: rec("ready"), openTelegramLink: (u) => { calls.push("openTelegramLink:" + u); }, openLink: rec("openLink"), expand: rec("expand"), requestFullscreen: () => { calls.push("requestFullscreen"); }, lockOrientation: rec("lockOrientation"),
    disableVerticalSwipes: rec("disableVerticalSwipes"), setHeaderColor: rec("setHeaderColor"), setBackgroundColor: rec("setBackgroundColor"), setBottomBarColor: rec("setBottomBarColor"),
    safeAreaInset: { top: 24, bottom: 16, left: 0, right: 0 }, contentSafeAreaInset: { top: 46, bottom: 0, left: 0, right: 0 },
    onEvent: (e, f) => { (ev[e] = ev[e] || []).push(f); }, offEvent: (e, f) => { ev[e] = (ev[e] || []).filter((x) => x !== f); },
    BackButton: { isVisible: false, show() { this.isVisible = true; calls.push("back.show"); }, hide() { this.isVisible = false; calls.push("back.hide"); },
      onClick(f) { backCb.push(f); }, offClick(f) { backCb = backCb.filter((x) => x !== f); } },
    HapticFeedback: { impactOccurred: rec("haptic.impact"), notificationOccurred: rec("haptic.notify"), selectionChanged: rec("haptic.select") },
    CloudStorage: cs,
  } };
  window.__tg = { calls, press: () => backCb.slice().forEach((f) => f()) };
})();`;
