/* Persistent global player profiles for every map/mode. */
const fs=require('fs'), path=require('path');
const dir=path.join(__dirname,'data'); const file=path.join(dir,'playerProfiles.json');
if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
let db={profiles:{},byName:{}};
try{ if(fs.existsSync(file)) db=JSON.parse(fs.readFileSync(file,'utf8')); }catch(e){ db={profiles:{},byName:{}}; }
const cleanName=s=>String(s??'').replace(/\s+/g,'').slice(0,18);
const key=s=>cleanName(s).toLocaleLowerCase('en-US');
function save(){fs.writeFileSync(file,JSON.stringify(db,null,2));}
function id(){let x; do{x='UZP-'+Math.random().toString(36).slice(2,8).toUpperCase()}while(db.profiles[x]); return x;}
function createOrLogin({profileId,name,gender,eyeColor,hairstyle,appearance}){
  name=cleanName(name); if(name.length<2)return {error:'O‘yinchi nomi kamida 2 belgidan iborat bo‘lsin.'};
  const k=key(name);
  if(profileId && db.profiles[profileId]){
    const p=db.profiles[profileId];
    if(key(p.name)!==k)return {error:'Bu ID boshqa o‘yinchi nomiga tegishli.'};
    Object.assign(p,{gender:gender||p.gender,eyeColor:eyeColor||p.eyeColor,hairstyle:Number(hairstyle)||p.hairstyle,appearance:Number(appearance)||p.appearance}); save(); return {profile:p};
  }
  if(db.byName[k])return {error:'Bu o‘yinchi nomi allaqachon band. Boshqa nom tanlang.'};
  const p={id:id(),name,gender:gender==='female'?'female':'male',eyeColor:String(eyeColor||'brown'),hairstyle:Math.max(1,Math.min(10,Number(hairstyle)||1)),appearance:Math.max(1,Math.min(10,Number(appearance)||1)),level:1,xp:0,friendRequests:{incoming:[],outgoing:[]},friends:[],createdAt:Date.now()};
  db.profiles[p.id]=p; db.byName[k]=p.id; save(); return {profile:p};
}
function get(id){return db.profiles[id]||null;}
function nameOf(id){return db.profiles[id]?.name||id;}
function publicProfile(p){if(!p)return null; return {id:p.id,name:p.name,gender:p.gender,eyeColor:p.eyeColor,hairstyle:p.hairstyle,appearance:p.appearance,level:p.level,friendsCount:p.friends.length};}
function search(q){const s=String(q||'').trim(); if(!s)return []; const lower=s.toLocaleLowerCase('en-US'); return Object.values(db.profiles).filter(p=>p.id.toLowerCase()===lower || p.name.toLocaleLowerCase('en-US').includes(lower)).slice(0,20).map(publicProfile);}
function request(fromId,toId){const a=db.profiles[fromId],b=db.profiles[toId]; if(!a||!b)return {error:'O‘yinchi topilmadi.'}; if(a.id===b.id)return {error:'O‘zingizga taklif yubora olmaysiz.'}; if(a.friends.includes(b.id))return {error:'Bu o‘yinchi allaqachon do‘stingiz.'}; if(b.friendRequests.incoming.includes(a.id))return {error:'Taklif allaqachon yuborilgan.'}; b.friendRequests.incoming.push(a.id); a.friendRequests.outgoing.push(b.id); save(); return {ok:true};}
function respond(meId,fromId,accept){const me=db.profiles[meId],from=db.profiles[fromId]; if(!me||!from)return {error:'O‘yinchi topilmadi.'}; me.friendRequests.incoming=me.friendRequests.incoming.filter(x=>x!==fromId); from.friendRequests.outgoing=from.friendRequests.outgoing.filter(x=>x!==meId); if(accept){if(!me.friends.includes(fromId))me.friends.push(fromId);if(!from.friends.includes(meId))from.friends.push(meId);} save(); return {ok:true};}
function requests(id){const p=db.profiles[id]; if(!p)return {incoming:[],outgoing:[]}; return {incoming:p.friendRequests.incoming.map(x=>publicProfile(db.profiles[x])).filter(Boolean),outgoing:p.friendRequests.outgoing.map(x=>publicProfile(db.profiles[x])).filter(Boolean)};}
module.exports={cleanName,createOrLogin,search,request,respond,requests,publicProfile,get,nameOf};
