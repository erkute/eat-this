// "Empfohlen von Eat This" badge image — a small, brand-styled PNG that listed
// restaurants embed on their own site (linking back to their /restaurant/<slug>
// page). The backlink is the SEO payload; this image is the carrot that makes a
// restaurant want to embed it. Mirrors the restaurant OG route's font/logo
// pipeline (Satori knows no system fonts, resvg can't decode the WebP logo), but
// stays PNG so the rounded card keeps its transparent corners on any background.
//
// Generic by design — the per-restaurant identity lives in the wrapping <a href>,
// not the image, so a single CDN-cached asset serves every embed. `?lang=en`
// switches the eyebrow to "Featured on".

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

const WIDTH = 520;
const HEIGHT = 150;

let fontPromise: Promise<Buffer> | null = null;
function loadFont() {
  fontPromise ??= readFile(
    join(process.cwd(), 'assets', 'fonts', 'SairaCondensed-ExtraBold.ttf'),
  );
  return fontPromise;
}

// The Eat This wordmark — WebP can't be decoded by resvg, so the PNG variant
// (the one the emails use) is inlined as a data URI, ships with the app.
let logoPromise: Promise<string> | null = null;
function loadLogo() {
  logoPromise ??= readFile(
    join(process.cwd(), 'public', 'pics', 'email', 'eat-this-logo.png'),
  ).then(buf => `data:image/png;base64,${buf.toString('base64')}`);
  return logoPromise;
}

export async function GET(request: Request) {
  const lang = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'de';
  const eyebrow = lang === 'en' ? 'FEATURED ON' : 'EMPFOHLEN VON';

  const [saira, logo] = await Promise.all([loadFont(), loadLogo()]);

  const png = new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Saira Condensed',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            backgroundColor: '#fff8ec',
            border: '4px solid #a02814',
            borderRadius: 24,
            padding: '22px 36px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: '#ffd84a',
                marginRight: 14,
              }}
            />
            <div
              style={{
                display: 'flex',
                color: '#a02814',
                fontSize: 30,
                letterSpacing: 6,
                textTransform: 'uppercase',
              }}
            >
              {eyebrow}
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={158} height={63} alt="" />
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [{ name: 'Saira Condensed', data: saira, weight: 800, style: 'normal' }],
    },
  );

  return new Response(new Uint8Array(await png.arrayBuffer()), {
    headers: {
      'Content-Type': 'image/png',
      // Long CDN cache — the badge is static brand art, it never changes.
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800',
    },
  });
}
