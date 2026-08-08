(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const A={profile:null,physics:null}; window.CharacterDetail=A;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function send(type,data={}){if(window.GameSocket?.readyState===1)window.GameSocket.send(JSON.stringify({type,...data}));}
 function render(){const e=$('characterDetailStats');if(!e)return;const p=A.profile||{},x=A.physics||{};e.innerHTML=`
 <div class="cdGrid"><div>Jins <b>${p.gender==='female'?'Ayol':'Erkak'}</b></div><div>Bo‘y <b>${(x.height||0).toFixed(2)} m</b></div>
 <div>Og‘irlik <b>${(x.mass||0).toFixed(0)} kg</b></div><div>Kapsula <b>${(x.radius||0).toFixed(2)} m</b></div>
 <div>Yelka <b>${(x.shoulder||0).toFixed(2)} m</b></div><div>Oyoq <b>${(x.foot||0).toFixed(2)} m</b></div></div>
 <div class="cdTags"><span>🦴 Skeletal rig</span><span>🦶 Foot IK</span><span>🎯 Recoil</span><span>🧍 Ragdoll-ready</span><span>⚙️ Capsule collision</span></div>`;}
 function open(){ $('characterDetailPanel')?.classList.add('show'); send('characterPhysicsSnapshot'); }
 window.addEventListener('game:message',e=>{const m=e.detail||{};if(m.type==='characterPhysicsSnapshot'){A.profile=m.profile||{};A.physics=m.physics||{};render();}});
 document.addEventListener('DOMContentLoaded',()=>{ $('characterDetailOpen')?.addEventListener('click',open);$('characterDetailClose')?.addEventListener('click',()=>$('characterDetailPanel')?.classList.remove('show'));});
})();
