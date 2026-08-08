/* CITY-ONLY paid leisure activities. All fees use the same in-game UZS wallet. */
const Shop=require('./shopStore'); const Profiles=require('./profileStore');
const CITIES=['Toshkent','Samarqand','Andijon'];
const PLACES=[
 {id:'cafe',name:'Qahvaxona',fee:20000,minutes:60},
 {id:'restaurant',name:'Restoran',fee:75000,minutes:90},
 {id:'cinema',name:'Kinoteatr',fee:45000,minutes:120},
 {id:'pool',name:'Basseyn',fee:60000,minutes:120},
 {id:'spa',name:'SPA & Sauna',fee:120000,minutes:120},
 {id:'bowling',name:'Bowling klubi',fee:50000,minutes:90},
 {id:'park',name:'Piknik zonasi',fee:15000,minutes:120},
 {id:'club',name:'Tungi klub',fee:100000,minutes:180}
];
function list(city){return CITIES.includes(city)?PLACES.map(x=>({...x,city})):[];}
function enter(profileId,city,placeId){if(!Profiles.get(profileId))return {error:'Profil topilmadi.'};if(!CITIES.includes(city))return {error:'Dam olish joylari faqat shahar xaritalarida ishlaydi.'};const p=PLACES.find(x=>x.id===placeId);if(!p)return {error:'Joy topilmadi.'};const pay=Shop.spendMoney(profileId,p.fee);if(pay.error)return {error:`Kirish: ${p.fee.toLocaleString('uz-UZ')} so‘m. ${pay.error}`};return {ok:true,place:p,city,wallet:pay.wallet,expiresAt:Date.now()+p.minutes*60000};}
module.exports={list,enter,PLACES};
