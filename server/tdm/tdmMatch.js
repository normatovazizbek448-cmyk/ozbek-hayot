const {teamForJoin}=require("./tdmTeams");
const {getWinner}=require("./tdmScore");
const {scheduleRespawn}=require("./tdmRespawn");
const {PhysicsWorld}=require("../physics/PhysicsWorld");
const MAX_PLAYERS = 10;
const TEAM_SIZE = 5;
const KILL_LIMIT = 50;
const TIME_LIMIT_MS = 20 * 60 * 1000;
const RESPAWN_MS = 3000;
const SPAWN_PROTECTION_MS = 2000;
const MAP = { width: 800, length: 500, minX: 0, maxX: 800, minZ: 0, maxZ: 500 };
const SPAWNS = {
  1: [
    [68,225],[68,250],[68,275],[92,235],[92,265]
  ],
  2: [
    [732,225],[732,250],[732,275],[708,235],[708,265]
  ]
};

class TdmMatch {
  constructor(broadcast) {
    this.broadcast = broadcast;
    this.players = new Map();
    this.phase = "WAITING";
    this.matchId = this.newId();
    this.startedAt = null;
    this.countdownEndsAt = null;
    this.scores = {1:0,2:0};
    this.spawnUse = {1:new Map(),2:new Map()};
    this.respawnTimers = new Map();
    this.lastShot = new Map();
    this.disconnectGraceMs = 30000;
    this.physics = new PhysicsWorld({mapMinX:0,mapMaxX:800,mapMinZ:0,mapMaxZ:500,maxSpeed:7.2});
  }

