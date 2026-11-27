// VRMヒロインの動きテスト(13秒):呼吸・まばたき・視線・揺れもの・イージング付きのポーズ・歩き
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { applyJirai } from './jirai/jirai.js';

const W = 1080, H = 1920, FPS = 30;
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setSize(W, H); r.setPixelRatio(1); r.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(r.domElement);

// ---------- 部屋 ----------
const s = new THREE.Scene(); s.background = new THREE.Color(0xf6e6ee);
const lam = c => new THREE.MeshLambertMaterial({ color: c });
const box = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(c)); m.position.set(x, y, z); s.add(m); return m; };
const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), lam(0xd8b48c)); floor.rotation.x = -Math.PI / 2; s.add(floor);
for (let i = -6; i < 6; i++) box(0.01, 0.002, 12, 0xc49c74, i * 0.5, 0.001, 0); // 床板の目地
box(12, 4, 0.1, 0xf4dbe6, 0, 2, -2.2);                 // 奥の壁
box(0.1, 4, 12, 0xefd2df, -3.2, 2, 0);                  // 左の壁
box(1.5, 1.2, 0.06, 0xbfe2ff, 1.3, 1.7, -2.14);         // 窓
box(1.62, 0.07, 0.1, 0xffffff, 1.3, 2.33, -2.12); box(1.62, 0.07, 0.1, 0xffffff, 1.3, 1.07, -2.12);
box(0.05, 1.2, 0.08, 0xffffff, 1.3, 1.7, -2.12);
box(0.7, 1.5, 0.08, 0xf5b8cc, 0.42, 1.75, -2.1);        // カーテン
box(1.8, 0.45, 1.0, 0xffffff, -1.9, 0.225, -1.4);       // ベッド
box(1.8, 0.12, 1.0, 0xf3c4d4, -1.9, 0.5, -1.4);
box(0.5, 0.14, 0.32, 0xffffff, -2.5, 0.62, -1.6);
box(0.9, 0.06, 0.5, 0xffffff, 2.2, 0.72, -1.7);         // 机
for (const x of [1.8, 2.6]) box(0.05, 0.72, 0.05, 0xffffff, x, 0.36, -1.7);
const pl = box(0.18, 0.25, 0.18, 0xd98aa4, 2.45, 0.87, -1.75);
const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), lam(0x7bbf8a)); leaf.position.set(2.45, 1.12, -1.75); s.add(leaf);
const rug = new THREE.Mesh(new THREE.CircleGeometry(1.1, 40), lam(0xffffff)); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.004, 0.2); s.add(rug);
s.add(new THREE.HemisphereLight(0xffffff, 0xb79a88, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 1.7); sun.position.set(1.5, 2.5, 2.5); s.add(sun);

const cam = new THREE.PerspectiveCamera(30, W / H, 0.05, 60);
const camTarget = new THREE.Object3D(); s.add(camTarget);

// ---------- 道具 ----------
const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);            // なめらか(始まりと終わりがゆっくり)
const easeOutBack = x => { x = Math.min(1, Math.max(0, x)); const c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }; // 少し行き過ぎて戻る
const seg = (t, a, b) => ease((t - a) / (b - a));
const mix = (a, b, k) => a + (b - a) * k;
const mixV = (a, b, k) => a.clone().lerp(b, k);
const V = (x, y, z) => new THREE.Vector3(x, y, z).normalize();

let vrm, B, phone, tPrev = 0;
const qTmp = new THREE.Quaternion(), qSceneInv = new THREE.Quaternion();

