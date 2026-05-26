/* reCAPTCHA Enterprise v3 (score-based) server-side verification.
 *
 * Gracefully degrades: if the three env vars are not all set, verify()
 * returns `{ enabled: false, ok: true }` and the caller skips the check.
 * This lets us ship the bot-protection layer before the GCP key is in
 * place — a honeypot + time-gate + per-IP rate-limit still apply. */

const RECAPTCHA_ENDPOINT = 'https://recaptchaenterprise.googleapis.com/v1'

interface VerifyOptions {
  token: string
  /** Action name passed by the client when fetching the token. Must match
   *  whatever the client called `grecaptcha.enterprise.execute(key, { action })` with. */
  expectedAction: string
  /** Minimum acceptable score (0.0 = bot, 1.0 = human). Default 0.5. */
  minScore?: number
}

export type VerifyResult =
  | { enabled: false; ok: true }
  | { enabled: true; ok: true; score: number }
  | { enabled: true; ok: false; reason: 'no_token' | 'bad_action' | 'low_score' | 'invalid_token' | 'api_error'; score?: number }

export async function verifyRecaptcha({ token, expectedAction, minScore = 0.5 }: VerifyOptions): Promise<VerifyResult> {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  const projectId = process.env.RECAPTCHA_PROJECT_ID
  const apiKey = process.env.RECAPTCHA_API_KEY

  if (!siteKey || !projectId || !apiKey) {
    return { enabled: false, ok: true }
  }

  if (!token) {
    return { enabled: true, ok: false, reason: 'no_token' }
  }

  const url = `${RECAPTCHA_ENDPOINT}/projects/${projectId}/assessments?key=${apiKey}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: { token, siteKey, expectedAction },
      }),
    })

    if (!res.ok) {
      console.error('[recaptcha] assessment HTTP error', res.status, await res.text().catch(() => ''))
      return { enabled: true, ok: false, reason: 'api_error' }
    }

    const data = await res.json() as {
      tokenProperties?: { valid?: boolean; action?: string; invalidReason?: string }
      riskAnalysis?: { score?: number }
    }

    if (!data.tokenProperties?.valid) {
      return { enabled: true, ok: false, reason: 'invalid_token' }
    }
    if (data.tokenProperties.action && data.tokenProperties.action !== expectedAction) {
      return { enabled: true, ok: false, reason: 'bad_action' }
    }
    const score = data.riskAnalysis?.score ?? 0
    if (score < minScore) {
      return { enabled: true, ok: false, reason: 'low_score', score }
    }
    return { enabled: true, ok: true, score }
  } catch (err) {
    console.error('[recaptcha] threw', err)
    return { enabled: true, ok: false, reason: 'api_error' }
  }
}
