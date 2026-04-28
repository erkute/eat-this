import type { Metadata } from 'next';

export const metadata: Metadata = {
  title:   'Anmeldung — Eat This',
  robots:  { index: false, follow: false },
};

export default function AuthActionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#F7F2E8' }}>
        {children}
      </body>
    </html>
  );
}
