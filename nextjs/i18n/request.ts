import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';
import { getCatalogMessages } from '@/lib/i18n/translations';
import { getPackContents } from '@/lib/sanity.server';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const { allBerlin } = await getPackContents();

  return {
    locale,
    timeZone: 'Europe/Berlin',
    messages: getCatalogMessages(locale, allBerlin.mustEats),
    // Fall back to key path when a message is missing (matches legacy behaviour
    // so partially-migrated raw-HTML modals don't explode).
    getMessageFallback: ({ key, namespace }) =>
      namespace ? `${namespace}.${key}` : key,
    onError: () => {},
  };
});
