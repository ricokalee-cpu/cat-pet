/** 花色定义 + 照片识别（纯本地像素分析，照片不上传服务器）。 */
export type CoatId = 'orange' | 'tabby' | 'black' | 'white' | 'tuxedo' | 'calico' | 'siamese' | 'blue';
export type EyeId = 'amber' | 'green' | 'blue' | 'copper';

export interface Coat {
  id: CoatId;
  label: string;
  base: string; // 主体色
  accent: string; // 花纹/斑块色
  belly: string; // 肚皮/口鼻色
}

export const COATS: Coat[] = [
  { id: 'orange', label: '橘猫', base: '#F2A65A', accent: '#D9772E', belly: '#FFE9CF' },
  { id: 'tabby', label: '狸花', base: '#A88C6A', accent: '#4E3B2A', belly: '#E9DCC5' },
  { id: 'black', label: '黑猫', base: '#2E2B30', accent: '#1C1A1E', belly: '#3D3940' },
  { id: 'white', label: '白猫', base: '#FAF7F2', accent: '#E8E1D6', belly: '#FFFFFF' },
  { id: 'tuxedo', label: '奶牛', base: '#2E2B30', accent: '#2E2B30', belly: '#FAF7F2' },
  { id: 'calico', label: '三花', base: '#FAF7F2', accent: '#E58B3A', belly: '#FFFFFF' },
  { id: 'siamese', label: '暹罗', base: '#F1E3CC', accent: '#5A4232', belly: '#FBF3E6' },
  { id: 'blue', label: '蓝猫', base: '#8D97A5', accent: '#6E7886', belly: '#B3BBC6' },
];

export const EYES: Record<EyeId, { label: string; color: string }> = {
  amber: { label: '琥珀', color: '#E0A526' },
  green: { label: '绿', color: '#6DBB5B' },
  blue: { label: '蓝', color: '#5AA6E0' },
  copper: { label: '铜色', color: '#C8692B' },
};

export function coatById(id: CoatId): Coat {
  return COATS.find((c) => c.id === id) || COATS[0];
}

type Bucket = 'black' | 'white' | 'orange' | 'cream' | 'grey' | 'brown';

function classify(r: number, g: number, b: number): Bucket | null {
  const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    const rr = r / 255, gg = g / 255, bb = b / 255;
    if (max === rr) h = 60 * (((gg - bb) / d) % 6);
    else if (max === gg) h = 60 * ((bb - rr) / d + 2);
    else h = 60 * ((rr - gg) / d + 4);
    if (h < 0) h += 360;
  }
  if (l < 0.17) return 'black';
  if (l > 0.82 && s < 0.35) return 'white';
  const warm = h >= 10 && h <= 50;
  if (warm && s > 0.45 && l > 0.3 && l < 0.78) return 'orange';
  if (warm && l > 0.65) return 'cream';
  if (s < 0.15) return 'grey';
  if (warm || (h > 50 && h < 70)) return 'brown';
  return null; // 背景里的绿植、蓝天等，不计入
}

export interface CoatGuess { coat: CoatId; score: number }

/**
 * 分析照片中央区域的颜色分布，给出花色候选（按可能性排序）。
 * 只是粗略猜测：照片背景、光线都会影响，所以界面上一定让玩家确认或改选。
 */
export function analyzeCoat(data: Uint8ClampedArray): CoatGuess[] {
  const count: Record<Bucket, number> = { black: 0, white: 0, orange: 0, cream: 0, grey: 0, brown: 0 };
  let total = 0;
  for (let i = 0; i < data.length; i += 16) {
    const k = classify(data[i], data[i + 1], data[i + 2]);
    if (k) { count[k]++; total++; }
  }
  if (total === 0) return [{ coat: 'orange', score: 0 }];
  const f = (k: Bucket) => count[k] / total;
  const dark = f('black') + f('brown');
  const scores: Record<CoatId, number> = {
    orange: f('orange') * 1.6 + f('cream') * 0.4 - f('black'),
    tabby: f('brown') * 1.4 + Math.min(f('black'), 0.3) * 0.5 + f('grey') * 0.3,
    black: f('black') * 1.3 - f('white') * 1.2,
    white: f('white') * 1.2 - dark,
    tuxedo: Math.min(f('black'), f('white')) * 2.6,
    calico: Math.min(f('orange'), f('white')) * 2 + Math.min(f('black'), f('orange')) * 2,
    siamese: Math.min(f('cream') + f('white') * 0.5, dark) * 2.2 - f('orange'),
    blue: f('grey') * 1.5 - f('orange'),
  };
  return (Object.keys(scores) as CoatId[])
    .map((coat) => ({ coat, score: scores[coat] }))
    .sort((a, b) => b.score - a.score);
}
