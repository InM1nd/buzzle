import { applyPath, createBoard, findBestPath, Board } from "../src/logic/board";
import { dailySeed } from "../src/logic/day";
import { neighbors } from "../src/logic/hex";
import { canExtend } from "../src/logic/board";
import { Rng } from "../src/logic/rng";

function casual(b: Board, rng: Rng) {
  // pick random start, extend randomly up to 3..7
  for (let t = 0; t < 200; t++) {
    const path = [{ c: rng.int(7), r: rng.int(8) }];
    const target = 3 + rng.int(5);
    while (path.length < target) {
      const last = path[path.length - 1];
      const opts = neighbors(last.c, last.r).filter((n) => canExtend(b, path, n));
      if (!opts.length) break;
      path.push(opts[rng.int(opts.length)]);
    }
    if (path.length >= 3) return path;
  }
  return findBestPath(b);
}
function play(seed: number, greedy: boolean) {
  let b = createBoard(seed); let score = 0; let combo = 0; const rng = new Rng(seed ^ 77);
  for (let m = 0; m < 20; m++) {
    const p = greedy ? findBestPath(b, 10, 4000) : casual(b, rng);
    const r = applyPath(b, p, undefined, combo);
    combo = p.length >= 5 ? combo + 1 : 0;
    score += r.score; b = r.board;
  }
  return score;
}
const g: number[] = [], c: number[] = [];
for (let d = 20700; d < 20740; d++) { g.push(play(dailySeed(d), true)); c.push(play(dailySeed(d), false)); }
const q = (a: number[], p: number) => a.slice().sort((x, y) => x - y)[Math.floor(p * (a.length - 1))];
console.log("greedy p10/50/90", q(g, .1), q(g, .5), q(g, .9));
console.log("casual p10/50/90", q(c, .1), q(c, .5), q(c, .9));
