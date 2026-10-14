import {ARMORS} from './core.mjs';
const TAU=Math.PI*2;
export const HERO_PROPORTIONS=Object.freeze({bodyWidth:1,bodyHeight:1,headScale:1,exploreScale:.92,battleScale:1.30});
export function heroDimensions(scale=1,mounted=false){return {width:84*scale,height:(144+(mounted?24:0))*scale};}
export function enemyDimensions(id){return id==='warden'?{width:184,height:211}:id==='wolf'?{width:101,height:118}:{width:66,height:104};}
let heroAtlas=null,creatureAtlas=null;
export function setHeroAtlas(image){heroAtlas=image;}
export function setCreatureAtlas(image){creatureAtlas=image;}
const CREATURES={dragon:{box:[0,0,575,500],clip:[[0,0],[575,0],[575,211],[550,222],[550,407],[575,418],[575,500],[0,500]]},warden:{box:[548,0,507,494],clip:[[78,0],[507,0],[507,494],[278,494],[278,454],[238,454],[230,479],[42,479],[42,400],[18,358],[0,343],[0,195],[53,195],[53,89]]},wolf:{box:[1054,0,482,510],clip:[[0,0],[482,0],[482,510],[302,510],[302,445],[208,445],[208,483],[0,483]]},fox:{box:[0,561,550,430]},glaive:{box:[713,457,181,556],clip:[[74,0],[110,0],[110,162],[181,201],[181,556],[0,556],[0,92]]},staff:{box:[1191,459,303,554],clip:[[70,0],[115,0],[163,75],[166,150],[303,291],[303,554],[0,554],[0,146],[42,75]]}};
function creaturePart(c,key,x,y,w,h){const p=CREATURES[key];c.save();c.translate(x,y);c.scale(w/p.box[2],h/p.box[3]);if(p.clip){c.beginPath();p.clip.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.closePath();c.clip();}c.drawImage(creatureAtlas,...p.box,0,0,p.box[2],p.box[3]);c.restore();}
const PARTS={face:[46,19,259,287],back:[394,29,217,292],crown:[667,13,256,286],halo:[987,98,237,224],crimsonBody:[31,324,278,262],jadeBody:[365,327,240,269],ivoryBody:[645,327,284,262],boots:[993,378,228,186],crimsonSkirt:[35,608,271,271],jadeSkirt:[343,609,275,276],ivorySkirt:[652,611,281,267],hand:[1044,657,123,206],crimsonArm:[84,885,164,342],jadeArm:[416,895,140,328],ivoryArm:[728,892,133,335],sword:[1057,882,126,348]};
function part(c,key,x,y,w,h){c.drawImage(heroAtlas,...PARTS[key],x,y,w,h);}
// Every piece keeps the atlas aspect ratio. Source landmarks, rather than
// image rectangle centres, connect the neck to the opening of each garment.
const GARMENTS={
 crimson:{collar:[146,39],lip:50},
 jade:{collar:[114,43],lip:62},
 ivory:{collar:[146,41],lip:53},
};
export function heroAttachment(armor='crimson',back=false){
 const id=GARMENTS[armor]?armor:'crimson',source=PARTS[id+'Body'];
 const body={x:-27,y:-101,w:54,h:54*source[3]/source[2]};
 const k=body.w/source[2],g=GARMENTS[id];
 const socket={x:body.x+g.collar[0]*k,y:body.y+g.collar[1]*k};
 const size=back?29:30,headPart=back?'back':'face',box=PARTS[headPart];
 const hs=size/box[2],anchor=back?[111,263]:[145,267];
 const head={x:socket.x-anchor[0]*hs,y:socket.y-anchor[1]*hs,w:size,h:box[3]*hs};
 const crown={x:head.x+(back?0:3),y:head.y-6,w:24,h:24*286/256};
 const ornament={x:head.x+(back?-1:1),y:head.y+5,w:28,h:28*224/237};
 return {body,socket,head,crown,ornament,lip:body.y+g.lip*k,headPart};
}
function paintedHead(c,equip,armor,back){
 const {body,socket,head,crown,ornament,lip,headPart}=heroAttachment(armor,back);
 if(equip.head==='halo')part(c,'halo',ornament.x,ornament.y,ornament.w,ornament.h);
 // The cervical root sits behind the jaw, not at the tip of the chin.
 // The jaw points forward with the face; the neck enters the same collar.
 shape(c,[[socket.x-5,socket.y-7],[socket.x+5,socket.y-6],[socket.x+5,socket.y+8],[socket.x-4,socket.y+8]],
  grad(c,socket.x-4,socket.y-5,socket.x+4,socket.y+5,['#99725a','#d6b494','#ad826a']),null);
 part(c,headPart,head.x,head.y,head.w,head.h);
 if(equip.hair==='ink'){
  c.save();
  if(!back){c.beginPath();[[0,0],[1,0],[1,.42],[.88,.45],[.72,.38],[.58,.43],[.56,.58],[.50,.73],[.60,.95],[.4,1],[0,1]].forEach(([px,py],i)=>i?c.lineTo(head.x+px*head.w,head.y+py*head.h):c.moveTo(head.x+px*head.w,head.y+py*head.h));c.closePath();c.clip();}
  c.filter='brightness(0.40) saturate(0.5)';part(c,headPart,head.x,head.y,head.w,head.h);c.restore();
 }
 if(!back){c.save();c.beginPath();c.rect(socket.x-10,lip,20,12);c.clip();part(c,armor+'Body',body.x,body.y,body.w,body.h);c.restore();}
 if(equip.head==='crown')part(c,'crown',crown.x,crown.y,crown.w,crown.h);
 else{c.save();c.beginPath();c.rect(ornament.x,ornament.y,ornament.w,7);c.clip();part(c,'halo',ornament.x,ornament.y,ornament.w,ornament.h);c.restore();}
}
function paintedHero(c,x,y,o){
 const {equip={armor:'crimson',weapon:'sword',head:'crown',hair:'silver'},dir=3,t=0,action='idle',scale=1,mounted=false,portrait=false}=o;
 const back=[0,1,7].includes(dir),mirror=[5,6,7].includes(dir)?-1:1;
 const walk=action==='walk',phase=walk?Math.sin(t*10):Math.sin(t*2)*.06,bob=walk?Math.abs(phase)*2:Math.sin(t*2)*.6;
 const attack=action==='attack',cast=action==='cast',brace=action==='defend';
 c.save();c.translate(x,y);c.scale(scale,scale);if(!portrait)shadow(c,0,1,mounted?48:28);
 if(mounted)drawDragon(c,0,0,{t,walk,dir,scale:.86});
 c.translate(action==='hit'?Math.sin(t*48)*3:0,-bob-(mounted?24:0));c.scale(mirror,1);
 if(action==='defeat'){c.rotate(-1.1);c.translate(-35,30);}
 const armor=['crimson','jade','ivory'].includes(equip.armor)?equip.armor:'crimson';
 // Keep source aspect ratios for every direction. The legacy atlas still
 // only has front/back views; squeezing a front view is not a side view.
 // Limbs and clothes have independent attachment points and motion.
 for(const leg of [-1,1]){c.save();c.beginPath();c.rect(leg===-1?-23:0,-36,23,43);c.clip();c.translate(0,mounted?-4:phase*leg*3);part(c,'boots',-17,-26,34,34*186/228);c.restore();}
 c.save();c.translate(0,-56);c.rotate(phase*.04);part(c,armor+'Skirt',-24.5,0,49,49*PARTS[armor+'Skirt'][3]/PARTS[armor+'Skirt'][2]);c.restore();
 const drawArm=(k,upperOnly=false)=>{
  c.save();c.translate(k*20,-84);
  c.rotate(k*phase*.18+(k===1?(attack?-.9+Math.sin(t*18)*.65:cast?-.95:brace?-.65:0):cast?.55:0));
  if(k===-1)c.scale(-1,1);
  // The torso owns both shoulder plates. Only the sleeve below the upper
  // shoulder is used here; a second pauldron must never cover the torso.
  const arm=PARTS[armor+'Arm'],ak=17/arm[2],trim=armor==='jade'?90:115;
  const sleeve=armor==='jade'?['#234d56','#50868a']:armor==='ivory'?['#273342','#59677a']:['#40262c','#754249'];
  // Continuous undersleeve connects the shoulder socket to the trimmed arm
  // even when raised. It stays beneath the torso's one visible pauldron.
  if(k===-1||upperOnly){
   c.beginPath();c.moveTo(-4,2);c.quadraticCurveTo(-4,-3,0,-3);c.quadraticCurveTo(4,-3,4,2);c.lineTo(5,trim*ak+8);c.lineTo(-5,trim*ak+8);c.closePath();c.fillStyle=grad(c,-5,0,5,0,sleeve);c.fill();
  }
  if(upperOnly){c.restore();return;}
  c.drawImage(heroAtlas,arm[0],arm[1]+trim,arm[2],arm[3]-trim,-8,trim*ak,17,(arm[3]-trim)*ak);
  const wristY=arm[3]*ak;
  // Use the actual hand and a short cuff, not a second full forearm.
  const hand=PARTS.hand,hk=8/hand[2],handTrim=78;
  const handY=wristY-3;
  c.drawImage(heroAtlas,hand[0],hand[1]+handTrim,hand[2],hand[3]-handTrim,-3,handY,8,(hand[3]-handTrim)*hk);
  if(k===1){c.save();c.translate(2,handY+6);
   if(equip.weapon==='sword'){c.rotate(attack?.3:.4);part(c,'sword',-8,-58,21,21*348/126);}
   else drawWeapon(c,equip.weapon,0,0,cast?-.2:.32,1.05);
   c.restore();
  }
  c.restore();
 };
 drawArm(-1);drawArm(1,true);
 // Rear-facing cloth hides the front belt; this is a rigged prototype, not a full direction atlas.
 const body=heroAttachment(armor).body;part(c,armor+'Body',body.x,body.y,body.w,body.h);
 if(back)part(c,armor+'Skirt',-19,-88,38,38*PARTS[armor+'Skirt'][3]/PARTS[armor+'Skirt'][2]);
 drawArm(1);
 paintedHead(c,equip,armor,back);
 c.restore();
}
function ellipse(c,x,y,rx,ry,fill,stroke){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.stroke();}}
function shape(c,pts,fill,stroke='#342c32',width=1){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.lineWidth=width;c.strokeStyle=stroke;c.stroke();}}
function grad(c,x1,y1,x2,y2,colors){const g=c.createLinearGradient(x1,y1,x2,y2);colors.forEach((v,i)=>g.addColorStop(i/(colors.length-1),v));return g;}
function line(c,pts,color,width=1){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
export function shadow(c,x,y,w=30){ellipse(c,x,y,w,w*.29,'rgba(17,24,27,.33)');}
export function ring(c,x,y,r,color='#8ce9d7',t=0){c.save();c.globalAlpha=.55+Math.sin(t*3)*.15;c.lineWidth=2;ellipse(c,x,y,r,r*.32,'rgba(68,208,195,.07)',color);c.globalAlpha=.28;ellipse(c,x,y,r+5,(r+5)*.32,'transparent',color);c.restore();}
export function drawWeapon(c,type,x,y,angle=0,scale=1){if(creatureAtlas&&['glaive','staff'].includes(type)){c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);creaturePart(c,type,type==='staff'?-13:-11,-86,type==='staff'?47:36,122);c.restore();return;}c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);const steel=grad(c,-7,0,8,0,['#677588','#eefbfb','#90acba']);if(type==='sword'){line(c,[[0,17],[0,-15]],'#382a20',5);line(c,[[0,13],[0,-8]],'#e2ba68',1.5);shape(c,[[-5,-15],[-4,-60],[0,-74],[5,-60],[5,-15]],steel);line(c,[[0,-67],[0,-18]],'#f4f6dd',1);shape(c,[[-13,-15],[-10,-22],[0,-19],[10,-22],[13,-15]],'#d6a64e');ellipse(c,0,18,4,4,'#ad322c','#e4bf6c');}else if(type==='glaive'){line(c,[[0,30],[0,-72]],'#2b302c',5);line(c,[[-1,30],[-1,-72]],'#cdb879',1.5);shape(c,[[0,-66],[0,-102],[8,-98],[20,-72],[11,-60],[5,-64]],steel,'#645235');shape(c,[[3,-74],[9,-84],[15,-72],[11,-65]],'#be3e39',null);line(c,[[0,-64],[0,-49]],'#bd873f',6);shape(c,[[0,-53],[18,-43],[10,-32],[4,-40]],'#b73c30',null);}else{line(c,[[0,26],[0,-70]],'#685438',6);line(c,[[-1,23],[-1,-68]],'#d4ad60',2);c.lineWidth=3;ellipse(c,0,-78,12,16,'rgba(76,216,236,.15)','#dab565');shape(c,[[0,-99],[8,-80],[0,-61],[-8,-80]],grad(c,-8,-90,8,-65,['#e2ffff','#5bdbea','#4c6bc2']),'#c5fcfc');line(c,[[-10,-66],[-18,-48]],'#49a69c',3);}
c.restore();}
export function drawHero(c,x,y,opts={}){if(heroAtlas){paintedHero(c,x,y,opts);return;}const {equip={armor:'crimson',weapon:'sword',head:'crown',hair:'silver'},dir=3,t=0,action='idle',scale=1,mounted=false,portrait=false}=opts;const a=ARMORS.find(a=>a.id===equip.armor)||ARMORS[0];const back=[0,1,7].includes(dir);const side=[2,6].includes(dir)?.55:[0,4].includes(dir)?1:.87;const mirror=[5,6,7].includes(dir)?-1:1;const walk=action==='walk',cast=action==='cast',attack=action==='attack',hit=action==='hit';const phase=walk?Math.sin(t*11):Math.sin(t*2)*.1;const bob=walk?Math.abs(Math.sin(t*11))*2:Math.sin(t*2)*1;const swing=attack?Math.sin(t*17)*.8:cast?-.8:phase*.24;c.save();c.translate(x,y);c.scale(scale,scale);if(!portrait)shadow(c,0,0,mounted?44:25);if(mounted)drawDragon(c,0,-1,{t,walk,dir,scale:.8});c.translate(hit?Math.sin(t*55)*3:0,-bob-(mounted?45:0));c.scale(mirror,1);if(action==='defeat'){c.rotate(-1.1);c.translate(-35,35);}
 // Trailing cloth, rear hair and independent weapon layer.
 shape(c,[[-18,-83],[-27,-70],[-24+phase*5,-7],[-5,0],[0,-57]],grad(c,-25,-75,4,0,[a.color,'#202d42']),a.trim,.7);
 if(equip.armor==='ivory')shape(c,[[5,-81],[23,-85],[35+phase*7,-20],[19,-30],[13,-50]],'#d1dce0','#83959c');
 const hair= equip.hair==='ink'?['#131f30','#465c72','#142331']:['#798d9c','#f4f3e4','#b6d0dc'];
 if(back)shape(c,[[-19,-102],[-18,-72],[-10,-55],[1,-70],[14,-58],[22,-85],[14,-106]],grad(c,-20,-90,20,-70,hair),'#546575');
 // Legs and leather boots move separately.
 for(const k of [-1,1]){c.save();const py=phase*k*5;c.translate(k*8,-23+py);c.rotate(phase*k*.17);shape(c,[[-6,-13],[5,-14],[6,17],[-6,17]],'#273347');shape(c,[[-7,9],[7,9],[9,23],[-6,24],[-10,19]],grad(c,-6,10,7,22,['#26394b','#566e75','#20303d']),'#192835');line(c,[[-5,11],[5,11]],a.trim,2);c.restore();}
 // Underrobe and shaped chest armor.
 const robe=a.id==='jade';shape(c,[[-16,-60],[16,-60],[22,-14],[5,-8],[0,-20],[-8,-8],[-25,-13]],grad(c,-24,-60,23,-20,[a.color,a.light,a.color]),'#343940');
 for(let k=-2;k<=2;k++)line(c,[[k*6,-52],[k*8+phase*2,-15]],k%2?'rgba(255,232,177,.22)':'rgba(10,22,35,.26)',1.5);
 shape(c,[[-18,-79],[-8,-87],[9,-87],[21,-76],[15,-47],[-15,-47]],grad(c,-20,-75,20,-50,[a.color,a.light,a.color]),a.trim,1.3);
 if(!robe){for(let i=0;i<3;i++){const yy=-72+i*8;shape(c,[[-14,yy],[0,yy+5],[15,yy], [12,yy+6],[0,yy+10],[-12,yy+6]],grad(c,-14,yy,14,yy,[a.color,a.light,a.color]),a.trim,.7);}}else{shape(c,[[-10,-86],[7,-63],[13,-82],[19,-75],[2,-52],[-15,-78]],'#dee5cf',a.trim,.8);line(c,[[0,-54],[14,-16]],'#ddd9ad',2);}
 line(c,[[-18,-48],[16,-48]],'#263540',9);line(c,[[-18,-48],[16,-48]],a.trim,2);shape(c,[[-5,-53],[4,-53],[7,-48],[1,-43],[-6,-46]],'#d5aa56');ellipse(c,0,-48,2.5,2.8,'#54aaa6');
 // Articulated arms, independent sleeves and gauntlets.
 function arm(k,front){c.save();c.translate(k*(17*side),-77);c.rotate(k*(phase*.22)+(k===1?swing:cast?.6:0));if(robe)shape(c,[[-6,-1],[7,0],[12,32],[-9,27]],grad(c,-6,0,10,30,[a.light,a.color]),a.trim);else{shape(c,[[-7,-2],[6,0],[8,24],[-6,28]],grad(c,-7,0,8,25,[a.color,a.light,a.color]),'#303743');shape(c,[[-11,-3],[-6,-10],[8,-8],[13,2],[8,9],[-10,6]],grad(c,-9,-9,12,8,[a.trim,a.light,a.color]),a.trim);for(let i=0;i<2;i++)line(c,[[-7,1+i*3],[9,4+i*3]],'#ad864e',.7);}shape(c,[[-6,22],[7,21],[8,34],[-6,35]],'#364552',a.trim);ellipse(c,1,38,5,6,'#e0ab84','#7d5341');if(k===1)drawWeapon(c,equip.weapon,2,39,attack?-.8:cast?-.25:-.18,.93);c.restore();}
 arm(-1,false);arm(1,true);
 // Neck and sculpted face.
 ellipse(c,0,-88,7,9,'#cea684','#6c5145');c.save();c.translate(1,-102);c.scale(side,1);ellipse(c,0,-3,20,22,grad(c,-19,-20,19,15,hair),'#4e606b');
 if(!back){shape(c,[[-14,-9],[-10,-18],[11,-17],[17,-7],[13,12],[4,19],[-6,16],[-13,5]],grad(c,-12,0,14,7,['#bd8871','#f5d6b0','#dcad85']),'#986f58',.7);ellipse(c,-14,0,4,6,'#d1a285');ellipse(c,15,1,3,5,'#e4b88e');
 line(c,[[-10,-3],[-4,-5]],'#525259',1.7);line(c,[[4,-5],[11,-4]],'#414452',1.8);line(c,[[-10,0],[-4,0]],'#353946',1.5);line(c,[[4,0],[11,0]],'#333d49',1.5);ellipse(c,-7,0,1.3,2.2,'#253346');ellipse(c,7,0,1.3,2.2,'#253346');line(c,[[0,1],[-1,7],[3,7]],'#ad7e68',.7);line(c,[[-3,11],[4,11]],'#9f6661',1);}
 // Hair silhouette with individual locks.
 const locks=back?[[[-17,-17],[-21,14],[-9,24],[-6,-9]],[[-5,-21],[-7,24],[3,15],[7,-20]],[[9,-21],[6,18],[16,22],[21,-6]]]:[[[-17,-18],[-23,-6],[-18,16],[-9,-8]], [[-11,-24],[-5,-12],[-3,3],[5,-13],[1,-25]],[[0,-26],[9,-12],[17,-4],[14,-21]], [[15,-20],[17,15],[23,6],[23,-9]]];for(const pts of locks)shape(c,pts,grad(c,-19,-20,21,12,hair),'#758996',.7);
 if(equip.head==='crown'){shape(c,[[-17,-14],[-11,-19],[-3,-17],[0,-26],[5,-18],[16,-15],[8,-10],[-8,-11]],'#b83235','#e0b57a');shape(c,[[-12,-18],[-25,-38],[-23,-13],[-17,-6]],grad(c,-25,-40,-15,-5,['#eff6e7','#899baf']), '#6d828f');shape(c,[[11,-18],[23,-37],[22,-11],[15,-6]],grad(c,11,-37,23,-8,['#f2f0df','#92b1c3']),'#6d828f');ellipse(c,0,-16,3.5,4,'#73d7d3','#e8d6a0');}else{line(c,[[-20,-16],[18,-21]],'#e2c784',3);ellipse(c,5,-21,5,5,'#7ddac1','#d5bd73');shape(c,[[15,-19],[23,-12],[27,26],[23,20],[18,-10]],'#6aa89f',null);}
 c.restore();c.restore();}
