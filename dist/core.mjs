export const VERSION=1;
export const ARMORS=[
 {id:'crimson',name:'赤霄戰甲',type:'鎧甲',desc:'赤銅疊甲與金色護肩，攻守均衡。',color:'#a3302d',light:'#e67549',trim:'#e5b76a',atk:6,def:6},
 {id:'jade',name:'青衡道袍',type:'道袍',desc:'青玉長袍、寬袖與垂帶，擅長仙術。',color:'#1d716d',light:'#6eb9a4',trim:'#d6dcab',atk:3,def:4,magic:12},
 {id:'ivory',name:'流雲銀甲',type:'輕甲',desc:'銀白甲片、靛藍內襯與長披帛。',color:'#a0b6c6',light:'#f2eee2',trim:'#dbb865',atk:4,def:10}
];
export const WEAPONS=[{id:'sword',name:'聽風劍',desc:'修長劍身，金色護手。',atk:12,magic:0},{id:'glaive',name:'赤月長戟',desc:'赤月刃與長槍桿，斬擊更有力。',atk:18,magic:0},{id:'staff',name:'玄冰法杖',desc:'懸浮青晶，提升霜華術傷害。',atk:6,magic:16}];
export const HEADS=[{id:'crown',name:'赤羽冠',desc:'朱紅額飾與雙側銀羽。'},{id:'halo',name:'青玉簪',desc:'玉簪束髮與兩條垂帶。'}];
export function freshGame(){return {schemaVersion:VERSION,revision:0,name:'凌雲',level:3,xp:0,gold:360,hp:180,mp:65,potions:5,equip:{armor:'crimson',weapon:'sword',head:'crown',hair:'silver'},mounted:false,quest:0,shards:0,kills:0,bossWins:0,scene:'town',pos:{x:650,y:470},activeBattle:null,claimed:[],chest:false,settings:{sound:false,low:false},savedAt:0};}
export function stats(s){const a=ARMORS.find(x=>x.id===s.equip.armor)||ARMORS[0],w=WEAPONS.find(x=>x.id===s.equip.weapon)||WEAPONS[0];return {maxHp:144+s.level*12,maxMp:50+s.level*5,atk:18+s.level*3+a.atk+w.atk,def:5+s.level*2+a.def,magic:20+s.level*3+(a.magic||0)+w.magic};}
export function clone(s){return JSON.parse(JSON.stringify(s));}
export function startBattle(s,boss=false){const n=clone(s);const seed=((s.kills+1)*931+s.bossWins*311)>>>0;n.mounted=false;n.activeBattle={id:'battle-'+Date.now()+'-'+seed,round:1,boss,seed,target:0,status:'active',enemies:boss?[{id:'warden',name:'玄岩守衛',hp:330,maxHp:330,atk:36,def:12},{id:'wisp',name:'幽火',hp:70,maxHp:70,atk:18,def:3}]:[{id:'wolf',name:'暮影狼',hp:90,maxHp:90,atk:21,def:5},{id:'wisp',name:'幽火',hp:72,maxHp:72,atk:17,def:3},{id:'wolf',name:'暮影狼',hp:100,maxHp:100,atk:23,def:5}],logs:[]};return n;}
function rnd(b){b.seed=(Math.imul(b.seed,1664525)+1013904223)>>>0;return b.seed/4294967296;}
export function actionValid(s,action){const b=s.activeBattle;if(!b||b.status!=='active')return '目前無法出招';if(!['attack','frost','heal','guard','potion','flee'].includes(action))return '未知的招式';if(action==='frost'&&s.mp<12)return '真氣不足，需要 12 點';if(action==='heal'&&s.mp<10)return '真氣不足，需要 10 點';if(action==='potion'&&s.potions<=0)return '沒有回元丹了';return null;}
export function resolveRound(s,action,target=0){const invalid=actionValid(s,action);if(invalid)throw Error(invalid);const n=clone(s),b=n.activeBattle,st=stats(n),events=[];const log=(text,type='info',who='hero',amount=0)=>{events.push({text,type,who,amount});};let guarding=false;
 if(action==='flee'){b.status='fled';log('你帶著靈狐退出戰場。');return {state:n,events};}
 const alive=b.enemies.map((e,i)=>e.hp>0?i:-1).filter(i=>i>=0);const ti=alive.includes(target)?target:alive[0];
 const hurt=(i,power,spell=false)=>{const e=b.enemies[i];if(!e||e.hp<=0)return;const critical=rnd(b)>.85;const damage=Math.max(1,Math.round((power-e.def)*(0.9+rnd(b)*0.2)*(critical?1.5:1)));e.hp=Math.max(0,e.hp-damage);log((critical?'會心！':'')+e.name+' −'+damage,spell?'frost':'damage','enemy'+i,damage);};
 if(action==='attack')hurt(ti,st.atk);
 if(action==='frost'){n.mp-=12;for(const i of alive)hurt(i,st.magic+12,true);log('霜華落下，冰晶覆蓋敵陣。','spell');}
 if(action==='heal'){n.mp-=10;const gain=Math.min(st.maxHp-n.hp,68);n.hp+=gain;log('回春術 ＋'+gain,'heal','hero',gain);}
 if(action==='potion'){n.potions--;const gain=Math.min(st.maxHp-n.hp,95);n.hp+=gain;log('回元丹 ＋'+gain,'heal','hero',gain);}
 if(action==='guard'){guarding=true;n.mp=Math.min(st.maxMp,n.mp+9);log('凝神守禦，回復 9 點真氣。','guard');}
 const left=b.enemies.findIndex(e=>e.hp>0);
 if(left>=0){if(n.hp<st.maxHp*.35&&b.round%2===0){n.hp=Math.min(st.maxHp,n.hp+22);log('靈狐施放靈息 ＋22','heal','hero',22);}else{hurt(left,18+n.level);log('靈狐追擊。','pet');}}
 if(b.enemies.every(e=>e.hp<=0)){b.status='won';if(!n.claimed.includes(b.id)){n.claimed.push(b.id);n.claimed=n.claimed.slice(-64);const xp=b.boss?100:55,gold=b.boss?150:65;n.gold+=gold;n.xp+=xp;n.kills+=b.enemies.length;if(b.boss)n.bossWins++;if(n.quest===1){n.shards=Math.min(3,n.shards+b.enemies.length);if(n.shards>=3)n.quest=2;}if(n.quest===2&&b.boss)n.quest=3;while(n.xp>=n.level*45){n.xp-=n.level*45;n.level++;n.hp=stats(n).maxHp;n.mp=stats(n).maxMp;log('境界提升！等級 '+n.level,'level');}log('獲得 '+xp+' 經驗、'+gold+' 銅錢。','reward');}b.logs=events;return {state:n,events};}
 for(let i=0;i<b.enemies.length;i++){const e=b.enemies[i];if(e.hp<=0)continue;const damage=Math.max(2,Math.round((e.atk-st.def*.55)*(0.9+rnd(b)*.2)*(guarding?.4:1)));n.hp=Math.max(0,n.hp-damage);log(e.name+' 攻擊 −'+damage,'hit','hero',damage);if(n.hp===0){b.status='lost';log('暫退山門，整裝再戰。','lost');break;}}
 b.round++;b.logs=events;return {state:n,events};}
