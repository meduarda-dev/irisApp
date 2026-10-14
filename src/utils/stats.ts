export type Stats = { mean: number; median: number; p95: number; std: number };

export function summarize(xs: number[]): Stats {
  const n = xs.length;
  if (n === 0) return { mean: 0, median: 0, p95: 0, std: 0 };
  const sorted = [...xs].sort((a, b) => a - b);
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const median =
    n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const p95 = sorted[Math.min(n - 1, Math.ceil(0.95 * n) - 1)];
  const variance =
    n > 1 ? xs.reduce((a, x) => a + (x - mean) ** 2, 0) / (n - 1) : 0;
  return { mean, median, p95, std: Math.sqrt(variance) };
}