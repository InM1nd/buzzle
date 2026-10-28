import { Season } from "../logic/event";
import { resolveScene, SceneView } from "../logic/scene";
/* eslint-disable @typescript-eslint/no-require-imports */
export const ART = {
  cells: [
    require("../../assets/art/cell0.webp"), require("../../assets/art/cell1.webp"), require("../../assets/art/cell2.webp"),
    require("../../assets/art/cell3.webp"), require("../../assets/art/cell4.webp"),
  ],
  wild: require("../../assets/art/cell_wild.webp"),
  bomb: require("../../assets/art/bomb.webp"),
  comb: require("../../assets/art/comb.webp"),
  combEmpty: require("../../assets/art/comb_empty.webp"),
  combLocked: require("../../assets/art/comb_locked.webp"),
  honey: require("../../assets/art/honey.webp"),
  jelly: require("../../assets/art/jelly.webp"),
  star: require("../../assets/art/star.webp"),
  starOff: require("../../assets/art/star_off.webp"),
  flame: require("../../assets/art/flame.webp"),
  chest: require("../../assets/art/chest.webp"),
  chestOpen: require("../../assets/art/chest_open.webp"),
  check: require("../../assets/art/check.webp"),
  drop: require("../../assets/art/drop.webp"),
  tabHive: require("../../assets/art/tab_hive.webp"),
  tabPuzzle: require("../../assets/art/tab_puzzle.webp"),
  tabBee: require("../../assets/art/tab_bee.webp"),
  tabTasks: require("../../assets/art/tab_tasks.webp"),
  gear: require("../../assets/art/gear.webp"),
  lock: require("../../assets/art/lock.webp"),
  close: require("../../assets/art/close.webp"),
  clock: require("../../assets/art/clock.webp"),
  // v1.2
  can: require("../../assets/art/can.webp"),
  seed: require("../../assets/art/seed.webp"),
  shovel: require("../../assets/art/shovel.webp"),
  pencil: require("../../assets/art/pencil.webp"),
  nectar: require("../../assets/art/garden/nectar.webp"),
  // v1.3
  pollen: require("../../assets/art/pollen.webp"),
  fragment: require("../../assets/art/fragment.webp"),
  boostMoves: require("../../assets/art/boost_moves.webp"),
  boostShuffle: require("../../assets/art/boost_shuffle.webp"),
  album: require("../../assets/art/album.webp"),
  shop: require("../../assets/art/shop.webp"),
  freeze: require("../../assets/art/freeze.webp"),
  share: require("../../assets/art/share.webp"),
  save: require("../../assets/art/save.webp"),
  tabBox: require("../../assets/art/tab_box.webp"),
  // v1.6 Halloween
  pumpkin: require("../../assets/art/halloween/cell_pumpkin.webp"),
  ghost: require("../../assets/art/halloween/ghost.webp"),
  point: require("../../assets/art/halloween/point.webp"),
  hiveNight: require("../../assets/art/halloween/hive_bg_night.webp"),
  gardenNight: require("../../assets/art/halloween/garden_bg_night.webp"),
  flightIcon: require("../../assets/art/halloween/fl_icon.webp"),
  puzzleNight: require("../../assets/art/halloween/puzzle_night.webp"),
  eventHeader: require("../../assets/art/halloween/event_header.webp"),
  trickDoor: require("../../assets/art/halloween/trick_door.webp"),
  trickBasket: require("../../assets/art/halloween/trick_basket.webp"),
};

/** v1.6 scene backdrops. Two layers: the event backdrop wins while an event runs (Halloween night), otherwise the
 * season's art, otherwise the default (summer) art. A season without its own picture for a view uses the default. */