  newId() { return "TDM-" + Math.random().toString(36).slice(2,8).toUpperCase(); }
  playerCount() { return this.players.size; }
  teamCounts() {
    return {1:[...this.players.values()].filter(p=>p.team===1).length,
            2:[...this.players.values()].filter(p=>p.team===2).length};
  }
  assignTeam() {
    return teamForJoin(this.players);
  }
  addConnection(ws, requestedId, name, partyId) {
    const now = Date.now();
    // Reconnects must be admitted even when the room is currently full.
    let p = requestedId ? this.players.get(requestedId) : null;
    if(p && p.disconnectedAt && now-p.disconnectedAt <= this.disconnectGraceMs) {
      p.ws=ws; p.disconnectedAt=null; p.name=(name||p.name).slice(0,18);
      if(!p.alive && p.respawnAt <= now) this.spawn(p);
      return {player:p, reconnected:true};
    }
    if(this.playerCount() >= MAX_PLAYERS) return {error:"full"};
    const team = partyId ? (String(partyId).startsWith("A") ? 1 : String(partyId).startsWith("B") ? 2 : this.assignTeam()) : this.assignTeam();
    if(!team) return {error:"full"};
    const id = requestedId && !this.players.has(requestedId)
      ? requestedId.slice(0,32)
      : Math.random().toString(36).slice(2,10);
    p={id,ws,name:(name||"Player").slice(0,18),team,alive:true,hp:100,
       x:0,z:0,yaw:0,ready:false,spawnProtectionUntil:0,
       respawnAt:0,disconnectedAt:null,vx:0,vy:0,vz:0,grounded:true,physicsBody:this.physics.body({x:0,y:0,z:0})};
    this.players.set(id,p);
    if(this.phase==="WAITING") this.spawn(p);
    return {player:p,reconnected:false};
  }
  removeConnection(id) {
    const p=this.players.get(id);
    if(!p) return;
    p.ws=null; p.disconnectedAt=Date.now();
    // Keep a reconnect slot during the match. In waiting, remove immediately.
    if(this.phase==="WAITING") this.players.delete(id);
  }
  spawn(p) {
    const list=SPAWNS[p.team];
    let best=list[0], bestScore=Infinity;
    for(const pos of list) {
      let score=0;
      for(const q of this.players.values()) if(q.team===p.team && q.id!==p.id && q.alive) {
        score += Math.hypot(q.x-pos[0], q.z-pos[1]) < 10 ? 1000 : 0;
      }
      if(score<bestScore){bestScore=score;best=pos;}
    }
    p.x=best[0]; p.z=best[1]; p.yaw=p.team===1?0:Math.PI;
    p.hp=100; p.alive=true; p.respawnAt=0;
    p.spawnProtectionUntil=Date.now()+SPAWN_PROTECTION_MS;
    p.physicsBody=this.physics.body({x:p.x,y:0,z:p.z});
  }
  clean(p) {
    return {id:p.id,name:p.name,team:p.team,x:p.x,z:p.z,yaw:p.yaw,hp:p.hp,
      alive:p.alive,ready:p.ready,vx:p.vx||0,vy:p.vy||0,vz:p.vz||0,grounded:p.grounded!==false,spawnProtectionMs:Math.max(0,p.spawnProtectionUntil-Date.now()),
      respawnMs:Math.max(0,p.respawnAt-Date.now())};
  }
  snapshot() {
    return {type:"tdmSnapshot",mode:"TDM_ARENA",matchId:this.matchId,phase:this.phase,
      maxPlayers:MAX_PLAYERS,killLimit:KILL_LIMIT,timeLimitMs:TIME_LIMIT_MS,
      scores:this.scores,timeLeftMs:this.timeLeft(),players:[...this.players.values()].map(p=>this.clean(p))};
  }
  timeLeft() {
    if(!this.startedAt) return TIME_LIMIT_MS;
    return Math.max(0,TIME_LIMIT_MS-(Date.now()-this.startedAt));
  }
  send(ws,msg) { if(ws && ws.readyState===1) ws.send(JSON.stringify(msg)); }
  room() { this.broadcast(this.snapshot()); }
  start(requesterId) {
    if(this.phase!=="WAITING") return {ok:false,message:"Match allaqachon boshlangan."};
    const host=[...this.players.values()][0];
    if(!host || host.id!==requesterId) return {ok:false,message:"Faqat xona egasi boshlashi mumkin."};
    const counts=this.teamCounts();
    if(this.playerCount()!==MAX_PLAYERS || counts[1]!==TEAM_SIZE || counts[2]!==TEAM_SIZE) return {ok:false,message:"TDM Arena 5 vs 5: ikkala jamoada ham 5 tadan o‘yinchi bo‘lishi kerak."};
    this.phase="COUNTDOWN";
    this.countdownEndsAt=Date.now()+5000;
    this.broadcast({type:"tdmCountdown",matchId:this.matchId,ms:5000});
    setTimeout(()=>{
      if(this.phase!=="COUNTDOWN") return;
      this.phase="COMBAT"; this.startedAt=Date.now(); this.scores={1:0,2:0};
      for(const p of this.players.values()) this.spawn(p);
      this.broadcast({type:"tdmMatchStart",matchId:this.matchId,serverTime:Date.now()});
      this.room();
    },5000);
    return {ok:true};
  }
  state(id,m) {
    const p=this.players.get(id); if(!p || this.phase!=="COMBAT" || !p.alive) return;
    if(typeof m.yaw==="number" && Number.isFinite(m.yaw)) p.yaw=m.yaw;
    if(m.input && p.physicsBody){
      const now=Date.now();
      const dt=Math.max(1/120,Math.min(0.08,(now-(p.lastStateAt||now))/1000 || 1/30));
      p.lastStateAt=now;
      this.physics.step(p.physicsBody,{x:m.input.x,z:m.input.z,sprint:m.input.sprint,jump:m.input.jump},dt);
      p.x=p.physicsBody.x; p.z=p.physicsBody.z; p.vx=p.physicsBody.vx; p.vy=p.physicsBody.vy; p.vz=p.physicsBody.vz; p.grounded=p.physicsBody.grounded;
      this.resolvePlayerCollisions(p);
    } else {
      if(typeof m.x==="number") p.x=Math.max(MAP.minX,Math.min(MAP.maxX,m.x));
      if(typeof m.z==="number") p.z=Math.max(MAP.minZ,Math.min(MAP.maxZ,m.z));
    }
  }
  resolvePlayerCollisions(active){
    for(const q of this.players.values()) if(q.id!==active.id && q.alive && q.physicsBody) this.physics.resolveCapsules(active.physicsBody,q.physicsBody);
    active.x=active.physicsBody.x; active.z=active.physicsBody.z;
  }
  fire(id,m) {
    const shooter=this.players.get(id);
    if(!shooter || this.phase!=="COMBAT" || !shooter.alive) return;
    const now=Date.now();
    if(now < shooter.spawnProtectionUntil) shooter.spawnProtectionUntil=0;
    const last=this.lastShot.get(id)||0;
    if(now-last<100) return;
    this.lastShot.set(id,now);
    if(!m || typeof m.targetId!=="string") {
      this.broadcast({type:"tdmGunshot",shooterId:id,team:shooter.team,x:shooter.x,z:shooter.z});
      return;
    }
    const target=this.players.get(m.targetId);
    if(!target || !target.alive || target.team===shooter.team) return;
    const dist=Math.hypot(shooter.x-target.x,shooter.z-target.z);
    if(dist>120) return;
    // Server-side hit decision. Damage is fixed for the TDM baseline.
    target.hp=Math.max(0,target.hp-100);
    this.broadcast({type:"tdmHit",shooterId:id,targetId:target.id,team:shooter.team});
    if(target.hp<=0) this.kill(shooter,target);
  }
  kill(killer,victim) {
    if(this.phase!=="COMBAT" || !victim.alive) return;
    victim.alive=false; victim.hp=0; victim.respawnAt=Date.now()+RESPAWN_MS;
    this.scores[killer.team] += 1;
    this.broadcast({type:"tdmKill",killerId:killer.id,killerTeam:killer.team,
      victimId:victim.id,scores:this.scores,respawnMs:RESPAWN_MS});
    if(this.scores[killer.team]>=KILL_LIMIT) return this.finish(killer.team,"KILL_LIMIT");
    const timer=scheduleRespawn(this,victim);
    this.respawnTimers.set(victim.id,timer);
    setTimeout(()=>{
      this.respawnTimers.delete(victim.id);
      const p=this.players.get(victim.id);
      if(p && p.ws && p.alive) { this.send(p.ws,{type:"tdmRespawn",player:this.clean(p)}); this.room(); }
    },RESPAWN_MS+10);
  }
  finish(winner,reason) {
    if(this.phase==="RESULTS") return;
    this.phase="RESULTS";
    const authoritativeWinner = reason==="TIME_LIMIT" ? getWinner(this.scores,KILL_LIMIT) : winner;
    let result = authoritativeWinner===0 ? "DRAW" : (authoritativeWinner===1?"TEAM_A_WIN":"TEAM_B_WIN");
    this.broadcast({type:"tdmResults",matchId:this.matchId,reason,result,
      scores:this.scores,timeLeftMs:this.timeLeft()});
    setTimeout(()=>{ if(this.phase==="RESULTS") this.reset(); },8000);
  }
  tick() {
    if(this.phase==="COMBAT" && this.timeLeft()<=0) this.finish(
      this.scores[1]===this.scores[2]?0:(this.scores[1]>this.scores[2]?1:2),"TIME_LIMIT");
    if(this.phase==="RESULTS" && [...this.players.values()].every(p=>!p.ws)) this.reset();
    if(this.phase==="WAITING" || this.phase==="COMBAT") this.room();
  }
  reset() {
    for(const t of this.respawnTimers.values()) clearTimeout(t);
    this.respawnTimers.clear(); this.lastShot.clear();
    this.phase="WAITING"; this.startedAt=null; this.countdownEndsAt=null;
    this.scores={1:0,2:0}; this.matchId=this.newId();
    for(const p of this.players.values()){p.ready=false;p.alive=true;p.hp=100;this.spawn(p);}
  }
}
module.exports = {TdmMatch,MAX_PLAYERS,TEAM_SIZE,KILL_LIMIT,TIME_LIMIT_MS,RESPAWN_MS,SPAWN_PROTECTION_MS,MAP};
