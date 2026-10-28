import { Section } from '@react-email/components';
import { Shell } from './components/Shell';
import { ResponsiveArt, CtaButton, LinkNote } from './components/Pieces';
import { ART } from './art.generated';
import type { MailLocale } from './locale';
export interface LoginEmailProps {magicLink:string;appUrl:string;locale:MailLocale}
export const LOGIN_SUBJECT:Record<MailLocale,string>={de:'Dein Login-Link für Eat This',en:'Your Eat This sign-in link'};
export default function LoginEmail({magicLink,appUrl,locale}:LoginEmailProps){
 const en=locale==='en';
 return <Shell appUrl={appUrl} locale={locale} preview={en?'One click and you’re back.':'Ein Klick und du bist wieder da.'}>
  <ResponsiveArt desktop={en?ART.introLoginEn:ART.introLogin} mobile={en?ART.introLoginEnMobile:ART.introLoginMobile} appUrl={appUrl} />
  <Section className="et-pad" style={{padding:'0 32px'}}>
   <CtaButton href={magicLink} art={en?ART.ctaEn:ART.cta} appUrl={appUrl} />
   <LinkNote href={magicLink} locale={locale} />
  </Section>
 </Shell>;
}
