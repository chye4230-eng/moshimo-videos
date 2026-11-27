// 地雷系ヒロインの見た目を、読み込んだVRM(pixiv VRM1サンプル)に着せる
import * as THREE from 'three';
const TEX=['Hair_00','HairBack_00','Tops_01','Bottoms_01','Shoes_01','Body_00','Face_00','EyeIris_00'];
export async function applyJirai(vrm, base='./jirai/'){
  const ld=new THREE.TextureLoader();
  const tex={};for(const n of TEX){const t=await ld.loadAsync(base+n+'.png');t.flipY=false;t.colorSpace=THREE.SRGBColorSpace;tex[n]=t;}
  let hairMat=null, clothMat=null;
  vrm.scene.traverse(o=>{if(!o.isMesh)return;const ms=Array.isArray(o.material)?o.material:[o.material];
    for(const m of ms){const n=(m.name||'').replace(/ \(Outline\)/,'');
      if(window.__dbg)console.log('MAT',m.name,m.emissive&&m.emissive.getHexString(),!!m.emissiveMap,m.uniforms&&m.uniforms.matcapFactor&&m.uniforms.matcapFactor.value.getHexString(),!!m.map,!!m.shadeMultiplyTexture,!!m.matcapTexture,!!m.rimMultiplyTexture,m.type);
      const key={Hair_00_HAIR:'Hair_00',HairBack_00_HAIR:'HairBack_00',Tops_01_CLOTH:'Tops_01',Bottoms_01_CLOTH:'Bottoms_01',Shoes_01_CLOTH:'Shoes_01',Body_00_SKIN:'Body_00',Face_00_SKIN:'Face_00',EyeIris_00_EYE:'EyeIris_00'}[n];
      if(key&&m.map){m.map=tex[key];if(m.shadeMultiplyTexture)m.shadeMultiplyTexture=tex[key];m.needsUpdate=true;}
      if(n.endsWith('_HAIR')){ if(m.shadeColorFactor)m.shadeColorFactor.setRGB(0.55,0.55,0.65); if(m.emissive&&m.emissiveMap)m.emissive.setRGB(0.16,0.17,0.24); if(m.parametricRimColorFactor)m.parametricRimColorFactor.setRGB(0.05,0.05,0.08); if(!m.name.includes('Outline'))hairMat=hairMat||m; }
      if(n==='Bottoms_01_CLOTH'){m.visible=false;}
      if(n==='Tops_01_CLOTH'&&m.shadeColorFactor)m.shadeColorFactor.setRGB(0.35,0.33,0.4);
    }});
  const h=vrm.humanoid, B=n=>h.getNormalizedBoneNode(n);
  const toon=(hex,shade)=>{const m=new THREE.MeshToonMaterial({color:hex});return m;};
  // ---- skirt: 2-tier pleated, grey, lace hem ----
  const hips=B('hips');
  const pleat=(r0,r1,len,n,depth)=>{const pts=[];const seg=6;for(let i=0;i<=seg;i++){const t=i/seg;pts.push(new THREE.Vector2(r0+(r1-r0)*t,-len*t));}
    const g=new THREE.LatheGeometry(pts,n*2);const p=g.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=p.getY(i);const a=Math.atan2(z,x);const t=-y/len;const k=1+depth*t*Math.sign(Math.cos(a*n));p.setX(i,x*k);p.setZ(i,z*k);}
    g.computeVertexNormals();return g;};
  const sk=new THREE.Group();
  const pl=await ld.loadAsync(base+'plaid.png');pl.colorSpace=THREE.SRGBColorSpace;pl.wrapS=pl.wrapT=THREE.RepeatWrapping;pl.repeat.set(6,1.2);
  const pl2=pl.clone();pl2.repeat.set(7,1.0);pl2.needsUpdate=true;
  const grey=new THREE.MeshToonMaterial({color:0xffffff,map:pl,side:THREE.DoubleSide});
  const grey2=new THREE.MeshToonMaterial({color:0xf0eef4,map:pl2,side:THREE.DoubleSide});
  const t1=new THREE.Mesh(pleat(0.125,0.175,0.15,14,0.05),grey);t1.scale.z=0.82;sk.add(t1);
  const t2=new THREE.Mesh(pleat(0.165,0.215,0.13,16,0.06),grey2);t2.position.y=-0.12;t2.scale.z=0.82;sk.add(t2);
  // lace hem: scalloped ring
  const lacePts=[];const N=64;for(let i=0;i<=N;i++){}
  const lg=new THREE.CylinderGeometry(0.218,0.224,0.035,96,1,true);{const lp=lg.attributes.position;for(let i=0;i<lp.count;i++){const x=lp.getX(i),z=lp.getZ(i),y=lp.getY(i);if(y<0){const a=Math.atan2(z,x);lp.setY(i,y-0.012*Math.abs(Math.sin(a*24)));}}lg.computeVertexNormals();}
  const lace=new THREE.Mesh(lg,new THREE.MeshToonMaterial({color:0xf2f0f5,side:THREE.DoubleSide}));lace.position.y=-0.262;lace.scale.z=0.82;sk.add(lace);
  const lace2=new THREE.Mesh(new THREE.TorusGeometry(0.218,0.005,6,96),new THREE.MeshToonMaterial({color:0x1a1a1e}));lace2.rotation.x=Math.PI/2;lace2.position.y=-0.245;lace2.scale.y=0.82;sk.add(lace2);
  const waist=new THREE.Mesh(new THREE.CylinderGeometry(0.128,0.128,0.03,40,1,true),new THREE.MeshToonMaterial({color:0x2a2830,side:THREE.DoubleSide}));waist.position.y=0.0;waist.scale.z=0.82;sk.add(waist);
  sk.position.set(0,-0.005,0.005);hips.add(sk);
  // ---- buns (half-up odango) ----
  const head=B('head');
  const bunMat=new THREE.MeshToonMaterial({color:0x17161c});
  for(const s of [-1,1]){const b=new THREE.Mesh(new THREE.SphereGeometry(0.042,24,16),bunMat);b.position.set(0.068*s,0.18,-0.085);head.add(b);
    const w=new THREE.Mesh(new THREE.TorusGeometry(0.03,0.009,8,24),new THREE.MeshToonMaterial({color:0xf3b6c8}));w.position.set(0.062*s,0.155,-0.09);w.rotation.set(0.9,0,0.4*s);head.add(w);}
  // black ribbon on back of head
  const rib=new THREE.Group();const rm=new THREE.MeshToonMaterial({color:0x0e0e10,side:THREE.DoubleSide});
  for(const s of [-1,1]){const c=new THREE.Mesh(new THREE.ConeGeometry(0.035,0.07,4),rm);c.rotation.z=s*Math.PI/2;c.position.x=s*0.035;c.scale.z=0.35;rib.add(c);}
  rib.position.set(0,0.13,-0.11);head.add(rib);
  // ---- figure: natural adult proportions (longer legs, slightly smaller head, soft chest shape) ----
  const R=n=>h.getRawBoneNode(n);
    R('head').scale.setScalar(0.95);
  const bump=(geo,A)=>{const p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(z<0.02||Math.abs(x)>0.16||y<1.08||y>1.32)continue;
    let d=0;for(const cx of [-0.058,0.058]){const r2=((x-cx)**2)/0.0022+((y-1.2)**2)/0.0019;d+=Math.exp(-r2);}
    p.setZ(i,z+A*Math.min(d,1));}p.needsUpdate=true;geo.computeVertexNormals();};
  const done=new Set();vrm.scene.traverse(o=>{if(!o.isMesh||done.has(o.geometry))return;const mn=(Array.isArray(o.material)?o.material:[o.material]).map(m=>m.name).join('|');
    if(/Body_00_SKIN|Tops_01_CLOTH/.test(mn)){done.add(o.geometry);bump(o.geometry,0.03);}});
  // ---- hime cut: straight bangs + straight side locks ----
  const hairM=new THREE.MeshToonMaterial({color:0x15141a,side:THREE.DoubleSide});const lineM=new THREE.MeshBasicMaterial({color:0x050507,side:THREE.BackSide});
  const addOL=(m,s2=1.06)=>{const o=new THREE.Mesh(m.geometry,lineM);o.scale.setScalar(s2);m.add(o);};
  const strand=(g,f)=>{const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);const a=Math.atan2(x,z);const k=1+0.035*Math.abs(Math.sin(a*f));p.setX(i,x*k);p.setZ(i,z*k);}g.computeVertexNormals();return g;};
  const bangs=new THREE.Mesh(strand(new THREE.CylinderGeometry(0.104,0.112,0.075,96,2,true,-1.0,2.0),22),hairM);bangs.position.set(0,0.108,-0.008);head.add(bangs);
  for(const [t0,tl] of [[0.7,0.5],[-1.2,0.5]]){const sl=new THREE.Mesh(strand(new THREE.CylinderGeometry(0.1,0.1,0.11,24,2,true,t0,tl),18),hairM);sl.position.set(0,0.025,-0.006);head.add(sl);}
  // ---- chest ribbon (pale pink), choker, sleeve frills ----
  const chest=B('upperChest')||B('chest');const neckW=B('neck').getWorldPosition(new THREE.Vector3());
  const pink=new THREE.MeshToonMaterial({color:0xf3b6c8,side:THREE.DoubleSide});
  const bow=new THREE.Group();
  for(const s2 of [-1,1]){const c=new THREE.Mesh(new THREE.ConeGeometry(0.03,0.055,12),pink);c.rotation.z=s2*Math.PI/2;c.position.x=s2*0.028;c.scale.z=0.45;bow.add(c);
    const tail=new THREE.Mesh(new THREE.BoxGeometry(0.014,0.06,0.004),pink);tail.position.set(s2*0.012,-0.035,0);tail.rotation.z=s2*0.25;bow.add(tail);}
  const knot=new THREE.Mesh(new THREE.SphereGeometry(0.012,12,8),pink);knot.scale.z=0.6;bow.add(knot);
  const bp=chest.worldToLocal(neckW.clone());bow.position.set(0,bp.y-0.075,0.095);chest.add(bow);
  const neck=B('neck');
  const ch=new THREE.Mesh(new THREE.TorusGeometry(0.043,0.006,8,40),new THREE.MeshToonMaterial({color:0x0c0c0e}));ch.rotation.x=Math.PI/2;ch.position.set(0,0.035,0.004);ch.scale.y=0.9;neck.add(ch);
  const ringH=new THREE.Mesh(new THREE.TorusGeometry(0.008,0.002,6,16),new THREE.MeshToonMaterial({color:0xd8d8e0}));ringH.position.set(0,0.026,0.046);neck.add(ringH);
  for(const side of ['left','right']){const ua=B(side+'UpperArm'),la=B(side+'LowerArm');const dir=la.position.clone();const len=dir.length();dir.normalize();
    const g=new THREE.CylinderGeometry(0.058,0.072,0.03,40,1,true);{const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=p.getY(i);if(y<0){const a=Math.atan2(z,x);const k=1+0.08*Math.abs(Math.sin(a*12));p.setX(i,x*k);p.setZ(i,z*k);}}g.computeVertexNormals();}
    const f=new THREE.Mesh(g,new THREE.MeshToonMaterial({color:0xf2f0f5,side:THREE.DoubleSide}));
    f.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),dir);f.position.copy(dir.clone().multiplyScalar(len*0.5));ua.add(f);f.userData.frill=true;}
  return {skirt:sk};
}
