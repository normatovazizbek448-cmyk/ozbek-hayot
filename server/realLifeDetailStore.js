
/* REAL-LIFE DETAIL SIMULATION — city maps only.
   Server-authoritative needs, utilities, vehicle fuel/wear and daily living costs.
   This is a game simulation, not a real financial service. */
const fs=require('fs'),path=require('path');
const Shop=require('./shopStore');
const dir=path.join(__dirname,'data'); const file=path.join(dir,'realLifeDetail.json');
if(!fs.existsSync(dir))fs.mkdirSync(dir,{recursive:true});
let db={players:{}};
try{if(fs.existsSync(file))db=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){db={players:{}};}
const CITIES=['Toshkent','Samarqand','Andijon'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function save(){fs.writeFileSync(file,JSON.stringify(db,null,2));}
function ensure(id,city){
 if(!id)return null;
 if(!db.players[id])db.players[id]={city:city||'Toshkent',hunger:92,thirst:94,energy:90,hygiene:88,health:100,mood:80,fuel:65,vehicleWear:4,utilitiesDue:0,lastTick:Date.now(),lastCity:city||'Toshkent'};
 const p=db.players[id]; if(city&&CITIES.includes(city))p.city=city,p.lastCity=city;
 tick(p); return p;
}
function tick(p){
 const now=Date.now(), mins=Math.max(0,Math.floor((now-(p.lastTick||now))/60000)); if(!mins)return;
 p.hunger=clamp(p.hunger-mins*0.06,0,100);p.thirst=clamp(p.thirst-mins*0.09,0,100);
 p.energy=clamp(p.energy-mins*0.035,0,100);p.hygiene=clamp(p.hygiene-mins*0.018,0,100);
 const stress=(p.hunger<20?7:0)+(p.thirst<20?8:0)+(p.energy<15?6:0)+(p.hygiene<15?3:0);
 p.mood=clamp(p.mood-mins*0.012-stress*0.01,0,100);
 if(p.hunger<8||p.thirst<8)p.health=clamp(p.health-mins*0.02,1,100);
 p.utilitiesDue=Math.min(2500000,(p.utilitiesDue||0)+mins*1.15);
 p.lastTick=now;save();
}
function snapshot(id,city){
 const p=ensure(id,city); if(!p)return null;
 return {city:p.city,hunger:+p.hunger.toFixed(1),thirst:+p.thirst.toFixed(1),energy:+p.energy.toFixed(1),hygiene:+p.hygiene.toFixed(1),health:+p.health.toFixed(1),mood:+p.mood.toFixed(1),fuel:+p.fuel.toFixed(1),vehicleWear:+p.vehicleWear.toFixed(1),utilitiesDue:Math.floor(p.utilitiesDue||0),serverTime:new Date().toISOString()};
}
function act(id,city,action){
 const p=ensure(id,city); if(!p)return {error:'Profil topilmadi.'};
 const costs={eat:8000,drink:2500,rest:0,shower:5000,fuel:12000,repair:35000,utilities:Math.max(0,Math.floor(p.utilitiesDue||0))};
 if(action==='eat'){if(!pay(id,costs.eat))return {error:'Ovqat uchun mablag‘ yetarli emas.'};p.hunger=clamp(p.hunger+28,0,100);p.mood=clamp(p.mood+2,0,100);}
 else if(action==='drink'){if(!pay(id,costs.drink))return {error:'Suv uchun mablag‘ yetarli emas.'};p.thirst=clamp(p.thirst+34,0,100);}
 else if(action==='rest'){p.energy=clamp(p.energy+35,0,100);p.mood=clamp(p.mood+5,0,100);}
 else if(action==='shower'){if(!pay(id,costs.shower))return {error:'Dush uchun mablag‘ yetarli emas.'};p.hygiene=clamp(p.hygiene+45,0,100);}
 else if(action==='fuel'){if(!pay(id,costs.fuel))return {error:'Yoqilg‘i uchun mablag‘ yetarli emas.'};p.fuel=clamp(p.fuel+28,0,100);}
 else if(action==='repair'){if(!pay(id,costs.repair))return {error:'Ta’mir uchun mablag‘ yetarli emas.'};p.vehicleWear=clamp(p.vehicleWear-35,0,100);}
 else if(action==='utilities'){const n=Math.floor(p.utilitiesDue||0);if(n>0&&!pay(id,n))return {error:'Kommunal to‘lov uchun mablag‘ yetarli emas.'};p.utilitiesDue=0;}
 else return {error:'Noma’lum amal.'};
 save(); return {ok:true,snapshot:snapshot(id,city),wallet:Shop.publicWallet(id)};
}
function pay(id,n){const r=Shop.spendMoney(id,n);return !r.error;}
function dailyDetails(city){
 return {city,weather:['Quyoshli','Bulutli','Yomg‘irli','Shamolli'][new Date().getDate()%4],
 traffic:['Yengil','O‘rtacha','Tirband'][new Date().getHours()%3],
 priceIndex:{food:1.00,transport:1.03,leisure:1.05},currency:'UZS',premiumCurrency:'UC'};
}
module.exports={snapshot,act,dailyDetails};
