function getWinner(scores, limit){
  if(scores[1]>=limit) return 1;
  if(scores[2]>=limit) return 2;
  if(scores[1]>scores[2]) return 1;
  if(scores[2]>scores[1]) return 2;
  return 0;
}
module.exports={getWinner};
