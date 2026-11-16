import * as THREE from 'three';

/** 等距视角的温馨小房间：木地板 + 两面墙 + 窗户 + 地毯 + 猫窝 + 绿植 + 饭碗。全部代码生成。 */
export function buildRoom(): THREE.Group {
  const g = new THREE.Group();
  const mat = (color: string, rough = 0.85) => new THREE.MeshStandardMaterial({ color, roughness: rough });
  const box = (w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b;
  };
  const S = 6;
  // 地板：木条
  for (let i = 0; i < 6; i++) box(S / 6 - 0.02, 0.2, S, mat(i % 2 ? '#E7C49B' : '#E1BC92'), -S / 2 + S / 12 + i * S / 6, -0.1, 0);
  // 墙
  box(S, 3.4, 0.2, mat('#FBEBD9'), 0, 1.7, -S / 2 - 0.1);
  box(0.2, 3.4, S, mat('#F7E1CC'), -S / 2 - 0.1, 1.7, 0);
  box(S, 0.25, 0.25, mat('#E2B98F'), 0, 0.12, -S / 2 + 0.03); // 踢脚线
  box(0.25, 0.25, S, mat('#E2B98F'), -S / 2 + 0.03, 0.12, 0);
  // 窗户（后墙）
  box(1.9, 1.5, 0.12, mat('#E2B98F'), 1.1, 2.0, -S / 2 + 0.02);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), new THREE.MeshBasicMaterial({ color: '#BFE3F5' }));
  glass.position.set(1.1, 2.0, -S / 2 + 0.09); g.add(glass);
  box(0.06, 1.2, 0.05, mat('#E2B98F'), 1.1, 2.0, -S / 2 + 0.11);
  box(1.6, 0.06, 0.05, mat('#E2B98F'), 1.1, 2.0, -S / 2 + 0.11);
  // 墙上小相框（左墙）
  box(0.08, 0.7, 0.9, mat('#F2A65A'), -S / 2 + 0.04, 2.1, -0.6);
  box(0.09, 0.55, 0.75, mat('#FFF6EC'), -S / 2 + 0.05, 2.1, -0.6);
  // 圆地毯
  const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.04, 48), mat('#F6C1C7'));
  rug.position.set(0.3, 0.02, 0.6); rug.receiveShadow = true; g.add(rug);
  const rugIn = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.045, 48), mat('#FBD9DC'));
  rugIn.position.set(0.3, 0.025, 0.6); rugIn.receiveShadow = true; g.add(rugIn);
  // 猫窝
  const bed = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.22, 16, 40), mat('#9FC7E8'));
  bed.rotation.x = Math.PI / 2; bed.position.set(-1.7, 0.2, -1.6); bed.castShadow = true; bed.receiveShadow = true; g.add(bed);
  const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.12, 32), mat('#FFF1DE'));
  cushion.position.set(-1.7, 0.08, -1.6); cushion.receiveShadow = true; g.add(cushion);
  // 绿植
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.5, 24), mat('#D9774A'));
  pot.position.set(2.3, 0.25, -2.3); pot.castShadow = true; g.add(pot);
  for (const [x, y, z, r] of [[2.3, 0.75, -2.3, 0.32], [2.15, 0.95, -2.2, 0.24], [2.45, 0.98, -2.4, 0.22], [2.3, 1.15, -2.3, 0.2]]) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat('#7DB86A'));
    leaf.position.set(x, y, z); leaf.castShadow = true; g.add(leaf);
  }
  // 饭碗 + 小鱼干
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.16, 28), mat('#FFFFFF', 0.4));
  bowl.position.set(1.9, 0.08, 1.3); bowl.castShadow = true; g.add(bowl);
  const food = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 28), mat('#C98A4B'));
  food.position.set(1.9, 0.15, 1.3); g.add(food);
  // 毛线球
  const yarn = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 16), mat('#B79CE0'));
  yarn.position.set(-1.2, 0.18, 1.4); yarn.castShadow = true; g.add(yarn);
  return g;
}

export function setupLights(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight('#FFF4E6', '#E8C9A8', 1.6));
  const sun = new THREE.DirectionalLight('#FFE7C7', 2.2);
  sun.position.set(4, 8, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -5; sun.shadow.camera.right = 5;
  sun.shadow.camera.top = 5; sun.shadow.camera.bottom = -5;
  sun.shadow.radius = 4;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
}
