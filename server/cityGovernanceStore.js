/* CITY-ONLY fictional governance simulation. This is an in-game system, not a real governmental office. */
const fs=require('fs'),path=require('path');
const Shop=require('./shopStore');
const Profiles=require('./profileStore');
const dir=path.join(__dirname,'data'); const file=path.join(dir,'cityGovernance.json');
if(!fs.existsSync(dir))fs.mkdirSync(dir,{recursive:true});
const CITIES=['Toshkent','Samarqand','Andijon'];
let db={cities:{}};
try{if(fs.existsSync(file))db=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){db={cities:{}};}
for(const city of CITIES) if(!db.cities[city]) db.cities[city]={presidentId:null,electionId:0,electionEndsAt:0,candidates:{},votes:{},budget:50000000,taxRate:5,history:[]};
function save(){fs.writeFileSync(file,JSON.stringify(db,null,2));}
const clean=s=>String(s??'').replace(/\s+/g,' ').trim().slice(0,32);
function validCity(c){return CITIES.includes(String(c||''));}
function ensureElection(city){const c=db.cities[city]; if(!c.electionId){c.electionId=1;c.electionEndsAt=Date.now()+7*24*60*60*1000;save();}return c;}
function publicCity(city){const c=ensureElection(city); const counts={};for(const id of Object.values(c.votes))counts[id]=(counts[id]||0)+1;const candidates=Object.values(c.candidates).map(x=>({...x,votes:counts[x.profileId]||0}));return {city,presidentId:c.presidentId,electionId:c.electionId,electionEndsAt:c.electionEndsAt,budget:c.budget,taxRate:c.taxRate,candidates,history:c.history.slice(-10).reverse()};}
function registerCandidate(profileId,city,manifesto){if(!validCity(city))return {error:'Faqat shahar xaritasida nomzod bo‘lish mumkin.'};const p=Profiles.get(profileId); if(!p)return {error:'Profil topilmadi.'};const c=ensureElection(city);if(c.candidates[profileId])return {error:'Siz allaqachon nomzodsiz.'};const fee=1000000;const pay=Shop.spendMoney(profileId,fee);if(pay.error)return {error:'Nomzodlik badali 1 000 000 so‘m. '+pay.error};c.candidates[profileId]={profileId,name:Profiles.nameOf(profileId),manifesto:clean(manifesto||'Shaharni rivojlantirish'),joinedAt:Date.now()};save();return {ok:true,fee,wallet:pay.wallet,city:publicCity(city)};}
function vote(profileId,city,candidateId){if(!Profiles.get(profileId))return {error:'Profil topilmadi.'};if(!validCity(city))return {error:'Shahar noto‘g‘ri.'};const c=ensureElection(city);if(c.votes[profileId])return {error:'Bu saylovda siz allaqachon ovoz bergansiz.'};if(!c.candidates[candidateId])return {error:'Nomzod topilmadi.'};c.votes[profileId]=candidateId;save();return {ok:true,city:publicCity(city)};}
function finalize(city){const c=ensureElection(city);if(Date.now()<c.electionEndsAt)return {error:'Saylov hali tugamagan.'};const counts={};for(const id of Object.values(c.votes))counts[id]=(counts[id]||0)+1;let winner=null,max=-1;for(const [id,n] of Object.entries(counts)){if(n>max){max=n;winner=id;}}c.presidentId=winner||c.presidentId;c.history.push({electionId:c.electionId,winnerId:winner,votes:max,at:Date.now()});c.electionId++;c.electionEndsAt=Date.now()+7*24*60*60*1000;c.candidates={};c.votes={};save();return {ok:true,city:publicCity(city)};}
function creditTax(city,amount){const c=db.cities[city];const n=Math.max(0,Math.floor(Number(amount)||0));if(c&&n>0){c.budget+=n;save();}return n;}
function setTax(profileId,city,rate){const c=db.cities[city];if(!c||c.presidentId!==profileId)return {error:'Faqat shu shaharning saylangan shahar prezidenti soliq stavkasini o‘zgartira oladi.'};const r=Math.max(0,Math.min(15,Number(rate)||0));c.taxRate=r;save();return {ok:true,city:publicCity(city)};}
function spendBudget(profileId,city,amount,reason){const c=db.cities[city];if(!c||c.presidentId!==profileId)return {error:'Budjetdan foydalanish huquqi yo‘q.'};const n=Math.max(0,Math.floor(Number(amount)||0));if(n>c.budget)return {error:'Shahar budjetida mablag‘ yetarli emas.'};c.budget-=n;c.history.push({type:'budget',amount:n,reason:clean(reason||'Shahar loyihasi'),at:Date.now()});save();return {ok:true,city:publicCity(city)};}
module.exports={CITIES,publicCity,registerCandidate,vote,finalize,setTax,spendBudget,creditTax};
