/* City-only player business/economy UI. */
(function(){
 const S={city:'',businesses:[],listings:[],dashboard:null}; window.CityEconomyUI=S;
 const $=id=>document.getElementById(id);
 const send=(type,data={})=>{const s=window.GameSocket;if(s&&s.readyState===1)s.send(JSON.stringify({type,...data}));else toast('Avval serverga ulaning.')};
 const toast=t=>{const e=$('cityEcoToast');if(e){e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2200)}};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function city(){try{const n=typeof window.cityName==='function'?window.cityName():'';return ['Toshkent','Samarqand','Andijon'].includes(n)?n:''}catch(e){return ''}}
 function refresh(){
  S.city=city();
  if(!S.city){toast('Bu tizim faqat shahar xaritalari uchun.');return}
  send('cityBusinessList',{city:S.city});send('cityMarketplace',{city:S.city});send('cityBusinessDashboard',{});
 }
 function businessCard(b){return `<div class="ecoBiz"><b>${esc(b.name)}</b><small>${b.type==='brand'?'🏷️ Shaxsiy brend':'🏪 Do‘kon'} • ${esc(b.city)} • Lv.${b.level}</small><span>⭐ ${b.reputation} • ${b.products.length} mahsulot</span></div>`}
 function listingCard(x){return `<div class="ecoListing"><div><b>${esc(x.businessName)}</b><small>${esc(x.brandName)} • ${esc(x.itemId)} • ${esc(x.city)}</small></div><strong>💰 ${Number(x.price).toLocaleString('uz-UZ')} so‘m</strong><button data-buy="${esc(x.listingId)}">SOTIB OLISH</button></div>`}
 function render(){
  const b=$('ecoBusinessList');if(b)b.innerHTML=S.businesses.map(businessCard).join('')||'<small>Bu shaharda hali o‘yinchi biznesi yo‘q.</small>';
  const l=$('ecoMarketList');if(l)l.innerHTML=S.listings.map(listingCard).join('')||'<small>Bozor bo‘sh.</small>';
  const d=$('ecoDashboard');if(d&&S.dashboard)d.innerHTML=`Jami savdo: <b>${Number(S.dashboard.totalSales||0).toLocaleString('uz-UZ')} so‘m</b><br>Oxirgi savdolar: ${S.dashboard.sales?.length||0}`;
  document.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const q=prompt('Nechta olasiz?', '1');send('cityMarketplaceBuy',{listingId:b.dataset.buy,qty:q||1})});
 }
 window.addEventListener('profile-message',e=>{
  const m=e.detail||{};
  if(m.type==='cityBusinessList'){S.businesses=m.businesses||[];render()}
  if(m.type==='cityMarketplace'){S.listings=m.listings||[];render()}
  if(m.type==='cityBusinessDashboard'){S.dashboard=m.dashboard;render()}
  if(/cityBusiness.*Result|cityMarketplaceBuyResult/.test(m.type)){toast(m.message||'Bajarildi.');refresh()}
  if(m.type==='cityEconomyError')toast(m.message)
 });
 document.addEventListener('DOMContentLoaded',()=>{
  $('cityEcoOpen')?.addEventListener('click',()=>{$('cityEcoPanel').classList.add('show');refresh()});
  $('cityEcoClose')?.addEventListener('click',()=>$('cityEcoPanel').classList.remove('show'));
  $('ecoCreate')?.addEventListener('click',()=>{
   const c=city();if(!c){toast('Avval Toshkent, Samarqand yoki Andijon shahar xaritasiga kiring.');return}
   const type=$('ecoType').value,name=$('ecoName').value,brandName=$('ecoBrand').value||name;
   send('cityBusinessCreate',{city:c,businessType:type,name,brandName});
  });
  $('ecoAdd')?.addEventListener('click',()=>{
   const myId=window.PlayerProfile?.profile?.id||''; const b=S.businesses.find(x=>x.ownerId===myId);
   if(!b){toast('Avval biznes yarating.');return}
   send('cityBusinessAddProduct',{businessId:b.id,itemId:$('ecoItem').value,price:$('ecoPrice').value,stock:$('ecoStock').value});
  });
 });
})();