export function drawDragon(c,x,y,{t=0,walk=false,dir=3,scale=1}={}){if(creatureAtlas){c.save();c.translate(x,y+(walk?Math.abs(Math.sin(t*10))*2:Math.sin(t*2)*.7));c.scale([5,6,7].includes(dir)?-scale:scale,scale);creaturePart(c,'dragon',-100,-148,206,155);c.restore();return;}c.save();c.translate(x,y);c.scale(scale,scale);if([5,6,7].includes(dir))c.scale(-1,1);const p=walk?Math.sin(t*10):Math.sin(t*2)*.1;
 line(c,[[-10,-25],[-52,-22],[-74,-41],[-91,-38]],'#683646',12);line(c,[[-12,-28],[-51,-26],[-73,-44],[-90,-40]],'#bb5b60',6);
 shape(c,[[-7,-33],[-28,-79],[-57,-96],[-61,-57],[-43,-70],[-36,-40]],grad(c,-55,-85,-15,-35,['#a93043','#e89996','#733643']),'#722a3d',2);
 ellipse(c,0,-26,39,24,grad(c,-30,-49,35,-5,['#e18075','#bc484c','#7b303f']),'#78323d');ellipse(c,9,-15,25,12,'#edc6a1','#a25b58');
 for(const k of [-1,1]){shape(c,[[-24+k*4,-22],[-25+k*3,9+p*k*3],[-37+k*3,10+p*k*3],[-32+k*6,-20]],'#a2464b','#71333f');shape(c,[[23+k*3,-21],[32+k*3,8-p*k*3],[18+k*3,10-p*k*3],[17+k*3,-18]],'#c2685e','#71333f');}
 shape(c,[[25,-32],[27,-60],[49,-73],[64,-64],[62,-46],[40,-36]],grad(c,26,-73,62,-36,['#d68b7c','#ba4e52','#7d3b48']),'#753244');ellipse(c,56,-53,19,10,'#cc7066','#894149');shape(c,[[31,-60],[24,-83],[42,-69]],'#edd6b6','#8f6770');shape(c,[[44,-70],[52,-88],[54,-68]],'#e8d6b7','#8f6770');ellipse(c,50,-63,4,3,'#f4e28b');ellipse(c,51,-63,1.6,3,'#1a2e39');ellipse(c,65,-55,2,1.4,'#703844');
 shape(c,[[-7,-35],[-19,-75],[-47,-91],[-37,-43],[-25,-57],[-20,-23]],grad(c,-40,-90,-8,-28,['#743444','#e49e92','#b1424d']),'#693849',2);line(c,[[-12,-34],[-20,-72],[-45,-90]],'#efb3a5',2);
 shape(c,[[-16,-45],[13,-45],[21,-34],[11,-27],[-15,-30],[-24,-37]],'#634a38','#d9aa66',2);line(c,[[-16,-35],[-17,-9]],'#d8b278',3);c.restore();}
