// Single source of truth for environment gating. Reads NEXT_PUBLIC_ENV at
// module-load time; bundlers inline it into client code, server SSR sees
// the runtime value. Defaults to 'production' so missing config is safe.
const RAW = process.env.NEXT_PUBLIC_ENV ?? 'production';

export const isStaging = RAW === 'staging';

/** A positive number from an environment variable, or the fallback. */
export function envNumber(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
