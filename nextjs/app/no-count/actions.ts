'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NO_COUNT_COOKIE } from '@/lib/analytics/noCount';

/** A native form also works before hydration or with JavaScript disabled.
 * Next's Server Action origin check protects the choice from foreign forms. */
export async function setCounting(form: FormData): Promise<never> {
  const choice = form.get('choice');
  if (choice !== 'exclude' && choice !== 'include') throw new Error('Invalid counting choice');
  const path = form.get('locale') === 'en' ? '/en/no-count' : '/no-count';
  const jar = await cookies();
  // Readable by GA's client-side opt-out gate; same scope as the admin switch.
  jar.set(NO_COUNT_COOKIE, choice === 'exclude' ? '1' : '', {
    path: '/',
    maxAge: choice === 'exclude' ? 31536000 : 0,
    sameSite: 'lax',
  });
  redirect(`${path}?choice=${choice}`);
}