// 骨を「この向きを指して」と方向で動かす(体の向き基準)
function aim(name, restDir, dirBody) {
  const bone = B(name);
  bone.parent.updateWorldMatrix(true, false);
  vrm.scene.getWorldQuaternion(qSceneInv); qSceneInv.invert();
  bone.parent.getWorldQuaternion(qTmp); qTmp.premultiply(qSceneInv);   // 親の向き(体の座標で)
  if (/UpperArm/.test(name)) { const sg = Math.sign(restDir.x); dirBody = dirBody.clone(); if (dirBody.y < 0.2) dirBody.x = sg * Math.max(Math.abs(dirBody.x), 0.3); dirBody.normalize(); }
  if (/LowerArm/.test(name) && dirBody.z < 0.35) { const sg = Math.sign(restDir.x); dirBody = dirBody.clone(); dirBody.x = sg * Math.max(sg * dirBody.x, 0.12); dirBody.normalize(); }
  const local = dirBody.clone().applyQuaternion(qTmp.clone().invert());
  bone.quaternion.setFromUnitVectors(restDir, local.normalize());
  bone.updateMatrixWorld(true);
}
const RX = new THREE.Vector3(1, 0, 0), LX = new THREE.Vector3(-1, 0, 0), DOWN = new THREE.Vector3(0, -1, 0);

const el = id => document.getElementById(id);
function show(id, t, a, b, pop = true) {
  const e = el(id); const fin = (t - a) / 0.25, fout = (b - t) / 0.2;
  const o = Math.max(0, Math.min(1, fin, fout)); e.style.opacity = o;
  const sc = pop ? mix(0.6, 1, easeOutBack(fin)) : 1; e.style.transform = `scale(${sc})`;
}

