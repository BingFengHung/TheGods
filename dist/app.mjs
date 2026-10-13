import {freshGame,stats,ARMORS,WEAPONS,HEADS,clone,startBattle,resolveRound,actionValid,leaveBattle,talkQuest,validateSave,restoreSave,questText} from './core.mjs';
import {drawHero,drawDragon,drawFox,drawEnemy,drawWorldBackdrop,drawCrystal,shadow,ring,label,setHeroAtlas,setCreatureAtlas} from './draw.mjs';
import {SaveStore} from './storage.mjs';
import {COMMANDS,emptyCommand,beginCommand,chooseCommandTarget,confirmedCommand,commandSummary} from './commands.mjs';
import {visibleViewport,cameraFor,screenToWorld,hitActor} from './layout.mjs';
const $=id=>document.getElementById(id),canvas=$('world'),ctx=canvas.getContext('2d');
const db=new SaveStore();let state=freshGame(),started=false,busy=false,paused=false,modalName='',lockedModal=false,gearTab='armor',previewDir=3,previewAction='idle',moveTarget=null,actorDir=3,actorAction='idle',time=0,animUntil=0,effects=[],selectedTarget=-1,hoverPoint=null,toastTimer,swWaiting=null,offlineReady=false;
let ready=false,saving=false,storageBlocked=false,rawSave=null;
let scale=1,ox=0,oy=0,viewWidth=1,viewHeight=1,last=performance.now();
let command=emptyCommand(),battleMenu='main',routeAfterTravel=null,pointerStart=null;
const heroImage=new Image();heroImage.onload=()=>{setHeroAtlas(heroImage);drawPortrait();};heroImage.onerror=()=>toast('人物素材未載入，先使用簡化人物；連網重整可重試。');heroImage.src='./assets/hero-parts.webp';
const creatureImage=new Image();creatureImage.onload=()=>setCreatureAtlas(creatureImage);creatureImage.src='./assets/creatures.webp';
const fieldImage=new Image();let fieldReady=false;fieldImage.onload=()=>fieldReady=true;fieldImage.src='./assets/field.webp';
const townImage=new Image();townImage.src='./assets/town.webp';let imageReady=false;townImage.onload=()=>imageReady=true;townImage.onerror=()=>toast('場景載入失敗，仍可遊玩；連網後重新整理可重試。');
function updateCamera(){
 const css=getComputedStyle($('safe-area-probe'));
 const camera=cameraFor(viewWidth,viewHeight,!!state.activeBattle,{left:parseFloat(css.paddingLeft)||0,right:parseFloat(css.paddingRight)||0,top:parseFloat(css.paddingTop)||0,bottom:parseFloat(css.paddingBottom)||0});
 scale=camera.scale;ox=camera.x;oy=camera.y;
}
function sizeCanvas(){
 const rect=$('game').getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
 viewWidth=Math.max(1,rect.width);viewHeight=Math.max(1,rect.height);
 canvas.width=Math.round(viewWidth*dpr);canvas.height=Math.round(viewHeight*dpr);
 paused=viewWidth<viewHeight&&viewWidth<700;
 $('game').dataset.portrait=String(paused);$('game').dataset.compact=String(viewWidth<740);
 $('game').style.setProperty('--stage-height',viewHeight+'px');
 updateCamera();
}
function resize(){
 const v=visibleViewport(document.documentElement.clientWidth,document.documentElement.clientHeight,window.visualViewport);
 Object.assign($('game').style,{width:v.width+'px',height:v.height+'px',left:v.left+'px',top:v.top+'px'});
 sizeCanvas();
}
window.addEventListener('resize',resize);
window.visualViewport?.addEventListener('resize',resize);
window.visualViewport?.addEventListener('scroll',resize);
new ResizeObserver(sizeCanvas).observe($('game'));resize();
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function beep(kind='tap'){if(!state.settings.sound)return;try{const ac=audioContext||(audioContext=new (window.AudioContext||window.webkitAudioContext)());ac.resume();const o=ac.createOscillator(),g=ac.createGain();o.type=kind==='hit'?'triangle':'sine';o.frequency.setValueAtTime(kind==='heal'?620:kind==='hit'?180:420,ac.currentTime);o.frequency.exponentialRampToValueAtTime(kind==='heal'?880:90,ac.currentTime+.16);g.gain.setValueAtTime(.035,ac.currentTime);g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+.23);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+.25);}catch{}}
let audioContext=null;
async function commit(next){
 if(storageBlocked){toast('原存檔已保護，請先匯出或復原。');return false;}
 if(saving)return false;
 saving=true;$('save-indicator').textContent='◌ 儲存中';
 try{state=await db.save(next);refresh();$('save-indicator').textContent='✓ 已存於此裝置';return true;}
 catch(e){toast(e.message);$('save-indicator').textContent='! 儲存失敗・請備份';return false;}
 finally{saving=false;}
}
// Ignore duplicate taps until an atomic save completes, including rapid equipment swaps.
for(const event of ['click','pointerdown'])document.addEventListener(event,e=>{if(saving||(!ready&&e.target.closest('button'))){e.preventDefault();e.stopImmediatePropagation();}},true);

