'use client';

import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';

// Client wrapper so we can pass function props (onError, getMessageFallback)
// that can't be serialized from a server component. Silencing onError stops
// next-intl from console.error-ing when legacy JS reads a key that contains
// ICU placeholders (e.g. "Hey {name}") without providing values — our
// tWrapped in I18nContext falls back to the raw string in that case.
export default function ClientIntlProvider({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: AbstractIntlMessages;
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={() => {}}
      getMessageFallback={({ key, namespace }) =>
        namespace ? `${namespace}.${key}` : key
      }
    >
      {children}
    </NextIntlClientProvider>
  );
}
