const http = require("http");
const WebSocket = require("ws");
const {TdmMatch,MAX_PLAYERS: TDM_MAX_PLAYERS} = require("./tdm/tdmMatch");
const TdmParty = require("./tdm/tdmParty");
const Profiles = require("./profileStore");
const Shop = require("./shopStore");
const CityEconomy = require("./cityEconomyStore");
const CityGovernance = require("./cityGovernanceStore");
const CityLeisure = require("./cityLeisureStore");
const CityLegal = require("./cityLegalStore");
const RealLifeDetail = require("./realLifeDetailStore");
const {PhysicsWorld} = require("./physics/PhysicsWorld");
const profileSockets = new Map();
const physicsWorld = new PhysicsWorld({mapMinX:0,mapMaxX:3000,mapMinZ:0,mapMaxZ:3000});

const PORT = process.env.PORT || 8080;
const MAX_PLAYERS = 60;
const players = new Map();
let matchId = "BR-" + Math.random().toString(36).slice(2,8).toUpperCase();
let phase = "lobby"; // lobby -> game
let startedAt = null;

const tdmMatch = new TdmMatch(data=>broadcastTdm(data));

const httpServer = http.createServer((req,res)=>{
  if(req.url === "/health"){
    res.writeHead(200, {"Content-Type":"application/json"});
    return res.end(JSON.stringify({
      ok:true, phase, players:players.size, maxPlayers:MAX_PLAYERS,
      tdm:{phase:tdmMatch.phase,players:tdmMatch.playerCount(),maxPlayers:TDM_MAX_PLAYERS,matchId:tdmMatch.matchId},
      matchId, startedAt
    }));
  }
  res.writeHead(200, {"Content-Type":"text/plain"});
  res.end("Battle Royale Arena server");
});

const wss = new WebSocket.Server({server:httpServer,path:"/ws"});

function cleanPlayer(p){
  return {
    id:p.id,name:p.name,x:p.x,y:p.y,z:p.z,yaw:p.yaw,hp:p.hp,
    team:p.team,alive:p.alive,ready:p.ready,phase:p.phase,
    brX:p.brX,brY:p.brY,brPhase:p.brPhase,brAlive:p.brAlive,brOutfit:p.brOutfit,
    vx:p.vx||0,vy:p.vy||0,vz:p.vz||0,grounded:p.grounded!==false
  };
}

function lobbySnapshot(){
  return JSON.stringify({
    type:"lobby",
    matchId, phase, maxPlayers:MAX_PLAYERS,
    hostId:[...players.values()][0]?.id || null,
    players:[...players.values()].map(cleanPlayer)
  });
}

function gameSnapshot(){
  return JSON.stringify({
    type:"snapshot", matchId, phase,
    players:[...players.values()].filter(p=>p.phase==="game").map(cleanPlayer)
  });
}
function brSnapshot(){
  return JSON.stringify({type:"brSnapshot",matchId,players:[...players.values()].filter(p=>p.phase==="game"&&p.brPhase).map(cleanPlayer)});
}

function broadcast(data){
  const msg=typeof data==="string"?data:JSON.stringify(data);
  for(const p of players.values()){
    if(p.ws.readyState===WebSocket.OPEN) p.ws.send(msg);
  }
}

