/** Freezes Cocoa Sort levels into src/logic/cocoaLevels.json, so level N never changes for players and nothing is
 *  searched on the phone. Run: npx tsx scripts/gen_cocoa_levels.ts */
import { writeFileSync } from "node:fs";
import { encodeLevel, level } from "../src/logic/cocoaSort";

const COUNT = 300;
writeFileSync("src/logic/cocoaLevels.json", JSON.stringify(Array.from({ length: COUNT }, (_, n) => encodeLevel(level(n)))) + "\n");
