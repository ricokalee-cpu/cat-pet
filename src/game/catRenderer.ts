import { coatById, EYES, type CoatId, type EyeId } from './coat';

import type { BodyType } from './pet';

export interface CatLook { coat: CoatId; eye: EyeId; body?: BodyType }
export type Expression = 'happy' | 'normal' | 'sad' | 'sleepy';

/**
 * 占位用的矢量卡通猫，按“部件”分层绘制：尾巴 → 身体 → 花纹 → 头 → 耳朵 → 脸。
 * 美术图到位后，把每一层换成 assets/cat/ 下的 PNG（底色层由代码着色），接口不变。
 * size 是猫的整体高度。
 */
export function drawCat(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, look: CatLook, expr: Expression, t: number) {
  const c = coatById(look.coat);
  const u = size / 100; // 以 100 为单位的坐标系
  const breathe = Math.sin(t * 2) * 1.2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(u, u);
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#3A2E2A';

  const point = look.coat === 'siamese' ? c.accent : c.base; // 暹罗的耳朵、尾巴、爪子是深色
  const fill = (color: string) => { ctx.fillStyle = color; ctx.fill(); ctx.stroke(); };

  // 尾巴
  const sway = Math.sin(t * 1.6) * 6;
  ctx.beginPath();
  ctx.moveTo(18, 30);
  ctx.quadraticCurveTo(46, 26 + sway, 40, -2 + sway);
  ctx.quadraticCurveTo(38, -8 + sway, 34, -2 + sway);
  ctx.quadraticCurveTo(38, 22, 14, 22);
  ctx.closePath();
  fill(look.coat === 'calico' ? c.accent : point);

  // 身体
  const bw = look.body === 'chubby' ? 32 : look.body === 'slim' ? 21 : 26; // 体型只影响身体宽窄
  const body = () => { ctx.beginPath(); ctx.ellipse(0, 22 - breathe * 0.3, bw, 22 + breathe * 0.3, 0, 0, Math.PI * 2); };
  body(); ctx.fillStyle = c.base; ctx.fill();
  ctx.save(); ctx.clip();
  drawBodyPattern(ctx, look.coat, c.accent, c.belly);
  ctx.restore();
  body(); ctx.stroke(); // 花纹画完后重建轮廓路径再描边

  // 前爪
  for (const x of [-12, 12]) {
    ctx.beginPath();
    ctx.ellipse(x, 42, 8, 5, 0, 0, Math.PI * 2);
    fill(look.coat === 'tuxedo' ? c.belly : look.coat === 'siamese' ? c.accent : c.base);
  }

  // 头（呼吸时轻微上下）
  ctx.save();
  ctx.translate(0, -breathe);
  // 耳朵
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 30, -26);
    ctx.lineTo(s * 26, -52);
    ctx.lineTo(s * 8, -38);
    ctx.closePath();
    fill(look.coat === 'calico' && s > 0 ? '#3A3236' : point);
    ctx.beginPath();
    ctx.moveTo(s * 26, -30);
    ctx.lineTo(s * 24, -45);
    ctx.lineTo(s * 14, -37);
    ctx.closePath();
    ctx.fillStyle = '#F6B8B8'; ctx.fill();
  }
  const head = () => { ctx.beginPath(); ctx.ellipse(0, -20, 34, 28, 0, 0, Math.PI * 2); };
  head(); ctx.fillStyle = c.base; ctx.fill();
  ctx.save(); ctx.clip();
  drawHeadPattern(ctx, look.coat, c.accent, c.belly);
  ctx.restore();
  head(); ctx.stroke();

  drawFace(ctx, expr, EYES[look.eye].color, t);
  ctx.restore();
  ctx.restore();
}

function drawBodyPattern(ctx: CanvasRenderingContext2D, coat: CoatId, accent: string, belly: string) {
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(0, 28, 14, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  if (coat === 'tabby' || coat === 'orange') {
    ctx.strokeStyle = accent; ctx.lineWidth = 3.5;
    for (const y of [6, 14, 22]) {
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * 26, y); ctx.quadraticCurveTo(s * 18, y + 2, s * 15, y + 6); ctx.stroke();
      }
    }
    ctx.strokeStyle = '#3A2E2A'; ctx.lineWidth = 2.4;
  } else if (coat === 'calico') {
    ctx.fillStyle = accent; ctx.beginPath(); ctx.ellipse(-16, 10, 12, 9, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3A3236'; ctx.beginPath(); ctx.ellipse(18, 18, 9, 8, -0.3, 0, Math.PI * 2); ctx.fill();
  }
}

