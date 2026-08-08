/* Global economy/shop for all maps and modes. Server-authoritative purchases. */
const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'data'); const file=path.join(dir,'playerEconomy.json');
if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
let db={players:{}};
try{if(fs.existsSync(file)) db=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){db={players:{}};}
for(const p of Object.values(db.players||{})){if(p.uc===undefined)p.uc=Number(p.ozc||0);delete p.ozc;}
function save(){fs.writeFileSync(file,JSON.stringify(db,null,2));}
function ensure(id){if(!id)return null;if(!db.players[id]) db.players[id]={money:250000,uc:300,owned:[],houses:[],vehicles:[],consumables:{water:3,food:3}};return db.players[id];}
const CATALOG=[
 {id:'outfit_basic',type:'outfit',name:'Oddiy kiyim',quality:'COMMON',price:25000,uc:0,style:1},
 {id:'outfit_city',type:'outfit',name:'Shahar kiyimi',quality:'UNCOMMON',price:65000,uc:20,style:2},
 {id:'outfit_sport',type:'outfit',name:'Sport kiyimi',quality:'RARE',price:120000,uc:45,style:3},
 {id:'outfit_premium',type:'outfit',name:'Premium kiyim',quality:'EPIC',price:250000,uc:90,style:4},
 {id:'outfit_elite',type:'outfit',name:'Elite kiyim',quality:'LEGENDARY',price:600000,uc:180,style:5},
 {id:'outfit_lux',type:'outfit',name:'Luxury kiyim',quality:'MYTHIC',price:1200000,uc:350,style:6},
 {id:'car_skin_basic',type:'carSkin',name:'Classic avtomobil skin',quality:'COMMON',price:40000,uc:0,style:1},
 {id:'car_skin_sport',type:'carSkin',name:'Sport avtomobil skin',quality:'RARE',price:180000,uc:60,style:2},
 {id:'car_skin_premium',type:'carSkin',name:'Premium avtomobil skin',quality:'EPIC',price:450000,uc:130,style:3},
 {id:'car_skin_elite',type:'carSkin',name:'Elite avtomobil skin',quality:'LEGENDARY',price:1000000,uc:300,style:4},
 {id:'car_sedan',type:'vehicle',name:'Shahar Sedan',quality:'COMMON',price:1800000,uc:500,style:1},
 {id:'car_suv',type:'vehicle',name:'Oila SUV',quality:'RARE',price:4200000,uc:900,style:2},
 {id:'car_sport',type:'vehicle',name:'Sport Car',quality:'EPIC',price:9000000,uc:1800,style:3},
 {id:'house_small',type:'house',name:'Kichik uy',quality:'COMMON',price:25000000,uc:0,style:1},
 {id:'house_family',type:'house',name:'Oilaviy uy',quality:'RARE',price:65000000,uc:2500,style:2},
 {id:'house_premium',type:'house',name:'Premium villa',quality:'EPIC',price:180000000,uc:6500,style:3},
 {id:'water',type:'consumable',name:'Suv',quality:'COMMON',price:2500,uc:0,style:1},
 {id:'food',type:'consumable',name:'Yegulik',quality:'COMMON',price:8000,uc:0,style:1}
];
function list(type){return CATALOG.filter(x=>!type||x.type===type);}
function publicWallet(id){const p=ensure(id);return p?{money:p.money,uc:p.uc||0,owned:p.owned,houseCount:p.houses.length,vehicleCount:p.vehicles.length,consumables:p.consumables,houses:p.houses}:null;}
function buy(profileId,itemId,currency,city){const p=ensure(profileId),item=CATALOG.find(x=>x.id===itemId);if(!p||!item)return {error:'Profil yoki mahsulot topilmadi.'};currency=(currency==='uc'||currency==='ozc')?'uc':'money'; if(p.uc===undefined)p.uc=0;
 const cityName=String(city||'').trim();
 const allowedCities=['Toshkent','Samarqand','Andijon'];
 if(item.type==='house' && !allowedCities.includes(cityName))return {error:'Uy faqat shahar xaritasi ichida sotib olinadi. Shahar xaritasini tanlang.'};
 const price=item[currency];if(price===undefined||price<=0)return {error:`${item.name} bu valyutada sotilmaydi.`};if(p[currency]<price)return {error:'Mablag‘ yetarli emas.'};
 if(item.type==='consumable'){p.consumables[item.id]=(p.consumables[item.id]||0)+1;} else {if(p.owned.includes(item.id))return {error:'Bu mahsulot sizda allaqachon bor.'};p.owned.push(item.id);if(item.type==='house')p.houses.push({itemId:item.id,boughtAt:Date.now(),city:cityName,rentPaidUntil:Date.now()+7*24*60*60*1000});if(item.type==='vehicle')p.vehicles.push({itemId:item.id,boughtAt:Date.now(),skin:null});}
 p[currency]-=price;save();return {ok:true,item,wallet:publicWallet(profileId)};}