export function drawFox(c,x,y,t=0,scale=1){if(creatureAtlas){c.save();c.translate(x,y);c.scale(scale,scale);shadow(c,0,1,26);creaturePart(c,'fox',-44,-67+Math.sin(t*3),88,69);c.restore();return;}c.save();c.translate(x,y);c.scale(scale,scale);shadow(c,0,1,18);const bob=Math.sin(t*3)*2;c.translate(0,bob);for(let i=0;i<3;i++){c.save();c.translate(-12,-12);c.rotate(-.65+i*.35+Math.sin(t*2+i)*.08);ellipse(c,-14,-11,20,8,grad(c,-25,-12,5,-12,['#b8ddd5','#f2ede3']),'#669398');c.restore();}ellipse(c,0,-14,15,15,'#dee6d9','#7daba5');ellipse(c,6,-29,14,13,'#f0ede1','#829da1');shape(c,[[-6,-34],[-8,-53],[6,-39]],'#e6e3d5','#91a7aa');shape(c,[[10,-38],[22,-52],[20,-27]],'#e6e3d5','#91a7aa');line(c,[[0,-31],[4,-32]],'#397982',2);line(c,[[12,-32],[16,-30]],'#397982',2);ellipse(c,9,-24,2,1.4,'#5c6466');ellipse(c,6,-36,2,3,'#69bfbb');c.restore();}
export function drawEnemy(c,x,y,e,t,selected=false){if(creatureAtlas&&['wolf','warden'].includes(e.id)){c.save();c.translate(x,y);if(e.hp<=0){c.globalAlpha=.23;c.rotate(-.4);}const big=e.id==='warden';if(big)c.scale(1.15,1.15);shadow(c,0,0,big?48:28);if(selected)ring(c,0,0,big?47:32,'#ffc779',t);c.scale(-1,1);creaturePart(c,e.id,big?-80:-49,(big?-179:-112)+Math.sin(t*2),big?160:101,big?183:118);c.restore();return;}c.save();c.translate(x,y);if(e.hp<=0){c.globalAlpha=.24;c.translate(0,12);c.rotate(-.5);}const p=Math.sin(t*2);shadow(c,0,0,e.id==='warden'?44:26);if(selected)ring(c,0,0,e.id==='warden'?47:32,'#ffc779',t);
 if(e.id==='wolf'){for(const k of [-1,1]){shape(c,[[k*12,-33],[k*18,-7],[k*24,1],[k*8,1],[k*6,-29]],'#313d58','#1c2a3b');}ellipse(c,0,-41+p,21,30,grad(c,-20,-65,21,-20,['#76828e','#43516c','#293747']),'#252f43');shape(c,[[-20,-57],[-37,-39],[-31,-20],[-25,-36],[-8,-44]],'#41445e','#253146');shape(c,[[18,-58],[37,-38],[30,-18],[24,-35],[7,-43]],'#51536d','#253146');shape(c,[[-22,-65],[-21,-98],[-6,-84],[7,-84],[20,-99],[23,-61],[7,-50],[-8,-52]],grad(c,-23,-90,23,-60,['#738599','#454769','#272d45']),'#253244');shape(c,[[-17,-67],[0,-73],[16,-67],[9,-51],[-6,-52]],'#829fa9','#2c3b4d');line(c,[[-15,-77],[-6,-76]],'#d6e66f',3);line(c,[[7,-76],[15,-78]],'#d6e66f',3);shape(c,[[-7,-57],[-5,-45],[-1,-57]],'#e9e0c0',null);shape(c,[[6,-57],[5,-46],[2,-57]],'#e9e0c0',null);
 }else if(e.id==='wisp'){
 c.translate(0,Math.sin(t*3)*3);
 const mist=c.createRadialGradient(0,-47,5,0,-47,44);mist.addColorStop(0,'#a1d0b84d');mist.addColorStop(1,'#527c7d00');ellipse(c,0,-47,44,48,mist);
 // Layered smoke and a narrow ember core keep the spirit out of the emoji style.
 for(let k=0;k<5;k++){
  c.save();c.translate((k-2)*8,-k%2*5);c.rotate((k-2)*.17+Math.sin(t*2+k)*.035);
  shape(c,[[-12,-17],[-22,-35],[-15,-59],[-16,-77],[-6,-96],[-9,-68],[4,-77],[14,-53],[12,-31],[4,-15]],grad(c,-15,-90,15,-12,['#a6c9b17a','#406577c9','#273d52eb']),'#b1d5c03b',.8);c.restore();
 }
 shape(c,[[-17,-63],[-8,-72],[6,-68],[15,-55],[10,-31],[2,-22],[-12,-37]],grad(c,-16,-60,15,-30,['#3b515c','#708d8b','#23354b']),null);
 line(c,[[-12,-58],[-4,-56]],'#dfdea0',2);line(c,[[3,-56],[10,-59]],'#d8e3b2',2);
 shape(c,[[0,-49],[5,-39],[0,-31],[-4,-41]],'#a8d4b4aa',null);
 for(let k=0;k<4;k++){c.globalAlpha=.18;line(c,[[18-k*10,-26],[23-k*11,-14],[13-k*8,-7]],'#b7dcca',1);c.globalAlpha=1;}

 }else{c.scale(1.3,1.3);for(let k of [-1,1]){shape(c,[[k*6,-35],[k*22,-38],[k*23,-6],[k*32,0],[k*6,0]],'#526878','#263d4a');shape(c,[[k*22,-84],[k*40,-80],[k*53,-46],[k*43,-21],[k*31,-45]],'#607c86','#354c5b');}shape(c,[[-29,-82],[0,-100],[31,-80],[21,-35],[-19,-35]],grad(c,-30,-80,31,-30,['#8ba19c','#446a77','#324b60']),'#293e4a',2);for(let i=0;i<3;i++)line(c,[[-20,-70+i*9],[0,-60+i*9],[20,-73+i*9]],'#abc9b8',2);shape(c,[[-20,-87],[-16,-120],[16,-120],[24,-88],[0,-80]],'#526f7d','#203d50',2);shape(c,[[-16,-120],[-28,-140],[-30,-119],[-14,-105]],'#8faba6','#405e66');shape(c,[[16,-120],[27,-140],[30,-119],[15,-105]],'#8faba6','#405e66');line(c,[[-13,-105],[-4,-102]],'#94f9e5',4);line(c,[[5,-102],[15,-105]],'#94f9e5',4);shape(c,[[-6,-64],[0,-78],[7,-63],[0,-50]],'#8affdc','#c4ffe5');}
c.restore();}
export function drawWorldBackdrop(c,w,h,scene,t,image){c.save();if(image){c.drawImage(image,0,0,w,h);}else{const sky=grad(c,0,0,0,h,['#476879','#819793','#8e9580','#515e55']);c.fillStyle=sky;c.fillRect(0,0,w,h);for(let z=0;z<3;z++){c.fillStyle=['#536e78','#3b5d66','#29484f'][z];c.beginPath();c.moveTo(0,180+z*45);for(let x=0;x<=w+80;x+=60)c.lineTo(x,100+z*70+Math.sin(x*.014+z)*60+Math.cos(x*.007)*30);c.lineTo(w,h);c.lineTo(0,h);c.fill();}shape(c,[[w*.33,h*.28],[w*.7,h*.22],[w,h*.6],[w*.8,h],[w*.08,h],[0,h*.65]],grad(c,0,h*.3,0,h,['#879491','#acaa94','#8c947f']),null);c.save();c.globalAlpha=.16;for(let y=200;y<h+200;y+=36)line(c,[[0,y],[w,y-w*.18]],'#2a383c',1);for(let x=-w;x<w*2;x+=85)line(c,[[x,0],[x+w*.9,h]],'#283b3d',1);c.restore();for(let i=0;i<24;i++){let x=i<12?90+(i%4)*50:w-85-(i%4)*45;let y=130+Math.floor(i/4)*85;if(y>h*.75)continue;c.save();c.translate(x,y);const sz=.8+(i%3)*.2;line(c,[[0,0],[0,125]],'#4c4942',10*sz);for(let j=0;j<4;j++)shape(c,[[0,-30+j*24],[-55*sz,55+j*21],[50*sz,50+j*20]],grad(c,-50,0,50,100,['#355e5b','#547865','#274e4f']),null);c.restore();}c.fillStyle='rgba(200,223,212,.07)';c.fillRect(0,130,w,90);}
 // Slow ambient motes and leaves.
 for(let i=0;i<16;i++){const x=(i*173+t*(4+i%3))%w,y=(i*87+Math.sin(t*.3+i)*35)%h;c.globalAlpha=.25+(i%4)*.09;ellipse(c,x,y,1.4,2.5,i%3?'#f7e7ae':'#b9e1d5');}c.restore();}
export function drawCrystal(c,x,y,t){c.save();c.translate(x,y+Math.sin(t*3)*4);c.shadowColor='#a0eeea';c.shadowBlur=14;shape(c,[[0,-33],[12,-14],[8,0],[-7,0],[-13,-14]],grad(c,-10,-30,10,0,['#d6ffff','#70c6c8','#3b7ca9']),'#c5f8ed');line(c,[[0,-33],[0,0]],'#d8ffff',1);c.restore();}
export function label(c,x,y,text,color='#fff6d8',small=false){c.save();c.font=(small?'12':'15')+'px "Noto Sans TC", "Microsoft JhengHei", sans-serif';c.textAlign='center';c.lineWidth=3;c.strokeStyle='rgba(17,30,38,.8)';c.strokeText(text,x,y);c.fillStyle=color;c.fillText(text,x,y);c.restore();}
