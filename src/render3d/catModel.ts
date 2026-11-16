import * as THREE from 'three';
import { coatById, EYES, type CoatId, type EyeId } from '../game/coat';
import { canvasTexture, litMaterial } from './materials';

/**
 * 纯代码的 3D 小猫（黏土 / 盲盒公仔风）。全部由球体、圆锥、管子拼成，
 * 花纹用代码画到 Canvas 贴图上，所以换花色、换眼睛不需要任何美术资源。
 * 坐标单位：小猫坐姿总高约 2。正面朝 +Z。
 */
import type { BodyType } from '../game/pet';
export type { BodyType };
export const BODY_TYPES: { id: BodyType; label: string }[] = [
  { id: 'chubby', label: '胖嘟嘟' }, { id: 'normal', label: '标准' }, { id: 'slim', label: '苗条' },
];

export interface CatRig {
  root: THREE.Group;
  /** 每帧调用：t 是秒数，mood 0~1 影响尾巴摆动幅度 */
  animate(t: number, mood?: number): void;
  setExpression(e: 'normal' | 'happy' | 'sleepy'): void;
}


function clay(color: string | THREE.Texture, rough = 0.75): THREE.Material {
  return color instanceof THREE.Texture ? litMaterial({ map: color, roughness: rough }) : litMaterial({ color, roughness: rough });
}

function sphere(r: number, mat: THREE.Material, seg = 32): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

type Part = 'body' | 'head';

/**
 * 在球体 UV 上画花纹。three.js 球体的 UV：u=0.25 是正面(+Z)，0.75 是背面，
 * v 从上(画布顶部)到下。所以“胸口”在画布 (0.25W, 0.6H) 附近。
 */
function coatTexture(coat: CoatId, part: Part, makeCanvas: (w: number, h: number) => HTMLCanvasElement): THREE.Texture {
  const c = coatById(coat);
  const W = 512, H = 256;
  const cv = makeCanvas(W, H);
  const g = cv.getContext('2d') as CanvasRenderingContext2D;
  g.fillStyle = c.base;
  g.fillRect(0, 0, W, H);
  const blob = (x: number, y: number, rx: number, ry: number, color: string, rot = 0) => {
    g.fillStyle = color;
    for (const dx of [-W, 0, W]) { // 横向首尾相接，防止接缝处断开
      g.beginPath(); g.ellipse(x + dx, y, rx, ry, rot, 0, Math.PI * 2); g.fill();
    }
  };
  const front = W * 0.25;

  if (part === 'body') {
    if (coat === 'tuxedo') blob(front, H * 0.62, W * 0.17, H * 0.42, c.belly);
    else if (coat !== 'black' && coat !== 'blue') blob(front, H * 0.66, W * 0.12, H * 0.3, c.belly);
    if (coat === 'tabby' || coat === 'orange') {
      g.strokeStyle = c.accent; g.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const x = front + W * 0.13 + i * W * 0.06; // 从身侧绕到背后，避开胸口
        g.lineWidth = coat === 'tabby' ? 14 : 11;
        g.beginPath(); g.moveTo(x, H * 0.18);
        g.bezierCurveTo(x + 14, H * 0.38, x - 14, H * 0.55, x + 6, H * 0.78); g.stroke();
      }
    }
    if (coat === 'calico') {
      blob(W * 0.47, H * 0.38, 70, 46, c.accent, 0.3);
      blob(W * 0.72, H * 0.5, 62, 52, '#3A3236', -0.2);
      blob(W * 0.95, H * 0.32, 52, 40, c.accent, 0.5);
    }
  } else {
    if (coat === 'tuxedo') {
      g.fillStyle = c.belly;
      g.beginPath(); g.moveTo(front, H * 0.38); g.lineTo(front - W * 0.12, H); g.lineTo(front + W * 0.12, H); g.closePath(); g.fill();
    }
    if (coat === 'tabby' || coat === 'orange') {
      g.strokeStyle = c.accent; g.lineCap = 'round'; g.lineWidth = 9;
      for (const dx of [-26, 0, 26]) { // 额头 M 纹
        g.beginPath(); g.moveTo(front + dx, H * 0.08); g.lineTo(front + dx * 0.7, H * 0.3); g.stroke();
      }
      for (const s of [-1, 1]) for (const dy of [0, 18]) { // 脸颊纹
        g.beginPath(); g.moveTo(front + s * W * 0.16, H * 0.5 + dy); g.lineTo(front + s * W * 0.11, H * 0.52 + dy); g.stroke();
      }
    }
    if (coat === 'calico') {
      blob(front - W * 0.1, H * 0.2, 60, 40, c.accent, 0.2);
      blob(front + W * 0.12, H * 0.18, 56, 38, '#3A3236', -0.2);
    }
    if (coat === 'siamese') {
      const r = g.createRadialGradient(front, H * 0.62, 6, front, H * 0.62, 95);
      r.addColorStop(0, c.accent); r.addColorStop(0.55, 'rgba(90,66,50,0.75)'); r.addColorStop(1, 'rgba(90,66,50,0)');
      g.fillStyle = r; g.fillRect(0, 0, W, H);
    }
  }
  const tex = canvasTexture(cv);
  tex.anisotropy = 4;
  return tex;
}

