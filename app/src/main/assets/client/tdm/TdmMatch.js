/* TDM authoritative client transport + match lifecycle */
(function(){
  const M=window.TdmMatch={socket:null,connected:false,id:null,matchId:null,state:null,url:null,reconnectKey:null,
    lastState:0,fireCooldown:0};
  M.connect=function(name){
    const base=localStorage.getItem('asadbek_server_url')||'wss://ozbekistondagi-hayot-server.onrender.com/ws';
    M.url=base+(base.includes('?')?'&':'?')+'mode=tdm'+(M.reconnectKey?'&reconnectId='+encodeURIComponent(M.reconnectKey):'')+'&name='+encodeURIComponent(name||'Player');
    try{M.socket=new WebSocket(M.url)}catch(e){return M.offline('WebSocket unavailable')}
    M.socket.onopen=()=>{M.connected=true;M.socket.send(JSON.stringify({type:'tdmJoin',name:(name||'Player').slice(0,18)}));M.emit('status',{online:true})};
    M.socket.onclose=()=>{M.connected=false;M.emit('status',{online:false})};
    M.socket.onerror=()=>{};
    M.socket.onmessage=e=>M.receive(e.data);
  };
  M.receive=function(raw){
    let m;try{m=JSON.parse(raw)}catch{return}
    if(m.type==='tdmWelcome'){M.id=m.id;M.reconnectKey=m.id;localStorage.setItem('tdm_reconnect_id',m.id);M.matchId=m.matchId;M.emit('welcome',m)}
    if(m.type==='tdmSnapshot'){M.state=m;M.emit('snapshot',m)}
    if(m.type==='tdmCountdown')M.emit('countdown',m);
    if(m.type==='tdmMatchStart')M.emit('start',m);
    if(m.type==='tdmHit')M.emit('hit',m);
    if(m.type==='tdmKill')M.emit('kill',m);
    if(m.type==='tdmRespawn')M.emit('respawn',m);
    if(m.type==='tdmResults')M.emit('results',m);
    if(m.type==='tdmNotice')M.emit('notice',m);
    if(m.type==='tdmParty')M.emit('party',m);
    if(m.type==='tdmPartyNotice')M.emit('partyNotice',m);
    if(m.type==='tdmFull')M.emit('notice',{message:'TDM Arena to‘la: 10/10'});
  };
  M.on={};
  M.emit=function(type,data){(M.on[type]||[]).forEach(fn=>fn(data))};
  M.listen=function(type,fn){(M.on[type]||(M.on[type]=[])).push(fn);return()=>M.on[type]=M.on[type].filter(x=>x!==fn)};
  M.send=function(type,data){if(M.socket?.readyState===1)M.socket.send(JSON.stringify({type,...(data||{})}))};
  M.sendState=function(p){
    const now=performance.now();if(now-M.lastState<80)return;M.lastState=now;
    M.send('tdmState',{input:{x:p.inputX||0,z:p.inputZ||0,sprint:!!p.sprint,jump:!!p.jump},yaw:p.yaw});
  };
  M.fire=function(targetId){
    if(performance.now()<M.fireCooldown)return;M.fireCooldown=performance.now()+100;
    M.send('tdmFire',targetId?{targetId}:{});
  };
  M.ready=function(v){M.send('tdmReady',{ready:!!v})};
  M.start=function(){M.send('tdmStart')};
  M.setLoadout=function(items){M.send('tdmLoadout',{items})};
  M.cancelProtection=function(){M.send('tdmProtectionCancel')};
  M.offline=function(reason){M.connected=false;M.emit('status',{online:false,reason})};
  M.connectName=function(name){M.reconnectKey=localStorage.getItem('tdm_reconnect_id')||null;M.connect(name)};
})();

