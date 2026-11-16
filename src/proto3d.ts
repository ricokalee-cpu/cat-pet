// 3D 美术原型（网页预览）。?coat=calico&eye=green 看单只；?show=all 看 8 种花色
import * as THREE from 'three';
import { buildCat, type BodyType } from './render3d/catModel';
import { buildRoom, setupLights } from './render3d/room';
import { COATS, type CoatId, type EyeId } from './game/coat';

const q = new URLSearchParams(location.search);
const W = window.innerWidth, H = window.innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#FFF6EC');
setupLights(scene);
const mk = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

const all = q.get('show') === 'all';
const rigs = [] as ReturnType<typeof buildCat>[];
let camera: THREE.OrthographicCamera;
if (q.get('cmp')) {
  const coat = (q.get('coat') || 'orange') as CoatId;
  (['chubby', 'normal', 'slim'] as BodyType[]).forEach((b, i) => {
    const r = buildCat(coat, (q.get('eye') || 'amber') as EyeId, mk, b);
    r.root.position.set(i * 2.3 - 2.3, 0, 0);
    rigs.push(r); scene.add(r.root);
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: '#F3DDC4' }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const v = 2.2, a = W / H;
  camera = new THREE.OrthographicCamera(-v * a, v * a, v, -v, 0.1, 100);
  camera.position.set(0, 5, 12);
  camera.lookAt(0, 1.0, 0);
} else if (all) {
  const eyes: EyeId[] = ['amber', 'green', 'blue', 'copper'];
  const bodies: BodyType[] = ['chubby', 'normal', 'slim'];
  const bodyMode = q.get('show') === 'all' && q.get('bodies');
  COATS.forEach((c, i) => {
    const r = buildCat(c.id, c.id === 'siamese' ? 'blue' : eyes[i % 4], mk, bodyMode ? bodies[i % 3] : 'normal');
    r.root.position.set((i % 4) * 2.2 - 3.3, 0, Math.floor(i / 4) * 3.4 - 1.7);
    rigs.push(r); scene.add(r.root);
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: '#F3DDC4' }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const v = 4.4, a = W / H;
  camera = new THREE.OrthographicCamera(-v * a, v * a, v, -v, 0.1, 100);
  camera.position.set(0, 9, 12);
  camera.lookAt(0, 0.6, 0);
} else {
  scene.add(buildRoom());
  const r = buildCat((q.get('coat') || 'orange') as CoatId, (q.get('eye') || 'amber') as EyeId, mk, (q.get('body') || 'normal') as BodyType);
  r.root.position.set(0.3, 0, 0.6);
  r.root.rotation.y = Math.PI / 4; // 面向等距镜头
  if (q.get('expr')) r.setExpression(q.get('expr') as any);
  rigs.push(r); scene.add(r.root);
  const v = 4.2, a = W / H;
  camera = new THREE.OrthographicCamera(-v * a, v * a, v, -v, 0.1, 100);
  camera.position.set(8, 7.5, 8); // 等距 45° 俯视
  camera.lookAt(0, 0.9, 0.3);
  camera.zoom = 1.05; camera.updateProjectionMatrix();
}

const t0 = performance.now();
const fixedT = q.get('t');
function loop() {
  const t = fixedT ? Number(fixedT) : (performance.now() - t0) / 1000;
  rigs.forEach((r, i) => r.animate(t + i * 0.7));
  renderer.render(scene, camera);
  if (!fixedT) requestAnimationFrame(loop);
  else (window as any).__ready = true;
}
loop();