export function leaveBattle(s){const n=clone(s);if(n.activeBattle?.status==='lost'){n.scene='town';n.pos={x:650,y:470};n.hp=Math.round(stats(n).maxHp*.65);n.mp=Math.round(stats(n).maxMp*.65);}n.activeBattle=null;return n;}
export function talkQuest(s){const n=clone(s);if(n.quest===0){n.quest=1;return {state:n,text:'山道上的暮影狼與幽火正在侵擾行人。帶回三枚靈石碎片，再擊退玄岩守衛，我會替你打開下一段旅程。'};}if(n.quest===3){n.quest=4;n.gold+=220;n.potions+=3;n.hp=stats(n).maxHp;n.mp=stats(n).maxMp;return {state:n,text:'山道終於恢復安寧。這是你的酬勞：220 銅錢、3 顆回元丹。第一章完成！你仍可以探索、試裝與挑戰守衛。'};}return {state:n,text:n.quest===1?'到雲隱山道調查異動，收集三枚靈石碎片。':n.quest===2?'碎片已齊，玄岩守衛就在山道深處。準備好再前往。':'你的俠義之心，我會記得。若需補給，隨時回鎮休息。'};}
export function validateSave(raw){if(!raw||raw.schemaVersion!==1)throw Error('存檔版本不支援');const n=freshGame();const ints={level:[1,100],xp:[0,100000],gold:[0,999999],hp:[0,9999],mp:[0,9999],potions:[0,9999],quest:[0,4],shards:[0,3],kills:[0,999999],bossWins:[0,99999]};for(const [k,[lo,hi]]of Object.entries(ints)){if(!Number.isInteger(raw[k])||raw[k]<lo||raw[k]>hi)throw Error('存檔欄位無效：'+k);n[k]=raw[k];}if(typeof raw.name!=='string'||raw.name.length<1||raw.name.length>16)throw Error('角色名稱不正確');n.name=raw.name;for(const [key,choices]of Object.entries({armor:ARMORS.map(x=>x.id),weapon:WEAPONS.map(x=>x.id),head:HEADS.map(x=>x.id),hair:['silver','ink']})){if(!choices.includes(raw.equip?.[key]))throw Error('未知裝備');n.equip[key]=raw.equip[key];}n.scene=['town','field'].includes(raw.scene)?raw.scene:'town';n.pos={x:650,y:470};n.mounted=!!raw.mounted;n.chest=!!raw.chest;n.claimed=Array.isArray(raw.claimed)?raw.claimed.filter(x=>typeof x==='string').slice(-64):[];n.settings={sound:!!raw.settings?.sound,low:!!raw.settings?.low};n.hp=Math.min(n.hp,stats(n).maxHp);n.mp=Math.min(n.mp,stats(n).maxMp);return n;}
export function questText(s){return ['與守山人交談，開啟旅程','擊敗山道妖物 · 靈石 '+s.shards+'/3','前往山道深處 · 挑戰玄岩守衛','返回青嵐鎮 · 向守山人覆命','第一章完成 · 自由探索'][s.quest];}

