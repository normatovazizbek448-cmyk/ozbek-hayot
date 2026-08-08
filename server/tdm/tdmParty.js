/* TDM team preparation rooms: one party = one 5-player team. */
const MAX_PARTY=5;
const VALID_MAPS=new Set(['TDM_Arena_800x500m','TDM_Arena_Night','TDM_Arena_Training']);
const parties=new Map();
function makeId(team){return 'TEAM-'+(team===2?'B':'A')+'-'+Math.random().toString(36).slice(2,6).toUpperCase();}
function create(ownerId,name,team=1){
  team=team===2?2:1;
  for(const [pid,p] of parties) if(p.members.has(ownerId)) leave(pid,ownerId);
  let id; do{id=makeId(team)}while(parties.has(id));
  const p={id,ownerId,team,createdAt:Date.now(),map:'TDM_Arena_800x500m',members:new Map()};
  p.members.set(ownerId,{id:ownerId,name:(name||'Player').slice(0,18),ready:false,outfit:1,level:1});
  parties.set(id,p); return p;
}
function join(id,member){
  const p=parties.get(id); if(!p)return {error:'Team xona topilmadi.'};
  for(const [pid,other] of parties) if(pid!==id && other.members.has(member.id)) leave(pid,member.id);
  if(p.members.size>=MAX_PARTY && !p.members.has(member.id))return {error:'Team xonasi to‘la: 5/5.'};
  p.members.set(member.id,{id:member.id,name:(member.name||'Player').slice(0,18),ready:false,outfit:1,level:1});
  return {party:p};
}
function leave(id,memberId){
  const p=parties.get(id); if(!p)return;
  p.members.delete(memberId);
  if(!p.members.size){parties.delete(id);return;}
  if(p.ownerId===memberId)p.ownerId=[...p.members.keys()][0];
}
function setMember(id,memberId,patch){const p=parties.get(id);if(!p)return;const m=p.members.get(memberId);if(!m)return;Object.assign(m,patch);}
function setMap(id,map){const p=parties.get(id);if(p && typeof map==='string' && VALID_MAPS.has(map))p.map=map;}
function clean(p){return {id:p.id,ownerId:p.ownerId,team:p.team,map:p.map,members:[...p.members.values()]};}
function get(id){return parties.get(id);}
module.exports={MAX_PARTY,VALID_MAPS,create,join,leave,setMember,setMap,clean,get};
