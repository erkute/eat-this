import { envNumber } from '@/lib/env';
import type { RateLimits } from '@/lib/rateLimit';

// Remy's limits are a question of money: every answer costs Anthropic credit. A
// daily limit per person and one for everyone together cap the spend. The
// environment variables change the numbers without a code deploy.

/** Per chat session: catches one visitor's UI spamming. */
export function sessionLimitsFromEnv(): RateLimits {
  return {
    perMinute: envNumber(process.env.BUDDY_RATE_LIMIT_PER_MIN, 5),
    perDay: envNumber(process.env.BUDDY_RATE_LIMIT_PER_DAY, 10),
  };
}

/**
 * Per IP: the real abuse guard, because the session id is set by the client.
 * As high as the session limit ("10 per person"); visitors behind the same
 * mobile NAT share the 10, which is accepted.
 */
export function ipLimitsFromEnv(): RateLimits {
  return {
    perMinute: envNumber(process.env.BUDDY_RATE_LIMIT_IP_PER_MIN, 5),
    perDay: envNumber(process.env.BUDDY_RATE_LIMIT_IP_PER_DAY, 10),
  };
}

/**
 * Across all visitors: the cap that no change of IP or session gets around.
 * Checked last, so a request that fails a personal limit uses none of it.
 */
export function globalLimitsFromEnv(): RateLimits {
  return {
    perMinute: envNumber(process.env.BUDDY_RATE_LIMIT_GLOBAL_PER_MIN, 20),
    perDay: envNumber(process.env.BUDDY_RATE_LIMIT_GLOBAL_PER_DAY, 50),
  };
}
