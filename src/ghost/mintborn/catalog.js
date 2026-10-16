// Review catalog, not a committed mint distribution. All IDs render in the viewer.
export const CATALOG_VERSION = 'ghost-textiles-03';
const list = rows => rows.map(([id, label, weight = 1]) => ({ id, label, weight }));
export const HATS = list([
  ['none','None',7],['beret','Beret',4],['bucket','Bucket hat',4],['beanie','Cuffed beanie',4],
  ['cap','Baseball cap',4],['boater','Straw boater',3],['bowler','Bowler',3],['top_hat','Top hat',2],
  ['witch','Floppy witch hat',2],['wizard','Wizard hat',1],['crown','Crown',1],['paperboat','Folded paper hat',2],
  ['sailor','Sailor cap',3],['chef','Chef hat',2],['mushroom','Mushroom cap',2],['bow','Ribbon bow',3],
  ['flower_crown','Flower crown',2],['propeller','Propeller cap',1],['hardhat','Hard hat',2],
  ['antenna','Antenna headband',1],['headphones','Headphones',3],
  ['nightcap','Drooping nightcap',3],['bonnet','Soft bonnet',2],['rainhat',"Fisherman's rain hat",3],
  ['deerstalker','Red hunting cap',2],['newsboy','Newsboy cap',3],['pilot','Leather aviator cap',2],
  ['cowboy','Cowboy hat',3],['tricorne','Pirate tricorne',2],['umbrella','Tiny umbrella hat',1],
  ['fez','Fez with tassel',2],['mortarboard','Graduation cap',2],['party','Party cone',2],
]);
export const GLASSES = list([
  ['none','None',8],['round','Round spectacles',4],['oval','Oval spectacles',3],['square','Square frames',3],
  ['cat_eye','Cat-eye frames',2],['hexagon','Hexagonal frames',2],['heart','Heart frames',1],
  ['star','Star frames',1],['aviator','Aviators',3],['sun','Round sunglasses',4],['visor','Visor',1],
  ['monocle','Monocle',2],['3d','3D glasses',1],
  ['groucho','Groucho disguise',2],['readers','Granny glasses with chain',3],
  ['swim','Swimming goggles',2],['pince_nez','Pince-nez',2],['motoring','Vintage motoring goggles',2],
  ['eyepatch','Pirate eyepatch',2],['hypnosis','Spiral hypnosis glasses',1],
  ['shutter','Shutter shades',2],['flip_up','Flip-up sunglasses',2],
]);
export const MARKINGS = list([
  ['none','Plain cloth',5],['sailor','Broad sailor stripes',3],['pinstripe','Vertical stripes',3],
  ['gingham','Gingham',3],['checker','Checkerboard',2],['diamonds','Harlequin diamonds',2],
  ['polka','Polka dots',3],['stars','Scattered stars',3],['moons','Crescent moons',2],
  ['celestial','Constellations',2],['clouds','Clouds',2],['rain','Raindrops',2],
  ['sunburst','Sun medallion',1],['floral','Tulips',2],['daisies','Daisies',3],
  ['fern','Fern fronds',3],['vines','Climbing vines',2],['waves','Ocean waves',3],
  ['scales','Scallop scales',2],['patchwork','Patchwork quilt',3],['stitches','Mended patches',3],
  ['hearts','Scattered hearts',2],['lightning','Lightning bolts',2],['terrazzo','Paint confetti',2],
  ['tie_dye','Tie-dye rings',1],['sash','Diagonal sash',2],['hem_border','Embroidered border',2],
  ['spots','Leopard spots',2],
]);
export const COLOR_FAMILIES = [
  {id:'linen',label:'Linen',base:'#eee3c9',dark:'#53646a',second:'#b6c9b3',third:'#d3a877'},
  {id:'ink',label:'Ink',base:'#303e50',dark:'#f1dba2',second:'#738c9c',third:'#bf8d9b'},
  {id:'coral',label:'Coral',base:'#d88370',dark:'#513d4a',second:'#f0c08f',third:'#ac778f'},
  {id:'ochre',label:'Ochre',base:'#d8b455',dark:'#574b34',second:'#f0dba4',third:'#be764f'},
  {id:'leaf',label:'Leaf',base:'#819453',dark:'#2e5145',second:'#cfce93',third:'#578f83'},
  {id:'mint',label:'Mint',base:'#a4c9b2',dark:'#365d62',second:'#d5dda9',third:'#839ab0'},
  {id:'teal',label:'Teal',base:'#448f91',dark:'#f1dfb5',second:'#a3d0c4',third:'#64839d'},
  {id:'sky',label:'Sky',base:'#7daccc',dark:'#304d6e',second:'#d2ddd2',third:'#6f83b4'},
  {id:'indigo',label:'Indigo',base:'#555582',dark:'#f0dba5',second:'#9b94bf',third:'#5e91a0'},
  {id:'lilac',label:'Lilac',base:'#b1a1c5',dark:'#554369',second:'#ddb7bf',third:'#edcf9f'},
  {id:'rose',label:'Rose',base:'#d5a3b9',dark:'#70455c',second:'#e9c6a6',third:'#ac99c2'},
  {id:'rust',label:'Rust',base:'#ae6c4a',dark:'#f0d6a1',second:'#d6a668',third:'#b16e7d'},
];
// Exact draft quotas per 10,000; these are collection-wide counts, not weights.
export const RARE_FABRICS = [
  {id:'rainbow',label:'Rainbow',base:'#e66367',dark:'#493d63',second:'#eacb65',third:'#6e81cf',pattern:'rainbow',finish:'cotton',edition:25},
  {id:'jet_black',label:'Jet Black',base:'#08090d',dark:'#9a9ca5',second:'#08090d',third:'#08090d',pattern:'solid',finish:'jet',edition:40},
  {id:'opal',label:'Opal',base:'#e8e5db',dark:'#7b7a97',second:'#b8dbd0',third:'#c5b8df',pattern:'aurora',finish:'opal',edition:20},
  {id:'antique_gold',label:'Antique Gold',base:'#d6ae55',dark:'#594426',second:'#997031',third:'#f0d896',pattern:'aurora',finish:'gold',edition:10},
  {id:'starlight',label:'Starlight',base:'#111827',dark:'#b7c5e0',second:'#252943',third:'#3a3154',pattern:'aurora',finish:'starlight',edition:5},
];
COLOR_FAMILIES.push(...RARE_FABRICS.map(f=>({...f,rare:true})));
export const PALETTES = COLOR_FAMILIES.flatMap(f => f.rare ? [
  {id:f.id,label:f.label+' · Rare',family:f.id,pattern:f.pattern,colors:[f.base,f.second,f.third],finish:f.finish,edition:f.edition}
] : [
  {id:f.id,label:f.label,family:f.id,pattern:'solid',colors:[f.base,f.second,f.third]},
  {id:f.id+'-fade',label:f.label+' fade',family:f.id,pattern:'vertical',colors:[f.base,f.second,f.third]},
  {id:f.id+'-diagonal',label:f.label+' diagonal',family:f.id,pattern:'diagonal',colors:[f.base,f.second,f.third]},
  {id:f.id+'-aurora',label:f.label+' aurora',family:f.id,pattern:'aurora',colors:[f.base,f.second,f.third]},
]);
export const ACCESSORY_COLORS = ['#354b49','#655768','#bd7559','#d5b862','#637f9a','#e9dcc0','#855647','#496780'];
export const labelFor = (list,id) => list.find(x=>x.id===id)?.label ?? id;
export function random(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function weighted(rows,r) { let value=r()*rows.reduce((n,x)=>n+x.weight,0); for(const item of rows){value-=item.weight;if(value<0)return item.id;}return rows.at(-1).id; }
export function compatible(hat,glasses) {
  if(['headphones','pilot','bonnet'].includes(hat)&&glasses==='visor')return false;
  // Raised clip-ons need forehead clearance from low peaks and broad brims.
  if(glasses==='flip_up'&&['cap','propeller','bucket','bowler','boater','witch','wizard','rainhat','deerstalker','newsboy','cowboy','tricorne','bonnet'].includes(hat))return false;
  return true;
}
export function coarseKey(t) {
  const hat=t.hat==='hardhat'?'cap':t.hat;
  const eyewear=['round','oval','hexagon'].includes(t.glasses)?'spectacles':['sun','aviator'].includes(t.glasses)?'sunglasses':t.glasses;
  return [hat,eyewear,t.marking,t.paletteFamily].join('|');
}
export function recipeFromPalette(paletteId) {
  const p=PALETTES.find(p=>p.id===paletteId) ?? PALETTES[0];
  const f=COLOR_FAMILIES.find(f=>f.id===p.family);
  return {palette:p.id,paletteFamily:p.family,pattern:p.pattern,finish:p.finish??'cotton',colors:[...p.colors],markColor:f.dark};
}
export function generateCollection(seed=9082026,count=10000) {
  if(!Number.isInteger(count)||count<1||count>10000)throw new Error('Review collection supports 1–10,000 ghosts.');
  const r=random(seed), used=new Set(), recipes=[];
  const ordinary=PALETTES.filter(p=>!p.edition), rareSlots=[];
  for(const f of RARE_FABRICS)for(let i=0;i<Math.floor(f.edition*count/10000);i++)rareSlots.push(f.id);
  while(rareSlots.length<count)rareSlots.push(null);
  const shuffle=random(seed^0x61c88647);
  for(let i=rareSlots.length-1;i>0;i--){const j=Math.floor(shuffle()*(i+1));[rareSlots[i],rareSlots[j]]=[rareSlots[j],rareSlots[i]];}
  let attempts=0;
  while(recipes.length<count && attempts++<count*100){
    const hat=weighted(HATS,r),glasses=weighted(GLASSES,r),marking=rareSlots[recipes.length]?'none':weighted(MARKINGS,r);
    if(!compatible(hat,glasses))continue;
    const palette=rareSlots[recipes.length]?PALETTES.find(p=>p.id===rareSlots[recipes.length]):ordinary[Math.floor(r()*ordinary.length)];
    const recipe={version:3,catalog:CATALOG_VERSION,body:'sheet-01',...recipeFromPalette(palette.id),
      hat,glasses,marking,accessoryColor:ACCESSORY_COLORS[Math.floor(r()*ACCESSORY_COLORS.length)],
      trimColor:palette.family==='ink'||palette.family==='indigo'?'#d7b65b':'#e6d6b1',markScale:1};
    const key=coarseKey(recipe); if(used.has(key))continue;
    used.add(key); recipes.push({number:recipes.length+1,...recipe});
  }
  if(recipes.length!==count)throw new Error('Could not produce requested unique collection.');
  return recipes;
}

export function hatFraming(id){return ['witch','wizard'].includes(id)?.4:['party'].includes(id)?.3:['top_hat','chef','antenna','nightcap','umbrella','fez'].includes(id)?.18:0;}