/** 体型参数：身体半径与三轴缩放、后腿大小、头的大小。头身比越大越萌 */
const SHAPES: Record<BodyType, { r: number; sx: number; sy: number; sz: number; leg: number; head: number }> = {
  chubby: { r: 0.62, sx: 1.25, sy: 0.84, sz: 1.08, leg: 0.27, head: 1.04 },
  normal: { r: 0.48, sx: 1.0, sy: 0.95, sz: 0.92, leg: 0.21, head: 1.0 },
  slim: { r: 0.4, sx: 0.82, sy: 1.38, sz: 0.82, leg: 0.17, head: 0.9 },
};

export function buildCat(coatId: CoatId, eyeId: EyeId, makeCanvas: (w: number, h: number) => HTMLCanvasElement, bodyType: BodyType = 'normal'): CatRig {
  const c = coatById(coatId);
  const sh = SHAPES[bodyType];
  const root = new THREE.Group();
  const point = coatId === 'siamese' ? c.accent : c.base; // 暹罗的耳朵、尾巴、爪子是深色
  const pawColor = coatId === 'tuxedo' || coatId === 'calico' ? c.belly : point;

  const bodyMat = clay(coatTexture(coatId, 'body', makeCanvas));
  const headMat = clay(coatTexture(coatId, 'head', makeCanvas));
  const pointMat = clay(point);
  const pawMat = clay(pawColor);
  const pinkMat = clay('#F7A9B6', 0.6);
  const inkMat = clay('#2A2026', 0.25);
  const whiteMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });

  // 身体：小小的梨形，坐在地面上
  const bodyH = sh.r * sh.sy;
  const body = sphere(sh.r, bodyMat);
  body.scale.set(sh.sx, sh.sy, sh.sz);
  body.position.y = bodyH;
  root.add(body);

  // 后腿
  for (const s of [-1, 1]) {
    const leg = sphere(sh.leg, bodyMat);
    leg.scale.set(0.95, 0.8, 1.25);
    leg.position.set(s * sh.r * sh.sx * 0.78, sh.leg * 0.78, -0.02);
    root.add(leg);
  }
  // 前爪：短短圆圆，带粉色肉垫
  for (const s of [-1, 1]) {
    const paw = sphere(0.12, pawMat, 24);
    paw.scale.set(1, 0.72, 1.25);
    paw.position.set(s * 0.15 * sh.sx, 0.08, sh.r * sh.sz * 0.88);
    const bean = sphere(0.04, pinkMat, 12);
    bean.scale.set(1.2, 0.5, 0.6);
    bean.position.set(0, -0.02, 0.11);
    paw.add(bean);
    root.add(paw);
  }

  // 尾巴：沿曲线的管子，绕根部旋转来摆动
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0.12, 0.16, -sh.r * sh.sz * 0.85);
  const tl = 0.8 + sh.sy * 0.2;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.32 * tl, 0.04, -0.18),
    new THREE.Vector3(0.55 * tl, 0.38 * tl, -0.12), new THREE.Vector3(0.48 * tl, 0.78 * tl, 0.02),
  ]);
  const tailMat = coatId === 'calico' ? clay(c.accent) : pointMat;
  const tail = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, bodyType === 'chubby' ? 0.1 : 0.085, 12, false), tailMat);
  tail.castShadow = true;
  const tip = sphere(bodyType === 'chubby' ? 0.1 : 0.085, tailMat, 16);
  tip.position.copy(curve.getPoint(1));
  tail.add(tip);
  tailPivot.add(tail);
  root.add(tailPivot);

  // 头：比身体大很多（大头小身子 = 萌）
  const head = new THREE.Group();
  const headY = bodyH * 2 + 0.3;
  head.position.y = headY;
  head.scale.setScalar(sh.head);
  root.add(head);
  const skull = sphere(0.7, headMat, 48);
  skull.scale.set(1.12, 0.92, 0.95);
  head.add(skull);

  // 耳朵：略圆、稍微向外张
  const ears: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(s * 0.42, 0.5, -0.04);
    ear.rotation.z = -s * 0.32;
    ear.rotation.x = -0.08;
    const earMat = coatId === 'calico' ? (s > 0 ? clay('#3A3236') : clay(c.accent)) : pointMat;
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.44, 32), earMat);
    outer.castShadow = true;
    outer.scale.z = 0.8;
    outer.position.y = 0.14;
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 24), pinkMat);
    inner.scale.z = 0.45;
    inner.position.set(0, 0.1, 0.1);
    ear.add(outer, inner);
    head.add(ear);
    ears.push(ear);
  }

  // 口鼻：小小的，位置偏低
  const muzzleMat = clay(coatId === 'black' || coatId === 'blue' ? c.belly : coatId === 'siamese' ? '#4A3628' : c.belly);
  for (const s of [-1, 1]) {
    const cheek = sphere(0.095, muzzleMat, 20);
    cheek.scale.set(1.1, 0.82, 0.8);
    cheek.position.set(s * 0.075, -0.28, 0.575);
    head.add(cheek);
  }
  const nose = sphere(0.042, pinkMat, 16);
  nose.scale.set(1.35, 0.85, 0.8);
  nose.position.set(0, -0.215, 0.635);
  head.add(nose);
  for (const s of [-1, 1]) { // ω 嘴
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.011, 6, 14, Math.PI), inkMat);
    m.rotation.z = Math.PI;
    m.position.set(s * 0.035, -0.255, 0.645);
    head.add(m);
  }
  // 腮红：更明显
  const blushMat = new THREE.MeshBasicMaterial({ color: '#FF8FA3', transparent: true, opacity: 0.55, depthWrite: false });
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.085, 24), blushMat);
    b.scale.y = 0.62;
    b.position.set(s * 0.45, -0.19, 0.525);
    b.rotation.y = s * 0.72;
    head.add(b);
  }

  // 大眼睛：彩色虹膜 + 大黑瞳 + 两个高光（萌系眼睛的关键）
  const eyeOpen: THREE.Group[] = [];
  const eyeClosed: THREE.Mesh[] = [];
  const irisMat = clay(EYES[eyeId].color, 0.2);
  for (const s of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(s * 0.25, -0.06, 0.6);
    eye.rotation.y = s * 0.3;
    const iris = sphere(0.17, irisMat, 28);
    iris.scale.set(0.86, 1.02, 0.38);
    const pupil = sphere(0.13, inkMat, 24);
    pupil.scale.set(0.84, 0.98, 0.4);
    pupil.position.set(0, 0.025, 0.02);
    const hl1 = sphere(0.05, whiteMat, 14);
    hl1.position.set(0.045, 0.07, 0.07);
    const hl2 = sphere(0.024, whiteMat, 10);
    hl2.position.set(-0.045, -0.055, 0.065);
    eye.add(iris, pupil, hl1, hl2);
    head.add(eye);
    eyeOpen.push(eye);

    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 8, 24, Math.PI), inkMat);
    arc.position.copy(eye.position).add(new THREE.Vector3(0, -0.04, 0.03));
    arc.rotation.y = eye.rotation.y;
    arc.visible = false;
    head.add(arc);
    eyeClosed.push(arc);
  }

  let expr: 'normal' | 'happy' | 'sleepy' = 'normal';
  const baseBodyY = body.scale.y;
  const rig: CatRig = {
    root,
    setExpression(e) { expr = e; },
    animate(t, mood = 0.7) {
      const breathe = Math.sin(t * 2.2);
      body.scale.y = baseBodyY * (1 + breathe * 0.015);
      head.position.y = headY + breathe * 0.015;
      head.rotation.z = 0.08 + Math.sin(t * 0.7) * 0.07; // 默认微微歪头
      head.rotation.x = Math.sin(t * 0.5) * 0.04;
      tailPivot.rotation.y = Math.sin(t * (1.2 + mood)) * (0.25 + mood * 0.35);
      tailPivot.rotation.z = Math.sin(t * 0.9) * 0.08;
      const twitch = (t % 5) < 0.15 ? Math.sin(t * 60) * 0.12 : 0;
      ears[1].rotation.z = -0.32 + twitch; // 右耳基础角度是 -0.32
      const blink = (t % 3.5) < 0.12;
      const closed = expr === 'happy' || blink;
      for (let i = 0; i < 2; i++) {
        eyeOpen[i].visible = !closed;
        eyeOpen[i].scale.y = expr === 'sleepy' ? 0.35 : 1;
        eyeClosed[i].visible = closed;
      }
    },
  };
  return rig;
}
