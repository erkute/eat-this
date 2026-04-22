import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';
import { translations } from '@/lib/i18n/translations';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: translations[locale] as unknown as Record<string, unknown>,
    // Fall back to key path when a message is missing (matches legacy behaviour
    // so partially-migrated raw-HTML modals don't explode).
    getMessageFallback: ({ key, namespace }) =>
      namespace ? `${namespace}.${key}` : key,
    onError: () => {},
  };
});
