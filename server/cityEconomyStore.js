/* CITY-ONLY PLAYER ECONOMY: player shops and personal brands.
   This is an in-game simulated economy; it never treats real-world money as game balance. */
const fs=require('fs'),path=require('path');
const Shop=require('./shopStore'); const Governance=require('./cityGovernanceStore');
const dir=path.join(__dirname,'data'); const file=path.join(dir,'cityEconomy.json');
if(!fs.existsSync(dir))fs.mkdirSync(dir,{recursive:true});
let db={businesses:{},byOwner:{},listings:{},transactions:[]};
try{if(fs.existsSync(file))db=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){db={businesses:{},byOwner:{},listings:{},transactions:[]};}
const CITIES=['Toshkent','Samarqand','Andijon'];
const clean=s=>String(s??'').replace(/\s+/g,' ').trim().slice(0,32);
const key=s=>clean(s).toLocaleLowerCase('uz-UZ');
const id=prefix=>prefix+'-'+Math.random().toString(36).slice(2,9).toUpperCase();
function save(){fs.writeFileSync(file,JSON.stringify(db,null,2));}
function validCity(city){return CITIES.includes(String(city||'').trim());}
function publicBusiness(b){return {id:b.id,ownerId:b.ownerId,name:b.name,type:b.type,city:b.city,brandName:b.brandName,level:b.level,reputation:b.reputation,products:b.products,createdAt:b.createdAt};}
function listBusinesses(city,type){const c=String(city||'').trim();return Object.values(db.businesses).filter(b=>(!c||b.city===c)&&(!type||b.type===type)).slice(0,100).map(publicBusiness);}
function ownerBusiness(ownerId,city,type){return Object.values(db.businesses).find(b=>b.ownerId===ownerId&&(!city||b.city===city)&&(!type||b.type===type));}
function create(ownerId,name,type,city,brandName){
  if(!ownerId)return {error:'Profil topilmadi.'}; city=String(city||'').trim(); type=type==='brand'?'brand':'shop'; name=clean(name); brandName=clean(brandName||name);
  if(!validCity(city))return {error:'Shaxsiy biznes faqat Toshkent, Samarqand yoki Andijon shahar xaritasida yaratiladi.'};
  if(name.length<3)return {error:'Biznes nomi kamida 3 belgidan iborat bo‘lsin.'};
  if(ownerBusiness(ownerId,null,type))return {error:`Sizda allaqachon ${type==='shop'?'do‘kon':'brend'} bor.`};
  const startupFee=type==='brand'?1500000:500000;
  // Validate the city/name before charging the player.
  if(Object.values(db.businesses).some(b=>b.city===city&&key(b.name)===key(name)))return {error:'Bu biznes nomi shu shaharda band.'};
  const payment=Shop.spendMoney(ownerId,startupFee);
  if(payment.error)return {error:`Biznes ochish badali: ${startupFee.toLocaleString('uz-UZ')} so‘m. ${payment.error}`};
  const b={id:id(type==='shop'?'SHOP':'BRAND'),ownerId,name,type,city,brandName,level:1,reputation:0,products:[],createdAt:Date.now()};
  db.businesses[b.id]=b; db.byOwner[ownerId]=db.byOwner[ownerId]||[]; db.byOwner[ownerId].push(b.id); save(); return {ok:true,business:publicBusiness(b),wallet:payment.wallet,fee:startupFee};
}
function addProduct(ownerId,businessId,itemId,price,stock){
  const b=db.businesses[businessId]; if(!b||b.ownerId!==ownerId)return {error:'Bu biznes sizga tegishli emas.'};
  const p=Math.max(100,Math.floor(Number(price)||0)), qty=Math.max(1,Math.min(999,Math.floor(Number(stock)||1)));
  const catalogItem=Shop.CATALOG.find(x=>x.id===String(itemId));
  if(!catalogItem)return {error:'Mahsulot ID do‘kon katalogida topilmadi.'};
  if(b.products.some(x=>x.itemId===itemId))return {error:'Bu mahsulot biznesingizda bor.'};
  b.products.push({id:id('LIST'),itemId:String(itemId).slice(0,48),price:p,stock:qty,sold:0});
  db.listings[b.products[b.products.length-1].id]=b.id; save(); return {ok:true,business:publicBusiness(b)};
}
function buy(buyerId,listingId,qty){
  const businessId=db.listings[listingId]; const b=db.businesses[businessId];
  if(!b)return {error:'Mahsulot topilmadi.'};
  const p=b.products.find(x=>x.id===listingId); if(!p)return {error:'Mahsulot topilmadi.'};
  if(b.ownerId===buyerId)return {error:'O‘z biznesingizdan xarid qila olmaysiz.'};
  const q=Math.max(1,Math.min(20,Math.floor(Number(qty)||1))); if(p.stock<q)return {error:'Omborda yetarli mahsulot yo‘q.'};
  const total=p.price*q;
  const taxRate=Governance.publicCity(b.city).taxRate||0;
  const tax=Math.floor(total*taxRate/100);
  const payment=Shop.transferMoney(buyerId,b.ownerId,total);
  if(payment.error)return {error:payment.error};
  p.stock-=q;p.sold+=q;b.reputation+=q; if(tax>0){ const sellerWallet=Shop.publicWallet(b.ownerId); const sellerTax=Math.min(tax,sellerWallet?.money||0); if(sellerTax>0){ Shop.spendMoney(b.ownerId,sellerTax); Governance.creditTax(b.city,sellerTax); } }
  db.transactions.push({id:id('TX'),buyerId,sellerId:b.ownerId,businessId:b.id,listingId,city:b.city,amount:total,qty:q,at:Date.now()});
  if(db.transactions.length>5000)db.transactions=db.transactions.slice(-5000);
  save(); return {ok:true,amount:total,businessId:b.id,sellerId:b.ownerId,city:b.city,wallet:payment.from};
}
function inventory(ownerId,businessId,itemId,qtyDelta){
 const b=db.businesses[businessId];if(!b||b.ownerId!==ownerId)return {error:'Biznes topilmadi.'};
 const p=b.products.find(x=>x.itemId===itemId);if(!p)return {error:'Mahsulot topilmadi.'};
 p.stock=Math.max(0,Math.min(9999,p.stock+Math.floor(Number(qtyDelta)||0)));save();return {ok:true,business:publicBusiness(b)};
}
function marketplace(city){return listBusinesses(city).flatMap(b=>b.products.map(p=>({listingId:p.id,businessId:b.id,businessName:b.name,brandName:b.brandName,type:b.type,city:b.city,itemId:p.itemId,price:p.price,stock:p.stock,sold:p.sold,reputation:b.reputation}))).filter(x=>x.stock>0).slice(0,200);}
function dashboard(ownerId){const bs=Object.values(db.businesses).filter(b=>b.ownerId===ownerId);const tx=db.transactions.filter(t=>t.sellerId===ownerId);return {businesses:bs.map(publicBusiness),sales:tx.slice(-50).reverse(),totalSales:tx.reduce((n,t)=>n+t.amount,0)};}
module.exports={CITIES,create,addProduct,buy,inventory,marketplace,listBusinesses,dashboard,ownerBusiness};
