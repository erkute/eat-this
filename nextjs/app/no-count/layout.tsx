import { ERROR_THEME_BOOTSTRAP } from '@/lib/theme';
import { toolLocale } from './locale';

/** A stable document keeps the saved theme when a Server Action updates the page. */
export default async function NoCountLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={await toolLocale()} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ERROR_THEME_BOOTSTRAP }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