// ---------- 1コマ分のポーズ ----------
function pose(t) {
  const h = vrm.humanoid; h.resetNormalizedPose();
  const em = vrm.expressionManager; for (const k of ['happy', 'angry', 'surprised', 'sad', 'relaxed', 'blink', 'aa', 'oh', 'ih']) em.setValue(k, 0);

  // 立ち位置と体の向き
  const walk = seg(t, 7.2, 10.0);
  const z = mix(-0.35, 0.55, walk);
  const yaw = mix(0.55, 0.0, seg(t, 5.6, 6.6));
  vrm.scene.position.set(mix(0.15, 0.0, walk), 0, z);
  vrm.scene.rotation.y = yaw;

  // 呼吸(いつも少しだけ)・体の揺れ
  const br = Math.sin(t * 2 * Math.PI / 3.6);
  B('spine').rotation.x = 0.015 * br; B('chest').rotation.x = 0.02 * br;
  B('hips').rotation.z = 0.025 * Math.sin(t * 1.1); B('spine').rotation.z = -0.02 * Math.sin(t * 1.1);

  // 驚き(ビクッ):肩が上がって体が少し後ろへ
  const startle = Math.exp(-Math.pow((t - 2.1) / 0.12, 2)) * 0.6 + Math.exp(-Math.pow((t - 3.45) / 0.15, 2));
  B('chest').rotation.x -= 0.08 * startle; B('leftShoulder').rotation.z = 0.12 * startle; B('rightShoulder').rotation.z = -0.12 * startle;
  // うれしくて小さく跳ねる
  const hop = seg(t, 4.6, 5.5) * (1 - seg(t, 5.5, 5.8));
  const bounce = Math.abs(Math.sin((t - 4.6) * Math.PI * 4)) * 0.025 * hop;

  // 歩き
  const walking = t > 7.2 && t < 10.0 ? Math.min(1, (t - 7.2) / 0.3, (10.0 - t) / 0.3) : 0;
  const ph = (t - 7.2) * Math.PI * 2 * 1.35;
  const sw = Math.sin(ph) * walking;
  B('leftUpperLeg').rotation.x = -0.42 * sw; B('rightUpperLeg').rotation.x = 0.42 * sw;
  B('leftLowerLeg').rotation.x = 0.55 * Math.max(0, Math.sin(ph - 0.9)) * walking;
  B('rightLowerLeg').rotation.x = 0.55 * Math.max(0, -Math.sin(ph - 0.9)) * walking;
  B('leftFoot').rotation.x = 0.15 * sw; B('rightFoot').rotation.x = -0.15 * sw;
  B('hips').rotation.y = 0.08 * sw; B('chest').rotation.y = -0.1 * sw;
  const bob = Math.abs(Math.cos(ph)) * 0.022 * walking;
  B('hips').position.y += bounce + bob - 0.012 * walking;

  // 頭と視線
  const lookPhone = seg(t, 2.25, 2.7) * (1 - seg(t, 5.4, 5.9));
  const lookWin = 1 - seg(t, 1.6, 2.2);
  B('neck').rotation.y = 0.25 * lookWin * Math.sin(t * 0.8 + 0.5) + 0.15 * lookWin;
  B('neck').rotation.x = 0.28 * lookPhone + 0.03 * Math.sin(t * 1.7);
  B('head').rotation.z = 0.12 * seg(t, 10.2, 10.8) + 0.06 * lookWin * Math.sin(t * 0.9);
  B('head').rotation.x = 0.1 * lookPhone;

  // 腕:左はふつう(手を振る)、右はスマホ
  const armDownL = V(0.18, -1, 0.05), armDownR = V(-0.18, -1, 0.05);
  const holdU = V(-0.22, -0.9, 0.35), holdL = V(0.25, 0.55, 0.8);           // スマホを胸の前で見る
  const hugU = V(-0.15, -0.95, 0.25), hugL = V(0.55, 0.6, 0.45);           // スマホを胸に抱く
  const showU = V(-0.38, -0.55, 0.75), showL = V(-0.12, 0.15, 1);              // 画面を相手に見せる
  const sideU = V(-0.2, -1, 0.12), sideL = V(-0.05, -0.85, 0.55);          // 手に持って下ろしている
  let uR = sideU, lR = sideL;
  const k1 = seg(t, 2.2, 3.0), k2 = seg(t, 4.5, 5.0), k3 = seg(t, 5.6, 6.2), k4 = seg(t, 9.9, 10.6);
  uR = mixV(uR, holdU, k1); lR = mixV(lR, holdL, k1);
  uR = mixV(uR, hugU, k2); lR = mixV(lR, hugL, k2);
  uR = mixV(uR, sideU, k3 * (1 - k4)); lR = mixV(lR, sideL, k3 * (1 - k4));
  if (k4 > 0) { uR = mixV(mixV(holdU, sideU, k3), showU, k4); lR = mixV(mixV(hugL, sideL, k3), showL, k4); }
  // 歩くときは腕を少し振る
  uR = uR.clone().add(new THREE.Vector3(0, 0, 0.18 * sw * (1 - k4))).normalize();
  aim('rightUpperArm', LX, uR); aim('rightLowerArm', LX, lR);

  const wave = seg(t, 5.9, 6.3) * (1 - seg(t, 7.0, 7.4));
  let uL = mixV(armDownL, V(0.8, 0.05, 0.4), wave);
  let lL = mixV(armDownL, V(0.1 + 0.4 * Math.sin((t - 5.9) * 11), 1, 0.35), wave);
  uL = uL.clone().add(new THREE.Vector3(0, 0, -0.2 * sw)).normalize();
  if (wave < 0.01) lL = uL.clone().add(new THREE.Vector3(0.02, 0, 0.12 + 0.1 * Math.max(0, -sw))).normalize();
  aim('leftUpperArm', RX, uL); aim('leftLowerArm', RX, lL);
  // 手:指を軽く曲げる
  for (const sd of ['left', 'right']) for (const f of ['Index', 'Middle', 'Ring', 'Little']) for (const j of ['Proximal', 'Intermediate']) {
    const b = B(sd + f + j); if (b) b.rotation.z = (sd === 'left' ? -1 : 1) * (sd === 'right' && wave === 0 ? 0.9 : 0.35);
  }

  // 表情
  const sur = seg(t, 3.35, 3.55) * (1 - seg(t, 4.3, 4.8));
  const hap = seg(t, 4.4, 5.0) * (1 - seg(t, 11.2, 11.6)) * 0.85;
  em.setValue('surprised', sur);
  em.setValue('happy', hap);
  em.setValue('relaxed', 0.35 * (1 - seg(t, 1.8, 2.2)) + 0.4 * seg(t, 11.2, 11.8));
  // まばたき(決まった時刻+驚きの直前)
  for (const bt of [0.8, 2.15, 6.9, 9.3, 11.0, 12.6]) { const d = Math.abs(t - bt); if (d < 0.09) em.setValue('blink', Math.max(0, 1 - d / 0.09) * (1 - hap)); }
  // 口パク(セリフの間)
  const talk = (t > 3.45 && t < 3.9) ? 1 : (t > 6.0 && t < 6.9) ? 1 : 0;
  if (talk) { em.setValue('aa', 0.6 * Math.abs(Math.sin(t * 22))); em.setValue('oh', 0.3 * Math.abs(Math.sin(t * 15 + 1))); }

  // カメラ:ゆっくり寄る/歩いてくると下がる
  const cz = mix(3.0, 2.55, seg(t, 0, 7)) + 0.9 * walk;
  const cy = mix(1.25, 1.3, seg(t, 2, 4));
  cam.position.set(0.25 + 0.05 * Math.sin(t * 0.5), cy, cz);
  const ty = mix(1.05, 1.18, seg(t, 2.2, 3.0)) - 0.04 * seg(t, 9.8, 10.6);
  cam.lookAt(0.05 * (1 - walk), ty, z * 0.6);
  vrm.lookAt.target = cam;
  // スマホ:手のひらの中に置き、画面を「見る人」に向ける(読むときは自分の顔、見せるときはカメラ)
  vrm.scene.updateMatrixWorld(true);
  const hw = B('rightHand').getWorldPosition(new THREE.Vector3());
  const ew = B('rightLowerArm').getWorldPosition(new THREE.Vector3());
  const fwd = hw.clone().sub(ew).normalize();
  phone.position.copy(hw).addScaledVector(fwd, 0.055);
  const headW = B('head').getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.06, 0));
  const reading = seg(t, 2.3, 2.9) * (1 - seg(t, 4.5, 5.0));
  const showing = seg(t, 10.0, 10.6);
  const look = headW.clone().lerp(cam.position, showing);
  if (reading > 0.01 || showing > 0.01) { phone.up.set(0, 1, 0); phone.lookAt(look); }
  else { phone.up.copy(fwd).negate(); const outward = new THREE.Vector3(-1, 0, 0.35).applyQuaternion(vrm.scene.quaternion); phone.lookAt(phone.position.clone().add(outward)); }
  // スマホの画面の光
  phone.screen.material.color.setHex(t > 2.0 ? 0xdff6ff : 0x222233);
}

