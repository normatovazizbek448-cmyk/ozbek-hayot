
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 function send(type,data){if(window.GameSocket?.readyState===1)window.GameSocket.send(JSON.stringify({type,...data}));}
 function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 function bar(label,v){return `<div class="rlBar"><span>${label}</span><b>${Math.round(v||0)}%</b><i><em style="width:${Math.max(0,Math.min(100,v||0))}%"></em></i></div>`}
 function render(s){const e=$('realLifeStats');if(!e||!s)return;e.innerHTML=
   bar('🍲 Ochlik',s.hunger)+bar('💧 Chanqoq',s.thirst)+bar('⚡ Energiya',s.energy)+bar('🚿 Tozalik',s.hygiene)+bar('❤️ Sog‘liq',s.health)+bar('🙂 Kayfiyat',s.mood)+bar('⛽ Yoqilg‘i',s.fuel)+bar('🔧 Mashina holati',100-(s.vehicleWear||0))+
   `<div class="rlMeta">🏙️ ${esc(s.city)} • 🧾 Kommunal: <b>${Number(s.utilitiesDue||0).toLocaleString('uz-UZ')} so‘m</b></div>`;}
 window.RealLifeDetail={refresh:()=>send('realLifeSnapshot',{}),action:a=>send('realLifeAction',{action:a})};
 document.addEventListener('DOMContentLoaded',()=>{
   const b=$('realLifeOpen'),p=$('realLifePanel'),c=$('realLifeClose');
   if(b)b.onclick=()=>{p.classList.add('show');window.RealLifeDetail.refresh()};
   if(c)c.onclick=()=>p.classList.remove('show');
   document.querySelectorAll('[data-real-action]').forEach(x=>x.onclick=()=>window.RealLifeDetail.action(x.dataset.realAction));
 });
 window.addEventListener('game:message',e=>{const m=e.detail;if(m?.type==='realLifeSnapshot')render(m.snapshot);if(m?.type==='realLifeActionResult'){render(m.snapshot); if(window.banner)banner(m.message)}});
})();
