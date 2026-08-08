/* TDM Arena 800x500 — original Battle Arena layout, mobile-first */
(function(){
  const A=window.TdmArena={};
  A.W=800; A.L=500; A.group=null; A.scene=null; A.camera=null; A.renderer=null;
  A.localId=null; A.players=new Map(); A.playerMesh=null; A.remoteMeshes=new Map(); A.serverTarget=null; A.lastServerAt=0;
  A.keys={w:false,a:false,s:false,d:false}; A.look={x:0,y:0};
  const root='../../world_pbr/textures/'; // resolved from client/tdm is not used for assets; manifest supplies canonical paths
  const tex={};
  function mat(name,color){
    const t=tex[name];
    const m=new THREE.MeshStandardMaterial({color:color||0xffffff,roughness:.82,metalness:0});
    if(t?.base)m.map=t.base;if(t?.normal){m.normalMap=t.normal;m.normalScale.set(.65,.65)}
    if(t?.rough)m.roughnessMap=t.rough;if(t?.metal)m.metalnessMap=t.metal;
    return m;
  }
  function loadPbr(name){
    const base='world_pbr/textures/'+name;
    const l=new THREE.TextureLoader();
    tex[name]={base:l.load(base+'_baseColor.png'),normal:l.load(base+'_normal.png'),rough:l.load(base+'_roughness.png'),metal:l.load(base+'_metallic.png')};
    Object.values(tex[name]).forEach(t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=1});
  }
  function box(x,y,z,w,h,d,material,rot=0){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.rotation.y=rot;m.castShadow=false;m.receiveShadow=true;A.group.add(m);return m;
  }
  function cover(x,z,w,d,h,material){return box(x,h/2,z,w,h,d,material,0)}
  function tree(x,z,s=1){
    const g=new THREE.Group();g.position.set(x,0,z);
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.8*s,1*s,6*s,7),mat('tree_bark',0x6f5136));trunk.position.y=3*s;
    const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(4*s,1),mat('tree_leaf',0x315b3b));crown.position.y=7*s;
    g.add(trunk,crown);A.group.add(g);
  }
  function house(x,z,w,d,h,rot=0){
    const wall=box(x,h/2,z,w,h,d,mat('house_wall',0x9a8b76),rot);
    const roof=box(x,h+.35,z,w*1.08,.7,d*1.08,mat('house_roof',0x564c43),rot);
    roof.rotation.x=.03; return [wall,roof];
  }
  function road(x,z,w,d){
    const r=box(x,.015,z,w,.03,d,mat('asphalt',0x353535)); r.receiveShadow=true;
  }
  A.build=function(host){
    if(typeof THREE==='undefined') return;
    host.innerHTML='';
    const canvas=document.createElement('canvas'); canvas.id='tdmCanvas'; host.appendChild(canvas);
    A.renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
    A.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25)); A.renderer.setSize(host.clientWidth,host.clientHeight,false);
    A.renderer.outputColorSpace=THREE.SRGBColorSpace||A.renderer.outputColorSpace;
    A.scene=new THREE.Scene();A.scene.background=new THREE.Color(0x9fc3d2);
    A.camera=new THREE.PerspectiveCamera(65,host.clientWidth/host.clientHeight,.2,1100);
    A.group=new THREE.Group();A.scene.add(A.group);
    ['asphalt','soil','concrete','house_wall','house_roof','tree_bark','tree_leaf','mountain_rock','gravel'].forEach(loadPbr);
    const soil=mat('soil',0x756b55), asphalt=mat('asphalt',0x3b3b3b), concrete=mat('concrete',0x777b7b);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(800,500),soil);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;A.group.add(ground);
    road(400,250,800,42); road(400,150,520,18); road(400,350,520,18);
    // Three-lane combat layout: left flank, central lane, right flank.
    const wall=mat('concrete',0x777b7b);
    // Bases
    for(const team of [1,2]){
      const x=team===1?80:720;
      for(let i=-2;i<=2;i++) cover(x,250+i*22,22,6,2.4,wall);
      cover(team===1?35:765,250,5,150,4,wall);
      cover(team===1?125:675,250,5,150,4,wall);
      house(team===1?82:718,210,32,26,9,team===1?0:0);
      house(team===1?82:718,290,26,22,7,0);
      tree(team===1?52:748,195,.8);tree(team===1?52:748,305,.8);
    }
    // Central structures and asymmetrical cover.
    house(330,250,46,34,11,.04); house(470,250,42,30,10,-.05);
    house(390,105,38,28,8,0); house(410,395,38,28,8,0);
    for(const p of [[235,190,28,5,3],[260,310,35,5,3],[335,150,5,34,3],[465,350,5,34,3],[540,195,30,5,3],[570,310,36,5,3],[390,245,5,28,3],[410,270,5,28,3]]) cover(...p,wall);
    // rubble
    const rubble=mat('concrete',0x676b68);
    [[285,235],[300,265],[505,235],[520,270],[360,325],[440,175]].forEach(([x,z])=>{
      for(let i=0;i<4;i++) box(x+(i%2)*4-2,1.2,z+Math.floor(i/2)*4-2,5,2.4,4,rubble,(i*.3));
    });
    // Small water zone, bounded by stone cover.
    const water=new THREE.Mesh(new THREE.PlaneGeometry(90,38),new THREE.MeshStandardMaterial({color:0x477e92,transparent:true,opacity:.72,roughness:.12,metalness:.05}));
    water.rotation.x=-Math.PI/2;water.position.set(400,.04,250);A.group.add(water);
    [[355,230],[445,230],[355,270],[445,270]].forEach(([x,z])=>box(x,1,z,10,2,5,rubble));
    [[180,120],[210,380],[610,120],[620,380],[300,90],[500,410],[150,250],[650,250]].forEach(p=>tree(p[0],p[1],.8));
    // Boundary collision visuals are invisible in game; helper grid is hidden.
    A.spawnPoints={1:[[68,225],[68,250],[68,275],[92,235],[92,265]],2:[[732,225],[732,250],[732,275],[708,235],[708,265]]};
    const amb=new THREE.HemisphereLight(0xddeeff,0x4c4b3e,1.6);A.scene.add(amb);
    const sun=new THREE.DirectionalLight(0xffffff,1.3);sun.position.set(180,260,80);A.scene.add(sun);
    A.resize();window.addEventListener('resize',A.resize);
    A.animate();
  };
  A.resize=function(){const host=document.getElementById('tdmArenaRoot');if(!host||!A.renderer)return;A.renderer.setSize(host.clientWidth,host.clientHeight,false);A.camera.aspect=host.clientWidth/host.clientHeight;A.camera.updateProjectionMatrix();};
  A.makePlayer=function(team){
    if(!A.scene)return null;
    if(typeof window.createExistingCharacter==='function') return window.createExistingCharacter(team);
    const g=new THREE.Group();
    const skin=new THREE.MeshStandardMaterial({color:0xd2a17e,roughness:.82,metalness:0});
    const cloth=new THREE.MeshStandardMaterial({color:team===1?0x2b8cff:0xd13c43,roughness:.72,metalness:.03});
    const dark=new THREE.MeshStandardMaterial({color:0x161a1d,roughness:.6,metalness:.1});
    function box(w,h,d,x,y,z,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=false;m.receiveShadow=true;g.add(m);return m}
    function sphere(r,x,y,z,mat){const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),mat);m.position.set(x,y,z);m.castShadow=false;g.add(m);return m}
    // Detailed low-poly fallback: torso, neck/head, hair, upper/lower limbs, hands and shoes.
    box(.56,.72,.34,0,1.34,0,cloth); box(.24,.14,.22,0,1.77,0,skin); sphere(.22,0,2.02,0,skin); sphere(.235,0,2.11,0,dark);
    for(const side of [-1,1]){box(.15,.42,.16,side*.38,1.45,0,cloth);box(.14,.38,.15,side*.38,1.10,0,skin);sphere(.10,side*.38,.88,0,skin);box(.19,.48,.20,side*.16,.86,0,cloth);box(.18,.48,.19,side*.16,.40,0,dark);box(.22,.10,.34,side*.16,.12,-.035,dark);}
    const eye=new THREE.MeshStandardMaterial({color:0x3b271b,roughness:.4}); sphere(.026,-.08,2.04,.19,eye);sphere(.026,.08,2.04,.19,eye);
    g.userData={detailed:true,rig:['pelvis','spine','neck','head','upperArmL','forearmL','handL','upperArmR','forearmR','handR','thighL','shinL','footL','thighR','shinR','footR'],mass:team===1?78:78};
    return g;
  };
  A.setLocal=function(p){A.localId=p.id; A.serverTarget={x:p.x,z:p.z}; A.lastServerAt=performance.now(); if(!A.playerMesh){A.playerMesh=A.makePlayer(p.team);A.scene.add(A.playerMesh);A.playerMesh.position.set(p.x,0,p.z);A.localInitialized=true;} const dx=p.x-A.playerMesh.position.x,dz=p.z-A.playerMesh.position.z; if(p.respawnMs>0||p.alive===false||Math.hypot(dx,dz)>3){A.playerMesh.position.set(p.x,0,p.z);} A.playerMesh.rotation.y=Number.isFinite(p.yaw)?p.yaw:A.playerMesh.rotation.y;};
  A.updateRemote=function(p){
    if(p.id===A.localId)return;
    let g=A.remoteMeshes.get(p.id); if(!g){g=A.makePlayer(p.team);A.scene.add(g);A.remoteMeshes.set(p.id,g);}
    g.visible=p.alive!==false;g.position.set(p.x,0,p.z);g.rotation.y=p.yaw||0;
  };
  A.removeMissing=function(ids){for(const [id,g] of A.remoteMeshes){if(!ids.has(id)){A.scene.remove(g);A.remoteMeshes.delete(id)}}};
  A.move=function(dt){
    if(!A.playerMesh)return;
    let dx=(A.keys.d?1:0)-(A.keys.a?1:0), dz=(A.keys.s?1:0)-(A.keys.w?1:0);
    if(dx||dz){const len=Math.hypot(dx,dz);dx/=len;dz/=len;const sp=7;A.playerMesh.position.x=Math.max(4,Math.min(796,A.playerMesh.position.x+dx*sp*dt));A.playerMesh.position.z=Math.max(4,Math.min(496,A.playerMesh.position.z+dz*sp*dt));}
    if(A.serverTarget){const ex=A.serverTarget.x-A.playerMesh.position.x,ez=A.serverTarget.z-A.playerMesh.position.z;const err=Math.hypot(ex,ez);if(err>0.08&&err<=3){const k=Math.min(1,dt*7);A.playerMesh.position.x+=ex*k;A.playerMesh.position.z+=ez*k;}}
    const p=A.playerMesh.position; A.playerMesh.rotation.y=Math.atan2(dx,dz); A.inputX=dx; A.inputZ=dz;
  };
  let last=performance.now();
  A.animate=function(){
    requestAnimationFrame(A.animate);if(!A.renderer)return;
    const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;A.move(dt);
    if(A.playerMesh && window.TdmMatch?.connected){const p=A.playerMesh.position;window.TdmMatch.sendState({inputX:A.inputX||0,inputZ:A.inputZ||0,sprint:false,jump:false,yaw:A.playerMesh.rotation.y});}
    if(A.playerMesh){const p=A.playerMesh.position;A.camera.position.lerp(new THREE.Vector3(p.x,8,p.z+14),.12);A.camera.lookAt(p.x,1.2,p.z);}
    A.renderer.render(A.scene,A.camera);
  };
})();
