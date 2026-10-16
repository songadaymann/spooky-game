import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildExpandedHat, buildExpandedGlasses } from './accessories-expanded.js';

// Art revision is independent of the trait catalogue: saved Ghosts keep their identities.
export const ACCESSORY_ART_VERSION = 'tailored-06';
const TAU = Math.PI * 2;
const V = p => new THREE.Vector3(...p);
function add(group, geometry, material, p=[0,0,0], s=[1,1,1], r=[0,0,0]) {
  const o = new THREE.Mesh(geometry, material);
  o.position.set(...p); o.scale.set(...s); o.rotation.set(...r); group.add(o); return o;
}
const sphere = (g,m,p,s) => {
  const tiny=Math.max(...s)<.05;
  return add(g,new THREE.SphereGeometry(1,tiny?12:20,tiny?8:12),m,p,s);
};
const cylinder = (g,m,top,bottom,h,p) => add(g,new THREE.CylinderGeometry(top,bottom,h,48),m,p);
function tube(g,m,points,r=.008,closed=false) {
  const curve = new THREE.CatmullRomCurve3(points.map(V),closed,'centripetal');
  return add(g,new THREE.TubeGeometry(curve,Math.max(12,points.length*(closed?1:2)),r,6,closed),m);
}
function ellipse(g,m,rx,rz,y,r=.008,offset=[0,0,0]) {
  return tube(g,m,Array.from({length:64},(_,i)=>{
    const a=i/64*TAU; return [offset[0]+rx*Math.sin(a),y+offset[1],offset[2]+rz*Math.cos(a)];
  }),r,true);
}
function lathe(g,m,profile,p=[0,0,0],scale=[1,1,1],deform) {
  const geo = new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),64);
  if(deform) {
    const a=geo.attributes.position;
    for(let i=0;i<a.count;i++) a.setXYZ(i,...deform(a.getX(i),a.getY(i),a.getZ(i)));
    geo.computeVertexNormals();
  }
  return add(g,geo,m,p,scale);
}
function grid(nu,nv,point,flip=false) {
  const positions=[],uv=[],indices=[];
  for(let j=0;j<=nv;j++) for(let i=0;i<=nu;i++) {
    positions.push(...point(i/nu,j/nv)); uv.push(i/nu,j/nv);
    if(i<nu&&j<nv) {
      const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;
      indices.push(...(flip?[a,c,b,b,c,d]:[a,b,c,b,d,c]));
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geo.setIndex(indices); geo.computeVertexNormals(); return geo;
}
// Brims have an actual upper face, underside and turned edge, with an opening
// under the crown. Curvature belongs to geometry, not a painted shading trick.
function brim(g,m,{rx=.62,rz=rx,y=2.3,inner=.28,drop=0,roll=0,wave=0,thickness=.024,edge=m}) {
  const point=(u,v)=>{
    const a=u*TAU,r=inner+(rx-inner)*v;
    return [r*Math.sin(a),y+drop*v+roll*v**5+wave*v*v*(Math.sin(2*a+.3)+.45*Math.cos(3*a)),r*rz/rx*Math.cos(a)];
  };
  add(g,grid(64,8,point,true),m);
  add(g,grid(64,8,(u,v)=>{const p=point(u,v);p[1]-=thickness;return p;}),m);
  add(g,grid(64,1,(u,v)=>{const p=point(u,1);p[1]-=thickness*v;return p;},true),edge);
  const rim=Array.from({length:64},(_,i)=>point(i/64,1));
  tube(g,edge,rim,.008,true);
  return point;
}
function shape(points) {
  const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s;
}
function plaque(g,m,points,p,depth=.009,bevel=.003) {
  return add(g,new THREE.ExtrudeGeometry(shape(points),{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,steps:1}),m,p);
}
function star(radius=.1,n=5,inner=.44) {
  return Array.from({length:n*2},(_,i)=>{
    const a=i*Math.PI/n+Math.PI/2,r=i%2?radius*inner:radius;return [Math.cos(a)*r,Math.sin(a)*r];
  });
}
function panel(g,m,points,thickness=.007) {
  // A folded paper/ribbon panel, extruded normal to its own plane.
  const a=V(points[0]),b=V(points[1]),c=V(points[2]),normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
  const positions=[],uv=[],indices=[],n=points.length;
  for(const side of[-1,1]) for(let i=0;i<n;i++) {
    const p=V(points[i]).addScaledVector(normal,side*thickness/2);
    positions.push(...p.toArray());uv.push(i/(n-1),side===1?1:0);
  }
  for(let i=1;i<n-1;i++) indices.push(0,i+1,i,n,n+i,n+i+1);
  for(let i=0;i<n;i++) {const j=(i+1)%n;indices.push(i,j,n+i,j,n+j,n+i);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();add(g,geo,m);
}
function bandBow(g,m,p,scale=.6) {
  const bow=new THREE.Group();g.add(bow);bow.position.set(...p);bow.scale.setScalar(scale);
  ribbonBow(bow,m,[0,0,0],.5);
}
function ribbonBow(g,m,p,scale=1) {
  const bow=new THREE.Group();g.add(bow);bow.position.set(...p);bow.scale.setScalar(scale);bow.rotation.z=-.22;
  // A loop is a broad ribbon swept around a teardrop, with a recessed return.
  for(const sign of[-1,1]) {
    const surface=(u,v)=>{
      const a=u*TAU,reach=(1-Math.cos(a))/2;
      return [sign*(.018+.26*reach),.05*reach+(v-.5)*(.045+.22*reach),.028+Math.sin(a)*.067*Math.sin(Math.PI*reach)**.5];
    };
    add(bow,grid(40,6,surface,sign===1),m.main);
    add(bow,grid(40,6,(u,v)=>{const p=surface(u,v);p[2]-=.009;return p;},sign!==1),m.main);
    for(const v of[0,1]) tube(bow,m.seam,Array.from({length:41},(_,i)=>surface(i/40,v)),.004);
    tube(bow,m.seam,[[sign*.045,0,.048],[sign*.12,.03,.079],[sign*.22,.035,.065]],.004);
    const points=[[sign*.015,-.015,.01],[sign*.105,-.03,.002],[sign*.16,-.28,.02],[sign*.09,-.237,.025],[sign*.04,-.285,.015]];
    panel(bow,m.main,points,.013);
    tube(bow,m.seam,[[sign*.047,-.06,.022],[sign*.075,-.15,.027],[sign*.09,-.23,.03]],.004);
  }
  const knot=sphere(bow,m.main,[0,0,.04],[.052,.068,.062]);knot.rotation.z=.16;
  tube(bow,m.seam,[[-.02,-.054,.076],[-.025,0,.098],[-.012,.054,.071]],.004);
}
function cap(g,m,propeller=false) {
  lathe(g,m.main,[[.405,2.29],[.452,2.30],[.458,2.34],[.446,2.40],[.407,2.48],[.34,2.55],[.22,2.60],[.07,2.624],[0,2.626]],[0,0,0],[1,1,.94]);
  ellipse(g,m.seam,.455,.427,2.315,.007);
  // Front-only curved peak, sewn into the cap instead of an oval plate.
  const bill=(u,v)=>{
    const a=(u-.5)*2.92;
    const inner=.41,outer=.45+.34*Math.cos(a)**2,r=inner+(outer-inner)*v;
    return [r*Math.sin(a),2.307-v*(.03+.026*Math.sin(a)**2),r*Math.cos(a)*.95];
  };
  add(g,grid(40,7,bill,true),m.main);
  add(g,grid(40,7,(u,v)=>{const p=bill(u,v);p[1]-=.022;return p;}),m.seam);
  for(const v of[.78,1])tube(g,v===1?m.seam:m.stitch,Array.from({length:41},(_,i)=>bill(i/40,v)),v===1?.009:.0035);
  for(let j=0;j<6;j++) {
    const a=j/6*TAU;
    tube(g,m.seam,[[.454,2.32],[.460,2.34],[.448,2.40],[.409,2.48],[.342,2.55],[.221,2.603],[.07,2.628]].map(([r,y])=>[r*Math.sin(a),y,r*.94*Math.cos(a)]),.0045);
    const eyelet=add(g,new THREE.TorusGeometry(.012,.003,5,12),m.metal,[.36*Math.sin(a),2.502,.338*Math.cos(a)]);
    eyelet.rotation.y=a;eyelet.rotation.x=-.5;
  }
  sphere(g,m.main,[0,2.633,0],[.035,.017,.035]);
  if(propeller) {
    cylinder(g,m.metal,.013,.017,.11,[0,2.698,0]);
    for(const sign of[-1,1]) {
      const blade=(u,v)=>[sign*(.018+u*.36),2.758+.04*(v-.5)*Math.sin(u*Math.PI),.15*Math.sin(Math.PI*u)**.6*(v-.5)+sign*.018*u];
      add(g,grid(18,4,blade,sign===1),sign<0?m.trim:m.main);
      add(g,grid(18,4,(u,v)=>{const p=blade(u,v);p[1]-=.008;return p;},sign!==1),sign<0?m.trim:m.main);
    }
    sphere(g,m.metal,[0,2.765,0],[.044,.026,.044]);
  }
}
function pointedHat(g,m,witch) {
  brim(g,m.main,{rx:witch?.77:.61,rz:witch?.69:.55,y:2.32,drop:-.018,roll:.04,wave:witch?.060:.02,edge:m.seam});
  const levels=witch?[
    [.435,2.32,0,0],[.425,2.38,0,0],[.39,2.49,-.014,0],[.32,2.66,-.045,0],
    [.255,2.83,-.07,0],[.195,3.00,-.13,.008],[.14,3.13,-.23,.02],
    [.094,3.16,-.34,.032],[.06,3.105,-.43,.04],[.025,3.05,-.49,.045],[.001,3.022,-.51,.045]
  ]:[
    [.43,2.32,0,0],[.41,2.40,0,0],[.36,2.55,.01,0],[.285,2.74,.025,0],
    [.19,2.98,.035,0],[.11,3.18,.028,0],[.05,3.34,.01,0],[.001,3.44,0,0]
  ];
  const points=[];
  for(const [r,y,x,z] of levels) points.push({r,y,x,z});
  const surface=(u,v)=>{
    const a=u*TAU,k=Math.min(points.length-2,Math.floor(v*(points.length-1))),t=v*(points.length-1)-k;
    const p=points[k],q=points[k+1],lerp=(key)=>THREE.MathUtils.lerp(p[key],q[key],t);
    const r=lerp('r')*(1+.025*Math.sin(a*5+v*4));
    return [lerp('x')+Math.sin(a)*r,lerp('y'),lerp('z')+Math.cos(a)*r*.94];
  };
  add(g,grid(64,(levels.length-1)*3,surface),m.main);
  const bandPoint=(u,v)=>{
    const p=surface(u,.025+v*(witch?.14:.10)),a=u*TAU;
    p[0]+=.010*Math.sin(a);p[2]+=.010*Math.cos(a);return p;
  };
  add(g,grid(64,5,bandPoint),m.leather);
  for(const v of[.12,.88])tube(g,m.stitch,Array.from({length:64},(_,i)=>bandPoint(i/64,v)),.0025,true);
  if(witch) {
    const buckle=shape([[-.064,-.043],[.064,-.043],[.064,.043],[-.064,.043]]);
    const hole=new THREE.Path();hole.moveTo(-.044,-.025);hole.lineTo(-.044,.025);hole.lineTo(.044,.025);hole.lineTo(.044,-.025);hole.closePath();buckle.holes.push(hole);
    add(g,new THREE.ExtrudeGeometry(buckle,{depth:.009,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:2}),m.metal,[.02,2.405,.422]);
    tube(g,m.metal,[[.02,2.37,.435],[.02,2.44,.435]],.005);
    tube(g,m.metal,[[-.51,3.027,.048],[-.51,2.972,.048],[-.508,2.945,.048]],.004);
    plaque(g,m.metal,star(.061),[-.508,2.896,.049],.008,.002);
  }
  // Sewn celestial appliqués sit on the cone surface, not in front of empty air.
  for(const [u,v,size] of witch?[[.03,.22,.045],[.91,.39,.038],[.02,.54,.045]]:[[.03,.28,.068],[.90,.45,.054],[.03,.65,.040],[.88,.72,.029]]) {
    const p=surface(u,v),obj=plaque(g,m.trim,star(size,4,.26),p,.004,.001);
    obj.rotation.y=u*TAU;obj.rotation.x=-.30;
  }
}

// Merge per material, including nested ribbon/flower geometry. Ornament counts
// never turn into one draw call per stitch, petal or straw strand.
function batch(group) {
  group.updateWorldMatrix(true,true);
  const inverse=group.matrixWorld.clone().invert(),slots=new Map();
  group.traverse(o=>{
    if(!o.isMesh)return;
    const geo=o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld));
    if(!slots.has(o.material))slots.set(o.material,[]);slots.get(o.material).push(geo);o.geometry.dispose();
  });group.clear();
  for(const [material,geometries] of slots) {
    const unpacked=geometries.map(g=>g.index?g.toNonIndexed():g),merged=mergeGeometries(unpacked,false);
    if(!merged)throw new Error('Accessory geometry could not be merged');
    const mesh=add(group,merged,material);mesh.castShadow=!material.userData.noAccessoryShadow;mesh.receiveShadow=true;
    for(const geo of new Set([...geometries,...unpacked]))geo.dispose();
  }
}

export function buildHat(group,id,m) {
  if(id==='none')return;
  if(buildExpandedHat(group,id,m,{add,sphere,tube,grid,lathe,brim,ellipse,plaque,ribbonBow,star})){batch(group);return;}
  if(id==='beret') {
    lathe(group,m.main,[[.31,2.29],[.40,2.295],[.49,2.32],[.535,2.38],[.52,2.445],[.44,2.51],[.30,2.545],[.10,2.555],[0,2.55]], [0,0,0],[1,1,.9],(x,y,z)=>{
      const q=(y-2.29)/.265,a=Math.atan2(x,z),fold=.008*Math.sin(8*a+.4)*Math.sin(Math.PI*q);
      return [x+.055*q,y-.09*x+(x*fold),z+fold];
    });
    ellipse(group,m.seam,.374,.34,2.305,.026);
    tube(group,m.main,[[.064,2.55,0],[.09,2.59,-.005],[.106,2.605,-.01]],.021);
    tube(group,m.seam,[[-.29,2.537,.07],[-.14,2.556,.028],[.067,2.553,0],[.27,2.526,-.045]],.0035);
  } else if(id==='bucket') {
    brim(group,m.main,{rx:.595,rz:.565,y:2.305,inner:.419,drop:-.11,roll:.011,wave:.012,edge:m.seam});
    lathe(group,m.main,[[.425,2.302],[.427,2.33],[.394,2.46],[.351,2.585],[.331,2.611],[.24,2.622],[0,2.623]],[0,0,0],[1,1,.95]);
    ellipse(group,m.seam,.35,.333,2.606,.007);
    for(const r of[.46,.50,.54,.58])ellipse(group,m.stitch,r,r*.95,2.305-.11*(r-.419)/(.595-.419)+.009,.003);
    for(const a of[-.85,.85,2.3,-2.3])tube(group,m.seam,[[.423*Math.sin(a),2.315,.402*Math.cos(a)],[.385*Math.sin(a),2.485,.367*Math.cos(a)],[.342*Math.sin(a),2.61,.325*Math.cos(a)]],.0045);
    for(const a of[-1.05,1.05])for(const d of[-.045,.045]){
      const ring=add(group,new THREE.TorusGeometry(.015,.004,6,16),m.metal,[.409*Math.sin(a+d),2.416,.389*Math.cos(a+d)]);
      ring.rotation.y=a+d;ring.rotation.x=-.23;
    }
  } else if(id==='beanie') {
    const knit=(u,v)=>{const a=u*TAU,t=v*Math.PI/2,r=.438*Math.cos(t)*(1+.008*Math.cos(a*36));return[r*Math.sin(a)+.04*Math.sin(t)**3,2.34+.405*Math.sin(t),r*.95*Math.cos(a)];};
    add(group,grid(72,20,knit),m.main);
    lathe(group,m.main,[[.407,2.278],[.444,2.28],[.461,2.297],[.461,2.395],[.45,2.413],[.418,2.414]],[0,0,0],[1,1,.95]);
    for(let i=0;i<42;i++) {
      const a=i/42*TAU;
      tube(group,m.seam,[[.458*Math.sin(a),2.293,.435*Math.cos(a)],[.466*Math.sin(a),2.351,.442*Math.cos(a)],[.455*Math.sin(a),2.401,.433*Math.cos(a)]],.0045);
    }
    for(let i=0;i<18;i++)tube(group,m.seam,Array.from({length:13},(_,j)=>knit(i/18,.14+j/12*.83)),.003);
    sphere(group,m.main,[.04,2.78,0],[.086,.079,.084]);
    for(let i=0;i<9;i++){const a=i/9*TAU;sphere(group,m.main,[.04+.063*Math.sin(a),2.785+.02*Math.sin(a*3),.06*Math.cos(a)],[.03,.036,.03]);}
    plaque(group,m.leather,[[-.052,-.033],[.052,-.033],[.052,.033],[-.052,.033]],[.16,2.346,.418]);
    tube(group,m.stitch,[[.129,2.33,.433],[.16,2.362,.437],[.189,2.33,.423]],.004);
  } else if(id==='cap'||id==='propeller') cap(group,m,id==='propeller');
  else if(id==='hardhat') {
    brim(group,m.main,{rx:.542,rz:.565,y:2.305,drop:-.023,roll:.012,edge:m.seam});
    lathe(group,m.main,[[.423,2.30],[.458,2.335],[.445,2.423],[.40,2.53],[.30,2.606],[.14,2.645],[0,2.65]],[0,0,0],[1,1,.95]);
    const shell=[[.458,2.335],[.445,2.423],[.40,2.53],[.30,2.606],[.14,2.645],[0,2.65]];
    for(const x of[-.19,0,.19])tube(group,m.main,Array.from({length:33},(_,i)=>{
      const z=Math.sqrt(.453**2-x*x)*Math.cos(i/32*Math.PI),r=Math.hypot(x,z);
      const k=shell.findIndex(([radius],j)=>j<shell.length-1 && r<=radius && r>=shell[j+1][0]);
      const [ra,ya]=shell[Math.max(0,k)],[rb,yb]=shell[Math.max(0,k)+1];
      return [x,THREE.MathUtils.lerp(ya,yb,(ra-r)/(ra-rb))+.005,z*.95];
    }),x===0?.02:.012);
    ellipse(group,m.seam,.458,.439,2.342,.011);
    for(const sign of[-1,1])for(let j=0;j<3;j++){
      const z=-.13+j*.07;
      tube(group,m.seam,[[sign*.438,2.409,z],[sign*.443,2.38,z+.027]],.009);
    }
    plaque(group,m.cream,[[-.065,-.044],[.065,-.044],[.065,.044],[-.065,.044]],[0,2.40,.439],.007);
    tube(group,m.main,[[-.025,2.386,.452],[0,2.423,.452],[.025,2.386,.452]],.008);
  } else if(['boater','bowler','top_hat'].includes(id)) {
    const straw=id==='boater',main=straw?m.straw:m.main;
    const edge=straw?m.strawSeam:m.seam;
    brim(group,main,{rx:straw?.685:.585,rz:straw?.62:.53,y:2.31,roll:straw?.01:.066,wave:straw?.005:.008,edge});
    const profile=straw?[[.398,2.31],[.412,2.335],[.407,2.55],[.394,2.579],[.32,2.588],[0,2.588]]:
      id==='bowler'?[[.405,2.315],[.416,2.35],[.41,2.44],[.378,2.54],[.30,2.624],[.18,2.677],[0,2.693]]:
      [[.408,2.316],[.422,2.34],[.399,2.43],[.372,2.65],[.4,2.86],[.437,2.961],[.433,2.984],[.32,2.99],[0,2.99]];
    lathe(group,main,profile,[0,0,0],[1,1,.93]);
    lathe(group,straw?m.main:m.leather,[[.419,2.346],[.418,2.366],[.402,2.435]],[0,0,0],[1,1,.93]);
    ellipse(group,edge,.409,.38,straw?2.575:id==='bowler'?2.35:2.35,.006);
    bandBow(group,{...m,main:straw?m.main:m.leather},[.37,2.386,.145],.62);
    if(straw) {
      for(let i=0;i<8;i++)ellipse(group,m.strawSeam,.438+i*.032,(.438+i*.032)*.905,2.32,.0035);
      for(let i=0;i<7;i++)ellipse(group,m.strawSeam,.409,.38,2.444+i*.02,.003);
      // Staggered stitches make plaited straw, not a stack of metal rings.
      for(let i=0;i<40;i++){
        const a=i/40*TAU;
        tube(group,m.strawSeam,[[.41*Math.sin(a),2.476,.382*Math.cos(a)],[.41*Math.sin(a+.014),2.49,.382*Math.cos(a+.014)]],.003);
      }
    }else if(id==='top_hat')ellipse(group,m.seam,.43,.40,2.981,.01);
  } else if(id==='witch'||id==='wizard') pointedHat(group,m,id==='witch');
  else if(id==='crown') {
    const crown=(u,v)=>{
      const a=u*TAU,peak=(.5+.5*Math.cos(a*8))**2,r=.418+.025*v;
      return [Math.sin(a)*r,2.302+v*(.13+.23*peak),Math.cos(a)*r*.95];
    };
    add(group,grid(128,4,crown),m.metal);
    add(group,grid(128,4,(u,v)=>{const p=crown(u,v);p[0]*=.955;p[2]*=.955;return p;},true),m.metal);
    tube(group,m.metal,Array.from({length:128},(_,i)=>crown(i/128,1)),.01,true);
    ellipse(group,m.metal,.424,.402,2.308,.02);
    ellipse(group,m.trim,.433,.411,2.374,.012);
    for(let i=0;i<8;i++){
      const a=i/8*TAU;
      sphere(group,m.metal,[.444*Math.sin(a),2.669,.422*Math.cos(a)],[.022,.022,.022]);
      const bezel=sphere(group,m.metal,[.432*Math.sin(a),2.36,.41*Math.cos(a)],[.045,.055,.018]);bezel.rotation.y=a;
      const gem=add(group,new THREE.OctahedronGeometry(.035),m.gem,[.449*Math.sin(a),2.36,.426*Math.cos(a)],[1,1.25,.45]);gem.rotation.y=a;
    }
  } else if(id==='paperboat') {
    // Four folded sheets around an open head space; no solid triangular block.
    panel(group,m.paper,[[-.56,2.305,.22],[.56,2.305,.22],[.07,2.772,0]],.011);
    panel(group,m.paper,[[-.56,2.305,-.22],[.07,2.772,0],[.56,2.305,-.22]],.011);
    for(const s of[-1,1]){
      panel(group,m.cream,[[-.56,2.299,s*.235],[.56,2.299,s*.235],[.43,2.449,s*.278],[-.43,2.449,s*.278]],.014);
      tube(group,m.paperInk,[[-.43,2.449,s*.278],[0,2.449,s*.278],[.43,2.449,s*.278]],.004);
      tube(group,m.paperInk,[[.07,2.772,0],[.018,2.562,s*.106],[0,2.453,s*.157]],.0035);
    }
    for(const sign of[-1,1])panel(group,m.paper,[[sign*.56,2.305,.22],[sign*.56,2.305,-.22],[.07,2.772,0]],.009);
    // Quiet printed columns echo the town's paper ephemera.
    for(let row=0;row<5;row++)for(let col=0;col<3;col++){
      const x=-.31+col*.18,y=2.329+row*.018,z=.246+(y-2.299)*.29;
      tube(group,m.paperInk,[[x,y,z],[x+.1-(row%3)*.014,y,z]],.002);
    }
  } else if(id==='sailor') {
    lathe(group,m.main,[[.372,2.296],[.411,2.304],[.435,2.387],[.42,2.4]],[0,0,0],[1,1,.94]);
    lathe(group,m.cream,[[.425,2.389],[.47,2.402],[.492,2.449],[.483,2.485],[.444,2.521],[.34,2.546],[.12,2.556],[0,2.555]],[0,0,0],[1,1,.94],(x,y,z)=>[x+.03*(y-2.39),y-.035*x,z]);
    ellipse(group,m.trim,.427,.401,2.363,.008);
    ellipse(group,m.seam,.436,.409,2.398,.006);
    ellipse(group,m.paper,.464,.436,2.495,.004);
    for(const sign of[-1,1])panel(group,m.main,[[sign*.085,2.36,-.401],[sign*.015,2.36,-.41],[sign*.035,2.135,-.426],[sign*.105,2.147,-.434]],.009);
  } else if(id==='chef') {
    lathe(group,m.cream,[[.359,2.295],[.405,2.30],[.406,2.455],[.388,2.471],[.366,2.46]],[0,0,0],[1,1,.96]);
    ellipse(group,m.paper,.405,.389,2.333,.004);
    const profile=[[.377,2.44],[.382,2.58],[.412,2.72],[.434,2.82],[.414,2.899],[.333,2.948],[.18,2.966],[0,2.968]];
    lathe(group,m.cream,profile,[0,0,0],[1,1,.96],(x,y,z)=>{
      const a=Math.atan2(x,z),w=.018*Math.cos(a*12)*Math.sin(Math.PI*Math.min(1,(y-2.44)/.55));
      const r=Math.hypot(x,z)||1;return [x+x/r*w,y,z+z/r*w];
    });
    for(let i=0;i<12;i++){
      const a=i/12*TAU;
      tube(group,m.paper,[[.38*Math.sin(a),2.46,.365*Math.cos(a)],[.398*Math.sin(a),2.68,.382*Math.cos(a)],[.42*Math.sin(a),2.817,.403*Math.cos(a)],[.365*Math.sin(a),2.92,.350*Math.cos(a)]],.0035);
    }
  } else if(id==='mushroom') {
    const cap=(u,v)=>{
      const a=u*TAU,t=v*Math.PI/2,r=.69*Math.cos(t)*(1+.018*Math.cos(a*5));
      return [r*Math.sin(a)-.025*Math.sin(t),2.389+.325*Math.sin(t)+.015*Math.cos(a*3)*Math.cos(t),r*.94*Math.cos(a)];
    };
    add(group,grid(80,24,cap),m.mushroom);
    const underside=(u,v)=>{const a=u*TAU,r=.26+v*.43;return [r*Math.sin(a),2.305+.071*v-.012*Math.sin(Math.PI*v)+.014*v*Math.cos(a*3),r*.94*Math.cos(a)];};
    add(group,grid(80,8,underside),m.cream);
    for(let i=0;i<44;i++)tube(group,m.gill,Array.from({length:8},(_,j)=>underside(i/44,.06+j/7*.92)),.004);
    tube(group,m.cream,Array.from({length:80},(_,i)=>cap(i/80,0)),.012,true);
    // Spots are curved patches sampled on the cap, so none float or cut through it.
    for(let i=0;i<13;i++){
      const u=(i*.381966)%1,v=.16+(i%4)*.175,ru=.016+(i%3)*.008,rv=.065+(i%3)*.017;
      add(group,grid(20,4,(a,r)=>{const t=a*TAU;const p=cap(u+Math.cos(t)*ru*r,v+Math.sin(t)*rv*r);p[1]+=.0045;return p;},true),m.cream);
    }
    const pivot=new THREE.Group(),pieces=[...group.children];group.add(pivot);
    for(const piece of pieces){group.remove(piece);piece.position.y-=2.389;pivot.add(piece);}
    pivot.position.y=2.405;pivot.rotation.x=-.30;pivot.rotation.z=-.035;
  } else if(id==='bow') ribbonBow(group,m,[.32,2.454,.255],1);
  else if(id==='flower_crown') {
    for(let j=0;j<2;j++)tube(group,m.leaf,Array.from({length:80},(_,i)=>{const a=i/80*TAU;return[(.432+.009*Math.sin(a*9+j*Math.PI))*Math.sin(a),2.325+.011*Math.cos(a*9+j*Math.PI),(.432+.009*Math.sin(a*9+j*Math.PI))*Math.cos(a)];}),.014,true);
    for(let i=0;i<9;i++){
      const a=i/9*TAU,flower=new THREE.Group();group.add(flower);
      flower.position.set(.437*Math.sin(a),2.356+.018*Math.sin(a*3),.437*Math.cos(a));flower.rotation.set(-.45,a,0);flower.scale.setScalar(i%3===0?1.15:.86);
      for(let j=0;j<7;j++){
        const b=j/7*TAU,petal=sphere(flower,m.cream,[Math.sin(b)*.05,Math.cos(b)*.05,.004],[.027,.06,.013]);petal.rotation.z=-b;
      }
      sphere(flower,m.trim,[0,0,.027],[.031,.031,.018]);
      for(let j=0;j<5;j++){const b=j/5*TAU;sphere(flower,m.strawSeam,[.015*Math.sin(b),.015*Math.cos(b),.041],[.004,.004,.003]);}
      const leaf=sphere(flower,m.leaf,[.10,.01,-.021],[.077,.024,.012]);leaf.rotation.z=.45;
      tube(flower,m.seam,[[.045,-.015,-.006],[.10,.01,-.006],[.157,.035,-.015]],.003);
    }
    const fitted=new THREE.Group(),pieces=[...group.children];group.add(fitted);
    for(const piece of pieces){group.remove(piece);fitted.add(piece);}
    fitted.scale.set(.835,1,.835);fitted.position.y=-.075;
  } else if(id==='antenna') {
    const arc=Array.from({length:25},(_,i)=>{const a=i/24*Math.PI;return [.467*Math.cos(a),2.09+.43*Math.sin(a),-.04];});
    tube(group,m.main,arc,.023);
    for(const sign of[-1,1]) {
      sphere(group,m.main,[sign*.28,2.434,-.04],[.037,.045,.035]);
      const spring=Array.from({length:65},(_,i)=>{const t=i/64,a=t*TAU*4;return [sign*(.28+.065*t)+.024*Math.sin(a),2.457+.36*t,-.04+.024*Math.cos(a)];});
      tube(group,m.metal,spring,.007);
      sphere(group,m.trim,[sign*.345,2.851,-.04],[.078,.077,.077]);
      ellipse(group,m.metal,.055,.055,2.818,.006,[sign*.345,0,-.04]);
    }
  } else if(id==='headphones') {
    // Broad padded band, adjustment rails and layered, cushioned cups.
    const arc=(radius,z)=>Array.from({length:33},(_,i)=>{const a=i/32*Math.PI;return [Math.cos(a)*radius,2.055+Math.sin(a)*.49,z];});
    tube(group,m.main,arc(.523,-.075),.032);tube(group,m.main,arc(.523,.015),.032);
    add(group,grid(40,5,(u,v)=>{const a=u*Math.PI;return [Math.cos(a)*.523,2.055+Math.sin(a)*.49,-.075+v*.09];}),m.main);
    tube(group,m.ink,arc(.504,-.03),.029);
    for(const sign of[-1,1]){
      tube(group,m.metal,[[sign*.499,2.29,-.03],[sign*.555,2.235,-.03],[sign*.562,2.12,-.03]],.012);
      sphere(group,m.ink,[sign*.499,2.055,-.028],[.072,.163,.136]);
      sphere(group,m.main,[sign*.554,2.055,-.028],[.066,.141,.119]);
      const cup=add(group,new THREE.CylinderGeometry(.104,.104,.025,40),m.seam,[sign*.606,2.055,-.028],[1,1,1],[0,0,Math.PI/2]);
      cup.scale.set(1,1,.92);
      for(let j=0;j<3;j++)tube(group,m.metal,[[sign*.622,2.026+j*.028,-.065],[sign*.622,2.026+j*.028,.008]],.0035);
      sphere(group,m.metal,[sign*.562,2.192,-.03],[.018,.018,.022]);
    }
  } else throw new Error('Unknown ghost hat: '+id);
  batch(group);
}

function lensOutline(id,sign=1) {
  const s=new THREE.Shape();
  if(id==='square'||id==='3d') {
    s.moveTo(-.116,-.10);s.lineTo(.112,-.10);s.quadraticCurveTo(.151,-.10,.153,-.062);s.lineTo(.153,.075);s.quadraticCurveTo(.153,.113,.113,.115);s.lineTo(-.114,.115);s.quadraticCurveTo(-.152,.113,-.152,.075);s.lineTo(-.152,-.061);s.quadraticCurveTo(-.151,-.10,-.116,-.10);
  }else if(id==='cat_eye') {
    s.moveTo(-.131,.082);s.bezierCurveTo(-.048,.126,.088,.114,.182,.162);s.bezierCurveTo(.18,.076,.137,-.08,.07,-.112);s.bezierCurveTo(-.035,-.151,-.157,-.045,-.131,.082);
  }else if(id==='aviator') {
    s.moveTo(-.12,.078);s.bezierCurveTo(-.025,.14,.13,.13,.15,.048);s.bezierCurveTo(.17,-.025,.1,-.16,.018,-.163);s.bezierCurveTo(-.069,-.164,-.145,-.015,-.12,.078);
  }else if(id==='hexagon') {
    const p=Array.from({length:6},(_,i)=>[Math.cos(i/6*TAU)*.147,Math.sin(i/6*TAU)*.139]);return p;
  }else if(id==='star') return star(.168,5,.48);
  else if(id==='heart') return Array.from({length:64},(_,i)=>{const a=i/64*TAU;return [.0095*(16*Math.sin(a)**3),.0088*(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))];});
  else return Array.from({length:64},(_,i)=>{const a=i/64*TAU;return [Math.cos(a)*.142,Math.sin(a)*(id==='oval'?.086:.139)];});
  return s.getPoints(12).map(p=>[p.x*(['cat_eye','aviator'].includes(id)?sign:1),p.y]);
}
function frameGeometry(points,width,depth) {
  // Beveled flat acetate or thin metal ribbon, with a real aperture. Explicit
  // inner/outer loops keep the corners of stars and hexagons crisp.
  const outer=shape(points.map(([x,y])=>[x*(1+width/.14),y*(1+width/.14)]));
  const hole=new THREE.Path();const inner=points.slice().reverse();
  inner.forEach(([x,y],i)=>i?hole.lineTo(x,y):hole.moveTo(x,y));hole.closePath();outer.holes.push(hole);
  return new THREE.ExtrudeGeometry(outer,{depth,bevelEnabled:true,bevelSegments:2,bevelSize:.003,bevelThickness:.003,steps:1,curveSegments:12});
}
function grouchoDisguise(group,m) {
  // One wearable assembly: open acetate frames at the normal eye seat, with
  // the rubber nose and brush moustache projecting in front of the cloth.
  for(const sign of[-1,1]) {
    const slot=new THREE.Group();group.add(slot);
    slot.position.set(sign*.193,2.045,.511);slot.rotation.y=sign*.13;
    add(slot,frameGeometry(lensOutline('round'),.027,.028),m.ink);
    sphere(slot,m.metal,[sign*.16,.063,.033],[.01,.005,.003]);
    tube(group,m.ink,[[sign*.356,2.11,.496],[sign*.452,2.094,.333],
      [sign*.493,2.048,.10],[sign*.476,2.012,-.05]],.014);

    const brow=new THREE.Shape();
    brow.moveTo(-.151,-.011);
    brow.bezierCurveTo(-.125,.043,-.015,.052,.092,.022);
    brow.quadraticCurveTo(.135,.008,.153,-.025);
    // A few cut bristle tips keep the silhouette bushy at portrait size.
    for(const p of[[.125,-.021],[.112,-.031],[.081,-.021],[.057,-.029],
      [.028,-.019],[.007,-.026],[-.022,-.018],[-.048,-.025],[-.079,-.019],[-.11,-.026]])brow.lineTo(...p);
    brow.closePath();
    const browMesh=plaque(group,m.disguiseHair,brow.getPoints(8).map(p=>[p.x*sign,p.y]),
      [sign*.193,2.251,.514],.037,.007);
    browMesh.rotation.y=sign*.13;

    const moustache=new THREE.Shape();
    moustache.moveTo(.012,.03);
    moustache.bezierCurveTo(.076,.071,.17,.044,.234,.015);
    moustache.quadraticCurveTo(.249,-.004,.25,-.036);
    for(const p of[[.225,-.026],[.212,-.045],[.19,-.035],[.174,-.049],
      [.15,-.038],[.13,-.048],[.106,-.035],[.085,-.045],[.059,-.03],[.04,-.038],[.012,-.019]])moustache.lineTo(...p);
    moustache.closePath();
    const whiskers=plaque(group,m.disguiseHair,moustache.getPoints(8).map(p=>[p.x*sign,p.y]),
      [0,1.795,.56],.046,.005);
    whiskers.rotation.y=sign*.16;
    // Raised tufts share the matte hair material and merge into the same draw.
    for(let i=0;i<6;i++) {
      const x=.05+i*.032,y=1.829-i*.003;
      tube(group,m.disguiseHair,[[sign*x,y,.611-x*.16],
        [sign*(x+.009),y-.028,.623-x*.16],[sign*(x+.016),y-.065,.612-x*.16]],.0045);
    }
  }
  tube(group,m.ink,[[-.06,2.085,.54],[0,2.111,.574],[.06,2.085,.54]],.019);

  // Sculpt a continuous bulb and narrow bridge, retaining the sphere's pole
  // topology rather than collapsing an entire row of a parametric grid.
  const nose=new THREE.SphereGeometry(1,24,18),positions=nose.attributes.position;
  for(let i=0;i<positions.count;i++) {
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),lower=(1-y)/2;
    positions.setXYZ(i,x*.084*(1-.60*Math.max(0,y)),1.945+y*.16,
      .58+lower*.057+z*(.058+lower*.052));
  }
  nose.computeVertexNormals();add(group,nose,m.disguiseNose);
  for(const sign of[-1,1]) {
    sphere(group,m.disguiseNose,[sign*.065,1.827,.62],[.036,.033,.042]);
    const nostril=sphere(group,m.disguiseHair,[sign*.044,1.813,.647],[.016,.009,.011]);
    nostril.rotation.z=sign*.22;
  }
}

