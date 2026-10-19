/**
 * v1.6 scene backdrops resolver (pure, testable): event backdrop while an event look is shown, otherwise the season's
 * art for that view, otherwise the default (summer) art. The art tables themselves live in src/ui/art.ts.
 */
import { Season, season } from "./event";

export type SceneView = "hive" | "garden" | "puzzle";
export interface SceneTables<T> {
  event: Record<SceneView, T>;
  seasons: Record<Season, Partial<Record<SceneView, T>>>;
  fallback: Record<SceneView, T>;
}
export function resolveScene<T>(t: SceneTables<T>, view: SceneView, day: number, event: boolean): T {
  if (event) return t.event[view];
  return t.seasons[season(day)][view] ?? t.fallback[view];
}
