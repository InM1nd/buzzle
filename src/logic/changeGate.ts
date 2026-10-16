/** Forward a value only when it differs from the last one sent. Used for per-frame native Animated.setValue calls:
 *  every call is a JS→native round trip, so unchanged values (pillar gaps, hidden slots, bat frames) must not be re-sent. */
export interface Gate { (n: number): boolean; last(): number }
export function changeGate(initial: number, send: (n: number) => void): Gate {
  let last = initial;
  const g = ((n: number) => {
    if (n === last) return false;
    last = n;
    send(n);
    return true;
  }) as Gate;
  g.last = () => last;
  return g;
}
