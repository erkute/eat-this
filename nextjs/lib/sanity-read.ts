import 'server-only';
import { createClient, type FilteredResponseQueryOptions, type QueryParams } from '@sanity/client';
import { client } from './sanity';

/** Retry a read once after a socket timeout, which get-it does not retry in RSC.
 * Keep cache tags and cancellation on both attempts; never retry mutations.
 * The extra attempt disables SDK retries so a timeout cannot start another retry chain. */
export async function readSanity<T>(
  query: string,
  params: QueryParams = {},
  options?: FilteredResponseQueryOptions
): Promise<T> {
  try {
    return await client.fetch<T>(query, params, options);
  } catch (error) {
    const timeout = error instanceof Error && (
      ('code' in error && (error.code === 'ESOCKETTIMEDOUT' || error.code === 'ETIMEDOUT')) ||
      /^(Socket|Request) timed out on request to /.test(error.message)
    );
    if (!timeout || options?.signal?.aborted) throw error;
    return createClient({ ...client.config(), maxRetries: 0 }).fetch<T>(query, params, options);
  }
}
