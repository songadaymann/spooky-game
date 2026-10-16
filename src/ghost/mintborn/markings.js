import * as THREE from 'three';
import { random } from './catalog.js';

// Color-and-alpha textile print. Separate albedo overlay preserves bright embroidery
// on dark fabric. Canvas antialiasing, mipmaps and anisotropy filter distant motifs.
export function makeMarkings(traits,size=512) {
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d');ctx.scale(size/512,size/512);
  const id=traits.marking??'none',ink=traits.markColor??'#53646a',accent=traits.trimColor??'#e2c484';
  const rand=random(1407), s=traits.markScale??1;
  ctx.strokeStyle=ctx.fillStyle=ink;ctx.lineWidth=3;ctx.lineJoin='round';ctx.lineCap='round';
  // The cap and eyes remain quiet. Hem seam is a garment detail, not a unique trait.
  if(id!=='none'){
    ctx.save();ctx.beginPath();ctx.rect(0,155,512,357);ctx.clip();
    const circle=(x,y,r)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();};
    const path=(pts,fill=false)=>{ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));if(fill){ctx.closePath();ctx.fill();}else ctx.stroke();};
    const star=(x,y,r,n=5,inner=.43)=>{const p=[];for(let i=0;i<n*2;i++){const a=i*Math.PI/n-Math.PI/2,rr=i%2?r*inner:r;p.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr]);}path(p,true);};
    const leaf=(x,y,r,a=0)=>{ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.beginPath();ctx.moveTo(0,-r);ctx.quadraticCurveTo(r,0,0,r);ctx.quadraticCurveTo(-r,0,0,-r);ctx.fill();ctx.restore();};
    const heart=(x,y,r)=>{ctx.beginPath();ctx.moveTo(x,y+r);ctx.bezierCurveTo(x-r*1.9,y-r*.3,x-r*.8,y-r*1.6,x,y-r*.45);ctx.bezierCurveTo(x+r*.8,y-r*1.6,x+r*1.9,y-r*.3,x,y+r);ctx.fill();};
    const flower=(x,y,r)=>{for(let i=0;i<6;i++){const a=i*Math.PI/3;leaf(x+Math.cos(a)*r*.7,y+Math.sin(a)*r*.7,r*.5,a+Math.PI/2);}ctx.fillStyle=accent;circle(x,y,r*.24);ctx.fillStyle=ink;};
    const moon=(x,y,r)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.save();ctx.globalCompositeOperation='destination-out';circle(x+r*.55,y-r*.2,r*.91);ctx.restore();};
    const repeat=(fn,dx=112,dy=105)=>{for(let row=0;row<4;row++)for(let col=-1;col<6;col++)fn(col*dx+(row%2)*dx*.5,198+row*dy,Math.floor(col+row*7));};
    if(id==='sailor')for(let y=178;y<512;y+=71/s)ctx.fillRect(0,y,512,24/s);
    else if(id==='pinstripe')for(let x=0;x<512;x+=58/s){ctx.fillRect(x,155,13/s,357);ctx.fillRect(x+20/s,155,3/s,357);}
    else if(id==='gingham'||id==='checker'){
      const cell=64/s;
      for(let y=128;y<512;y+=cell)for(let x=0;x<512;x+=cell){const a=Math.round(x/cell)%2,b=Math.round(y/cell)%2;
        if(id==='checker'){if((a+b)%2)ctx.fillRect(x,y,cell+.5,cell+.5);}
        else {ctx.globalAlpha=a&&b?.85:a||b?.36:0;ctx.fillRect(x,y,cell+.5,cell+.5);}}
      ctx.globalAlpha=1;
    }else if(id==='diamonds')repeat((x,y)=>path([[x,y-43],[x+30,y],[x,y+43],[x-30,y]],true),76/s,90/s);
    else if(id==='polka')repeat((x,y)=>circle(x,y,19/s),86/s,80/s);
    else if(id==='stars')repeat((x,y)=>star(x,y,24/s),113/s,101/s);
    else if(id==='moons')repeat((x,y)=>moon(x,y,25/s),120/s,105/s);
    else if(id==='celestial'){
      repeat((x,y,i)=>i%2?star(x,y,17/s,4,.15):moon(x,y,29/s),117/s,105/s);
      ctx.lineWidth=1.5;for(let x=-30;x<530;x+=125){path([[x,264],[x+25,239],[x+53,273],[x+77,233]]);for(const [dx,y]of[[0,264],[25,239],[53,273],[77,233]])circle(x+dx,y,3);}
    }else if(id==='clouds')repeat((x,y)=>{ctx.beginPath();ctx.ellipse(x,y,34,13,0,0,Math.PI*2);ctx.fill();circle(x-13,y-11,15);circle(x+8,y-16,20);},132/s,98/s);
    else if(id==='rain')repeat((x,y)=>{ctx.beginPath();ctx.moveTo(x,y-27);ctx.bezierCurveTo(x+27,y+5,x+17,y+24,x,y+24);ctx.bezierCurveTo(x-17,y+24,x-27,y+5,x,y-27);ctx.fill();},78/s,90/s);
    else if(id==='sunburst'){
      for(const x of[0,256,512]){star(x,298,95,16,.8);ctx.save();ctx.globalCompositeOperation='destination-out';circle(x,298,62);ctx.restore();circle(x,298,49);}
    }else if(id==='floral')repeat((x,y)=>{path([[x,y+36],[x,y-13]]);leaf(x-12,y+15,15,-.7);leaf(x+12,y+3,15,.7);path([[x-20,y-10],[x-21,y-37],[x-8,y-28],[x,y-40],[x+8,y-28],[x+21,y-37],[x+20,y-10],[x,y]],true);},108/s,122/s);
    else if(id==='daisies')repeat((x,y)=>flower(x,y,39/s),151/s,135/s);
    else if(id==='fern')repeat((x,y)=>{
      ctx.save();ctx.translate(x,y);ctx.rotate(-.23);path([[0,58],[2,-54]]);
      for(let i=0;i<6;i++){const yy=-40+i*16,rr=9+i*1.4;leaf(-rr*.7,yy,rr,-.9);leaf(rr*.7,yy+7,rr,.9);}ctx.restore();
    },137/s,140/s);
    else if(id==='vines')for(let x=-20;x<540;x+=99/s){ctx.beginPath();ctx.moveTo(x,512);ctx.bezierCurveTo(x-35,410,x+35,285,x,160);ctx.stroke();for(let y=190;y<510;y+=42){const xx=x+14*Math.sin(y/47);leaf(xx-10,y,19,-.7);leaf(xx+12,y+20,16,.8);}}
    else if(id==='waves'){
      for(let y=229;y<540;y+=91/s){ctx.beginPath();ctx.moveTo(-70,y);for(let x=-70;x<600;x+=128/s){ctx.bezierCurveTo(x+35/s,y-52/s,x+101/s,y-49/s,x+96/s,y-11/s);ctx.bezierCurveTo(x+86/s,y+10/s,x+64/s,y-10/s,x+80/s,y-19/s);ctx.bezierCurveTo(x+118/s,y-14/s,x+103/s,y+17/s,x+128/s,y);}ctx.lineTo(600,y+20/s);ctx.lineTo(-70,y+20/s);ctx.closePath();ctx.fill();}
    }else if(id==='scales'){ctx.lineWidth=8;for(let row=0;row<7;row++)for(let col=-1;col<8;col++){ctx.beginPath();ctx.arc(col*80+row%2*40,161+row*48,40,0,Math.PI);ctx.stroke();}}
    else if(id==='patchwork'){
      const colors=[ink,accent,traits.colors[1],traits.colors[2]];
      for(let row=0;row<4;row++)for(let col=-1;col<6;col++){const x=col*111+(row%2)*27,y=150+row*94;ctx.fillStyle=colors[(col+row*3+8)%4];ctx.fillRect(x,y,110,93);ctx.strokeStyle='#f0dfb9';ctx.lineWidth=1.5;ctx.setLineDash([3,6]);ctx.strokeRect(x+4,y+4,102,85);}ctx.setLineDash([]);
    }else if(id==='stitches'){
      repeat((x,y,i)=>{ctx.save();ctx.translate(x,y);ctx.rotate(i%2?.16:-.22);ctx.fillStyle=ink;ctx.fillRect(-27,-24,54,48);ctx.strokeStyle=accent;ctx.lineWidth=2;for(let a=-21;a<27;a+=10){path([[a,-28],[a,-19]]);path([[a,20],[a,28]]);}for(let a=-18;a<22;a+=10){path([[-31,a],[-21,a]]);path([[21,a],[31,a]]);}ctx.restore();},166/s,141/s);
    }else if(id==='hearts')repeat((x,y)=>heart(x,y,22/s),109/s,108/s);
    else if(id==='lightning')repeat((x,y)=>path([[x+5,y-40],[x-27,y+5],[x-4,y+2],[x-12,y+42],[x+29,y-15],[x+8,y-12]],true),114/s,111/s);
    else if(id==='terrazzo')for(let i=0;i<110;i++){const x=rand()*512,y=155+rand()*357,r=8+rand()*12;ctx.fillStyle=i%3===0?accent:ink;path([[x-r,y-r*.2],[x+r*.2,y-r],[x+r,y+r*.6],[x-r*.5,y+r]],true);}
    else if(id==='tie_dye'){
      for(const x of[0,256,512])for(let r=27;r<180;r+=27){ctx.beginPath();for(let i=0;i<=96;i++){const a=i/96*Math.PI*2,rr=r+5*Math.sin(a*9+r);const xx=x+Math.cos(a)*rr,yy=338+Math.sin(a)*rr;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.strokeStyle=r%54===0?accent:ink;ctx.lineWidth=13;ctx.stroke();}
    }else if(id==='sash')for(let x=-450;x<800;x+=512)path([[x,150],[x+62,150],[x+320,512],[x+258,512]],true);
    else if(id==='hem_border'){
      ctx.fillRect(0,414,512,6);ctx.fillRect(0,488,512,5);for(let x=-10;x<530;x+=56){star(x,454,19,4,.47);circle(x+28,454,4);}
    }else if(id==='spots')repeat((x,y)=>{ctx.save();ctx.translate(x,y);ctx.rotate(x*.03);ctx.lineWidth=7;ctx.beginPath();ctx.ellipse(0,0,21,14,.3,0,5.2);ctx.stroke();ctx.fillStyle=accent;ctx.globalAlpha=.7;circle(0,0,7);ctx.restore();},89/s,79/s);
    else throw new Error('Unknown fabric marking: '+id);
    ctx.restore();
  }
  // A barely drawn folded hem adds garment construction to the plain base too.
  ctx.strokeStyle=ink;ctx.globalAlpha=.20;ctx.lineWidth=1.1;ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(0,498);ctx.lineTo(512,498);ctx.stroke();
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=THREE.RepeatWrapping;texture.anisotropy=4;texture.name='textile-'+id;
  return texture;
}
