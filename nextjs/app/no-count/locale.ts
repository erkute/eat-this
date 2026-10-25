import { headers } from 'next/headers';

export async function toolLocale() {
  return (await headers()).get('x-eatthis-no-count-locale') === 'en' ? 'en' : 'de';
}
