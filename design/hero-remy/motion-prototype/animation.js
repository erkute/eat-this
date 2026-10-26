// Motion study: authored in-between poses, registered mesh morphs, one clock.
const stage=document.querySelector('.stage'),canvas=document.querySelector('canvas'),cover=document.querySelector('.cover'),seek=document.querySelector('#seek'),phaseLabel=document.querySelector('.phase');
const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:true});
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t)},mix=(a,b,t)=>a+(b-a)*t;
const duration=8.4,aspect=1448/1086;
const poses=[
 {name:'hand',file:'remy-hand-push-v2.png',contact:.98,floor:.947,points:[[735,80],[665,185],[812,190],[765,320],[700,355],[600,380],[770,430],[775,565],[875,495],[1020,550],[1035,380],[520,700],[655,725],[310,1000],[765,980],[110,1290],[690,1315],[80,1350],[800,1350]],face:[.70,.175,.088,.071],offset:[.022,.006]},
 {name:'release',file:'remy-release.png',contact:.87,floor:.962,points:[[665,80],[595,190],[735,190],[690,325],[630,350],[515,380],[710,390],[435,555],[735,600],[670,510],[825,550],[515,700],[650,710],[435,1010],[715,1010],[295,1315],[650,1320],[345,1380],[740,1360]]},
 {name:'turn',file:'remy-turn-v2.png',contact:.84,floor:.961,points:[[540,72],[455,185],[615,185],[500,310],[545,345],[410,385],[660,390],[350,585],[720,600],[385,790],[790,790],[485,700],[625,700],[530,1020],[665,1020],[490,1320],[650,1320],[535,1375],[730,1360]]},
 {name:'brace',file:'remy-brace.png',contact:.80,floor:.965,points:[[625,75],[535,190],[690,190],[560,320],[635,350],[555,395],[750,390],[485,595],[790,585],[405,685],[610,685],[490,710],[645,720],[375,970],[565,1010],[410,1270],[720,1310],[310,1320],[665,1370]]},
 {name:'back',file:'remy-back-push-v2.png',contact:.80,floor:.937,points:[[755,95],[650,205],[825,205],[665,340],[745,380],[700,420],[835,420],[555,595],[795,630],[425,655],[555,705],[540,735],[685,765],[310,965],[495,1040],[295,1250],[695,1290],[155,1305],[620,1340]],face:[.63,.185,.095,.074],offset:[.014,.009]},
 {name:'thumb',file:'remy-thumbs-up.png',contact:.84,floor:.966,points:[[555,72],[470,185],[630,185],[515,310],[555,345],[425,385],[675,390],[360,540],[735,600],[385,400],[805,790],[495,700],[640,700],[545,1020],[680,1020],[505,1320],[665,1320],[550,1380],[745,1370]]},
];
// Lock the painted torso independently from the hands crossing in front of it.
const torsoAnchors=[
 [[525,485],[510,550],[495,625],[640,445],[615,535],[580,620],[735,490],[710,590],[675,670]],
 [[500,450],[500,550],[490,630],[600,450],[590,550],[580,630],[710,450],[690,550],[665,640]],
 [[440,450],[455,550],[455,630],[550,450],[550,550],[550,630],[650,450],[650,550],[645,630]],
 [[535,450],[515,550],[510,630],[630,450],[610,550],[590,630],[745,450],[720,550],[680,640]],
 [[650,450],[610,550],[560,630],[740,450],[700,550],[640,640],[805,450],[800,550],[760,640]],
 [[450,450],[465,550],[465,630],[560,450],[560,550],[560,630],[665,450],[665,550],[660,630]],
];
poses.forEach((p,i)=>p.points.push(...torsoAnchors[i]));
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec4 p;varying vec2 uv;void main(){gl_Position=vec4(p.xy,0.,1.);uv=p.zw;}'));
gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision mediump float;
 varying vec2 uv;uniform sampler2D image;uniform sampler2D expression;
 uniform float opacity;uniform float effort;uniform vec4 face;uniform vec2 faceOffset;
 void main(){vec4 c=texture2D(image,uv);vec4 e=texture2D(expression,uv+faceOffset);
 float region=1.-smoothstep(.65,1.,length((uv-face.xy)/face.zw));
 float weight=region*effort*step(.98,e.a)*step(.98,c.a);
 gl_FragColor=mix(c,e,weight)*opacity;}`));gl.linkProgram(program);gl.useProgram(program);
const uniforms=Object.fromEntries(['image','expression','opacity','effort','face','faceOffset'].map(n=>[n,gl.getUniformLocation(program,n)]));gl.uniform1i(uniforms.image,0);gl.uniform1i(uniforms.expression,1);
// Add premultiplied contributions so aligned poses stay opaque during a morph.
gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
const cols=44,rows=58,count=(cols+1)*(rows+1),vertices=new Float32Array(count*4),indices=[];
for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const i=y*(cols+1)+x;indices.push(i,i+1,i+cols+1,i+1,i+cols+2,i+cols+1)}
const buffer=gl.createBuffer(),indexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices.byteLength,gl.DYNAMIC_DRAW);const pointLocation=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(pointLocation);gl.vertexAttribPointer(pointLocation,4,gl.FLOAT,false,0,0);
const load=src=>new Promise((resolve,reject)=>{const img=new Image;img.onload=()=>{const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);resolve(tex)};img.onerror=reject;img.src=src});
const restPoint=(p,x,y)=>[x-p.contact,(y-p.floor)*aspect];
// Weighted local similarity deformation preserves face/foot proportions while
// bringing corresponding joints to the same place in both painted textures.
function warp(point,source,target){
 let sum=0,px=0,py=0,qx=0,qy=0;const weights=[];
 for(let j=0;j<source.length;j++){const dx=point[0]-source[j][0],dy=point[1]-source[j][1],w=1/Math.max(.000001,(dx*dx+dy*dy)**1.6);weights.push(w);sum+=w;px+=w*source[j][0];py+=w*source[j][1];qx+=w*target[j][0];qy+=w*target[j][1]}
 px/=sum;py/=sum;qx/=sum;qy/=sum;let a=0,b=0,mu=0;
 for(let j=0;j<source.length;j++){const x=source[j][0]-px,y=source[j][1]-py,u=target[j][0]-qx,v=target[j][1]-qy,w=weights[j];a+=w*(x*u+y*v);b+=w*(x*v-y*u);mu+=w*(x*x+y*y)}
 a/=mu;b/=mu;return[qx+a*(point[0]-px)-b*(point[1]-py),qy+b*(point[0]-px)+a*(point[1]-py)];
}
const maps=new Map();
function prepareMap(a,b){const key=a+':'+b;if(maps.has(key))return maps.get(key);const from=poses[a],to=poses[b],s=from.points.map(([x,y])=>restPoint(from,x/1086,y/1448)),q=to.points.map(([x,y])=>restPoint(to,x/1086,y/1448)),map=new Float32Array(count*2);for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){const i=(y*(cols+1)+x)*2,p=warp(restPoint(from,x/cols,y/rows),s,q);map[i]=p[0];map[i+1]=p[1]}maps.set(key,map);return map}
const keys=[[0,0],[1.65,0],[2.02,1],[2.40,2],[2.76,3],[3.12,4],[5.10,4],[5.48,3],[5.83,2],[6.22,5],[7.1,5],[8.4,5]];
function transition(t){for(let i=1;i<keys.length;i++){if(t<=keys[i][0])return[keys[i-1][1],keys[i][1],smooth(keys[i-1][0],keys[i][0],t)]}return[5,5,1]}
let time=0,running=false,last=0,raf=0,ready=false;
function draw(t){
 if(!ready)return;const w=stage.clientWidth,h=stage.clientHeight,dpr=Math.min(devicePixelRatio,2);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT);seek.value=t;
 const size=Math.min(w<600?w*.74:360,h*.49);
 const edge=t<1.75?mix(0,w*.54,smooth(0,1.75,t)):t<3.12?w*.54:t<4.2?mix(w*.54,w*.73,smooth(3.12,4.2,t)):mix(w*.73,w+8,smooth(4.2,5.45,t));cover.style.setProperty('--edge',edge+'px');
 phaseLabel.textContent=t<1.65?'Mit den Händen schieben':t<2.02?'Puh … das klemmt':t<2.76?'Gewicht verlagern und drehen':t<3.12?'Mit dem Rücken anlegen':t<5.1?'Zähne zusammenbeißen':t<6.22?'Geschafft — durchatmen':t<7.1?'Daumen hoch!':t<8.4?'Bis gleich!':'Geschafft';
 if(t>=duration)return;
 const end=w-size*.13;let actor=edge;
 if(t>4.2)actor=mix(w*.73,end,smooth(4.2,5.45,t));
 if(t>7.1)actor+=size*1.03*smooth(7.1,8.4,t);
 const [a,b,blend]=transition(t),ink=blend<.5?0:1,contributions=a===b?[[a,b,0,1]]:[[a,b,blend,1-ink],[b,a,1-blend,ink]];
 for(const [index,other,morph,opacity] of contributions){
  if(opacity<.001)continue;const p=poses[index],map=index===other?null:prepareMap(index,other),pushing=(index===0||index===4),exert=pushing?(.45+.55*Math.sin(t*(index===0?4.4:3.2))**2):0;
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,p.texture);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,p.expression||p.texture);gl.uniform1f(uniforms.opacity,opacity);gl.uniform1f(uniforms.effort,exert*(1-morph));gl.uniform4fv(uniforms.face,p.face||[0,0,1,1]);gl.uniform2fv(uniforms.faceOffset,p.offset||[0,0]);
  for(let iy=0;iy<=rows;iy++)for(let ix=0;ix<=cols;ix++){
   const u=ix/cols,v=iy/rows,i=iy*(cols+1)+ix;let [x,y]=restPoint(p,u,v);
   if(map){const dx=map[i*2]-x,dy=map[i*2+1]-y,limit=Math.min(1,.035/Math.max(.0001,Math.hypot(dx,dy)));x+=dx*morph*limit;y+=dy*morph*limit;}
   const still=1-morph;
   if(index===3)y+=still*.038*(1-smooth(.40,.55,u))*smooth(.78,.92,v)*aspect;
   if(index===0){const lock=1-smooth(.8,.98,u),torso=1-smooth(.73,.9,v),step=Math.sin(t*9+smooth(.42,.61,u)*Math.PI);x+=still*(.018*exert*lock*torso+.014*step*smooth(.55,.85,v));y+=still*(.008*exert*lock*torso-.008*Math.max(0,step)*smooth(.79,.9,v))*aspect;}
   if(index===4){const step=Math.sin((t-3.12)*7+smooth(.35,.52,u)*Math.PI);x+=still*(-.025*exert*smooth(.49,.84,v)*(1-smooth(.90,.96,v))+.011*step*smooth(.77,.91,v));y+=still*(.012*exert*(1-smooth(.75,.94,v))*smooth(.3,.55,v)+.026*(1-smooth(.3,.53,u))*smooth(.77,.91,v)-.006*Math.max(0,step)*smooth(.82,.91,v))*aspect;}
   // Small nod on the held thumbs-up; feet remain planted until departure.
   if(index===5){const nod=Math.sin(smooth(6.22,6.8,t)*Math.PI);y+=still*.008*nod*(1-smooth(.27,.45,v));if(t>7.1){const step=Math.sin((t-7.1)*12+smooth(.49,.62,u)*Math.PI);x+=.025*step*smooth(.55,.9,v);y-=.015*Math.max(0,step)*smooth(.75,.92,v);}}
   vertices[i*4]=(actor+x*size)/w*2-1;vertices[i*4+1]=1-(h+y*size)/h*2;vertices[i*4+2]=u;vertices[i*4+3]=v;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,vertices);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
 }
}
function tick(now){if(!running)return;time=Math.min(duration,time+Math.min(.05,(now-last)/1000)*(document.querySelector('#slow').checked?.35:1));last=now;draw(time);running=time<duration;if(running)raf=requestAnimationFrame(tick)}
function play(){if(!ready)return;cancelAnimationFrame(raf);time=0;running=true;last=performance.now();raf=requestAnimationFrame(tick)}
document.querySelector('#play').onclick=play;seek.oninput=()=>{running=false;cancelAnimationFrame(raf);time=Number(seek.value);draw(time)};window.onresize=()=>draw(time);document.addEventListener('visibilitychange',()=>{last=performance.now()});
async function init(){
 await Promise.all(poses.map(async p=>p.texture=await load(p.file)));
 poses[0].expression=await load('remy-hand-effort.png');poses[4].expression=await load('remy-back-effort.png');
 for(let i=1;i<keys.length;i++){const a=keys[i-1][1],b=keys[i][1];if(a!==b){prepareMap(a,b);prepareMap(b,a)}}
 ready=true;if(matchMedia('(prefers-reduced-motion: reduce)').matches){time=duration;draw(time)}else play();
}
init().catch(e=>{phaseLabel.textContent='Vorschau konnte nicht geladen werden';console.error(e)});
window.addEventListener('pagehide',()=>cancelAnimationFrame(raf));