function drawHeadPattern(ctx: CanvasRenderingContext2D, coat: CoatId, accent: string, belly: string) {
  if (coat === 'tabby' || coat === 'orange') {
    // 额头 M 纹
    ctx.strokeStyle = accent; ctx.lineWidth = 3;
    for (const x of [-7, 0, 7]) { ctx.beginPath(); ctx.moveTo(x, -46); ctx.lineTo(x * 0.8, -36); ctx.stroke(); }
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 34, -18); ctx.lineTo(s * 24, -16); ctx.stroke(); }
    ctx.strokeStyle = '#3A2E2A'; ctx.lineWidth = 2.4;
  } else if (coat === 'tuxedo') {
    ctx.fillStyle = belly;
    ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(-18, 8); ctx.lineTo(18, 8); ctx.closePath(); ctx.fill();
  } else if (coat === 'calico') {
    ctx.fillStyle = accent; ctx.beginPath(); ctx.ellipse(-22, -36, 16, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3A3236'; ctx.beginPath(); ctx.ellipse(24, -38, 14, 12, 0, 0, Math.PI * 2); ctx.fill();
  } else if (coat === 'siamese') {
    const g = ctx.createRadialGradient(0, -12, 2, 0, -12, 22);
    g.addColorStop(0, accent); g.addColorStop(1, 'rgba(90,66,50,0)');
    ctx.fillStyle = g; ctx.fillRect(-34, -48, 68, 56);
  }
  // 口鼻白色区
  ctx.fillStyle = belly;
  ctx.beginPath(); ctx.ellipse(0, -8, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
}

function drawFace(ctx: CanvasRenderingContext2D, expr: Expression, eyeColor: string, t: number) {
  const blink = (t % 4) < 0.12; // 每 4 秒眨一次眼
  for (const s of [-1, 1]) {
    const x = s * 13, y = -22;
    if (expr === 'happy' || expr === 'sleepy' || blink) {
      ctx.beginPath();
      if (expr === 'happy') ctx.arc(x, y + 2, 5, Math.PI * 1.1, Math.PI * 1.9);
      else { ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); }
      ctx.stroke();
    } else {
      ctx.beginPath(); ctx.ellipse(x, y, 5.5, 6.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = eyeColor; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, y, 2, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#1D1A1C'; ctx.fill();
      ctx.beginPath(); ctx.arc(x + 1.8, y - 2.5, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
    }
    if (expr === 'sad') { ctx.beginPath(); ctx.moveTo(x - 6, y - 10 + s * 0); ctx.lineTo(x + 6, y - 8 - s * 2); ctx.stroke(); }
  }
  // 鼻子和嘴
  ctx.fillStyle = '#E98A95';
  ctx.beginPath(); ctx.moveTo(-3, -12); ctx.lineTo(3, -12); ctx.lineTo(0, -9); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  if (expr === 'sad') { ctx.moveTo(-5, -2); ctx.quadraticCurveTo(0, -6, 5, -2); }
  else { ctx.moveTo(0, -9); ctx.quadraticCurveTo(-3, -4, -6, -6); ctx.moveTo(0, -9); ctx.quadraticCurveTo(3, -4, 6, -6); }
  ctx.stroke();
  // 腮红
  ctx.fillStyle = 'rgba(246,140,150,0.35)';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 22, -10, 5, 3, 0, 0, Math.PI * 2); ctx.fill(); }
  // 胡须
  ctx.lineWidth = 1.2;
  for (const s of [-1, 1]) for (const dy of [-1, 3]) {
    ctx.beginPath(); ctx.moveTo(s * 14, -8 + dy); ctx.lineTo(s * 30, -10 + dy * 1.6); ctx.stroke();
  }
  ctx.lineWidth = 2.4;
  if (expr === 'sleepy') {
    ctx.fillStyle = '#7A8BA8'; ctx.font = 'bold 10px sans-serif';
    ctx.fillText('z', 30, -46 - (t % 2) * 4);
  }
}
