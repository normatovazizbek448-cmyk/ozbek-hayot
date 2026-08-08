(function(){
  const H=window.TdmHud={};
  const $=id=>document.getElementById(id);
  H.render=function(s){
    if(!s)return;
    $('tdmA').textContent=String(s.scores?.[1]||0).padStart(2,'0');
    $('tdmB').textContent=String(s.scores?.[2]||0).padStart(2,'0');
    const ms=s.timeLeftMs||0,sec=Math.max(0,Math.ceil(ms/1000));
    $('tdmTimer').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
    $('tdmCount').textContent=(s.players||[]).length+'/10';
    const me=(s.players||[]).find(p=>p.id===window.TdmMatch.id);
    if(me){H.me=me; if(window.TdmArena)window.TdmArena.setLocal(me);if(me.respawnMs>0)window.TdmRespawn.show(me.respawnMs);else window.TdmRespawn.hide();}
    const ids=new Set();
    (s.players||[]).forEach(p=>{ids.add(p.id);window.TdmArena?.updateRemote(p)});
    window.TdmArena?.removeMissing(ids);
  };
  H.notify=function(t){const e=$('tdmNotice');if(!e)return;e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),1600)};
  H.result=function(m){
    const e=$('tdmResults');if(!e)return;
    let title=m.result==='DRAW'?'DRAW':m.result==='TEAM_A_WIN'?'🔵 TEAM A G‘ALABA':'🔴 TEAM B G‘ALABA';
    e.innerHTML='<div class="tdmResultTitle">'+title+'</div><div>'+m.scores[1]+' — '+m.scores[2]+'</div><button id="tdmBackLobby">LOBBYGA QAYTISH</button>';
    e.classList.add('show');document.getElementById('tdmBackLobby').onclick=()=>location.reload();
  };
})();