export function buildGlasses(group,id,m) {
  if(id==='none')return;
  if(buildExpandedGlasses(group,id,m,{add,sphere,tube,plaque,frameGeometry,lensOutline})){batch(group);return;}
  if(id==='groucho'){grouchoDisguise(group,m);batch(group);return;}
  const metal=['round','oval','hexagon','aviator','monocle'].includes(id);
  const frame=id==='3d'?m.paper:['round','oval'].includes(id)?m.frame:metal?m.metal:m.frame;
  if(id==='visor') {
    const surface=(u,v)=>{
      const a=(u-.5)*1.65;return [Math.sin(a)*.575,2.015+(v-.5)*.224+.02*Math.cos(a),Math.cos(a)*.565];
    };
    add(group,grid(40,6,surface),m.lens);
    add(group,grid(40,6,(u,v)=>{const p=surface(u,v);p[2]-=.012;return p;},true),m.lens);
    for(const v of[0,1])tube(group,v===1?m.frame:m.metal,Array.from({length:41},(_,i)=>surface(i/40,v)),v===1?.020:.006);
    tube(group,m.lensGlint,Array.from({length:15},(_,i)=>{const p=surface(.14+i*.018,.82);p[2]+=.008;return p;}),.004);
    for(const sign of[-1,1])tube(group,m.frame,[[sign*.421,2.106,.383],[sign*.487,2.07,.23],[sign*.493,2.018,-.025]],.015);
  } else {
    for(const sign of id==='monocle'?[1]:[-1,1]) {
      const x=sign*(id==='monocle'?.17:.193),points=lensOutline(id,sign),slot=new THREE.Group();
      group.add(slot);slot.position.set(x,2.045,.511);slot.rotation.y=sign*.13;
      add(slot,frameGeometry(points,id==='3d'?.029:metal?.009:.019,metal?.013:.022),frame);
      if(['sun','aviator','3d'].includes(id)) {
        plaque(slot,id==='3d'?(sign<0?m.red:m.blue):m.lens,points.map(([x,y])=>[x*.995,y*.995]),[0,0,.002],.008,.001);
        // A restrained opaque reflection stroke; eyes remain visible in open frames.
        tube(slot,m.lensGlint,[[-.085,.054,.017],[-.054,.084,.017],[-.013,.087,.017]],.0045);
      }
      if(id!=='monocle') {
        const outer=sign*(id==='cat_eye'?.18:.158),height=id==='cat_eye'?.11:.063;
        sphere(slot,m.metal,[outer,height,.022],[.018,.01,.01]);
        if(!metal)sphere(slot,m.cream,[outer,height,.032],[.005,.004,.003]);
      }
    }
    if(id==='monocle') {
      const path=new THREE.CatmullRomCurve3([[.303,1.97,.515],[.374,1.75,.466],[.384,1.55,.432],[.348,1.42,.447]].map(V));
      for(let i=0;i<28;i++){
        const p=path.getPoint(i/27),ring=add(group,new THREE.TorusGeometry(.012,.003,5,12),m.metal,p.toArray(),[.65,1,1]);
        ring.rotation.y=(i%2)*Math.PI/2;
      }
    }else {
      tube(group,frame,[[-.05,2.079,.531],[0,2.103,.55],[.05,2.079,.531]],metal?.008:.014);
      if(id==='aviator')tube(group,m.metal,[[-.12,2.168,.52],[0,2.18,.537],[.12,2.168,.52]],.006);
      for(const sign of[-1,1]) {
        const outer=id==='cat_eye'?.375:.351,height=id==='cat_eye'?2.156:2.108;
        tube(group,frame,[[sign*outer,height,.49],[sign*.451,2.099,.335],[sign*.492,2.044,.095],[sign*.474,2.011,-.05]],metal?.008:.012);
        tube(group,metal?m.leather:frame,[[sign*.49,2.05,.12],[sign*.492,2.019,.011],[sign*.474,2.011,-.05]],.014);
      }
    }
  }
  batch(group);
}
