// "Empfohlen von Eat This" badge image — a small, brand-styled PNG that listed
// restaurants embed on their own site (linking back to their /restaurant/<slug>
// page). The backlink is the SEO payload; this image is the carrot that makes a
// restaurant want to embed it.
//
// Visual language mirrors the home hero: brand-red surface, cream Schoolbell
// kicker, the Eat This wordmark — the same red-bar/red-button look the landing
// uses. Reuses the restaurant OG route's font/logo pipeline (Satori knows no
// system fonts, resvg can't decode the WebP logo), but stays PNG so the rounded
// card keeps transparent corners on any host background.
//
// Generic by design — the per-restaurant identity lives in the wrapping <a href>,
// not the image, so a single CDN-cached asset serves every embed. `?lang=en`
// switches the kicker to "Featured on".

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

const WIDTH = 540;
const HEIGHT = 170;

let fontPromise: Promise<Buffer> | null = null;
function loadFont() {
  // Schoolbell is the brand display face (the home kicker/headline font).
  fontPromise ??= readFile(
    join(process.cwd(), 'assets', 'fonts', 'Schoolbell-Regular.ttf'),
  );
  return fontPromise;
}

// The Eat This wordmark — WebP can't be decoded by resvg, so the PNG variant
// (the one the emails use: cream fill, black outline) is inlined as a data URI.
// Its cream fill reads cleanly on the red card, just like the home top bar.
let logoPromise: Promise<string> | null = null;
function loadLogo() {
  logoPromise ??= readFile(
    join(process.cwd(), 'public', 'pics', 'email', 'eat-this-logo.png'),
  ).then(buf => `data:image/png;base64,${buf.toString('base64')}`);
  return logoPromise;
}

export async function GET(request: Request) {
  const lang = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'de';
  const kicker = lang === 'en' ? 'FEATURED ON' : 'EMPFOHLEN VON';

  const [schoolbell, logo] = await Promise.all([loadFont(), loadLogo()]);

  const png = new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Schoolbell',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: '#a02814',
            borderRadius: 22,
            padding: '26px 52px 30px',
          }}
        >
          <div
            style={{
              display: 'flex',
              color: '#fbf8ee',
              fontSize: 30,
              letterSpacing: 4,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            {kicker}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={184} height={75} alt="" />
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [{ name: 'Schoolbell', data: schoolbell, weight: 400, style: 'normal' }],
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
