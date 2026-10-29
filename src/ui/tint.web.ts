/**
 * Web / Telegram: an image filled with one colour (what `tintColor` does), rendered once into a data URI.
 * react-native-web draws `tintColor` with an SVG filter per element (`filter: url(#tint-N)`): Safari / WKWebView runs SVG
 * filters on the CPU and re-runs them whenever anything over or under the element repaints, e.g. the 56 board sockets under
 * the falling puzzle tiles. A pre-tinted bitmap draws like any other image. Same result as the filter (colour × source alpha).
 */
import { useEffect, useState } from "react";
import { ImageSourcePropType } from "react-native";
import { Asset } from "expo-asset";

const done = new Map<string, { uri: string }>(); // stable objects: the same source prop every render
const pending = new Map<string, Promise<string | null>>();

function uriOf(src: ImageSourcePropType): string | null {
  if (typeof src === "number") { try { return Asset.fromModule(src).uri || null; } catch { return null; } }
  const u = (src as { uri?: unknown } | null)?.uri;
  return typeof u === "string" ? u : null;
}

function render(uri: string, color: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const g = c.getContext("2d");
        if (!g || !c.width || !c.height) return resolve(null);
        g.drawImage(img, 0, 0);
        g.globalCompositeOperation = "source-in";
        g.fillStyle = color;
        g.fillRect(0, 0, c.width, c.height);
        resolve(c.toDataURL("image/png"));
      } catch { resolve(null); } // tainted canvas / no 2d context: keep the filter
    };
    img.onerror = () => resolve(null);
    img.src = uri;
  });
}

/** The tinted copy of `src` once it is ready (null until then, or if it can't be made: fall back to `tintColor`). */
export function useTinted(src: ImageSourcePropType, color: string, on = true): ImageSourcePropType | null {
  const uri = on ? uriOf(src) : null;
  const key = uri ? `${color}|${uri}` : "";
  const [, ready] = useState(0);
  useEffect(() => {
    if (!uri || done.has(key)) return;
    let alive = true;
    let p = pending.get(key);
    if (!p) {
      p = render(uri, color).then((d) => { if (d) done.set(key, { uri: d }); return d; });
      pending.set(key, p);
    }
    p.then((d) => { if (alive && d) ready((n) => n + 1); });
    return () => { alive = false; };
  }, [key, uri, color]);
  return (key && done.get(key)) || null;
}