function refresh(){
 const st=stats(state);
 $('level').textContent=state.level;$('hero-name').textContent=state.name;
 $('hp-text').textContent=state.hp+' / '+st.maxHp;$('mp-text').textContent=state.mp+' / '+st.maxMp;
 $('hp-bar').style.width=state.hp/st.maxHp*100+'%';$('mp-bar').style.width=state.mp/st.maxMp*100+'%';
 $('gold').textContent=state.gold.toLocaleString();$('quest-short').textContent=questText(state);
 $('sound').style.color=state.settings.sound?'#f1d295':'#9cb4b4';
 $('sound').setAttribute('aria-label',state.settings.sound?'關閉音效':'開啟音效');
 const b=state.activeBattle;$('game').classList.toggle('in-battle',!!b);
 canvas.setAttribute('aria-label',b?'戰鬥場景，選擇指令後點擊目標；亦可使用下方目標按鈕。':'遊戲場景，點擊地面移動、人物互動');
 $('scene-name').textContent=b?'山道遭遇':state.scene==='town'?'青嵐鎮':'雲隱山道';
 $('map-label').textContent=state.scene==='town'?'青嵐鎮':'雲隱山道';
 $('scene-sub').textContent=b?(b.boss?'玄岩守衛':'妖氣聚集'):'第一章 · 風起青嵐';
 for(const id of ['quest-card','minimap','explore-dock','movement-hint'])$(id).hidden=!!b;
 $('combat').hidden=!b;$('battle-record').hidden=!b;$('battle-log').hidden=!b||!$('battle-log').textContent;
 $('mount').querySelector('small').textContent=state.mounted?'下騎':'騎乘';
 updateCamera();renderBattleUI();drawPortrait();
}
function drawPortrait(){const pc=$('portrait'),c=pc.getContext('2d');c.clearRect(0,0,128,128);drawHero(c,65,186,{equip:state.equip,dir:3,scale:1.32,portrait:true});}
function getNodes(){return state.scene==='town'?[{id:'sage',x:442,y:376,label:'守山人',sub:state.quest===0?'可接任務':state.quest===3?'可交付任務':'問道與休息',type:'human'},{id:'smith',x:880,y:492,label:'鍛造師 · 陸衡',sub:'整備與補給',type:'human'},{id:'portal',x:1060,y:332,label:'雲隱山道',sub:'離開城鎮 ↗',type:'portal'}]:[{id:'encounter',x:450,y:393,label:'妖氣聚集',sub:'暮影狼與幽火',type:'monster'},{id:'boss',x:926,y:395,label:'玄岩守衛',sub:'山道深處',type:'boss'},{id:'chest',x:711,y:562,label:state.chest?'空的寶匣':'山間寶匣',sub:state.chest?'已開啟':'發現補給',type:'chest'},{id:'portal',x:258,y:565,label:'返回青嵐鎮',sub:'回城休息 ↙',type:'portal'}];}
function goNode(id){const n=getNodes().find(n=>n.id===id);if(n)moveTarget={x:Math.max(270,Math.min(1080,n.x-48)),y:Math.min(605,n.y+40),node:id};}
function requestTravel(scene,node=null){
 if(state.activeBattle)return;
 closePanel();routeAfterTravel=null;
 if(state.scene===scene){if(node)goNode(node);else toast('你已經在這裡。');return;}
 routeAfterTravel=node;goNode('portal');toast('沿路前往出口；點擊地面可取消帶路。');
}
async function navigate(scene){if(state.activeBattle){toast('請先結束戰鬥。');return false;}closePanel();moveTarget=null;const n=clone(state);n.scene=scene;n.pos=scene==='town'?{x:960,y:425}:{x:330,y:550};if(!await commit(n))return false;toast(scene==='town'?'回到青嵐鎮':'雲隱山道 · 留意前方妖氣');return true;}
function pointer(e){const r=canvas.getBoundingClientRect();return screenToWorld(e.clientX-r.left,e.clientY-r.top,{scale,x:ox,y:oy});}
canvas.addEventListener('pointerdown',e=>{
 if(!started||busy||saving||paused||modalName||!e.isPrimary)return;
 pointerStart={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointercancel',()=>pointerStart=null);
canvas.addEventListener('pointerup',e=>{
 const start=pointerStart;pointerStart=null;
 if(!start||start.id!==e.pointerId||Math.hypot(e.clientX-start.x,e.clientY-start.y)>12||!started||busy||saving||paused||modalName)return;
 beep();const p=pointer(e);
 if(state.activeBattle){
  const hit=hitActor(p,battleActors(),scale);if(!hit)return;
  if(command.phase==='target'||command.phase==='confirm')selectBattleTarget(hit.id);
  else if(hit.id!=='hero'){selectedTarget=hit.id;toast('已查看目標，請先選擇攻擊或仙術。');}
  return;
 }
 routeAfterTravel=null;
 const node=hitActor(p,getNodes().map(n=>({...n,width:n.type==='boss'?160:n.type==='portal'?100:80,height:n.type==='boss'?205:n.type==='human'?180:n.type==='portal'?80:n.type==='chest'?55:140})),scale);
 if(node){goNode(node.id);return;}
 moveTarget={x:Math.max(270,Math.min(1080,p.x)),y:Math.max(310,Math.min(605,p.y))};hoverPoint={...moveTarget,at:time};
});
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'){if(modalName)closePanel();else if(state.activeBattle&&!busy)cancelBattleCommand();else{moveTarget=null;routeAfterTravel=null;}return;}
 if(!started||modalName||busy||saving)return;
 if(state.activeBattle){if(e.key==='Enter'&&command.phase==='confirm'&&e.target===document.body){e.preventDefault();confirmBattleCommand();}return;}
 const dirs={ArrowUp:[0,-60],ArrowDown:[0,60],ArrowLeft:[-60,0],ArrowRight:[60,0]};
 if(dirs[e.key]){e.preventDefault();routeAfterTravel=null;moveTarget={x:Math.max(270,Math.min(1080,state.pos.x+dirs[e.key][0])),y:Math.max(310,Math.min(605,state.pos.y+dirs[e.key][1]))};}
});
async function interact(id){if(storageBlocked)return;if(id==='portal'){const nextNode=routeAfterTravel;routeAfterTravel=null;if(await navigate(state.scene==='town'?'field':'town')&&nextNode)goNode(nextNode);return;}if(id==='sage'){const q=talkQuest(state);if(!await commit(q.state))return;openDialogue('守山人','山靜心自明，路遠劍有聲。',q.text,'sage');return;}if(id==='smith'){openDialogue('鍛造師 · 陸衡','好鋼，也要配得上好身手。','試試不同裝備吧。換上法杖能提升仙術，長戟擅長斬擊；銀甲更適合迎戰強敵。需要補給的話，一顆回元丹只收 30 銅錢。','smith');return;}if(id==='chest'){if(state.chest){toast('寶匣已經空了。');return;}const n=clone(state);n.chest=true;n.potions+=2;n.gold+=40;if(!await commit(n))return;beep('heal');toast('發現 2 顆回元丹與 40 銅錢！');return;}if(id==='encounter'||id==='boss'){openPanel('迎戰','山道異動', '<div class="dialogue-content"><canvas id="enemy-preview" width="260" height="240"></canvas><div><h3 class="journal-title">'+(id==='boss'?'玄岩守衛':'妖氣聚集')+'</h3><p>'+(id==='boss'?'遠古的石甲甦醒，山道正被它封鎖。確認生命與真氣，再開始挑戰。':'暮影狼與幽火佔據了道路。擊退牠們，收集靈石碎片。')+'</p><div class="panel-actions"><button class="primary" id="engage">進入戰鬥 →</button><button class="secondary" id="later">稍後再來</button></div></div></div>');const c=$('enemy-preview').getContext('2d');drawEnemy(c,125,205,{id:id==='boss'?'warden':'wolf',hp:1},0);$('engage').onclick=async()=>{closePanel();cancelBattleCommand();moveTarget=null;routeAfterTravel=null;$('battle-log').replaceChildren();if(!await commit(startBattle(state,id==='boss')))return;toast('選擇指令 → 點選目標 → 確認出招');};$('later').onclick=closePanel;}}
function openPanel(title,sub,html,lock=false){modalName=title;lockedModal=lock;$('panel-title').textContent=title;$('panel-sub').textContent=sub;$('panel-body').innerHTML=html;$('modal').hidden=false;$('close-panel').hidden=lock;moveTarget=null;$('close-panel').focus();}
function closePanel(){if(lockedModal)return;modalName='';$('modal').hidden=true;}
$('close-panel').onclick=closePanel;document.querySelector('.modal-shade').onclick=closePanel;
function openDialogue(name,sub,text,type){openPanel(name,sub,'<div class="dialogue-content"><canvas id="npc-preview" width="250" height="300"></canvas><div><p id="npc-speech"></p><div class="panel-actions" id="dialog-actions"></div></div></div>');$('npc-speech').textContent=text;const c=$('npc-preview').getContext('2d');drawHero(c,125,275,{equip:{armor:type==='sage'?'jade':'ivory',weapon:type==='sage'?'staff':'glaive',head:'halo',hair:type==='sage'?'silver':'ink'},dir:3,scale:1.65});$('dialog-actions').innerHTML=type==='sage'?'<button class="primary" id="dialog-go">'+(state.quest===4?'繼續探索':'前往山道 →')+'</button><button class="secondary" id="rest">休息恢復</button>':'<button class="primary" id="buy-potion">購買回元丹 · 30</button><button class="secondary" id="open-gear">查看裝備</button>';if(type==='sage'){$('dialog-go').onclick=()=>{closePanel();if(state.quest!==4)requestTravel('field');};$('rest').onclick=async()=>{const n=clone(state);n.hp=stats(n).maxHp;n.mp=stats(n).maxMp;if(!await commit(n))return;beep('heal');toast('身心澄明，生命與真氣已恢復。');};}else{$('buy-potion').onclick=buyPotion;$('open-gear').onclick=()=>openGear();}}
async function buyPotion(){if(state.gold<30){toast('銅錢不足。');return;}const n=clone(state);n.gold-=30;n.potions++;if(await commit(n))toast('獲得一顆回元丹。');}
function openGear(){if(state.activeBattle){toast('戰鬥結束後才能換裝。');return;}openPanel('衣甲藏鋒','CHARACTER · 分件換裝','<div class="gear-layout"><div class="dressing"><canvas id="wardrobe" width="400" height="440"></canvas><div class="direction-controls"><button id="turn-left" aria-label="向左轉">‹</button><button id="anim-toggle" aria-label="切換動作">▶</button><button id="turn-right" aria-label="向右轉">›</button></div><small id="pose-label">方向預覽 · 待機</small></div><div><div class="gear-tabs"><button data-tab="armor">衣甲</button><button data-tab="weapon">武器</button><button data-tab="head">頭飾</button><button data-tab="hair">髮色</button></div><div class="item-list" id="gear-items"></div><div class="gear-stats" id="gear-stats"></div></div></div>');$('turn-left').onclick=()=>{previewDir=(previewDir+7)%8;};$('turn-right').onclick=()=>{previewDir=(previewDir+1)%8;};$('anim-toggle').onclick=()=>{const a=['idle','walk','attack','cast'];previewAction=a[(a.indexOf(previewAction)+1)%a.length];$('pose-label').textContent='方向預覽 · '+{idle:'待機',walk:'行走',attack:'攻擊',cast:'施法'}[previewAction];};document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{gearTab=b.dataset.tab;gearItems();});gearItems();}
function gearItems(){document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===gearTab));const items=gearTab==='armor'?ARMORS:gearTab==='weapon'?WEAPONS:gearTab==='head'?HEADS:[{id:'silver',name:'霜雪銀髮',desc:'銀白髮束與冷色高光。'},{id:'ink',name:'玄墨青絲',desc:'烏黑髮束與靛青光澤。'}];const icon={armor:'◇',weapon:'⚔',head:'♕',hair:'〰'}[gearTab];$('gear-items').innerHTML=items.map(i=>'<button class="item '+(state.equip[gearTab]===i.id?'selected':'')+'" data-equip="'+i.id+'"><span class="item-icon" '+(i.color?'style="background:'+i.color+'"':'')+'>'+icon+'</span><div><b>'+i.name+'</b><small>'+i.desc+'</small></div><span class="check">'+(state.equip[gearTab]===i.id?'已穿戴':'穿戴')+'</span></button>').join('');document.querySelectorAll('[data-equip]').forEach(b=>b.onclick=async()=>{const n=clone(state);n.equip[gearTab]=b.dataset.equip;if(await commit(n)){beep();gearItems();}});const st=stats(state);$('gear-stats').innerHTML='攻擊 <b>'+st.atk+'</b> 防禦 <b>'+st.def+'</b> 仙術 <b>'+st.magic+'</b><br><small>裝備會同時改變外觀、持握與能力。</small>';}
function openBag(){openPanel('行旅之囊','INVENTORY · 隨身物品','<div class="inventory-grid"><div class="inventory-card"><span>♜</span><div><b>回元丹 ×'+state.potions+'</b><p>回復 95 點生命。</p><button id="use-potion">使用丹藥</button></div></div><div class="inventory-card"><span>◈</span><div><b>靈石碎片 ×'+state.shards+'</b><p>擊敗山道妖物取得的任務物品。</p></div></div><div class="inventory-card"><span>⚔</span><div><b>隨身武器 · 3</b><p>聽風劍、赤月長戟、玄冰法杖</p><button id="bag-gear">前往換裝</button></div></div><div class="inventory-card"><span>◇</span><div><b>銅錢 · '+state.gold+'</b><p>回鎮向鍛造師購買補給。</p></div></div></div>');$('use-potion').onclick=async()=>{if(state.activeBattle){toast('請使用戰鬥中的丹藥指令。');return;}if(!state.potions){toast('沒有回元丹了。');return;}if(state.hp===stats(state).maxHp){toast('生命已滿。');return;}const n=clone(state);n.potions--;n.hp=Math.min(stats(n).maxHp,n.hp+95);if(await commit(n)){beep('heal');openBag();}};$('bag-gear').onclick=openGear;}
function openJournal(){const steps=['與守山人交談','清除妖物，收集三枚碎片','挑戰玄岩守衛','回到青嵐鎮覆命'];openPanel('山道的異動','JOURNAL · 第一章','<span class="chapter">風起青嵐</span><h3 class="journal-title">山靜，風未止。</h3><p>古老山道上的靈石失去光芒。帶上你的劍與靈狐，尋找妖氣的源頭。</p><div class="steps">'+steps.map((text,i)=>'<div class="step '+(state.quest>i?'done':state.quest===i?'current':'')+'"><span>'+(state.quest>i?'✓':'◇')+'</span>'+text+'</div>').join('')+'</div><div class="panel-actions"><button class="primary" id="journal-go">追蹤任務 →</button><span class="gear-stats">酬勞：220 銅錢 · 回元丹 ×3</span></div>');$('journal-go').onclick=()=>{closePanel();questGo();};}
function openMap(){if(state.activeBattle){toast('戰鬥中無法切換地圖。');return;}openPanel('山海輿圖','WORLD · 第一章','<p>點選目的地會帶你走到地圖出口。途中點擊地面可取消帶路；下載完成後可離線遊玩。</p><div class="map-options"><button class="map-option" id="map-town"><b>青嵐鎮</b><small>守山人・鍛造師・休息與補給</small></button><button class="map-option" id="map-field"><b>雲隱山道</b><small>妖物遭遇・寶匣・玄岩守衛</small></button></div>');$('map-town').onclick=()=>requestTravel('town');$('map-field').onclick=()=>requestTravel('field');}
function openSettings(){openPanel('行旅設定','SETTINGS · 本機存檔','<div class="settings-grid"><div class="settings-card"><h3>進度與備份</h3><p>進度會自動儲存於此裝置。清除網站資料前，請先匯出存檔。</p><button class="secondary" id="export">匯出備份</button> <button class="secondary" id="import">匯入備份</button> <button class="secondary" id="recover">復原上次存檔</button></div><div class="settings-card"><h3>安裝與離線</h3><p id="offline-status">'+(offlineReady?'離線資源已就緒。首次安裝後可關閉網路遊玩。':'遊戲正在準備離線資源。連網開啟一次，下載完成後即可離線。')+'</p><button class="secondary" id="install">安裝說明</button> <button class="secondary" id="update">檢查更新</button></div><div class="settings-card"><h3>聲音與畫面</h3><p>音效預設關閉。低效果模式可減少粒子。</p><button class="secondary" id="toggle-sound">音效：'+(state.settings.sound?'開啟':'關閉')+'</button> <button class="secondary" id="toggle-fx">特效：'+(state.settings.low?'精簡':'完整')+'</button></div><div class="settings-card"><h3>TheGods 0.1.1</h3><p>單機原型・第一章。已調整頭身比例與指令操作；角色尚未具備完整八方向逐格動畫。</p><button class="secondary" id="help">操作說明</button></div></div>');$('export').onclick=exportSave;$('recover').onclick=recoverPrevious;$('import').onclick=()=>{$('import-file').value='';$('import-file').click();};$('install').onclick=()=>toast('iPhone：Safari 分享 → 加入主畫面。Android：瀏覽器選單 → 安裝應用程式。');$('update').onclick=async()=>{if(state.activeBattle){toast('請先結束戰鬥，再更新。');return;}if(swWaiting){if(await commit(clone(state)))swWaiting.postMessage({type:'SKIP_WAITING'});}else if('serviceWorker'in navigator){try{const reg=await navigator.serviceWorker.getRegistration();if(!reg){toast('離線服務尚未就緒，請連網重整。');return;}await reg.update();toast('已檢查版本；有更新時會提示。');}catch{toast('目前無法檢查更新，請連網後重試。');}}};$('toggle-sound').onclick=async()=>{const n=clone(state);n.settings.sound=!n.settings.sound;await commit(n);beep();openSettings();};$('toggle-fx').onclick=async()=>{const n=clone(state);n.settings.low=!n.settings.low;await commit(n);openSettings();};$('help').onclick=()=>openPanel('旅途指南','HOW TO PLAY','<p>點一下地面移動；點人物後會走近交談。地圖與任務追蹤會帶你走到出口，途中點擊別處可取消；拖動畫面不會觸發移動。</p><p>戰鬥先選攻擊、仙術或物品，再點場上目標或目標按鈕，最後按「確認出招」。確認前可以取消，不會扣除真氣或消耗回合。防禦、撤退也需要確認。靈狐目前自動協助。</p><p>換裝可以分別選衣甲、武器、頭飾與髮色。人物預覽可旋轉與播放動作。受傷時可回城找守山人免費休息。</p><p>直向與退到背景會暫停單機。請定期匯出存檔；換手機或清除網站資料不會自動保留進度。</p>');}
function exportSave(){const content=JSON.stringify(rawSave??state,null,2);const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='TheGods-save-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已匯出備份。');}
function previewImport(n,recovery=false){
 openPanel(recovery?'復原上次存檔':'匯入存檔','SAVE · 保護你的進度','<p id="import-info"></p><p>確認後回到安全地點，戰鬥不會接續。建議先匯出目前進度。</p><div class="panel-actions"><button class="secondary" id="backup-first">先匯出目前存檔</button><button class="primary" id="confirm-import">確認'+(recovery?'復原':'匯入')+'</button></div>',storageBlocked);
 $('import-info').textContent='角色 '+n.name+' · 等級 '+n.level+' · '+n.gold+' 銅錢';$('backup-first').onclick=exportSave;
 $('confirm-import').onclick=async()=>{const wasBlocked=storageBlocked;storageBlocked=false;if(await commit(n)){rawSave=null;lockedModal=false;closePanel();moveTarget=null;started=true;$('welcome').hidden=true;toast('進度已載入。');}else storageBlocked=wasBlocked;};
}
async function recoverPrevious(){try{const previous=await db.previous();if(!previous){toast('尚無上一份存檔。');return;}previewImport(validateSave(previous),true);}catch(e){toast('無法復原：'+e.message);}}
$('import-file').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>262144){toast('存檔檔案過大。');return;}try{previewImport(validateSave(JSON.parse(await file.text())));}catch(e){toast('無法匯入：'+e.message);}};
function showSaveRecovery(message){openPanel('存檔需要處理','SAVE · 原進度已保護','<p id="save-error"></p><p>目前不會覆寫原進度。請先保留備份，再復原或匯入有效存檔。</p><div class="panel-actions"><button class="secondary" id="protected-export">匯出原始資料</button><button class="secondary" id="protected-recover">復原上次存檔</button><button class="primary" id="protected-import">匯入備份</button></div>',true);$('save-error').textContent=message;$('protected-export').onclick=exportSave;$('protected-export').disabled=!rawSave;$('protected-recover').onclick=recoverPrevious;$('protected-import').onclick=()=>{$('import-file').value='';$('import-file').click();};}

