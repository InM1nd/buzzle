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
  bgTile: require("../../assets/art/bg_tile.webp"),
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
};

/** v1.6 puzzle tile styles (Settings). setTileStyle swaps ART.cells / wild / bomb / pumpkin in place, so every screen that draws
 * tiles follows; App re-mounts the tree on a change (like the language). Calm sets: scripts/import_tile_styles.py */
const tileSet = (st: string, cells: number[], wild: number, bomb: number, pumpkin: number = ART.pumpkin) => ({ st, cells, wild, bomb, pumpkin });
export const TILE_SETS = {
  classic: tileSet("classic", ART.cells, ART.wild, ART.bomb),
  soft: tileSet("soft", [
    require("../../assets/art/tiles/soft_cell0.webp"), require("../../assets/art/tiles/soft_cell1.webp"), require("../../assets/art/tiles/soft_cell2.webp"),
    require("../../assets/art/tiles/soft_cell3.webp"), require("../../assets/art/tiles/soft_cell4.webp"),
  ], require("../../assets/art/tiles/soft_cell_wild.webp"), require("../../assets/art/tiles/soft_bomb.webp")),
  pastel: tileSet("pastel", [
    require("../../assets/art/tiles/pastel_cell0.webp"), require("../../assets/art/tiles/pastel_cell1.webp"), require("../../assets/art/tiles/pastel_cell2.webp"),
    require("../../assets/art/tiles/pastel_cell3.webp"), require("../../assets/art/tiles/pastel_cell4.webp"),
  ], require("../../assets/art/tiles/pastel_cell_wild.webp"), require("../../assets/art/tiles/pastel_bomb.webp")),
  wax: tileSet("wax", [
    require("../../assets/art/tiles/wax_cell0.webp"), require("../../assets/art/tiles/wax_cell1.webp"), require("../../assets/art/tiles/wax_cell2.webp"),
    require("../../assets/art/tiles/wax_cell3.webp"), require("../../assets/art/tiles/wax_cell4.webp"),
  ], require("../../assets/art/tiles/wax_cell_wild.webp"), require("../../assets/art/tiles/wax_bomb.webp")),
  hsoft: tileSet("hsoft", [
    require("../../assets/art/tiles/hsoft_cell0.webp"), require("../../assets/art/tiles/hsoft_cell1.webp"), require("../../assets/art/tiles/hsoft_cell2.webp"),
    require("../../assets/art/tiles/hsoft_cell3.webp"), require("../../assets/art/tiles/hsoft_cell4.webp"),
  ], require("../../assets/art/tiles/hsoft_cell_wild.webp"), require("../../assets/art/tiles/hsoft_bomb.webp"),
    require("../../assets/art/tiles/hsoft_cell_pumpkin.webp")),
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
const HALLOWEEN: Record<string, TileSetId> = { soft: "hsoft", pastel: "hpastel", wax: "hwax", classic: "hbright" };
export const seasonalTiles = (st: string, halloween: boolean): TileSetId =>
  !halloween ? ((st in TILE_SETS ? st : "soft") as TileSetId) : HALLOWEEN[st] ?? "hsoft";
export function setTileStyle(st: TileSetId) {
  const t = TILE_SETS[st] ?? TILE_SETS.soft;
  ART.cells = t.cells; ART.wild = t.wild; ART.bomb = t.bomb; ART.pumpkin = t.pumpkin;
}

// Bee body, wing and outfit layers are registered separately in turnArt.ts.
