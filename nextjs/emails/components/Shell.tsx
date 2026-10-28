import { Body, Container, Head, Html, Preview, Section, Text, Link } from '@react-email/components';
import { ART } from '../art.generated';
import { ArtImage } from './Pieces';
import { COLOR, BODY_FONT, EMAIL_ASSET_VERSION } from '../theme';
import type { MailLocale } from '../locale';

export function Shell({preview,appUrl,locale,children}:{preview:string;appUrl:string;locale:MailLocale;children:React.ReactNode}) {
 const en=locale==='en';
 const links=[
  {art:en?ART.footerImpressumEn:ART.footerImpressum,path:'/impressum'},
  {art:en?ART.footerDatenschutzEn:ART.footerDatenschutz,path:'/datenschutz'},
  {art:en?ART.footerContactEn:ART.footerContact,path:'/contact'},
 ];
 return <Html lang={locale}><Head>
  <meta name="color-scheme" content="light" /><meta name="supported-color-schemes" content="light" />
  <style>{`:root{color-scheme:light only;supported-color-schemes:light only} @media only screen and (max-width:600px){.et-pad{padding-left:24px!important;padding-right:24px!important}.et-desktop-art{display:none!important}.et-mobile-art{display:block!important;max-height:none!important;overflow:visible!important}}`}</style>
 </Head><Preview>{preview}</Preview><Body style={{margin:0,padding:0,fontFamily:BODY_FONT,color:COLOR.text,backgroundColor:COLOR.raised}}>
 <Container style={{maxWidth:600,width:'100%',margin:'0 auto',backgroundColor:COLOR.surface,backgroundImage:`url(${appUrl}/pics/email/mail-paper.png?v=${EMAIL_ASSET_VERSION})`,backgroundSize:'100% 100%',backgroundRepeat:'no-repeat'}}>
 {children}
 <Section className="et-pad" style={{padding:'24px 32px 32px'}}>
  <ArtImage art={en?ART.footerBrandEn:ART.footerBrand} appUrl={appUrl} style={{width:160,margin:'0 auto 16px'}} />
  <Text style={{fontSize:12,lineHeight:1.35,margin:'26px 0',color:COLOR.text}}>{en?'If you didn’t request this link, you can simply delete this email.':'Falls du diesen Link nicht angefordert hast, kannst du diese E-Mail einfach löschen.'}</Text>
  <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}><tbody><tr>{links.map(({art,path})=><td key={path} width="33.33%" style={{padding:0}}><Link href={`${appUrl}${en?'/en':''}${path}`} style={{display:'block',textDecoration:'none',color:COLOR.text}}><ArtImage art={art} appUrl={appUrl} /></Link></td>)}</tr></tbody></table>
 </Section></Container></Body></Html>;
}
