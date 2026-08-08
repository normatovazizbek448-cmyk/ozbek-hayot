(function(){
  const R=window.TdmRespawn={};
  R.show=function(ms){const e=document.getElementById('tdmRespawn');if(!e)return;e.classList.add('show');e.textContent='QAYTA TIRILISH: '+Math.ceil(ms/1000)+'s';clearInterval(R.t);R.t=setInterval(()=>{ms-=100;if(ms<=0){clearInterval(R.t);e.classList.remove('show')}else e.textContent='QAYTA TIRILISH: '+Math.ceil(ms/1000)+'s'},100)};
  R.hide=function(){const e=document.getElementById('tdmRespawn');if(e)e.classList.remove('show');clearInterval(R.t)};
})();