function handleProfileMessage(ws, player, m){
  if(m.type==="characterPhysicsSnapshot") {
    const profile = player.profileId ? Profiles.get(player.profileId) : null;
    const physics = physicsWorld.characterProfile(profile || {gender:"male"});
    ws.send(JSON.stringify({type:"characterPhysicsSnapshot",profile:profile?Profiles.publicProfile(profile):{},physics})); return true;
  }
  if(m.type==="realLifeSnapshot"){ if(!player.profileId){ws.send(JSON.stringify({type:"realLifeSnapshot",snapshot:null}));return true;} ws.send(JSON.stringify({type:"realLifeSnapshot",snapshot:RealLifeDetail.snapshot(player.profileId,player.city),details:RealLifeDetail.dailyDetails(player.city)})); return true; }
  if(m.type==="realLifeAction"){ if(!player.profileId){ws.send(JSON.stringify({type:"realLifeActionResult",ok:false,message:"Avval profil yarating."}));return true;} const r=RealLifeDetail.act(player.profileId,player.city,String(m.action||"")); ws.send(JSON.stringify({type:"realLifeActionResult",ok:!r.error,message:r.error||"Amal bajarildi.",snapshot:r.snapshot||null,wallet:r.wallet||null})); return true; }
  if(m.type==="cityGovernance"){ const city=String(player.city||""); ws.send(JSON.stringify({type:"cityGovernance",city,data:CityGovernance.publicCity(city)})); return true; }
  if(m.type==="cityLegal"){ ws.send(JSON.stringify({type:"cityLegal",principles:CityLegal.list(),officialSource:CityLegal.officialSource})); return true; }
  if(m.type==="cityCandidateRegister"){ if(!player.profileId){ws.send(JSON.stringify({type:"cityGovernanceError",message:"Avval profil yarating."}));return true;} const r=CityGovernance.registerCandidate(player.profileId,player.city,m.manifesto); ws.send(JSON.stringify({type:"cityCandidateRegisterResult",ok:!r.error,message:r.error||"Nomzodlik qabul qilindi.",city:r.city||null,wallet:r.wallet||null})); return true; }
  if(m.type==="cityVote"){ if(!player.profileId){ws.send(JSON.stringify({type:"cityGovernanceError",message:"Avval profil yarating."}));return true;} const r=CityGovernance.vote(player.profileId,player.city,String(m.candidateId||"")); ws.send(JSON.stringify({type:"cityVoteResult",ok:!r.error,message:r.error||"Ovoz qabul qilindi.",city:r.city||null})); return true; }
  if(m.type==="cityFinalizeElection"){ const r=CityGovernance.finalize(player.city); ws.send(JSON.stringify({type:"cityElectionFinalizeResult",ok:!r.error,message:r.error||"Saylov yakunlandi.",city:r.city||null})); return true; }
  if(m.type==="citySetTax"){ if(!player.profileId){ws.send(JSON.stringify({type:"cityGovernanceError",message:"Avval profil yarating."}));return true;} const r=CityGovernance.setTax(player.profileId,player.city,m.rate); ws.send(JSON.stringify({type:"citySetTaxResult",ok:!r.error,message:r.error||"Soliq stavkasi yangilandi.",city:r.city||null})); return true; }
  if(m.type==="cityBudgetSpend"){ if(!player.profileId){ws.send(JSON.stringify({type:"cityGovernanceError",message:"Avval profil yarating."}));return true;} const r=CityGovernance.spendBudget(player.profileId,player.city,m.amount,m.reason); ws.send(JSON.stringify({type:"cityBudgetSpendResult",ok:!r.error,message:r.error||"Budjet sarfi amalga oshirildi.",city:r.city||null})); return true; }
  if(m.type==="cityLeisureList"){ ws.send(JSON.stringify({type:"cityLeisureList",city:player.city,places:CityLeisure.list(player.city)})); return true; }
  if(m.type==="cityLeisureEnter"){ if(!player.profileId){ws.send(JSON.stringify({type:"cityLeisureResult",ok:false,message:"Avval profil yarating."}));return true;} const r=CityLeisure.enter(player.profileId,player.city,String(m.placeId||"")); ws.send(JSON.stringify({type:"cityLeisureResult",ok:!r.error,message:r.error||`${r.place.name}ga kirish to‘lovi amalga oshdi.`,place:r.place||null,wallet:r.wallet||null,expiresAt:r.expiresAt||0})); return true; }
  if(m.type==="cityJobPayout"){ if(!player.profileId){ws.send(JSON.stringify({type:"cityJobPayoutResult",ok:false,message:"Avval profil yarating."}));return true;} const r=Shop.earnMoney(player.profileId,m.amount); ws.send(JSON.stringify({type:"cityJobPayoutResult",ok:!r.error,message:r.error||`+${r.amount.toLocaleString('uz-UZ')} so‘m ish haqi.`,wallet:r.wallet||null})); return true; }
  if(m.type==="shopExchangeUc"){ if(!player.profileId){ws.send(JSON.stringify({type:"shopUcExchangeResult",ok:false,message:"Avval profil yarating."}));return true;} const r=Shop.exchangeMoneyForUc(player.profileId,m.cost,m.uc); ws.send(JSON.stringify({type:"shopUcExchangeResult",ok:!r.error,message:r.error||`+${r.gain} UC olindi.`,wallet:r.wallet||null})); return true; }
  if(m.type==="shopRentPay"){ if(!player.profileId){ws.send(JSON.stringify({type:"shopRentResult",ok:false,message:"Avval profil yarating."}));return true;} const r=Shop.payRent(player.profileId,String(m.itemId||""),player.city); ws.send(JSON.stringify({type:"shopRentResult",ok:!r.error,message:r.error||"Ijara to‘lovi amalga oshirildi.",wallet:r.wallet||null,rent:r.rent||0,rentPaidUntil:r.rentPaidUntil||0})); return true; }
  if(m.type==="cityBusinessList"){ ws.send(JSON.stringify({type:"cityBusinessList",city:String(m.city||""),businesses:CityEconomy.listBusinesses(player.city,m.businessType)})); return true; }
  if(m.type==="cityMarketplace"){ ws.send(JSON.stringify({type:"cityMarketplace",city:String(m.city||""),listings:CityEconomy.marketplace(player.city)})); return true; }
  if(m.type==="cityBusinessCreate"){
    if(!player.profileId){ws.send(JSON.stringify({type:"cityEconomyError",message:"Avval profil yarating."}));return true;}
    const r=CityEconomy.create(player.profileId,m.name,m.businessType,player.city,m.brandName);
    ws.send(JSON.stringify({type:"cityBusinessCreateResult",ok:!r.error,message:r.error||"Biznes yaratildi.",business:r.business||null,wallet:r.wallet||null,fee:r.fee||0})); return true;
  }
  if(m.type==="cityBusinessAddProduct"){
    if(!player.profileId){ws.send(JSON.stringify({type:"cityEconomyError",message:"Avval profil yarating."}));return true;}
    const r=CityEconomy.addProduct(player.profileId,String(m.businessId||""),String(m.itemId||""),m.price,m.stock);
    ws.send(JSON.stringify({type:"cityBusinessProductResult",ok:!r.error,message:r.error||"Mahsulot qo‘shildi.",business:r.business||null})); return true;
  }
  if(m.type==="cityBusinessStock"){
    if(!player.profileId){ws.send(JSON.stringify({type:"cityEconomyError",message:"Avval profil yarating."}));return true;}
    const r=CityEconomy.inventory(player.profileId,String(m.businessId||""),String(m.itemId||""),m.delta);
    ws.send(JSON.stringify({type:"cityBusinessStockResult",ok:!r.error,message:r.error||"Ombor yangilandi.",business:r.business||null})); return true;
  }
  if(m.type==="cityMarketplaceBuy"){
    if(!player.profileId){ws.send(JSON.stringify({type:"cityEconomyError",message:"Avval profil yarating."}));return true;}
    const r=CityEconomy.buy(player.profileId,String(m.listingId||""),m.qty);
    ws.send(JSON.stringify({type:"cityMarketplaceBuyResult",ok:!r.error,message:r.error||"Xarid amalga oshdi.",result:r||null})); return true;
  }
  if(m.type==="cityBusinessDashboard"){
    if(!player.profileId){ws.send(JSON.stringify({type:"cityEconomyError",message:"Avval profil yarating."}));return true;}
    ws.send(JSON.stringify({type:"cityBusinessDashboard",dashboard:CityEconomy.dashboard(player.profileId)})); return true;
  }
  if(m.type==="shopCatalog"){ ws.send(JSON.stringify({type:"shopCatalog",items:Shop.list(m.category)})); return true; }
  if(m.type==="shopWallet"){ if(!player.profileId){ws.send(JSON.stringify({type:"shopError",message:"Avval profil yarating."}));return true;} ws.send(JSON.stringify({type:"shopWallet",wallet:Shop.publicWallet(player.profileId)})); return true; }
  if(m.type==="shopBuy"){ if(!player.profileId){ws.send(JSON.stringify({type:"shopError",message:"Avval profil yarating."}));return true;} const r=Shop.buy(player.profileId,String(m.itemId||""),m.currency,player.city); ws.send(JSON.stringify({type:"shopPurchase",ok:!r.error,message:r.error||`${r.item.name}${r.item.type==="house" ? ` ${player.city} xaritasidan sotib olindi.` : " sotib olindi."}`,item:r.item||null,wallet:r.wallet||null})); return true; }
  if(m.type==="shopPlaceHouse"){ if(!player.profileId){ws.send(JSON.stringify({type:"shopError",message:"Avval profil yarating."}));return true;} const r=Shop.place(player.profileId,String(m.itemId||""),player.city); ws.send(JSON.stringify({type:"shopHousePlaced",ok:!r.error,message:r.error||"Uy shahar xaritasiga joylashtirildi.",wallet:r.wallet||null})); return true; }
  if(m.type==="shopVehicleSkin"){ if(!player.profileId){ws.send(JSON.stringify({type:"shopError",message:"Avval profil yarating."}));return true;} const r=Shop.setVehicleSkin(player.profileId,String(m.vehicleId||""),String(m.skinId||"")); ws.send(JSON.stringify({type:"shopVehicleSkin",ok:!r.error,message:r.error||"Mashina skini qo‘llandi.",wallet:r.wallet||null})); return true; }
  if(m.type==="profileRegister"){
    const r=Profiles.createOrLogin({profileId:String(m.profileId||''),name:m.name,gender:m.gender,eyeColor:m.eyeColor,hairstyle:m.hairstyle,appearance:m.appearance});
    if(r.error){ ws.send(JSON.stringify({type:"profileError",message:r.error})); return true; }
    player.profileId=r.profile.id; player.name=r.profile.name; profileSockets.set(player.profileId,ws);
    ws.send(JSON.stringify({type:"profileReady",profile:Profiles.publicProfile(r.profile),requests:Profiles.requests(r.profile.id)})); return true;
  }
  if(m.type==="profileSearch"){ ws.send(JSON.stringify({type:"profileSearchResult",query:String(m.query||''),results:Profiles.search(m.query)})); return true; }
  if(m.type==="friendRequest"){ const targetId=String(m.targetId||''); const r=Profiles.request(player.profileId,targetId); ws.send(JSON.stringify({type:"friendRequestResult",ok:!r.error,message:r.error||'Taklif yuborildi.'})); if(!r.error){const ts=profileSockets.get(targetId); if(ts&&ts.readyState===WebSocket.OPEN) ts.send(JSON.stringify({type:"friendRequestIncoming",requests:Profiles.requests(targetId)}));} return true; }
  if(m.type==="friendRespond"){ const r=Profiles.respond(player.profileId,String(m.fromId||''),!!m.accept); ws.send(JSON.stringify({type:"friendRespondResult",ok:!r.error,message:r.error|| (m.accept?'Taklif qabul qilindi.':'Taklif rad etildi.')})); return true; }
  if(m.type==="friendRequests"){ ws.send(JSON.stringify({type:"friendRequestsResult",requests:Profiles.requests(player.profileId)})); return true; }
  return false;
}

