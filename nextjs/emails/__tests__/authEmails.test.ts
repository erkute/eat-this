import { describe, it, expect } from 'vitest';
import { renderEmail } from '../render';
import SignupEmail from '../SignupEmail';
import LoginEmail from '../LoginEmail';
import { ART, BRAND_FACE_AVAILABLE } from '../art.generated';
import { existsSync } from 'node:fs';
const magicLink='https://example.test/verify?oobCode=test-code&mode=signIn';
const appUrl='https://www.eatthisdot.com';
const variants=()=>Promise.all(['de','en'].flatMap(locale=>[SignupEmail,LoginEmail].map(component=>renderEmail(component({magicLink,appUrl,locale:locale as 'de'|'en'})))));
describe('approved paper auth emails',()=>{
 it('keeps the real sign-in link usable when images are blocked',async()=>{
  for(const html of await variants()){
   const cta=html.match(/<a[^>]*background-color:#ffc600[^>]*>[\s\S]*?<\/a>/i)?.[0];
   expect(cta).toBeTruthy();expect(cta).toContain('oobCode=test-code');expect(cta).toMatch(/alt="(Anmelden|Sign up|Sign in)"/);
   expect(html).toMatch(/>Anmeldelink öffnen<|>Open sign-in link</);expect(html).toContain(html.includes('lang="en"')?'one hour':'eine Stunde');
   for(const img of html.match(/<img[^>]*>/g)??[]){expect(img).toMatch(/alt="[^"]+"/);expect(img).toContain('color:#15120e');expect(img).not.toMatch(/\sheight="/);expect(img).toMatch(/\swidth="\d+"/);}
  }
 });
 it('renders every design asset locally with the real brand face',()=>{
  expect(BRAND_FACE_AVAILABLE).toBe(true);
  for(const art of Object.values(ART))expect(existsSync(`public/pics/email/${art.id}.png`)).toBe(true);
 });
 it('uses PNGs, safe mail markup and versioned artwork in DE and EN',async()=>{
  for(const html of await variants()){
   expect(html).toContain('mail-paper.png?v=');expect(html).not.toMatch(/\.webp|@font-face|position\s*:|(?<![a-z-])transform\s*:|box-shadow\s*:|\/api\/email\//i);
   for(const src of html.match(/src="[^"]*\/pics\/email\/[^"]*"/g)??[])expect(src).toMatch(/\?v=[a-z0-9]+"/);
   expect(Buffer.byteLength(html)).toBeLessThan(100_000);
  }
 });
 it('keeps signup and login distinct, with phone-specific compositions',async()=>{
  const [signup,login,enSignup,enLogin]=await variants();
  expect(signup).toContain('20 zusätzliche Must Eats');expect(signup).toContain('spot-heading.png');
  expect(signup).toContain('We tell you what to eat.');
  expect(signup).toContain('/pics/email/spots/');
  expect(signup).toContain('/map?r=');expect(signup).toContain('intro-signup-mobile.png');
  expect(login).not.toContain('/pics/email/spots/');expect(login).not.toContain('20 zusätzliche');expect(login).toContain('Schön, dass du wieder da bist.');
  expect(enSignup).toContain('20 additional Must Eats');expect(enSignup).toContain('alt="Sign up"');expect(enLogin).toContain('alt="Sign in"');
  for(const html of [enSignup,enLogin]){expect(html).toContain('lang="en"');expect(html).not.toMatch(/Anmelden|Anmeldelink|Datenschutz|Stunde/);expect(html).toContain('/en/datenschutz');}
 });
});
