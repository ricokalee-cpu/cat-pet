import * as THREE from 'three';

/**
 * 材质档位：设备越弱用越简单的着色器。
 * - standard：物理材质，最好看（WebGL2 默认）
 * - lambert：漫反射材质，便宜很多，WebGL1 默认
 * - basic：不受光照，最后的兜底
 */
export type MaterialTier = 'standard' | 'lambert' | 'basic';
let tier: MaterialTier = 'standard';
let webgl1 = false;

export function setMaterialTier(t: MaterialTier) { tier = t; }
export function getMaterialTier() { return tier; }
export function setWebGL1(v: boolean) { webgl1 = v; }

export function litMaterial(opts: { color?: THREE.ColorRepresentation; map?: THREE.Texture; roughness?: number }): THREE.Material {
  const base: any = {};
  if (opts.color !== undefined) base.color = opts.color;
  if (opts.map) base.map = opts.map;
  if (tier === 'standard') return new THREE.MeshStandardMaterial({ ...base, roughness: opts.roughness ?? 0.75, metalness: 0 });
  if (tier === 'lambert') return new THREE.MeshLambertMaterial(base);
  return new THREE.MeshBasicMaterial(base);
}

const LUT = (() => {
  const t = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    const c = i / 255;
    t[i] = Math.round(255 * (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  }
  return t;
})();

/**
 * 把代码画好的 Canvas 变成贴图。WebGL1 下 three.js 没法在小游戏里做 sRGB 转换，
 * 所以这里自己把像素转成线性颜色，保证和 WebGL2 下看起来一样。
 */
export function canvasTexture(cv: HTMLCanvasElement): THREE.Texture {
  if (webgl1) {
    const g = cv.getContext('2d') as CanvasRenderingContext2D;
    const img = g.getImageData(0, 0, cv.width, cv.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) { d[i] = LUT[d[i]]; d[i + 1] = LUT[d[i + 1]]; d[i + 2] = LUT[d[i + 2]]; }
    g.putImageData(img, 0, 0);
  }
  const tex = new THREE.CanvasTexture(cv as any);
  tex.colorSpace = webgl1 ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  return tex;
}