// Local resumes preserve a validated battle; portable imports return to safety.
export function restoreSave(raw){
 const n=validateSave(raw);
 n.revision=Number.isSafeInteger(raw.revision)&&raw.revision>=0?raw.revision:0;
 n.savedAt=Number.isSafeInteger(raw.savedAt)&&raw.savedAt>=0?raw.savedAt:0;
 if(Number.isFinite(raw.pos?.x)&&Number.isFinite(raw.pos?.y))n.pos={x:Math.max(270,Math.min(1080,raw.pos.x)),y:Math.max(310,Math.min(605,raw.pos.y))};
 if(raw.activeBattle){
  const b=raw.activeBattle;
  if(typeof b.id!=='string'||b.id.length>128||!b.id.startsWith('battle-')||!Number.isInteger(b.round)||b.round<1||b.round>100000||!Number.isInteger(b.seed)||b.seed<0||b.seed>4294967295||typeof b.boss!=='boolean'||!['active','won','lost','fled'].includes(b.status))throw Error('戰鬥存檔格式不正確');
  const templates=startBattle(n,b.boss).activeBattle.enemies;
  if(!Array.isArray(b.enemies)||b.enemies.length!==templates.length)throw Error('敵人資料不正確');
  const enemies=b.enemies.map((e,i)=>{const template=templates[i];if(e.id!==template.id||!Number.isInteger(e.hp)||e.hp<0||e.hp>template.maxHp)throw Error('敵人生命資料不正確');return {...template,hp:e.hp};});
  if((b.status==='active'&&(n.hp===0||enemies.every(e=>e.hp===0)))||(b.status==='won'&&enemies.some(e=>e.hp>0))||(b.status==='lost'&&n.hp!==0))throw Error('戰鬥狀態不一致');
  n.activeBattle={id:b.id,round:b.round,boss:b.boss,seed:b.seed,target:0,status:b.status,enemies,logs:[]};
 }else if(n.hp===0)n.hp=1;
 return n;
}
