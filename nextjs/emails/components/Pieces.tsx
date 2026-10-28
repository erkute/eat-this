import { Button, Img, Link, Section, Text } from '@react-email/components';
import type { ArtAsset } from '../art.generated';
import { COLOR } from '../theme';
import type { MailLocale } from '../locale';

export function ArtImage({ art, appUrl, className, style }: {art:ArtAsset;appUrl:string;className?:string;style?:React.CSSProperties}) {
 return <Img className={className} src={`${appUrl}/pics/email/${art.id}.png?v=${art.version}`} alt={art.alt} width={art.width} style={{display:'block',height:'auto',width:'100%',maxWidth:'100%',border:0,color:COLOR.text,fontSize:14,...style}} />;
}

/** Media-query clients get the phone composition; Outlook retains the desktop image. */
export function ResponsiveArt({desktop,mobile,appUrl}:{desktop:ArtAsset;mobile:ArtAsset;appUrl:string}) {
 return <><ArtImage art={desktop} appUrl={appUrl} className="et-desktop-art" /><ArtImage art={mobile} appUrl={appUrl} className="et-mobile-art" style={{display:'none',maxHeight:0,overflow:'hidden',...({msoHide:'all'} as React.CSSProperties)}} /></>;
}

/** Real yellow link, with only its label rendered as an image. */
export function CtaButton({href,art,appUrl}:{href:string;art:ArtAsset;appUrl:string}) {
 return <Button href={href} style={{display:'block',boxSizing:'border-box',width:'100%',padding:'15px 0',borderRadius:28,backgroundColor:COLOR.accent,color:COLOR.text,textAlign:'center',textDecoration:'none'}}>
  <Img src={`${appUrl}/pics/email/${art.id}.png?v=${art.version}`} alt={art.alt} width={art.width} style={{display:'inline-block',verticalAlign:'middle',height:'auto',border:0,color:COLOR.text,fontSize:18,fontWeight:700}} />
 </Button>;
}

export function LinkNote({href,locale}:{href:string;locale:MailLocale}) {
 return <Section><Text style={{margin:'26px 0',fontSize:12,lineHeight:1.35,color:COLOR.text}}>
 {locale==='en'?'The link is valid for one hour.':'Der Link ist eine Stunde gültig.'}<br />
 {locale==='en'?'Button not working? ':'Button funktioniert nicht? '}
 <Link href={href} style={{color:COLOR.text,textDecoration:'none'}}>{locale==='en'?'Open sign-in link':'Anmeldelink öffnen'}</Link>.
 </Text></Section>;
}
