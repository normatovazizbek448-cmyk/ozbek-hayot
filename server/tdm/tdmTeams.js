const TEAM_SIZE=5;
function teamForJoin(players){
  const a=[...players.values()].filter(p=>p.team===1).length;
  const b=[...players.values()].filter(p=>p.team===2).length;
  if(a<TEAM_SIZE && b<TEAM_SIZE) return a<=b?1:2;
  if(a<TEAM_SIZE) return 1;
  if(b<TEAM_SIZE) return 2;
  return 0;
}
module.exports={teamForJoin,TEAM_SIZE};
