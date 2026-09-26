import SiteChrome from './SiteChrome';

/* Die Schriften kommen aus den @font-face-Regeln in globals.css, das auch eine
   gestreamte notFound()-Antwort lädt — kein eigener Kit-Link nötig. */
export default function NotFoundAppFrame({ children }: { children: React.ReactNode }) {
  return (
    <SiteChrome appPages remy={false}>
      {children}
    </SiteChrome>
  );
}
