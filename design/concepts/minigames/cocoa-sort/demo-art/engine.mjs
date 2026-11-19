export const complete = cup => cup.length === 4 && cup.every(c => c === cup[0]);
export const won = cups => cups.every(c => !c.length || complete(c));
export function pour(cups, from, to) {
  const a = cups[from], b = cups[to];
  if (!a || !b || from === to || !a.length || complete(a) || b.length >= 4 || (b.length && b.at(-1) !== a.at(-1))) return null;
  let count = 1;
  while (count < a.length && a.at(-count - 1) === a.at(-1)) count++;
  count = Math.min(count, 4 - b.length);
  const next = cups.map(c => [...c]);
  next[to].push(...next[from].splice(-count));
  return {cups: next, count, color: a.at(-1)};
}
export function createGame(level) {
  let cups, moves, undos, added, history;
  function reset() {cups=level.initialBottomToTop.map(c=>[...c]);moves=0;undos=3;added=false;history=[];}
  reset();
  return {
    snapshot: () => ({cups:cups.map(c=>[...c]),moves,undos,added,won:won(cups)}),
    move(from,to) {
      if(won(cups)) return null;
      const result=pour(cups,from,to);if(!result)return null;
      history.push({cups:cups.map(c=>[...c]),moves});cups=result.cups;moves++;return result;
    },
    undo(){if(!undos||!history.length)return false;const last=history.pop();cups=last.cups;moves=last.moves;undos--;return true;},
    add(){if(added||won(cups))return false;cups.push([]);added=true;history=[];return true;},
    reset
  };
}