export type { SceneView };
export const DEFAULT_BG: Record<SceneView, number> = {
  hive: require("../../assets/art/env/hive_bg.webp"),
  garden: require("../../assets/art/env/garden_bg.webp"),
  puzzle: require("../../assets/art/env/puzzle_default.webp"),
};
export const SEASON_BG: Record<Season, Partial<Record<SceneView, number>>> = {
  // winter / spring: no art yet, the default (summer) backdrops are shown; needed assets: design/SEASONS.ru.md
  spring: {},
  summer: {}, // = the defaults
  autumn: {
    hive: require("../../assets/art/halloween/hive_bg_autumn.webp"),
    garden: require("../../assets/art/env/garden_bg_autumn.webp"),
    puzzle: require("../../assets/art/halloween/puzzle_autumn.webp"),
  },
  winter: {}, // see spring
};
export const EVENT_BG: Record<SceneView, number> = { hive: ART.hiveNight, garden: ART.gardenNight, puzzle: ART.puzzleNight };
/** the backdrop for a view on that game day; `event` = the event look is shown (see App: it lags the calendar during the transition) */
export const sceneBg = (view: SceneView, day: number, event: boolean): number =>
  resolveScene({ event: EVENT_BG, seasons: SEASON_BG, fallback: DEFAULT_BG }, view, day, event);

/** v1.6 puzzle tile styles (Settings). setTileStyle swaps ART.cells / wild / bomb / pumpkin in place, so every screen that draws
 * tiles follows; App re-mounts the tree on a change (like the language). Calm sets: scripts/import_tile_styles.py */
