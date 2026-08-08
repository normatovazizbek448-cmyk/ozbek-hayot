const RESPAWN_MS=3000, SPAWN_PROTECTION_MS=2000;
function scheduleRespawn(match, player){
  if(!player) return;
  player.respawnAt=Date.now()+RESPAWN_MS;
  return setTimeout(()=>{ if(match.phase==="COMBAT" && player.ws){ match.spawn(player); } },RESPAWN_MS);
}
module.exports={scheduleRespawn,RESPAWN_MS,SPAWN_PROTECTION_MS};
