import * as THREE from 'three';

const TAU=Math.PI*2;
export const EXPANDED_HATS=['nightcap','bonnet','rainhat','deerstalker','newsboy','pilot','cowboy','tricorne','umbrella','fez','mortarboard','party'];
export const EXPANDED_GLASSES=['readers','swim','pince_nez','motoring','eyepatch','hypnosis','shutter','flip_up'];

// Shared seats: crown base y=2.30, open eyes at y=2.045 / z=.511.
// All decorative pieces are merged by the caller after the assembly is fitted.
export function buildExpandedHat(g,id,m,h) {
  if(!EXPANDED_HATS.includes(id))return false;
  const {add,sphere,tube,grid,lathe,brim,ellipse,plaque,ribbonBow}=h;
  const dome=(material,rx=.45,height=.36,rz=.43,y=2.30,deform)=>{
    const geo=new THREE.SphereGeometry(1,48,18,0,TAU,0,Math.PI/2),p=geo.attributes.position;
    for(let i=0;i<p.count;i++){
      const point=[p.getX(i)*rx,y+p.getY(i)*height,p.getZ(i)*rz];
      p.setXYZ(i,...(deform?deform(...point):point));
    }
    geo.computeVertexNormals();return add(g,geo,material);
  };
  const peak=(back=false,width=.41,reach=.73)=>{
    const surface=(u,v)=>{const a=(u-.5)*2.8,r=width+(reach-width)*v*Math.cos(a)**2;return[r*Math.sin(a),2.315-.055*v,r*Math.cos(a)*(back?-1:1)];};
    add(g,grid(36,6,surface,!back),m.main);
    add(g,grid(36,6,(u,v)=>{const p=surface(u,v);p[1]-=.018;return p;},back),m.seam);
    tube(g,m.seam,Array.from({length:37},(_,i)=>surface(i/36,1)),.008);
  };
  const cuff=(material=m.trim)=>lathe(g,material,[[.417,2.29],[.451,2.295],[.46,2.32],[.455,2.388],[.427,2.397]],[0,0,0],[1,1,.96]);
  if(id==='nightcap') {
    const levels=[[0,2.34,.44],[0,2.48,.37],[-.025,2.66,.28],[-.13,2.81,.18],[-.30,2.84,.105],[-.46,2.74,.052],[-.5,2.62,.019]];
    const profile=new THREE.CatmullRomCurve3(levels.map(p=>new THREE.Vector3(...p)),false,'centripetal');
    const surface=(u,v)=>{const p=profile.getPoint(v),a=u*TAU;return[p.x+p.z*Math.sin(a),p.y,p.z*.94*Math.cos(a)];};
    add(g,grid(48,30,surface),m.main);cuff();
    for(let j=0;j<8;j++)tube(g,m.trim,Array.from({length:25},(_,i)=>{const p=surface(j/8,i/24);p[2]+=.004*Math.cos(j/8*TAU);return p;}),.008);
    sphere(g,m.cream,[-.5,2.575,0],[.088,.095,.082]);
    for(let j=0;j<7;j++){const a=j/7*TAU;sphere(g,m.cream,[-.5+.054*Math.sin(a),2.573,.052*Math.cos(a)],[.037,.044,.036]);}
  } else if(id==='bonnet') {
    // A gathered bag closes behind the head; its open face is framed by a
    // separate flounce. The lower bag tucks into the sheet at the nape.
    const crown=new THREE.SphereGeometry(1,64,20,0,TAU,0,Math.PI/2),p=crown.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(x,z);
      const gathers=.021*Math.sin(a*18+.6*y)*Math.pow(1-y,1.6);
      const fullness=1+.10*Math.sin(y*Math.PI);
      p.setXYZ(i,x*(.515*fullness+gathers),2.17+z*(.49*fullness+gathers),.22-y*.80);
    }
    crown.computeVertexNormals();add(g,crown,m.bonnetCotton);
    const ruffle=(u,v)=>{
      const a=(u-.5)*3.88,wave=Math.sin(u*TAU*15),gather=.014*wave;
      return[(.515+gather+v*.070)*Math.sin(a),2.17+(.49+gather+v*.065)*Math.cos(a),
        .222+v*.075+.023*wave*v];
    };
    // The gathered front band closes the space between the roomy bag and the
    // forehead; without it the ruffled edge reads as a floating hoop head-on.
    const brow=(u,v)=>{
      const a=(u-.5)*3.88,outer=ruffle(u,0),inner=[.455*Math.sin(a),2.05+.29*Math.cos(a),.39-.10*Math.cos(a)];
      return outer.map((n,i)=>n*(1-v)+inner[i]*v+(i===2?.025*Math.sin(v*Math.PI)*(1+.3*Math.sin(u*TAU*15)):0));
    };
    add(g,grid(90,5,brow,true),m.bonnetCotton);
    add(g,grid(90,5,(u,v)=>{const p=brow(u,v);p[2]-=.009;return p;}),m.bonnetCotton);
    tube(g,m.cream,Array.from({length:73},(_,i)=>brow(i/72,1)),.007);
    add(g,grid(90,3,ruffle),m.cream);
    add(g,grid(90,3,(u,v)=>{const p=ruffle(u,v);p[2]-=.009;return p;},true),m.cream);
    tube(g,m.bonnetSeam,Array.from({length:91},(_,i)=>ruffle(i/90,0)),.009);
    tube(g,m.cream,Array.from({length:91},(_,i)=>ruffle(i/90,1)),.006);
    for(const sign of[-1,1]){
      const tie=new THREE.CatmullRomCurve3([
        [sign*.487,1.99,.255],[sign*.401,1.80,.414],
        [sign*.21,1.645,.548],[0,1.59,.576]
      ].map(p=>new THREE.Vector3(...p)));
      const ribbon=(u,v)=>{
        const c=tie.getPoint(u),t=tie.getTangent(u),n=new THREE.Vector3(-t.y,t.x,0).normalize();
        c.addScaledVector(n,(v-.5)*(.058-.009*u));c.z+=.008*Math.sin(v*Math.PI);return c.toArray();
      };
      add(g,grid(24,4,ribbon),m.cream);
      add(g,grid(24,4,(u,v)=>{const p=ribbon(u,v);p[2]-=.009;return p;},true),m.cream);
      for(const v of[0,1])tube(g,m.bonnetSeam,Array.from({length:25},(_,i)=>ribbon(i/24,v)),.0025);
    }
    ribbonBow(g,{...m,main:m.cream,seam:m.bonnetSeam},[0,1.59,.576],.72);
  } else if(id==='rainhat') {
    const surface=(u,v)=>{const a=u*TAU,back=(1-Math.cos(a))/2,r=.43+v*(.18+.13*back);
      return[r*Math.sin(a),2.31-v*(.085+.18*back),r*Math.cos(a)];};
    add(g,grid(64,8,surface,true),m.oilskin);add(g,grid(64,8,(u,v)=>{const p=surface(u,v);p[1]-=.018;return p;}),m.oilskin);
    dome(m.oilskin,.445,.325,.43);tube(g,m.oilskinSeam,Array.from({length:64},(_,i)=>surface(i/64,1)),.009,true);
    for(const a of[-.9,.9,Math.PI])tube(g,m.oilskinSeam,Array.from({length:18},(_,i)=>{const t=i/17*Math.PI/2;return[.447*Math.cos(t)*Math.sin(a),2.30+.329*Math.sin(t),.434*Math.cos(t)*Math.cos(a)];}),.0045);
  } else if(id==='deerstalker') {
    // Preserve the recipe ID, but interpret it as Holden's red hunting cap:
    // one long backward peak, a sewn wool crown, and practical earflaps.
    dome(m.huntingWool,.463,.315,.456,2.32,(x,y,z)=>[x,y-.025*z,z]);
    cuff(m.huntingWool);
    const bill=(u,v)=>{
      const x=u*2-1;
      return[x*.405*(1-.22*v**6),2.312-.065*v-.025*Math.sin(v*Math.PI)+.055*x*x*v,
        -.255-v*(.745-.17*x**4)];
    };
    add(g,grid(36,10,bill),m.huntingWool);
    add(g,grid(36,10,(u,v)=>{const p=bill(u,v);p[1]-=.023;return p;},true),m.huntingSeam);
    const billEdge=[...Array.from({length:13},(_,i)=>bill(0,i/12)),
      ...Array.from({length:36},(_,i)=>bill((i+1)/36,1)),...Array.from({length:12},(_,i)=>bill(1,1-(i+1)/12))];
    tube(g,m.huntingSeam,billEdge,.008);
    tube(g,m.huntingSeam,Array.from({length:37},(_,i)=>{const p=bill(.03+i/36*.94,.90);p[1]+=.004;return p;}),.0035);
    for(let j=0;j<6;j++){
      const a=j/6*TAU;
      tube(g,m.huntingSeam,Array.from({length:22},(_,i)=>{
        const t=i/21*Math.PI/2,r=Math.cos(t),z=.459*r*Math.cos(a);
        return[.466*r*Math.sin(a),2.323+.315*Math.sin(t)-.025*z,z];
      }),.0035);
    }
    ellipse(g,m.huntingSeam,.459,.441,2.345,.004);
    for(const sign of[-1,1]){
      const flap=(u,v)=>[sign*(.46+.073*v+.010*Math.sin(u*Math.PI)),
        2.345-v*(.305+.085*Math.sin(u*Math.PI)),-.055+(u-.5)*.49];
      add(g,grid(24,10,flap,sign<0),m.huntingWool);
      add(g,grid(24,10,(u,v)=>{const p=flap(u,v);p[0]-=sign*.018;return p;},sign>0),m.huntingLining);
      const edge=[...Array.from({length:13},(_,i)=>flap(0,i/12)),
        ...Array.from({length:24},(_,i)=>flap((i+1)/24,1)),...Array.from({length:12},(_,i)=>flap(1,1-(i+1)/12))];
      tube(g,m.huntingSeam,edge,.010);
      sphere(g,m.huntingSeam,[sign*.542,2.004,-.055],[.006,.021,.021]);
    }
    sphere(g,m.huntingWool,[0,2.64,0],[.026,.014,.026]);
  } else if(id==='newsboy') {
    dome(m.main,.515,.32,.45,2.32,(x,y,z)=>[x*(1+.014*Math.cos(Math.atan2(x,z)*8)),y-.07*z,z+.032]);
    cuff(m.seam);peak(false,.41,.67);
    for(let j=0;j<8;j++){const a=j/8*TAU;tube(g,m.stitch,Array.from({length:18},(_,i)=>{const t=i/17*Math.PI/2,r=Math.cos(t);return[.518*r*Math.sin(a),2.324+.32*Math.sin(t)-.07*.45*r*Math.cos(a),.454*r*Math.cos(a)+.032];}),.004);}
    sphere(g,m.main,[0,2.653,.032],[.031,.016,.031]);
  } else if(id==='pilot') {
    dome(m.leather,.472,.315,.45,2.30);ellipse(g,m.cream,.466,.44,2.31,.016);
    for(const sign of[-1,1]){
      const flap=sphere(g,m.leather,[sign*.464,2.07,-.055],[.062,.29,.195]);flap.rotation.z=sign*.10;
      tube(g,m.cream,[[sign*.47,2.26,.10],[sign*.494,2.10,.137],[sign*.481,1.90,.08],[sign*.472,1.819,-.055],[sign*.479,1.96,-.214]],.014);
      sphere(g,m.metal,[sign*.506,1.93,.075],[.007,.02,.02]);
    }
    for(const x of[-.23,.23])tube(g,m.stitch,Array.from({length:25},(_,i)=>{const a=i/24*Math.PI;return[x,2.30+.276*Math.sin(a),.391*Math.cos(a)];}),.004);
    tube(g,m.leather,[[.48,1.84,0],[.39,1.70,.04],[.33,1.58,.09]],.018);
  } else if(id==='cowboy'||id==='tricorne') {
    const cowboy=id==='cowboy';
    const surface=(u,v)=>{const a=u*TAU,r=.41+v*(cowboy?.40:.35),lift=cowboy?.24*Math.sin(a)**6:.35*((1+Math.cos(3*a))/2)**4;
      return[r*Math.sin(a),2.31+v*v*lift-.028*v,r*Math.cos(a)*(cowboy?.90:1)];};
    add(g,grid(72,9,surface,true),m.main);add(g,grid(72,9,(u,v)=>{const p=surface(u,v);p[1]-=.024;return p;}),m.seam);
    tube(g,cowboy?m.seam:m.trim,Array.from({length:73},(_,i)=>surface(i/73,1)),.013,true);
    dome(m.main,.43,cowboy?.43:.31,.39,2.32,(x,y,z)=>[x,y-(cowboy?.09*Math.exp(-x*x/ .008)*Math.max(0,(y-2.47)/.28):0),z]);
    lathe(g,m.leather,[[.431,2.33],[.434,2.36],[.426,2.405]],[0,0,0],[1,1,.915]);
    if(cowboy){plaque(g,m.metal,h.star(.054,5,.47),[0,2.37,.406],.008,.002);}
    else {sphere(g,m.trim,[.38,2.49,.34],[.047,.047,.027]);tube(g,m.cream,[[.4,2.5,.33],[.52,2.72,.29],[.48,2.88,.26]],.014);
      for(let i=0;i<8;i++)tube(g,m.cream,[[.43+i*.006,2.60+i*.029,.30],[.51+i*.005,2.635+i*.028,.30]],.009);}
  } else if(id==='umbrella') {
    const surface=(u,v)=>{const a=u*TAU,r=.015+v*.70,scallop=.035*(1-Math.cos(a*8))/2;
      return[r*Math.sin(a),2.91-.28*v*v+scallop*v**5,r*Math.cos(a)];};
    for(let j=0;j<8;j++){
      const material=j%2?m.trim:m.main;
      add(g,grid(8,10,(u,v)=>surface((j+u)/8,v),true),material);
      add(g,grid(8,10,(u,v)=>{const p=surface((j+u)/8,v);p[1]-=.012;return p;}),material);
      tube(g,m.metal,Array.from({length:18},(_,i)=>{const p=surface(j/8,i/17);p[1]-=.016;return p;}),.005);
      const p=surface(j/8,1);sphere(g,m.metal,p,[.014,.017,.014]);
    }
    tube(g,m.metal,[[0,2.35,0],[0,2.96,0]],.014);
    ellipse(g,m.seam,.347,.332,2.258,.023);sphere(g,m.main,[0,2.957,0],[.032,.027,.032]);
  } else if(id==='fez') {
    lathe(g,m.main,[[.432,2.30],[.438,2.32],[.365,2.78],[.348,2.802]],[0,0,0],[1,1,.95]);
    const top=add(g,new THREE.CircleGeometry(.348,48),m.main,[0,2.802,0]);top.rotation.x=-Math.PI/2;top.scale.y=.95;
    ellipse(g,m.seam,.347,.331,2.805,.006);
    tube(g,m.ink,[[0,2.817,0],[.20,2.823,.015],[.35,2.76,.05],[.401,2.63,.08]],.013);
    for(let j=0;j<9;j++){const a=j/9*TAU;tube(g,m.ink,[[.401,2.636,.08],[.408+.023*Math.sin(a),2.52,.08+.023*Math.cos(a)]],.006);}
  } else if(id==='mortarboard') {
    lathe(g,m.main,[[.431,2.30],[.432,2.43],[.37,2.54]],[0,0,0],[1,1,.94]);
    const board=add(g,new THREE.BoxGeometry(.99,.035,.99),m.main,[0,2.563,0]);board.rotation.y=.20;
    tube(g,m.trim,[[0,2.594,0],[.30,2.597,.27],[.44,2.57,.36],[.46,2.34,.37]],.01);
    for(let j=0;j<8;j++){const a=j/8*TAU;tube(g,m.trim,[[.46,2.34,.37],[.46+.022*Math.sin(a),2.20,.37+.022*Math.cos(a)]],.005);}
    sphere(g,m.main,[0,2.599,0],[.027,.019,.027]);
  } else if(id==='party') {
    const cone=add(g,new THREE.ConeGeometry(.375,.78,48),m.main,[0,2.70,0]);
    ellipse(g,m.trim,.376,.376,2.311,.014);
    for(let j=0;j<5;j++){const y=2.38+j*.125,r=.375*(1-(y-2.31)/.78);ellipse(g,m.trim,r+.003,r+.003,y,.012);}
    sphere(g,m.trim,[0,3.115,0],[.070,.070,.070]);
    for(let j=0;j<6;j++){const a=j/6*TAU;sphere(g,m.trim,[.042*Math.sin(a),3.12,.042*Math.cos(a)],[.032,.032,.032]);}
  }
  return true;
}

