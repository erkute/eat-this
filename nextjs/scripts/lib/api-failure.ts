/**
 * Shared failure accounting for the content-generation scripts.
 *
 * All three of them (generate-de-descriptions, bootstrap-en-translations,
 * generate-seo-fields) walk a list of documents and call a model per document.
 * Two things must hold for a long unattended run to be trustworthy:
 *
 *  1. A run that failed must not look like a run that succeeded. Failures are
 *     counted, reported at the end, and reflected in the exit code.
 *  2. A rejection that retrying cannot fix must stop the run. Exhausted credit,
 *     a bad key or a revoked permission repeats for every remaining document —
 *     and in generate-de-descriptions each attempt costs a billed Places lookup
 *     *before* the model is called.
 */

/** An API rejection that will repeat identically for every remaining document. */
export class FatalApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FatalApiError';
  }
}

// Matched against the message text because the SDK surfaces these as plain
// 400/401/403 bodies rather than distinct error classes.
const FATAL_API =
  /credit balance is too low|authentication_error|permission_error|invalid x-api-key|invalid_api_key/i;

export function isFatalApiMessage(message: string): boolean {
  return FATAL_API.test(message);
}

export interface RunStats {
  ok: number;
  failed: number;
}

export function newStats(): RunStats {
  return { ok: 0, failed: 0 };
}

/** Logs one failure; throws FatalApiError when the run cannot recover. */
export function noteFailure(stats: RunStats, label: string, e: unknown): void {
  stats.failed++;
  const message = e instanceof Error ? e.message : String(e);
  console.error(`  ✗ ${label}:`, message);
  if (isFatalApiMessage(message)) throw new FatalApiError(message);
}

/** Explains the abort. Re-throws anything that isn't a FatalApiError. */
export function reportFatal(tag: string, e: unknown): void {
  if (!(e instanceof FatalApiError)) throw e;
  console.error(
    `\n[${tag}] ABGEBROCHEN — die API lehnt jede weitere Anfrage genauso ab:\n  ${e.message}\n` +
      '  Jedes verbleibende Dokument würde identisch scheitern. Nach dem Beheben\n' +
      '  denselben Befehl erneut starten — fertige Dokumente werden übersprungen.'
  );
}

/** Final tally. Sets a non-zero exit code when anything failed. */
export function finish(tag: string, stats: RunStats): void {
  console.log(`\n[${tag}] geschrieben ${stats.ok} · fehlgeschlagen ${stats.failed}`);
  if (stats.failed > 0) process.exitCode = 1;
}
