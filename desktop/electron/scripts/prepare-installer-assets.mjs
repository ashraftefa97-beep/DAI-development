import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import sharp from 'sharp';

const require=createRequire(import.meta.url);
const bmp=require('bmp-js');
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const buildDir=path.join(root,'build');
fs.mkdirSync(buildDir,{recursive:true});

function faceSvg(x,y,scale=1){
  const sx=(n)=>x+n*scale;
  const sy=(n)=>y+n*scale;
  return `
    <g>
      <rect x="${sx(0)}" y="${sy(0)}" width="${24*scale}" height="${62*scale}" rx="${12*scale}" fill="#fff7ec" transform="rotate(-2 ${sx(12)} ${sy(31)})"/>
      <rect x="${sx(58)}" y="${sy(0)}" width="${24*scale}" height="${62*scale}" rx="${12*scale}" fill="#ead9ff" transform="rotate(2 ${sx(70)} ${sy(31)})"/>
      <path d="M ${sx(18)} ${sy(78)} C ${sx(31)} ${sy(92)}, ${sx(52)} ${sy(92)}, ${sx(65)} ${sy(78)}" stroke="#f6a9c1" stroke-width="${5*scale}" stroke-linecap="round" fill="none"/>
      <path d="M ${sx(88)} ${sy(-20)} C ${sx(90)} ${sy(-9)} ${sx(94)} ${sy(-5)} ${sx(105)} ${sy(-3)} C ${sx(94)} ${sy(-1)} ${sx(90)} ${sy(3)} ${sx(88)} ${sy(14)} C ${sx(86)} ${sy(3)} ${sx(82)} ${sy(-1)} ${sx(71)} ${sy(-3)} C ${sx(82)} ${sy(-5)} ${sx(86)} ${sy(-9)} ${sx(88)} ${sy(-20)} Z" fill="#d9b7ff"/>
    </g>`;
}

const sidebar=`<svg xmlns="http://www.w3.org/2000/svg" width="164" height="314" viewBox="0 0 164 314">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="164" y2="314" gradientUnits="userSpaceOnUse">
      <stop stop-color="#141827"/>
      <stop offset=".58" stop-color="#211929"/>
      <stop offset="1" stop-color="#121522"/>
    </linearGradient>
    <radialGradient id="glow" cx="0" cy="0" r="1" gradientTransform="translate(83 104) rotate(90) scale(118)">
      <stop stop-color="#f6a9c1" stop-opacity=".16"/>
      <stop offset="1" stop-color="#f6a9c1" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="164" height="314" fill="url(#bg)"/>
  <rect width="164" height="240" fill="url(#glow)"/>
  <circle cx="24" cy="34" r="2" fill="#f6a9c1" opacity=".7"/>
  <circle cx="142" cy="62" r="1.6" fill="#c7a8e7" opacity=".7"/>
  <circle cx="132" cy="184" r="2" fill="#f6a9c1" opacity=".35"/>
  ${faceSvg(42,76,1)}
  <text x="82" y="204" text-anchor="middle" fill="#ffd4e1" font-family="Segoe UI, Arial" font-size="22" font-weight="700">DAI AI</text>
  <text x="82" y="226" text-anchor="middle" fill="#a9a9b9" font-family="Segoe UI, Arial" font-size="8">YOUR AI COMPANION</text>
  <line x1="38" y1="246" x2="126" y2="246" stroke="#ffffff" stroke-opacity=".08"/>
  <text x="82" y="268" text-anchor="middle" fill="#cdbdce" font-family="Segoe UI, Arial" font-size="8">CALM · SMART · SECURE</text>
</svg>`;

const header=`<svg xmlns="http://www.w3.org/2000/svg" width="150" height="57" viewBox="0 0 150 57">
  <defs>
    <linearGradient id="hbg" x1="0" y1="0" x2="150" y2="57">
      <stop stop-color="#171b2b"/>
      <stop offset="1" stop-color="#2a1d2d"/>
    </linearGradient>
  </defs>
  <rect width="150" height="57" fill="url(#hbg)"/>
  ${faceSvg(10,13,.34)}
  <text x="56" y="26" fill="#ffd4e1" font-family="Segoe UI, Arial" font-size="14" font-weight="700">DAI AI</text>
  <text x="56" y="39" fill="#aaa8b8" font-family="Segoe UI, Arial" font-size="7">A calmer way to use AI</text>
</svg>`;

async function svgToBmp(svg,width,height,outFile){
  const {data,info}=await sharp(Buffer.from(svg))
    .resize(width,height,{fit:'fill'})
    .ensureAlpha()
    .raw()
    .toBuffer({resolveWithObject:true});

  const abgr=Buffer.alloc(info.width*info.height*4);
  for(let i=0;i<info.width*info.height;i++){
    const r=data[i*4];
    const g=data[i*4+1];
    const b=data[i*4+2];
    const a=data[i*4+3];
    abgr[i*4]=a;
    abgr[i*4+1]=b;
    abgr[i*4+2]=g;
    abgr[i*4+3]=r;
  }

  const encoded=bmp.encode({data:abgr,width:info.width,height:info.height});
  fs.writeFileSync(outFile,encoded.data);
}

await svgToBmp(sidebar,164,314,path.join(buildDir,'installerSidebar.bmp'));
await svgToBmp(sidebar,164,314,path.join(buildDir,'uninstallerSidebar.bmp'));
await svgToBmp(header,150,57,path.join(buildDir,'installerHeader.bmp'));

console.log('DAI installer artwork ready.');
