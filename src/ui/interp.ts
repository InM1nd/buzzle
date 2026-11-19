/** Piecewise-linear map like Animated `interpolate` (inputRange ascending; outside it: "extend" or "clamp"). */
export function interp(x: number, inR: readonly number[], outR: readonly number[], clamp = false): number {
  const n = inR.length;
  if (clamp) x = Math.min(inR[n - 1], Math.max(inR[0], x));
  let i = 1;
  while (i < n - 1 && x > inR[i]) i++;
  const a = inR[i - 1], b = inR[i];
  if (b === a) return x > a ? outR[i] : outR[i - 1];
  return outR[i - 1] + ((x - a) / (b - a)) * (outR[i] - outR[i - 1]);
}