function broadcastRoom(){
  broadcast(phase==="lobby" ? lobbySnapshot() : gameSnapshot());
}

function assignLobbyTeam(player, requested){
  const t = Number(requested);
  if(Number.isInteger(t) && t>=1 && t<=4) player.team=t;
}

function spawnFor(player){
  // Four team areas around the arena start point.
  const team = player.team || 1;
  const slots = [...players.values()].filter(p=>p.phase==="game" && p.team===team);
  const slot = slots.length;
  const offsets = [[0,0],[12,0],[0,12],[12,12],[-12,0],[0,-12],[-12,12],[12,-12]];
  const o = offsets[slot % offsets.length];
  const base = {
    1:[1500,1500], 2:[1550,1500], 3:[1500,1550], 4:[1550,1550]
  }[team] || [1500,1500];
  player.x=base[0]+o[0]; player.y=base[1]+o[1]; player.z=0;
  player.yaw=0; player.hp=100; player.alive=true;
  player.physicsBody=physicsWorld.body({x:player.x,y:player.z||0,z:player.y}); player.physicsBody.grounded=true;
  player.brX=player.x; player.brY=player.z; player.brPhase="air"; player.brAlive=true; player.brOutfit=1;
}

function startMatch(){
  if(phase==="game") return;
  phase="game";
  startedAt=Date.now();
  for(const p of players.values()){
    p.phase="game";
    spawnFor(p);
  }
  broadcast({
    type:"matchStart",matchId,maxPlayers:MAX_PLAYERS,
    players:[...players.values()].map(cleanPlayer)
  });
  setTimeout(()=>broadcast(gameSnapshot()),250);
}