function place(profileId,itemId,city){const p=ensure(profileId);if(!p)return {error:'Profil topilmadi.'};const target=String(city||'').trim();const h=p.houses.find(x=>x.itemId===itemId);if(!h)return {error:'Avval shu shahar uchun uyni sotib oling.'};if(h.city && h.city!==target)return {error:`Bu uy ${h.city} xaritasiga tegishli. Boshqa xaritada joylab bo‘lmaydi.`};if(!['Toshkent','Samarqand','Andijon'].includes(target))return {error:'Faqat mavjud shahar xaritasida uy joylashtirish mumkin.'};h.city=target;save();return {ok:true,wallet:publicWallet(profileId)};}
function spendMoney(id,amount){
 const p=ensure(id),n=Math.max(0,Math.floor(Number(amount)||0));
 if(!p||p.money<n)return {error:'Biznes ochish uchun mablag‘ yetarli emas.'};
 p.money-=n;save();return {ok:true,wallet:publicWallet(id)};
}
function transferMoney(fromId,toId,amount){
 const a=ensure(fromId),b=ensure(toId),n=Math.max(0,Math.floor(Number(amount)||0));
 if(!a||!b||n<=0)return {error:'To‘lovni amalga oshirib bo‘lmaydi.'};
 if(a.money<n)return {error:'Mablag‘ yetarli emas.'};
 a.money-=n;b.money+=n;save();return {ok:true,from:publicWallet(fromId),to:publicWallet(toId)};
}
function payRent(profileId,itemId,city){const p=ensure(profileId);if(!p)return {error:'Profil topilmadi.'};const h=p.houses.find(x=>x.itemId===itemId);if(!h)return {error:'Uy topilmadi.'};if(h.city!==city)return {error:`Bu uy ${h.city} xaritasiga tegishli.`};const item=CATALOG.find(x=>x.id===itemId);const rent=Math.max(50000,Math.floor((item?.price||25000000)*0.002));const now=Date.now();if(h.rentPaidUntil>now)return {error:'Ijara to‘lovi hali muddatidan o‘tmagan.',rent,rentPaidUntil:h.rentPaidUntil,wallet:publicWallet(profileId)};if(p.money<rent)return {error:`Ijara uchun ${rent.toLocaleString('uz-UZ')} so‘m kerak.`};p.money-=rent;h.rentPaidUntil=now+7*24*60*60*1000;save();return {ok:true,rent,rentPaidUntil:h.rentPaidUntil,wallet:publicWallet(profileId)};}
function earnMoney(profileId,amount){const p=ensure(profileId),n=Math.max(0,Math.floor(Number(amount)||0));if(!p||n<=0)return {error:'Daromad noto‘g‘ri.'};p.money+=n;save();return {ok:true,amount:n,wallet:publicWallet(profileId)};}
function exchangeMoneyForUc(profileId,moneyAmount,ucAmount){const p=ensure(profileId);const cost=Math.max(0,Math.floor(Number(moneyAmount)||0)),gain=Math.max(0,Math.floor(Number(ucAmount)||0));if(!p||cost<=0||gain<=0)return {error:'Almashtirish ma’lumotlari noto‘g‘ri.'};if(p.money<cost)return {error:'UZS balans yetarli emas.'};p.money-=cost;p.uc=(p.uc||0)+gain;save();return {ok:true,wallet:publicWallet(profileId),cost,gain};}
function setVehicleSkin(profileId,vehicleId,skinId){const p=ensure(profileId);if(!p)return {error:'Profil topilmadi.'};const vehicle=CATALOG.find(x=>x.id===vehicleId),skin=CATALOG.find(x=>x.id===skinId);if(!vehicle||vehicle.type!=='vehicle'||!skin||skin.type!=='carSkin')return {error:'Faqat avtomobil va avtomobil skinini biriktirish mumkin.'};if(!p.owned.includes(vehicleId)||!p.owned.includes(skinId))return {error:'Avval avtomobil va skinni sotib oling.'};const v=p.vehicles.find(x=>x.itemId===vehicleId);if(v)v.skin=skinId;save();return {ok:true,wallet:publicWallet(profileId)};}
module.exports={list,publicWallet,buy,place,payRent,earnMoney,exchangeMoneyForUc,setVehicleSkin,transferMoney,spendMoney,CATALOG};
