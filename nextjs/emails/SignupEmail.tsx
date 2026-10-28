import { Section, Link, Img } from '@react-email/components';
import { Shell } from './components/Shell';
import { ResponsiveArt, CtaButton, LinkNote } from './components/Pieces';
import { ART } from './art.generated';
import { EMAIL_SPOTS } from './spots.generated';
import type { MailLocale } from './locale';
export interface SignupEmailProps {magicLink:string;appUrl:string;locale:MailLocale}
export const SIGNUP_SUBJECT:Record<MailLocale,string>={de:'Dein Anmeldelink für Eat This',en:'Your Eat This sign-in link'};
export default function SignupEmail({magicLink,appUrl,locale}:SignupEmailProps){
 const en=locale==='en';
 return <Shell appUrl={appUrl} locale={locale} preview={en?'20 additional Must Eats for your collection.':'20 zusätzliche Must Eats für deine Sammlung.'}>
  <ResponsiveArt desktop={en?ART.introSignupEn:ART.introSignup} mobile={en?ART.introSignupEnMobile:ART.introSignupMobile} appUrl={appUrl} />
  <Section className="et-pad" style={{padding:'0 32px'}}>
   <CtaButton href={magicLink} art={en?ART.ctaSignupEn:ART.cta} appUrl={appUrl} />
   <LinkNote href={magicLink} locale={locale} />
   <ResponsiveArt desktop={en?ART.spotHeadingEn:ART.spotHeading} mobile={en?ART.spotHeadingEnMobile:ART.spotHeadingMobile} appUrl={appUrl} />
   {EMAIL_SPOTS.slice(0,3).map(spot=><Link key={spot.slug} href={`${appUrl}${en?'/en':''}/map?r=${spot.slug}`} style={{display:'block',margin:'0 0 16px',textDecoration:'none'}}><Img src={`${appUrl}/pics/email/spots/${spot.slug}.jpg?v=${spot.version}`} alt={`${spot.name} — ${spot.meta}, Must Eat`} width={536} style={{display:'block',width:'100%',height:'auto',border:0,color:'#15120e',fontSize:14}} /></Link>)}
  </Section>
 </Shell>;
}