(function(){
  const M=window.TdmMatch, H=window.TdmHud;
  let hostId=null, countdownTimer=null, audioCtx=null;
  function $(id){return document.getElementById(id)}
  function sound(kind,pan=0){
    try{
      audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
      const o=audioCtx.createOscillator(),g=audioCtx.createGain(),p=audioCtx.createStereoPanner();
      const f={shot:120,hit:260,kill:520,respawn:180,start:740,count:420,reload:300}[kind]||300;
      o.frequency.value=f;p.pan.value=Math.max(-1,Math.min(1,pan));g.gain.value=.035;
      o.connect(g);g.connect(p);p.connect(audioCtx.destination);o.start();
      g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+.12);o.stop(audioCtx.currentTime+.13);
    }catch(_){}
  }
  function nearestEnemy(){
    const me=H.me;if(!me)return null;let best=null,bd=1e9;
    (M.state?.players||[]).forEach(p=>{if(p.team!==me.team&&p.alive){const d=Math.hypot(p.x-me.x,p.z-me.z);if(d<bd){bd=d;best=p}}});
    return best&&bd<=120?best:null;
  }
  function wireControls(){
    ['w','a','s','d'].forEach(k=>{const b=$('tdm'+k.toUpperCase());if(!b)return;
      const on=v=>{window.TdmArena.keys[k]=v;if(v)M.cancelProtection()};
      b.addEventListener('pointerdown',e=>{e.preventDefault();on(true)});['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,e=>{e.preventDefault();on(false)}));
    });
    $('tdmFire')?.addEventListener('pointerdown',e=>{e.preventDefault();const t=nearestEnemy();M.fire(t?.id);sound('shot',t&&H.me?Math.sign(t.x-H.me.x)*.4:0);});
    $('tdmReload')?.addEventListener('pointerdown',e=>{e.preventDefault();sound('reload');H.notify('🔄 RELOAD')});
  }
  function open(){
    $('start')?.classList.add('hidden');$('teamLobby')?.classList.remove('show');
    $('tdmOverlay').classList.add('show');$('tdmResults').classList.remove('show');$('tdmPanel').classList.remove('hidden');
    const name=localStorage.getItem('asadbek_name')||'Player';$('tdmName').value=name;
    const loadout=['AR-01','SMG-02','DMR-03'];M.setLoadout(loadout);M.connectName(name);wireControls();
  }
  window.openTdmArena=open;
  M.listen('welcome',m=>{hostId=m.hostId;H.notify('🟢 TDM SERVERGA ULANDI')});
  M.listen('status',m=>{if($('tdmStatus'))$('tdmStatus').textContent=m.online?'🟢 SERVER ONLINE':'🔴 SERVER OFFLINE';if(!m.online)H.notify('🔴 TDM server ulanishi uzildi')});
  M.listen('snapshot',s=>{H.render(s);hostId=hostId||s.players?.[0]?.id;const start=$('tdmStart');if(start)start.style.display=M.id===hostId&&s.phase==='WAITING'?'block':'none';});
  M.listen('countdown',m=>{let n=5;H.notify('MATCH '+n);sound('count');clearInterval(countdownTimer);countdownTimer=setInterval(()=>{n--;if(n>0){H.notify('MATCH '+n);sound('count')}else clearInterval(countdownTimer)},1000)});
  M.listen('start',()=>{$('tdmPanel')?.classList.add('hidden');H.notify('🔥 COMBAT START');sound('start')});
  M.listen('hit',()=>sound('hit'));
  M.listen('kill',m=>{H.render(M.state);H.notify(m.killerTeam===1?'🔵 TEAM A KILL':'🔴 TEAM B KILL');sound('kill')});
  M.listen('respawn',m=>{H.render(M.state);H.notify('RESPAWN');sound('respawn')});
  M.listen('results',m=>{H.result(m);sound(m.result==='DRAW'?'hit':(m.result==='TEAM_A_WIN'?'start':'kill'))});
  M.listen('notice',m=>H.notify(m.message||''));
  window.addEventListener('load',()=>{
    $('tdmOpen')?.addEventListener('click',open);
    $('tdmReady')?.addEventListener('click',()=>{M.ready(true);$('tdmReady').textContent='✅ TAYYOR'});
    $('tdmStart')?.addEventListener('click',()=>M.start());
    $('tdmClose')?.addEventListener('click',()=>{try{M.socket?.close()}catch(_){}$('tdmOverlay').classList.remove('show');$('start').classList.remove('hidden')});
    $('tdmLoadout')?.addEventListener('change',e=>M.setLoadout([e.target.value]));
    $('tdmArenaRoot')?.addEventListener('pointerdown',()=>{try{audioCtx?.resume()}catch(_){}});
    document.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['w','a','s','d'].includes(k)){window.TdmArena.keys[k]=true;M.cancelProtection()}if(e.code==='Space'){M.fire(nearestEnemy()?.id);sound('shot')}});
    document.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(['w','a','s','d'].includes(k))window.TdmArena.keys[k]=false});
    window.TdmArena.build($('tdmArenaRoot'));
  });
})();
