// 服と体型の仕上げ:長そで・ブーツ(体の形をなぞった殻)、自然な脚の肉付け、テクスチャの差し替え
import * as THREE from 'three';

export function findMesh(vrm, re) {
  let hit = null;
  vrm.scene.traverse(o => { if (!hit && o.isSkinnedMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; if (ms.some(m => re.test(m.name || ''))) hit = o; } });
  return hit;
}
const W = new THREE.Vector3();
function boneLocal(vrm, mesh, name) { vrm.humanoid.getRawBoneNode(name).getWorldPosition(W); return mesh.worldToLocal(W.clone()); }

// 脚に自然な肉付き(太ももは少し、ひざは細いまま、ふくらはぎにふくらみ)。ももの付け根は内側に広げすぎない
export function shapeLegs(vrm, mesh, k = 1) {
  vrm.scene.updateMatrixWorld(true);
  const p = mesh.geometry.attributes.position;
  for (const side of ['left', 'right']) {
    const hip = boneLocal(vrm, mesh, side + 'UpperLeg'), knee = boneLocal(vrm, mesh, side + 'LowerLeg'), ank = boneLocal(vrm, mesh, side + 'Foot');
    const sx = Math.sign(hip.x);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (Math.sign(x) !== sx || y > hip.y + 0.02 || y < ank.y + 0.02) continue;
      let c, f;
      if (y >= knee.y) { const t = (y - knee.y) / (hip.y - knee.y); c = knee.clone().lerp(hip, t); f = 1 + (0.03 + 0.10 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.62)) * k; if (t > 0.85) f = 1 + (f - 1) * (1 - (t - 0.85) / 0.15 * 0.7); }
      else { const t = (y - ank.y) / (knee.y - ank.y); c = ank.clone().lerp(knee, t); f = 1 + 0.085 * Math.sin(Math.pow(t, 0.8) * Math.PI) * k * (t > 0.08 ? 1 : t / 0.08); }
      const dx = x - c.x, dz = z - c.z;
      p.setX(i, c.x + dx * f); p.setZ(i, c.z + dz * f * (y >= knee.y ? 1.0 : 1.04));
    }
  }
  p.needsUpdate = true; mesh.geometry.computeBoundingSphere();
}

// 体の形をなぞった殻(長そで・ブーツなど)。pred(x,y,z) が true の三角形だけ取り出して、法線方向に少しふくらませる
export function shell(mesh, pred, offset, material, matRe = null) {
  const g = mesh.geometry, p = g.attributes.position, n = g.attributes.normal;
  const idx = g.index ? g.index.array : [...Array(p.count).keys()];
  const keep = [];
  let ranges = [[0, idx.length]];
  if (matRe && g.groups && g.groups.length && Array.isArray(mesh.material)) ranges = g.groups.filter(gr => matRe.test(mesh.material[gr.materialIndex].name || '')).map(gr => [gr.start, gr.start + gr.count]);
  for (const [a, b] of ranges) for (let i = a; i < b; i += 3) { let ok = true; for (let j = 0; j < 3; j++) { const v = idx[i + j]; if (!pred(p.getX(v), p.getY(v), p.getZ(v))) { ok = false; break; } } if (ok) keep.push(idx[i], idx[i + 1], idx[i + 2]); }
  const ng = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv', 'skinIndex', 'skinWeight']) if (g.attributes[k]) ng.setAttribute(k, g.attributes[k].clone());
  const np = ng.attributes.position;
  for (let i = 0; i < np.count; i++) { np.setXYZ(i, np.getX(i) + n.getX(i) * offset, np.getY(i) + n.getY(i) * offset, np.getZ(i) + n.getZ(i) * offset); }
  ng.setIndex(keep);
  const sm = new THREE.SkinnedMesh(ng, material); sm.bind(mesh.skeleton, mesh.bindMatrix); sm.frustumCulled = false;
  mesh.parent.add(sm); return sm;
}

// 長そで(肩〜手首)
export function sleeves(vrm, mesh, material, offset = 0.004, matRe = /Body_00_SKIN/) {
  vrm.scene.updateMatrixWorld(true);
  const sh = Math.abs(boneLocal(vrm, mesh, 'leftUpperArm').x) - 0.03;
  const wr = Math.abs(boneLocal(vrm, mesh, 'leftHand').x) - 0.004;
  const sy = boneLocal(vrm, mesh, 'leftUpperArm').y;
  return shell(mesh, (x, y) => Math.abs(x) > sh && Math.abs(x) < wr && y > sy - 0.15, offset, material, matRe);
}
// ひざ下ブーツ(ひざの少し下〜足首)。靴はそのまま使う
export function boots(vrm, mesh, material, top = 0.04, offset = 0.006) {
  vrm.scene.updateMatrixWorld(true);
  const knee = boneLocal(vrm, mesh, 'leftLowerLeg').y, ank = boneLocal(vrm, mesh, 'leftFoot').y;
  return shell(mesh, (x, y) => y < knee - top && y > ank - 0.03 && Math.abs(x) > 0.01, offset, material, /Body_00_SKIN/);
}

export async function setTex(vrm, re, url) {
  const t = await new THREE.TextureLoader().loadAsync(url); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace;
  vrm.scene.traverse(o => { if (!o.isMesh) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (re.test(m.name || '') && m.map) { m.map = t; if (m.shadeMultiplyTexture) m.shadeMultiplyTexture = t; m.needsUpdate = true; } }); });
}
export function hide(vrm, re) { vrm.scene.traverse(o => { if (!o.isMesh) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (re.test(m.name || '')) m.visible = false; }); }); }
export const knit = (hex) => new THREE.MeshToonMaterial({ color: hex });

// ワイドパンツ:脚の軸から外へ広げる(裾ほど広い)
export function widen(vrm, mesh, top = 1.12, bottom = 1.4, matRe = /Bottoms_01/) {
  vrm.scene.updateMatrixWorld(true);
  const p = mesh.geometry.attributes.position;
  const g = mesh.geometry; let allow = null;
  if (g.groups && g.groups.length && Array.isArray(mesh.material)) { allow = new Set(); const idx = g.index.array; for (const gr of g.groups) if (matRe.test(mesh.material[gr.materialIndex].name || '')) for (let i = gr.start; i < gr.start + gr.count; i++) allow.add(idx[i]); }
  for (const side of ['left', 'right']) {
    const hip = boneLocal(vrm, mesh, side + 'UpperLeg'), ank = boneLocal(vrm, mesh, side + 'Foot');
    const sx = Math.sign(hip.x);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (Math.sign(x) !== sx || y > hip.y || (allow && !allow.has(i))) continue;
      const t = Math.max(0, Math.min(1, (y - ank.y) / (hip.y - ank.y)));
      const c = ank.clone().lerp(hip, t); const f = bottom + (top - bottom) * t;
      p.setX(i, c.x + (x - c.x) * f); p.setZ(i, c.z + (z - c.z) * f);
    }
  }
  p.needsUpdate = true;
}
// 前を開けたジャケット:上着メッシュをなぞって、前の真ん中だけ開ける
export function jacket(vrm, topsMesh, material, open = 0.055, offset = 0.012, front = 1) {
  const sm = shell(topsMesh, (x, y, z) => !(Math.abs(x) < open && z * front > 0), offset, material, /Tops_01/);
  return sm;
}