function overlays(t) {
  show('title', t, 0.1, 2.0, false);
  show('b1', t, 3.4, 4.4);
  show('b2', t, 6.0, 7.1);
  show('phone', t, 10.5, 11.6);
  show('q', t, 11.7, 99, false);
}

window.step = (t) => {        // t まで順番に進める(髪のゆれは前のコマの続きで計算するため)
  while (tPrev < t - 1e-6) { const dt = Math.min(1 / FPS, t - tPrev); tPrev += dt; pose(tPrev); vrm.update(dt); }
  pose(t); vrm.update(0); overlays(t); r.render(s, cam);
};

new GLTFLoader().register(p => new VRMLoaderPlugin(p)).load('./m.vrm', async g => {
  vrm = g.userData.vrm; s.add(vrm.scene); await applyJirai(vrm);
  B = n => vrm.humanoid.getNormalizedBoneNode(n);
  // スマホ(右手に持たせる)
  phone = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, 0.01), new THREE.MeshToonMaterial({ color: 0xf2b6c8 }));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.138), new THREE.MeshBasicMaterial({ color: 0x222233 }));
  scr.position.z = 0.0056; phone.add(body); phone.add(scr); phone.screen = scr;
  s.add(phone);
  vrm.scene.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  // 髪を自然な位置に落ち着かせる
  for (let i = 0; i < 60; i++) { pose(0); vrm.update(1 / FPS); }
  tPrev = 0; window.ready = true;
});
