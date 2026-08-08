'use strict';

// Lightweight deterministic rigid-body model for networked player/vehicle motion.
// Units: meters, seconds, kilograms. Server is authoritative.
const DEFAULTS = Object.freeze({
  gravity: 9.81,
  airDrag: 0.12,
  groundFriction: 8.5,
  maxSpeed: 7.2,
  runAcceleration: 18.0,
  braking: 22.0,
  jumpSpeed: 5.2,
  capsuleRadius: 0.34,
  capsuleHeight: 1.78,
  mass: 78,
  restitution: 0.05,
  mapMinX: 0,
  mapMaxX: 800,
  mapMinZ: 0,
  mapMaxZ: 500
});

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function len(x,z){return Math.hypot(x,z);}
function approach(v,target,delta){return v<target?Math.min(v+delta,target):Math.max(v-delta,target);}

class PhysicsWorld {
  constructor(opts={}) { this.p={...DEFAULTS,...opts}; }
  body(seed={}) {
    return {x:seed.x||0,y:seed.y||0,z:seed.z||0,vx:seed.vx||0,vy:seed.vy||0,vz:seed.vz||0,
      grounded:seed.grounded!==false, mass:seed.mass||this.p.mass, radius:seed.radius||this.p.capsuleRadius,
      height:seed.height||this.p.capsuleHeight};
  }
  step(body,input={},dt=1/60){
    dt=clamp(Number(dt)||1/60,1/120,0.05);
    const p=this.p;
    let ix=clamp(Number(input.x)||0,-1,1), iz=clamp(Number(input.z)||0,-1,1);
    const mag=len(ix,iz); if(mag>1){ix/=mag;iz/=mag;}
    const sprint=!!input.sprint;
    const target=p.maxSpeed*(sprint?1.28:1);
    const ax=ix*target, az=iz*target;
    const accel=(mag>0.01?p.runAcceleration:p.braking);
    body.vx=approach(body.vx,ax,accel*dt);
    body.vz=approach(body.vz,az,accel*dt);
    if(mag<=0.01){body.vx*=Math.max(0,1-p.groundFriction*dt);body.vz*=Math.max(0,1-p.groundFriction*dt);}
    if(!body.grounded){body.vx*=Math.max(0,1-p.airDrag*dt);body.vz*=Math.max(0,1-p.airDrag*dt);body.vy-=p.gravity*dt;}
    if(body.grounded && input.jump){body.vy=p.jumpSpeed;body.grounded=false;}
    body.x+=body.vx*dt; body.y+=body.vy*dt; body.z+=body.vz*dt;
    if(body.y<=0){body.y=0; if(body.vy<0) body.vy=-body.vy*p.restitution; else body.vy=0; body.grounded=true;}
    else body.grounded=false;
    const r=body.radius;
    if(body.x< p.mapMinX+r){body.x=p.mapMinX+r;body.vx=Math.abs(body.vx)*p.restitution;}
    if(body.x> p.mapMaxX-r){body.x=p.mapMaxX-r;body.vx=-Math.abs(body.vx)*p.restitution;}
    if(body.z< p.mapMinZ+r){body.z=p.mapMinZ+r;body.vz=Math.abs(body.vz)*p.restitution;}
    if(body.z> p.mapMaxZ-r){body.z=p.mapMaxZ-r;body.vz=-Math.abs(body.vz)*p.restitution;}
    return body;
  }
  resolveCapsules(a,b,dt=1/60){
    const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),min=a.radius+b.radius;
    if(d<=0||d>=min)return false;
    const nx=dx/d,nz=dz/d,penetration=min-d;
    const invA=1/Math.max(1,a.mass),invB=1/Math.max(1,b.mass),sum=invA+invB;
    a.x-=nx*penetration*(invA/sum);a.z-=nz*penetration*(invA/sum);
    b.x+=nx*penetration*(invB/sum);b.z+=nz*penetration*(invB/sum);
    const rvx=b.vx-a.vx,rvz=b.vz-a.vz,rel=rvx*nx+rvz*nz;
    if(rel<0){const impulse=-(1+this.p.restitution)*rel/sum;a.vx-=impulse*nx*invA;a.vz-=impulse*nz*invA;b.vx+=impulse*nx*invB;b.vz+=impulse*nz*invB;}
    return true;
  }
  characterProfile(profile={}){
    const female=profile.gender==='female';
    const scale=clamp(Number(profile.heightScale)||1,0.94,1.06);
    return {mass:female?64:78,height:(female?1.68:1.78)*scale,radius:0.32*scale,
      shoulder:(female?0.38:0.44)*scale,hip:(female?0.34:0.38)*scale,
      head:0.18*scale,foot:0.27*scale};
  }
}
module.exports={PhysicsWorld,DEFAULTS};
