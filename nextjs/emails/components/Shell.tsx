import { Body, Container, Head, Html, Preview, Section, Text, Link } from '@react-email/components';
import { ART } from '../art.generated';
import { ArtImage } from './Pieces';
import { COLOR, BODY_FONT, EMAIL_ASSET_VERSION } from '../theme';
import type { MailLocale } from '../locale';

export function Shell({preview,appUrl,locale,children}:{preview:string;appUrl:string;locale:MailLocale;children:React.ReactNode}) {
 const en=locale==='en';
 const linkRows=[[
  {art:en?ART.footerAboutEn:ART.footerAbout,path:'/about'},
  {art:en?ART.footerContactEn:ART.footerContact,path:'/contact'},
 ],[
  {art:en?ART.footerImpressumEn:ART.footerImpressum,path:'/impressum'},
  {art:en?ART.footerDatenschutzEn:ART.footerDatenschutz,path:'/datenschutz'},
  {art:en?ART.footerAgbEn:ART.footerAgb,path:'/agb'},
 ]];
 return <Html lang={locale}><Head>
  <meta name="color-scheme" content="light" /><meta name="supported-color-schemes" content="light" />
  <style>{`:root{color-scheme:light only;supported-color-schemes:light only} @media only screen and (max-width:600px){.et-pad{padding-left:24px!important;padding-right:24px!important}.et-desktop-art{display:none!important}.et-mobile-art{display:block!important;max-height:none!important;overflow:visible!important}.et-footer-brand{width:238px!important;max-width:100%!important}}`}</style>
 </Head><Preview>{preview}</Preview><Body style={{margin:0,padding:0,fontFamily:BODY_FONT,color:COLOR.text,backgroundColor:COLOR.raised}}>
 <Container style={{maxWidth:600,width:'100%',margin:'0 auto',backgroundColor:COLOR.surface,backgroundImage:`url(${appUrl}/pics/email/mail-paper.png?v=${EMAIL_ASSET_VERSION})`,backgroundSize:'100% 100%',backgroundRepeat:'no-repeat'}}>
 {children}
 <Section className="et-pad" style={{padding:'32px 32px',textAlign:'center'}}>
  <table role="presentation" align="center" width={420} className="et-footer-brand" cellPadding={0} cellSpacing={0} style={{width:'100%',maxWidth:420,margin:'0 auto'}}><tbody><tr><td align="center" style={{padding:0}}>
   <Link href={`${appUrl}${en?'/en':'/'}`} style={{display:'block',textDecoration:'none',color:COLOR.text}}><ArtImage art={ART.footerBrand} appUrl={appUrl} /></Link>
  </td></tr></tbody></table>
  <table role="presentation" align="center" cellPadding={0} cellSpacing={0} style={{margin:'12px auto'}}><tbody><tr><td align="center" style={{padding:0}}>
   <Link href="https://www.instagram.com/eatthisdotcom/" style={{display:'block',padding:8,textDecoration:'none',color:COLOR.text}}><ArtImage art={ART.footerInstagram} appUrl={appUrl} style={{width:28}} /></Link>
  </td></tr></tbody></table>
  {linkRows.map((links,index)=><table key={index} role="presentation" align="center" cellPadding={0} cellSpacing={0} style={{margin:'0 auto'}}><tbody><tr>{links.map(({art,path})=><td key={path} align="center" style={{padding:0}}>
   <Link href={`${appUrl}${en?'/en':''}${path}`} style={{display:'block',padding:'12px 10px',textDecoration:'none',color:COLOR.text}}><ArtImage art={art} appUrl={appUrl} style={{width:art.width}} /></Link>
  </td>)}</tr></tbody></table>)}
  <Text style={{fontSize:12,lineHeight:1.5,margin:'12px 0 0',textAlign:'center',color:COLOR.muted}}>© 2026 Eat This. {en?'All rights reserved.':'Alle Rechte vorbehalten.'}</Text>
  <Text style={{fontSize:12,lineHeight:1.5,margin:'20px 0 0',textAlign:'center',color:COLOR.muted}}>{en?'If you didn’t request this link, you can simply delete this email.':'Falls du diesen Link nicht angefordert hast, kannst du diese E-Mail einfach löschen.'}</Text>
 </Section></Container></Body></Html>;
}