function broadcastTdm(data){
  const msg=typeof data==="string"?data:JSON.stringify(data);
  for(const p of tdmMatch.players.values()){
    if(p.ws && p.ws.readyState===WebSocket.OPEN) p.ws.send(msg);
  }
}

function handleTdmConnection(ws, req){
  const url = new URL(req.url, "ws://localhost");
  const reconnectId = url.searchParams.get("reconnectId");
  const name = url.searchParams.get("name") || "Player";
  const partyId = url.searchParams.get("partyId") || "";
  const result = tdmMatch.addConnection(ws,reconnectId,name,partyId);
  if(result.error){
    ws.send(JSON.stringify({type:"tdmFull",maxPlayers:TDM_MAX_PLAYERS}));
    return ws.close();
  }
  const player=result.player; player.profileId=null;
  ws.send(JSON.stringify({type:"tdmWelcome",id:player.id,matchId:tdmMatch.matchId,
    maxPlayers:TDM_MAX_PLAYERS,team:player.team,phase:tdmMatch.phase,reconnected:!!result.reconnected,
    hostId:[...tdmMatch.players.values()][0]?.id||player.id}));
  ws.send(JSON.stringify(tdmMatch.snapshot()));

  ws.on("message",raw=>{
    let m; try{m=JSON.parse(raw.toString())}catch{return}
    if(handleProfileMessage(ws,player,m)) return;
    if(m.type==="tdmJoin"){
      if(typeof m.name==="string") player.name=Profiles.cleanName(m.name)||player.name;
      tdmMatch.room(); return;
    }
    if(m.type==="tdmPartyCreate") {
      if(player.partyId) TdmParty.leave(player.partyId,player.id);
      const p=TdmParty.create(player.id,player.name,Number(m.team)===2?2:1);
      player.partyId=p.id; player.team=p.team;
      ws.send(JSON.stringify({type:"tdmParty",party:TdmParty.clean(p)})); return;
    }
    if(m.type==="tdmPartyJoin") {
      const oldParty=player.partyId;
      const r=TdmParty.join(String(m.partyId||"").toUpperCase(),{id:player.id,name:player.name});
      if(r.error){ws.send(JSON.stringify({type:"tdmPartyNotice",message:r.error}));return;}
      if(oldParty && oldParty!==r.party.id) TdmParty.leave(oldParty,player.id);
      player.partyId=r.party.id;
      player.team=r.party.team;
      ws.send(JSON.stringify({type:"tdmParty",party:TdmParty.clean(r.party)})); return;
    }
    if(m.type==="tdmPartyState") {
      const p=TdmParty.get(player.partyId); if(!p)return;
      if(m.ready!==undefined) TdmParty.setMember(p.id,player.id,{ready:!!m.ready});
      if(m.outfit!==undefined) TdmParty.setMember(p.id,player.id,{outfit:Math.max(1,Math.min(99,Number(m.outfit)||1))});
      if(m.level!==undefined) TdmParty.setMember(p.id,player.id,{level:Math.max(1,Math.min(100,Number(m.level)||1))});
      if(m.map && p.ownerId===player.id) TdmParty.setMap(p.id,m.map);
      ws.send(JSON.stringify({type:"tdmParty",party:TdmParty.clean(p)})); return;
    }
    if(m.type==="tdmReady" && tdmMatch.phase==="WAITING"){
      player.ready=!!m.ready; tdmMatch.room(); return;
    }
    if(m.type==="tdmStart"){
      const r=tdmMatch.start(player.id);
      if(!r.ok) tdmMatch.send(ws,{type:"tdmNotice",message:r.message});
      return;
    }
    if(m.type==="tdmState"){ tdmMatch.state(player.id,m); return; }
    if(m.type==="tdmFire"){ tdmMatch.fire(player.id,m); return; }
    if(m.type==="tdmLoadout"){
      // Loadout selection is declarative; server stores only a bounded string.
      if(Array.isArray(m.items)) player.loadout=m.items.slice(0,3).map(x=>String(x).slice(0,32));
      return;
    }
    if(m.type==="tdmProtectionCancel"){
      if(Date.now()<player.spawnProtectionUntil) player.spawnProtectionUntil=0;
    }
  });
  ws.on("close",()=>{ if(player.profileId) profileSockets.delete(player.profileId); if(player.partyId) TdmParty.leave(player.partyId,player.id); tdmMatch.removeConnection(player.id); });
}
wss.on("connection",(ws,req)=>{
  const u = new URL(req.url, "ws://localhost");
  if(u.searchParams.get("mode")==="tdm") return handleTdmConnection(ws,req);
  if(players.size>=MAX_PLAYERS){
    ws.send(JSON.stringify({type:"full",maxPlayers:MAX_PLAYERS}));
    return ws.close();
  }

  const id=Math.random().toString(36).slice(2,10);
  const player={
    id,ws,name:"Player",x:1500,y:1500,z:0,yaw:0,hp:100,
    team:1,alive:true,ready:false,phase,profileId:null,city:"Toshkent",
    vx:0,vy:0,vz:0,grounded:true,physicsBody:physicsWorld.body({x:1500,y:0,z:1500})
  };
  players.set(id,player);

  ws.send(JSON.stringify({
    type:"welcome",id,matchId,maxPlayers:MAX_PLAYERS,phase,
    hostId:[...players.values()][0]?.id || id
  }));
  ws.send(phase==="lobby" ? lobbySnapshot() : gameSnapshot());

  ws.on("close",()=>{ if(player.profileId) profileSockets.delete(player.profileId); });
  ws.on("message",(raw)=>{
    let m; try{m=JSON.parse(raw.toString())}catch{return}

    if(handleProfileMessage(ws,player,m)) return;
    if(m.type==="join"){
      if(typeof m.name==="string") player.name=Profiles.cleanName(m.name)||"Player";
      if(Number(m.world)===1) player.city="Toshkent"; else if(Number(m.world)===2) player.city="Samarqand"; else if(Number(m.world)===3) player.city="Andijon";
      assignLobbyTeam(player,m.team);
      if(phase==="lobby") broadcastRoom();
      return;
    }

    if(m.type==="cityChange"){
      const w=Number(m.world); if(w===1)player.city="Toshkent"; else if(w===2)player.city="Samarqand"; else if(w===3)player.city="Andijon";
      return;
    }

    if(m.type==="team" && phase==="lobby"){
      assignLobbyTeam(player,m.team);
      broadcastRoom();
      return;
    }

    if(m.type==="ready" && phase==="lobby"){
      player.ready=!!m.ready;
      broadcastRoom();
      return;
    }

    if(m.type==="startMatch" && phase==="lobby"){
      const host=[...players.values()][0];
      if(host && host.id===player.id){
        startMatch();
      } else {
        ws.send(JSON.stringify({type:"notice",message:"Faqat xona egasi o‘yinni boshlashi mumkin."}));
      }
      return;
    }

    if(m.type==="brState" && phase==="game" && player.phase==="game"){
      if(typeof m.x==="number") player.brX=Math.max(0,Math.min(1200,m.x));
      if(typeof m.y==="number") player.brY=Math.max(0,Math.min(1200,m.y));
      if(typeof m.phase==="string") player.brPhase=m.phase.slice(0,12);
      if(typeof m.alive==="boolean") player.brAlive=m.alive;
      if(Number.isInteger(m.outfit)) player.brOutfit=Math.max(1,Math.min(120,m.outfit));
      broadcast(brSnapshot());
      return;
    }

    if(m.type==="state" && phase==="game" && player.phase==="game"){
      if(typeof m.yaw==="number") player.yaw=m.yaw;
      if(typeof m.hp==="number") player.hp=Math.max(0,Math.min(100,m.hp));
      if(typeof m.alive==="boolean") player.alive=m.alive;
      if(m.input && player.physicsBody){
        physicsWorld.step(player.physicsBody,{x:m.input.x,z:m.input.z,sprint:m.input.sprint,jump:m.input.jump},1/30);
        player.x=player.physicsBody.x; player.y=player.physicsBody.z; player.z=player.physicsBody.y;
        player.vx=player.physicsBody.vx; player.vy=player.physicsBody.vy; player.vz=player.physicsBody.vz; player.grounded=player.physicsBody.grounded;
      } else {
        if(typeof m.x==="number") player.x=Math.max(0,Math.min(800,m.x));
        if(typeof m.y==="number") player.y=Math.max(0,m.y);
        if(typeof m.z==="number") player.z=Math.max(0,Math.min(500,m.z));
      }
      broadcast({type:"playerState",player:cleanPlayer(player)});
    }

    if(m.type==="event" && phase==="game"){
      broadcast({type:"event",event:m.event});
    }
  });

  ws.on("close",()=>{
    players.delete(id);
    if(players.size===0){
      // Reset the room after everyone leaves.
      phase="lobby"; startedAt=null;
      matchId="BR-"+Math.random().toString(36).slice(2,8).toUpperCase();
    } else {
      broadcastRoom();
    }
  });
});

setInterval(()=>broadcastRoom(),1500);
setInterval(()=>tdmMatch.tick(),1000);
httpServer.listen(PORT,()=>console.log(`Battle Royale + TDM server listening on ${PORT}; BR ${MAX_PLAYERS}, TDM ${TDM_MAX_PLAYERS}`));