const tileSet = (st: string, cells: number[], wild: number, bomb: number, pumpkin: number = ART.pumpkin) => ({ st, cells, wild, bomb, pumpkin });
export const TILE_SETS = {
  balanced: tileSet("balanced", [
    require("../../assets/art/tiles/balanced_cell0.webp"),
    require("../../assets/art/tiles/balanced_cell1.webp"),
    require("../../assets/art/tiles/balanced_cell2.webp"),
    require("../../assets/art/tiles/balanced_cell3.webp"),
    require("../../assets/art/tiles/balanced_cell4.webp"),
  ], require("../../assets/art/tiles/balanced_cell_wild.webp"), require("../../assets/art/tiles/balanced_bomb.webp"),
    require("../../assets/art/tiles/balanced_cell_pumpkin.webp")),
  mellow: tileSet("mellow", [
    require("../../assets/art/tiles/mellow_cell0.webp"),
    require("../../assets/art/tiles/mellow_cell1.webp"),
    require("../../assets/art/tiles/mellow_cell2.webp"),
    require("../../assets/art/tiles/mellow_cell3.webp"),
    require("../../assets/art/tiles/mellow_cell4.webp"),
  ], require("../../assets/art/tiles/mellow_cell_wild.webp"), require("../../assets/art/tiles/mellow_bomb.webp"),
    require("../../assets/art/tiles/mellow_cell_pumpkin.webp")),
  hbalanced: tileSet("hbalanced", [
    require("../../assets/art/tiles/hbalanced_cell0.webp"),
    require("../../assets/art/tiles/hbalanced_cell1.webp"),
    require("../../assets/art/tiles/hbalanced_cell2.webp"),
    require("../../assets/art/tiles/hbalanced_cell3.webp"),
    require("../../assets/art/tiles/hbalanced_cell4.webp"),
  ], require("../../assets/art/tiles/hbalanced_cell_wild.webp"), require("../../assets/art/tiles/hbalanced_bomb.webp"),
    require("../../assets/art/tiles/hbalanced_cell_pumpkin.webp")),
  hmellow: tileSet("hmellow", [
    require("../../assets/art/tiles/hmellow_cell0.webp"),
    require("../../assets/art/tiles/hmellow_cell1.webp"),
    require("../../assets/art/tiles/hmellow_cell2.webp"),
    require("../../assets/art/tiles/hmellow_cell3.webp"),
    require("../../assets/art/tiles/hmellow_cell4.webp"),
  ], require("../../assets/art/tiles/hmellow_cell_wild.webp"), require("../../assets/art/tiles/hmellow_bomb.webp"),
    require("../../assets/art/tiles/hmellow_cell_pumpkin.webp")),

  classic: tileSet("classic", ART.cells, ART.wild, ART.bomb),
  pastel: tileSet("pastel", [
    require("../../assets/art/tiles/pastel_cell0.webp"), require("../../assets/art/tiles/pastel_cell1.webp"), require("../../assets/art/tiles/pastel_cell2.webp"),
    require("../../assets/art/tiles/pastel_cell3.webp"), require("../../assets/art/tiles/pastel_cell4.webp"),
  ], require("../../assets/art/tiles/pastel_cell_wild.webp"), require("../../assets/art/tiles/pastel_bomb.webp")),
  wax: tileSet("wax", [
    require("../../assets/art/tiles/wax_cell0.webp"), require("../../assets/art/tiles/wax_cell1.webp"), require("../../assets/art/tiles/wax_cell2.webp"),
    require("../../assets/art/tiles/wax_cell3.webp"), require("../../assets/art/tiles/wax_cell4.webp"),
  ], require("../../assets/art/tiles/wax_cell_wild.webp"), require("../../assets/art/tiles/wax_bomb.webp")),
  hpastel: tileSet("hpastel", [
    require("../../assets/art/tiles/hpastel_cell0.webp"), require("../../assets/art/tiles/hpastel_cell1.webp"), require("../../assets/art/tiles/hpastel_cell2.webp"),
    require("../../assets/art/tiles/hpastel_cell3.webp"), require("../../assets/art/tiles/hpastel_cell4.webp"),
  ], require("../../assets/art/tiles/hpastel_cell_wild.webp"), require("../../assets/art/tiles/hpastel_bomb.webp"),
    require("../../assets/art/tiles/hpastel_cell_pumpkin.webp")),
  hwax: tileSet("hwax", [
    require("../../assets/art/tiles/hwax_cell0.webp"), require("../../assets/art/tiles/hwax_cell1.webp"), require("../../assets/art/tiles/hwax_cell2.webp"),
    require("../../assets/art/tiles/hwax_cell3.webp"), require("../../assets/art/tiles/hwax_cell4.webp"),
  ], require("../../assets/art/tiles/hwax_cell_wild.webp"), require("../../assets/art/tiles/hwax_bomb.webp"),
    require("../../assets/art/tiles/hwax_cell_pumpkin.webp")),
  hbright: tileSet("hbright", [
    require("../../assets/art/tiles/hbright_cell0.webp"), require("../../assets/art/tiles/hbright_cell1.webp"), require("../../assets/art/tiles/hbright_cell2.webp"),
    require("../../assets/art/tiles/hbright_cell3.webp"), require("../../assets/art/tiles/hbright_cell4.webp"),
  ], require("../../assets/art/tiles/hbright_cell_wild.webp"), require("../../assets/art/tiles/hbright_bomb.webp"),
    require("../../assets/art/tiles/hbright_cell_pumpkin.webp")),
};
export type TileSetId = keyof typeof TILE_SETS;
/** during the Halloween event every style switches to its seasonal version by itself */
const HALLOWEEN: Record<string, TileSetId> = { pastel: "hpastel", wax: "hwax", classic: "hbright", balanced: "hbalanced", mellow: "hmellow" };
export const seasonalTiles = (st: string, halloween: boolean): TileSetId => {
  const selected = st === "soft" ? "mellow" : st === "faceted" ? "balanced" : st;
  return !halloween ? ((Object.prototype.hasOwnProperty.call(TILE_SETS, selected) ? selected : "mellow") as TileSetId) : HALLOWEEN[selected] ?? "hmellow";
};
export function setTileStyle(st: TileSetId) {
  const t = TILE_SETS[st] ?? TILE_SETS.mellow;
  ART.cells = t.cells; ART.wild = t.wild; ART.bomb = t.bomb; ART.pumpkin = t.pumpkin;
}

// Bee body, wing and outfit layers are registered separately in turnArt.ts.