export function buildExpandedGlasses(g,id,m,h) {
  if(!EXPANDED_GLASSES.includes(id))return false;
  const {add,sphere,tube,plaque,frameGeometry,lensOutline}=h;
  const slot=(x,y=2.045,z=.515)=>{const o=new THREE.Group();g.add(o);o.position.set(x,y,z);o.rotation.y=Math.sign(x)*.13;return o;};
  const arms=(mat=m.frame,dy=0,start=.351)=>{for(const s of[-1,1])tube(g,mat,[[s*start,2.106+dy,.492],[s*.452,2.096+dy,.33],[s*.492,2.035+dy,.05],[s*.475,2.011+dy,-.055]],.01);};
  const bridge=(mat=m.metal)=>tube(g,mat,[[-.055,2.073,.54],[0,2.106,.56],[.055,2.073,.54]],.008);
  const strap=(mat,y=2.075)=>tube(g,mat,Array.from({length:49},(_,i)=>{const a=.79+i/48*(TAU-1.58);return[.502*Math.sin(a),y,.502*Math.cos(a)];}),.016);
  if(id==='eyepatch') {
    strap(m.ink,2.13);
    const p=new THREE.Shape();p.moveTo(-.128,.102);p.quadraticCurveTo(0,.138,.128,.102);p.lineTo(.116,-.025);p.quadraticCurveTo(0,-.166,-.116,-.025);p.closePath();
    const patch=slot(.17,2.047,.522);plaque(patch,m.ink,p.getPoints(12).map(v=>[v.x,v.y]),[0,0,0],.035,.006);
    tube(g,m.ink,[[.04,2.137,.532],[-.23,2.17,.481],[-.43,2.145,.254]],.012);
    tube(g,m.ink,[[.29,2.14,.52],[.43,2.13,.272]],.012);
  } else if(id==='swim'||id==='motoring') {
    const swim=id==='swim';strap(swim?m.frame:m.leather);
    for(const s of[-1,1]){
      const o=slot(s*.193),points=lensOutline(swim?'oval':'round');
      add(o,frameGeometry(points,swim?.032:.035,swim?.09:.10),swim?m.frame:m.leather,[0,0,-.045]);
      add(o,frameGeometry(points,.012,.059),swim?m.cream:m.metal);
      // Clear apertures preserve the eyes; one pale glass edge implies the lens.
      tube(o,m.lensGlint,[[-.097,.024,.067],[-.076,.06,.067],[-.039,.077,.067]],.004);
      sphere(o,m.metal,[s*.181,.02,.016],[.021,.034,.02]);
      tube(g,swim?m.frame:m.leather,[[s*.37,2.065,.493],[s*.424,2.07,.398],[s*.452,2.075,.24]],.016);
    }
    tube(g,swim?m.frame:m.leather,[[-.044,2.06,.56],[0,2.085,.58],[.044,2.06,.56]],.017);
  } else if(id==='readers'||id==='pince_nez') {
    const readers=id==='readers';
    for(const s of[-1,1]){
      const o=slot(s*.18,readers?1.999:2.045,.513);
      const points=readers?Array.from({length:33},(_,i)=>{const a=Math.PI+i/32*Math.PI;return[.139*Math.cos(a),.045+.101*Math.sin(a)];}):lensOutline('oval');
      add(o,frameGeometry(points,.009,.012),m.metal);
    }
    if(readers){
      tube(g,m.metal,[[-.038,2.009,.54],[0,2.03,.558],[.038,2.009,.54]],.008);arms(m.metal,-.067,.325);
      for(const s of[-1,1]){
        const path=new THREE.CatmullRomCurve3([[s*.34,2.024,.51],[s*.445,1.67,.47],[s*.48,1.57,.23],[s*.49,1.96,-.045]].map(p=>new THREE.Vector3(...p)));
        for(let i=0;i<27;i++){const ring=add(g,new THREE.TorusGeometry(.012,.0028,5,10),m.metal,path.getPoint(i/26).toArray(),[.64,1,1]);ring.rotation.y=i%2*Math.PI/2;}
      }
    }else {bridge();for(const s of[-1,1])sphere(g,m.metal,[s*.049,2.014,.508],[.012,.018,.008]);}
  } else if(id==='hypnosis') {
    for(const s of[-1,1]){
      const o=slot(s*.193),points=lensOutline('round');
      add(o,frameGeometry(points,.024,.025),m.ink);plaque(o,m.cream,points,[0,0,.004],.013,.001);
      tube(o,m.ink,Array.from({length:101},(_,i)=>{const t=i/100,a=t*TAU*2.65,r=.008+t*.124;return[r*Math.cos(a),r*Math.sin(a),.031];}),.0065);
    }bridge(m.ink);arms(m.ink);
  } else if(id==='shutter'||id==='flip_up') {
    for(const s of[-1,1]){
      const o=slot(s*.193),points=lensOutline('square');
      add(o,frameGeometry(points,.022,.023),m.frame);
      if(id==='shutter')for(let j=0;j<5;j++)add(o,new THREE.BoxGeometry(.279,.018,.021),m.frame,[0,-.073+j*.039,.019]);
      else {
        const hinge=new THREE.Group();o.add(hinge);hinge.position.set(0,.12,.037);hinge.rotation.x=.93;
        const lens=points.map(([x,y])=>[x,y+.116]);
        plaque(hinge,m.lens,lens,[0,0,0],.009,.002);add(hinge,frameGeometry(lens,.008,.012),m.metal);
        tube(hinge,m.lensGlint,[[-.09,.19,.019],[-.06,.208,.019],[-.012,.208,.019]],.004);
        for(const x of[-.064,.064])sphere(o,m.metal,[x,.115,.037],[.014,.009,.012]);
      }
    }bridge();arms();
  }
  return true;
}