function questGo(){if(state.activeBattle)return;if(state.quest===0||state.quest===3)requestTravel('town','sage');else if(state.quest===1||state.quest===2)requestTravel('field',state.quest===2?'boss':'encounter');else openJournal();}
$('quest-go').onclick=questGo;$('quest-toggle').onclick=()=>{const p=$('quest-short'),g=$('quest-go');p.hidden=!p.hidden;g.hidden=p.hidden;};$('minimap').onclick=openMap;$('minimap').onkeydown=e=>{if(e.key==='Enter')openMap();};
document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{if(!started||busy)return;beep();({gear:openGear,bag:openBag,map:openMap,journal:openJournal,settings:openSettings})[b.dataset.open]();});
$('mount').onclick=async()=>{if(state.activeBattle)return;const n=clone(state);n.mounted=!n.mounted;await commit(n);toast(state.mounted?'乘上赤雲，山路也變得輕快。':'已下騎。');};$('sound').onclick=async()=>{const n=clone(state);n.settings.sound=!n.settings.sound;await commit(n);beep();toast('音效已'+(state.settings.sound?'開啟':'關閉'));};
function enemyPositions(){return state.activeBattle?.boss?[{x:475,y:350},{x:365,y:483}]:[{x:418,y:345},{x:548,y:415},{x:330,y:473}];}
function battleActors(){
 const b=state.activeBattle;if(!b)return [];
 const pos=enemyPositions();
 return [...b.enemies.map((e,i)=>({id:i,...pos[i],width:e.id==='warden'?160:e.id==='wolf'?101:66,height:e.id==='warden'?183:e.id==='wolf'?118:104,alive:e.hp>0})),{id:'hero',x:842,y:463,width:80,height:162,alive:state.hp>0}];
}
function cancelBattleCommand(){command=emptyCommand();battleMenu='main';selectedTarget=-1;renderBattleUI();}
function selectBattleAction(action){
 if(busy||saving)return;
 try{command=beginCommand(state,action);selectedTarget=-1;renderBattleUI();}
 catch(e){toast(e.message);}
}
function selectBattleTarget(target){
 if(busy||saving||!command.action||COMMANDS[command.action].target==='none')return;
 try{command=chooseCommandTarget(state,command,target);selectedTarget=Number.isInteger(target)?target:-1;renderBattleUI();}
 catch(e){toast(e.message);}
}
async function confirmBattleCommand(){
 if(busy||saving)return;
 try{const chosen=confirmedCommand(state,command);await battleAction(chosen.action,chosen.target);}
 catch(e){toast(e.message);}
}
function renderBattleUI(){
 const b=state.activeBattle;if(!b)return;
 $('round-no').textContent=String(b.round).padStart(2,'0');
 $('round-state').textContent=busy?'招式施展中':b.status!=='active'?'戰鬥結束':command.phase==='target'?'② 選擇目標':command.phase==='confirm'?'③ 確認出招':'① 選擇指令';
 $('target-hint').textContent=busy?'等待本回合結束':command.action?commandSummary(state,command):battleMenu==='skills'?'選擇仙術':battleMenu==='items'?'選擇物品':'靈狐自動協助';
 $('battle-record').disabled=busy||!b.logs.length;
 const row=$('command-buttons');row.replaceChildren();
 const add=(name,detail,handler,{disabled=false,primary=false,label=name}={})=>{
  const button=document.createElement('button');button.type='button';button.className='command-button'+(primary?' command-primary':'');
  button.disabled=disabled||busy||b.status!=='active';button.setAttribute('aria-label',label+(detail?'・'+detail:''));
  const title=document.createElement('b');title.textContent=name;button.append(title);
  if(detail){const small=document.createElement('small');small.textContent=detail;button.append(small);}
  button.onclick=handler;row.append(button);return button;
 };
 const back=()=>add('返回','重新選擇',cancelBattleCommand);
 const action=(id)=>{const item=COMMANDS[id],error=actionValid(state,id);return add(item.name,error||(id==='potion'?'持有 '+state.potions+' 顆':item.cost),()=>selectBattleAction(id),{disabled:!!error});};
 if(busy){add('出招中','請稍候',()=>{}, {disabled:true});return;}
 if(b.status!=='active'){add('查看結果','結束這場戰鬥',showResult).disabled=false;return;}
 if(command.phase==='confirm'){
  add('重新選擇','取消這次指令',cancelBattleCommand);
  const confirm=add('確認出招',COMMANDS[command.action].name,confirmBattleCommand,{primary:true,label:'確認出招 '+commandSummary(state,command)});confirm.id='confirm-command';
  return;
 }
 if(command.phase==='target'){
  back();
  if(COMMANDS[command.action].target==='hero')add(state.name,'生命 '+state.hp+' / '+stats(state).maxHp,()=>selectBattleTarget('hero'),{primary:true});
  else b.enemies.forEach((e,i)=>{if(e.hp>0)add((i+1)+' · '+e.name,'生命 '+e.hp+' / '+e.maxHp,()=>selectBattleTarget(i));});
  return;
 }
 if(battleMenu==='skills'){back();action('frost');action('heal');return;}
 if(battleMenu==='items'){back();action('potion');return;}
 add('攻擊','普通攻擊',()=>selectBattleAction('attack'));
 add('仙術','霜華・回春',()=>{battleMenu='skills';renderBattleUI();});
 add('物品','回元丹 ×'+state.potions,()=>{battleMenu='items';renderBattleUI();});
 add('防禦','減傷・凝神',()=>selectBattleAction('guard'));
 add('撤退','離開戰場',()=>selectBattleAction('flee'));
}
$('battle-record').onclick=()=>{
 const b=state.activeBattle;if(!b||busy)return;
 openPanel('本回合戰報','BATTLE · 行動紀錄','<div id="round-record"></div>');
 for(const event of b.logs){const p=document.createElement('p');p.textContent=event.text;$('round-record').append(p);}
};
async function battleAction(action,target){
 if(busy||!state.activeBattle)return;
 const invalid=actionValid(state,action);if(invalid){toast(invalid);return;}
 busy=true;refresh();
 const result=resolveRound(state,action,target);
 if(!await commit(result.state)){busy=false;refresh();return;}
 command=emptyCommand();battleMenu='main';selectedTarget=-1;
 actorAction=action==='frost'||action==='heal'?'cast':action==='attack'?'attack':action==='guard'?'defend':'idle';
 animUntil=time+1.05;effects=result.events.map((e,i)=>({...e,start:time+i*.14}));beep(action==='heal'?'heal':'hit');
 $('battle-log').textContent=result.events.map(e=>e.text).join('；');$('battle-log').hidden=false;
 setTimeout(()=>{busy=false;actorAction='idle';refresh();if(state.activeBattle?.status!=='active')showResult();},1250);
}
function showResult(){const b=state.activeBattle;if(!b)return;const won=b.status==='won',lost=b.status==='lost';openPanel(won?'戰鬥勝利':lost?'暫別山道':'成功撤退','BATTLE RESULT','<div class="result"><div class="result-mark">'+(won?'✧':'◇')+'</div><h3>'+(won?'劍定風息':lost?'整裝，再啟程':'來日再戰')+'</h3><p>'+(won?'妖氣散去，獎勵已存入行囊。':lost?'靈狐將你帶回青嵐鎮。沒有扣除銅錢，休息後再挑戰。':'保留目前進度，回到山道自由探索。')+'</p><p>'+questText(state)+'</p><button class="primary" id="result-continue">'+(lost?'返回青嵐鎮':'繼續旅程')+' →</button></div>',true);$('result-continue').onclick=async()=>{const n=leaveBattle(state);if(await commit(n)){lockedModal=false;closePanel();cancelBattleCommand();}};}
function drawBar(x,y,value,max,color){ctx.fillStyle='#142a35bb';ctx.fillRect(x-27,y,54,5);ctx.fillStyle=color;ctx.fillRect(x-26,y+1,52*Math.max(0,value/max),3);}
function render(now){const dt=Math.min((now-last)/1000,.04);last=now;if(!document.hidden&&!paused)time+=dt;const dpr=Math.min(devicePixelRatio||1,2);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,viewWidth,viewHeight);
 if(state.activeBattle){const cover=cameraFor(viewWidth,viewHeight);ctx.save();ctx.translate(cover.x,cover.y);ctx.scale(cover.scale,cover.scale);drawWorldBackdrop(ctx,1280,720,'field',state.settings.low?0:time,fieldReady?fieldImage:null);ctx.fillStyle='rgba(22,36,41,.12)';ctx.fillRect(0,0,1280,720);ctx.restore();}
 ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
 if(!state.activeBattle)drawWorldBackdrop(ctx,1280,720,state.scene,state.settings.low?0:time,state.scene==='field'?(fieldReady?fieldImage:null):(imageReady?townImage:null));
 if(state.activeBattle){const b=state.activeBattle;const pos=enemyPositions();b.enemies.forEach((e,i)=>{drawEnemy(ctx,pos[i].x,pos[i].y,e,time,e.hp>0&&(i===selectedTarget||command.target==='all'));if(e.hp>0){label(ctx,pos[i].x,pos[i].y-(e.id==='warden'?204:113),e.name,'#e6ddba',true);drawBar(pos[i].x,pos[i].y+11,e.hp,e.maxHp,'#d89e6b');}});ring(ctx,842,463,31,command.target==='hero'?'#ffc779':'#9aead3',time);drawHero(ctx,842,463,{equip:state.equip,dir:7,t:time,action:time<animUntil?actorAction:'idle',scale:1.12});label(ctx,842,286,state.name,'#c9f0de',true);drawBar(842,481,state.hp,stats(state).maxHp,'#7fc8ae');drawFox(ctx,735,551,time,1.12);label(ctx,736,466,'靈狐 · 協助',' #c9f0de',true);drawBar(735,566,1,1,'#7fc8ae');for(const e of effects){const age=time-e.start;if(age<0||age>1.5)continue;const q=e.who==='hero'?{x:842,y:360}:pos[Number(e.who.replace('enemy',''))]||{x:800,y:360};ctx.save();ctx.globalAlpha=Math.min(1,(1.5-age)*2);if(e.type==='frost'){for(let k=0;k<6;k++){const xx=q.x+Math.sin(k*9)*35;drawCrystal(ctx,xx,q.y-20-Math.cos(k*3)*20-age*35,time+k);}}if(e.amount){ctx.font='bold '+(e.type==='heal'?24:29)+'px Georgia';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#253240';const text=(e.type==='heal'?'+':'−')+e.amount;ctx.strokeText(text,q.x,q.y-80-age*40);ctx.fillStyle=e.type==='heal'?'#aee9bd':'#fff0bb';ctx.fillText(text,q.x,q.y-80-age*40);}ctx.restore();}
 }else{if(moveTarget&&!modalName&&started&&!paused&&!document.hidden&&!saving){const dx=moveTarget.x-state.pos.x,dy=moveTarget.y-state.pos.y,dist=Math.hypot(dx,dy),step=(state.mounted?200:145)*dt;actorDir=(Math.round(Math.atan2(dx,-dy)/(Math.PI/4))+8)%8;actorAction='walk';if(dist<=step+2){state.pos={x:moveTarget.x,y:moveTarget.y};const id=moveTarget.node;moveTarget=null;actorAction='idle';commit(clone(state)).then(ok=>ok&&id&&interact(id));}else{state.pos.x+=dx/dist*step;state.pos.y+=dy/dist*step;}}else actorAction='idle';const nodes=getNodes();const actors=nodes.map(n=>({...n,kind:'node'}));actors.push({x:state.pos.x,y:state.pos.y,kind:'hero'});actors.push({x:state.pos.x-53,y:state.pos.y+30,kind:'pet'});actors.sort((a,b)=>a.y-b.y);for(const a of actors){if(a.kind==='hero'){ring(ctx,a.x,a.y,27,'#98ddca',time);drawHero(ctx,a.x,a.y,{equip:state.equip,dir:actorDir,t:time,action:actorAction,scale:1.03,mounted:state.mounted});label(ctx,a.x,a.y-(state.mounted?204:171),state.name,'#def2d6',true);}else if(a.kind==='pet')drawFox(ctx,a.x,a.y,time,.82);else{if(a.type==='human'){drawHero(ctx,a.x,a.y,{equip:{armor:a.id==='sage'?'jade':'ivory',weapon:a.id==='sage'?'staff':'glaive',head:'halo',hair:a.id==='sage'?'silver':'ink'},dir:3,t:time,scale:1.03});label(ctx,a.x,a.y-188,a.label,'#efe4b5',true);label(ctx,a.x,a.y-171,a.sub,'#b8dfd1',true);if(a.id==='sage'&&(state.quest===0||state.quest===3)){label(ctx,a.x,a.y-211,state.quest===3?'？':'！','#ffe287');}}else if(a.type==='portal'){ring(ctx,a.x,a.y,35,'#e9d698',time);for(let k=0;k<8;k++){const ang=k*Math.PI/4+time*.3;ctx.fillStyle='#dbebc1';ctx.globalAlpha=.4;ctx.fillRect(a.x+Math.sin(ang)*28,a.y-12-Math.cos(ang)*8-Math.sin(time+k)*20,2,2);ctx.globalAlpha=1;}label(ctx,a.x,a.y-58,a.label,'#f6e2b2');label(ctx,a.x,a.y-38,a.sub,'#c0dcd0',true);}else if(a.type==='chest'){ctx.fillStyle=state.chest?'#564c3b':'#856335';ctx.fillRect(a.x-20,a.y-26,40,27);ctx.strokeStyle='#d8bd78';ctx.lineWidth=2;ctx.strokeRect(a.x-20,a.y-26,40,27);ctx.fillStyle='#d8bc6c';ctx.fillRect(a.x-3,a.y-20,6,10);label(ctx,a.x,a.y-43,a.label,'#f2deae',true);}else{drawEnemy(ctx,a.x,a.y,{id:a.type==='boss'?'warden':'wolf',hp:1},time);label(ctx,a.x,a.y-(a.type==='boss'?205:124),a.label,'#f0cca8',true);label(ctx,a.x,a.y+25,a.sub,'#d0d6bd',true);}}}if(hoverPoint&&time-hoverPoint.at<1)ring(ctx,hoverPoint.x,hoverPoint.y,12+(time-hoverPoint.at)*15,'#ecdfa7',time);$('map-pin').setAttribute('cx',String(15+state.pos.x/1280*100));$('map-pin').setAttribute('cy',String(10+state.pos.y/720*55));}
 ctx.restore();const wc=$('wardrobe');if(wc){const c=wc.getContext('2d');c.clearRect(0,0,400,440);drawHero(c,205,357,{equip:state.equip,dir:previewDir,t:time,action:previewAction,scale:2.05});}requestAnimationFrame(render);}
$('start').onclick=()=>{started=true;$('welcome').hidden=true;beep();if(state.activeBattle&&state.activeBattle.status!=='active')showResult();};
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(ready&&!storageBlocked&&!saving)commit(clone(state));}else last=performance.now();});
async function init(){
 $('start').disabled=true;
 try{await db.open();}catch{db.db=null;db.degraded=true;}
 try{const loaded=await db.load();if(loaded){rawSave=loaded;state=restoreSave(loaded);rawSave=null;$('start').innerHTML='繼續旅程 <span>→</span>';}}
 catch(e){storageBlocked=true;showSaveRecovery(e.message||'資料無法讀取，請稍後重試。');}
 if(db.degraded&&!storageBlocked)toast('正在使用備用儲存，請定期匯出備份。');
 ready=true;$('start').disabled=storageBlocked;refresh();requestAnimationFrame(render);
 if('serviceWorker'in navigator){try{
  const reg=await navigator.serviceWorker.register('./sw.js');
  const installed=worker=>{if(worker?.state==='installed'){offlineReady=true;if(navigator.serviceWorker.controller){swWaiting=worker;toast('新版本已準備好，戰鬥後可更新。');}}};
  reg.addEventListener('updatefound',()=>{const w=reg.installing;w?.addEventListener('statechange',()=>installed(w));});
  if(reg.installing)reg.installing.addEventListener('statechange',()=>installed(reg.installing));
  if(reg.waiting){swWaiting=reg.waiting;toast('新版本已準備好，可在設定更新。');}
  const active=await navigator.serviceWorker.ready;offlineReady=!!active.active;
  let changing=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(swWaiting&&!changing){changing=true;location.reload();}});
 }catch{toast('離線包尚未完成，請保持連線後再試。');}}
}
init();
