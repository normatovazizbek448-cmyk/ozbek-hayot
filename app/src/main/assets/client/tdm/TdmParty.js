/* TDM pre-match team hub: 5-player private preparation room. */
(function(){
  const P=window.TdmParty={party:null,selectedMap:'TDM_Arena_800x500m'};
  const $=id=>document.getElementById(id);
  P.open=function(){ $('tdmTeamHub')?.classList.add('show'); P.render(); };
  P.close=function(){ $('tdmTeamHub')?.classList.remove('show'); };
  P.create=function(team){ window.TdmMatch?.send('tdmPartyCreate',{team:team||1}); };
  P.join=function(){ const code=($('tdmPartyCode')?.value||'').trim().toUpperCase(); if(code)window.TdmMatch?.send('tdmPartyJoin',{partyId:code}); };
  P.update=function(patch){ Object.assign(P.party||{},patch); window.TdmMatch?.send('tdmPartyState',patch); };
  P.render=function(){
    const p=P.party; if(!p)return;
    const title=$('tdmTeamHubTitle'); if(title)title.textContent=`${p.team===1?'🔵 TEAM A':'🔴 TEAM B'} — TAYYORLANISH XONASI`;
    const code=$('tdmPartyCodeShow'); if(code)code.textContent=p.id;
    const list=$('tdmPartyMembers'); if(list) list.innerHTML=Array.from({length:5},(_,i)=>{
      const m=p.members[i]; return `<div class="partySlot"><div class="partyAvatar">${m?'🧑':'＋'}</div><div class="partyMember"><b>${m?esc(m.name):'Bo‘sh joy'}</b><small>${m?`LVL ${m.level||1} · ${m.ready?'✅ TAYYOR':'⏳ KUTILMOQDA'}`:'Do‘stingizni taklif qiling'}</small></div><div>${m?`👕 ${m.outfit||1}`:''}</div></div>`;
    }).join('');
    const map=$('tdmPartyMap'); if(map)map.value=p.map||P.selectedMap;
    const count=$('tdmPartyCount'); if(count)count.textContent=`${p.members.length}/5 O‘YINCHI`;
  };
  function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  window.addEventListener('load',()=>{
    $('tdmPartyCreateA')?.addEventListener('click',()=>P.create(1));
    $('tdmPartyCreateB')?.addEventListener('click',()=>P.create(2));
    $('tdmPartyJoin')?.addEventListener('click',P.join);
    $('tdmPartyReady')?.addEventListener('click',()=>P.update({ready:true}));
    $('tdmPartyOutfit')?.addEventListener('click',()=>P.update({outfit:Math.floor(Math.random()*8)+1}));
    $('tdmPartyMap')?.addEventListener('change',e=>P.update({map:e.target.value}));
    $('tdmPartyToMatch')?.addEventListener('click',()=>{P.close();window.openTdmArena?.();});
    $('tdmPartyClose')?.addEventListener('click',P.close);
    $('tdmPartyCodeCopy')?.addEventListener('click',async()=>{const code=$('tdmPartyCodeShow')?.textContent||'';try{await navigator.clipboard.writeText(code);$('tdmPartyStatus').textContent='TEAM kodi nusxalandi.';}catch(_){$('tdmPartyStatus').textContent='Kod: '+code;}});
    $('tdmPartyInvite')?.addEventListener('click',()=>{const code=$('tdmPartyCodeShow')?.textContent||'';const text=`TDM Team xonasiga qo‘shiling: ${code}`;if(navigator.share)navigator.share({text}).catch(()=>{});else{try{navigator.clipboard.writeText(text)}catch(_){}$('tdmPartyStatus').textContent=text;}});
    $('tdmPartyExchange')?.addEventListener('click',()=>{
      const n=Math.floor(Math.random()*5)+1; const out=$('tdmPartyExchangeStatus'); if(out)out.textContent=`${n*60} UC — demo almashinuv tayyor. Xarid server tasdig‘idan keyin qo‘llanadi.`;
    });
    window.TdmMatch?.listen('welcome',()=>{});
    window.TdmMatch?.listen('party',m=>{P.party=m.party;P.render();P.open();});
    window.TdmMatch?.listen('partyNotice',m=>{const o=$('tdmPartyStatus');if(o)o.textContent=m.message||'';});
  });
})();
