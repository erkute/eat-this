// Brand typography is rendered locally; fonts never enter an email or deployment.
// Figma: Signup 2629:3084 / Login 2629:3308. Source paper: Instagram 1092:3690.
import React from 'react';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadBrandFont, BRAND_FONT_NAME } from '../lib/email/brandFont.ts';
import { COLOR } from '../emails/theme.ts';
const out='public/pics/email'; await mkdir(out,{recursive:true});
const {faces,isBrandFace,files}=await loadBrandFont();
console.log(isBrandFace ? `Markenschrift: ${files.join(', ')}` : '⚠️ Markenschrift fehlt: sichtbarer Schoolbell-Ersatz.');
const paper='../design/auth-mail/volume-paper.png';
const mark=await readFile('public/pics/eat-this-crumpled-wordmark.webp');
const logo=await sharp(mark).png().toBuffer();
const data=(b:Buffer)=>`data:image/png;base64,${b.toString('base64')}`;
const h=React.createElement;
const manifest:Record<string,{id:string;width:number;height:number;alt:string;version:string}>={};
async function save(id:string,buffer:Buffer,width:number,alt:string){buffer=await sharp(buffer).png({palette:true,quality:90,dither:0.7}).toBuffer();const meta=await sharp(buffer).metadata();await writeFile(`${out}/${id}.png`,buffer);manifest[id.replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase())]={id,width,height:Math.round(meta.height!/(meta.width!/width)),alt,version:createHash('sha1').update(buffer).digest('hex').slice(0,8)};}
async function ground(w:number,height:number,yellow=false){const texture=await sharp(paper).resize(w*2,height*2,{fit:'cover'}).ensureAlpha().toBuffer();const softened=await sharp(texture).linear(.65,255*.35).toBuffer();return sharp({create:{width:w*2,height:height*2,channels:4,background:yellow?COLOR.accent:COLOR.surface}}).composite([{input:softened,blend:'multiply'}]).png().toBuffer();}
async function render(w:number,height:number,children:React.ReactNode[],yellow=false){const bg=await ground(w,height,yellow);return Buffer.from(await new ImageResponse(h('div',{style:{display:'flex',position:'relative',width:w*2,height:height*2,fontFamily:BRAND_FONT_NAME,color:COLOR.text}},h('img',{src:data(bg),width:w*2,height:height*2,style:{position:'absolute',left:0,top:0}}),...children),{width:w*2,height:height*2,fonts:faces}).arrayBuffer());}
function text(s:string,left:number,top:number,width:number,size:number,bold=false,line=1.35){return h('div',{style:{display:'flex',position:'absolute',left:left*2,top:top*2,width:width*2,fontSize:size*2,fontWeight:bold?700:400,lineHeight:line,whiteSpace:'pre-wrap'}},s);}
// The same original transparent claim used by the live hero and Figma master.
const claim=await sharp('public/pics/home/silver-hero/slogan-desktop.webp').png().toBuffer();
const copy={
 de:{loginTitle:'Schön, dass du\nwieder da bist.',signupLead:'Mit deiner Anmeldung kommen 20 zusätzliche Must Eats in dein Deck.',loginLead:'Hier geht’s zurück zu deinem Deck und den Berliner Spots.',signupKicker:'20 ZUSÄTZLICHE MUST EATS',spotTitle:'Wo wir essen gehen.',brand:'Eat This',links:['Impressum','Datenschutz','Kontakt']},
 en:{loginTitle:'Good to have\nyou back.',signupLead:'Sign up and add 20 additional Must Eats to your deck.',loginLead:'Back to your deck and Berlin’s food spots.',signupKicker:'20 ADDITIONAL MUST EATS',spotTitle:'Where we eat.',brand:'Eat This',links:['Legal notice','Privacy','Contact']},
};
async function lineCount(value:string,width:number,size:number,line=1.3,bold=false){
 const probe=Buffer.from(await new ImageResponse(h('div',{style:{display:'flex',width:width*2,height:500,fontFamily:BRAND_FONT_NAME,fontSize:size*2,lineHeight:line,fontWeight:bold?700:400}},value),{width:width*2,height:500,fonts:faces}).arrayBuffer());
 const trimmed=await sharp(probe).trim().toBuffer({resolveWithObject:true});
 return Math.ceil(trimmed.info.height/(size*2*line));
}
for(const locale of ['de','en'] as const){const c=copy[locale],suffix=locale==='en'?'-en':'';
 for(const w of [600,375]){
  const mobile=w===375,pad=mobile?24:32,cw=w-pad*2,tag=mobile?'-mobile':'',gap=mobile?18:24;
  const markW=cw-12,markH=markW*322.0803833/1300,claimH=markW*108.4065323/960;
  const markY=mobile?32:40,claimY=markY+markH+gap,contentY=claimY+claimH+gap;
  for(const kind of ['signup','login'] as const){
   const layers:React.ReactNode[]=[
    h('img',{src:data(logo),width:markW*2,height:markH*2,style:{position:'absolute',left:(w-markW),top:markY*2}}),
    h('img',{src:data(claim),width:markW*2,height:claimH*2,style:{position:'absolute',left:(w-markW),top:claimY*2}}),
   ];
   let y=contentY;let alt='Eat This. We tell you what to eat. ';
   const centered=(value:string,top:number,size:number,bold=false)=>h('div',{style:{display:'flex',position:'absolute',left:pad*2,top:top*2,width:cw*2,justifyContent:'center',textAlign:'center',whiteSpace:'pre-wrap',fontSize:size*2,fontWeight:bold?700:400,lineHeight:1.3}},value);
   if(kind==='signup'){
    const fan=await readFile(`../design/auth-mail/hero-fan${mobile?'-mobile':''}.png`);
    const fanH=mobile?220:310;
    layers.push(h('img',{src:data(fan),width:cw*2,height:fanH*2,style:{position:'absolute',left:pad*2,top:y*2}}));
    y+=fanH+gap;const size=mobile?13:15;
    layers.push(centered(c.signupKicker,y,size,true));y+=size*1.3+gap;
    alt+=c.signupKicker+'. ';
   }else{
    const size=mobile?32:42;
    layers.push(centered(c.loginTitle,y,size,true));y+=size*1.3*2+gap;
    alt+=c.loginTitle.replaceAll('\n',' ')+' ';
   }
   const lead=c[kind==='signup'?'signupLead':'loginLead'],leadSize=mobile?17:20;
   layers.push(centered(lead,y,leadSize));y+=leadSize*1.3*await lineCount(lead,cw,leadSize)+gap;
   await save(`intro-${kind}${suffix}${tag}`,await render(w,Math.ceil(y),layers),w,alt+lead);
  }
  await save(`spot-heading${suffix}${tag}`,await render(cw,mobile?58:77,[text(c.spotTitle,0,0,cw,mobile?29:44,true,1.3)]),cw,c.spotTitle);
 }
 const label=locale==='en'?'Sign in':'Anmelden';
 const labelPng=Buffer.from(await new ImageResponse(h('div',{style:{display:'flex',fontFamily:BRAND_FONT_NAME,fontWeight:700,fontSize:36,color:COLOR.text,background:COLOR.accent,width:220,height:50,alignItems:'center',justifyContent:'center'}},label),{width:220,height:50,fonts:faces}).arrayBuffer());
 await save(`cta${suffix}`,labelPng,110,label);
 if(locale==='en'){const signUp=Buffer.from(await new ImageResponse(h('div',{style:{display:'flex',fontFamily:BRAND_FONT_NAME,fontWeight:700,fontSize:36,color:COLOR.text,background:COLOR.accent,width:220,height:50,alignItems:'center',justifyContent:'center'}},'Sign up'),{width:220,height:50,fonts:faces}).arrayBuffer());await save('cta-signup-en',signUp,110,'Sign up');}
 const small=async(value:string,w:number)=>Buffer.from(await new ImageResponse(h('div',{style:{display:'flex',fontFamily:BRAND_FONT_NAME,fontSize:24,color:COLOR.text,width:w*2,height:36}},value),{width:w*2,height:36,fonts:faces}).arrayBuffer());
 await save(`footer-brand${suffix}`,await sharp(logo).resize(320).png().toBuffer(),160,c.brand);
 for(const [i,key] of ['impressum','datenschutz','contact'].entries())await save(`footer-${key}${suffix}`,await small(c.links[i]!,140),140,c.links[i]!);
}
await sharp(await ground(600,1100)).png().toFile(`${out}/mail-paper.png`);
await sharp(logo).resize(260).png().toFile(`${out}/eat-this-logo.png`);
// Remove artwork retired by the approved layout; keep separate spot-card exports.
const keep=new Set([...Object.values(manifest).map(a=>a.id+'.png'),'mail-paper.png','eat-this-logo.png']);
for(const f of await readdir(out))if(f.endsWith('.png')&&!keep.has(f))await unlink(`${out}/${f}`);
await writeFile('emails/art.generated.ts',`// Generated by npm run build:email-art.\nexport const BRAND_FACE_AVAILABLE = ${isBrandFace};\nexport interface ArtAsset { id:string; width:number; height:number; alt:string; version:string }\nexport const ART = ${JSON.stringify(manifest,null,2)} as const satisfies Record<string,ArtAsset>;\n`);
console.log(`${Object.keys(manifest).length} locally rendered assets. No runtime font dependency.`);
