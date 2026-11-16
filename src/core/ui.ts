export const THEME = {
  bg: '#FFF6EC',
  floor: '#F3DDC4',
  ink: '#3A2E2A',
  sub: '#8A7568',
  primary: '#FF8A5B',
  primaryInk: '#FFFFFF',
  card: '#FFFFFF',
  disabled: '#D9CFC6',
  hunger: '#FFB347',
  clean: '#6EC6E8',
  mood: '#FF7FA3',
  energy: '#8CCB6E',
  font: '"PingFang SC","Microsoft YaHei",sans-serif',
};

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color = THEME.ink, align: CanvasTextAlign = 'center', bold = false) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${THEME.font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

export class Button {
  enabled = true;
  constructor(
    public x: number, public y: number, public w: number, public h: number,
    public label: string, public onTap: () => void,
    public style: { bg?: string; ink?: string; size?: number; sub?: string } = {},
  ) {}

  hit(px: number, py: number) {
    return this.enabled && px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.shadowColor = 'rgba(120,80,50,0.18)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    roundRect(ctx, this.x, this.y, this.w, this.h, 14);
    ctx.fillStyle = this.enabled ? this.style.bg || THEME.primary : THEME.disabled;
    ctx.fill();
    ctx.restore();
    const ink = this.style.ink || THEME.primaryInk;
    const size = this.style.size || 16;
    if (this.style.sub) {
      text(ctx, this.label, this.x + this.w / 2, this.y + this.h / 2 - size * 0.45, size, ink, 'center', true);
      text(ctx, this.style.sub, this.x + this.w / 2, this.y + this.h / 2 + size * 0.7, size * 0.65, ink);
    } else {
      text(ctx, this.label, this.x + this.w / 2, this.y + this.h / 2, size, ink, 'center', true);
    }
  }
}

export function statBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, label: string, value: number, color: string) {
  text(ctx, label, x, y + 7, 12, THEME.sub, 'left');
  const bx = x + 30, bw = w - 30;
  roundRect(ctx, bx, y, bw, 14, 7);
  ctx.fillStyle = '#F1E6DA'; ctx.fill();
  if (value > 0) {
    roundRect(ctx, bx, y, Math.max(14, bw * value / 100), 14, 7);
    ctx.fillStyle = value < 25 ? '#E86A5A' : color; ctx.fill();
  }
}

/** 飘字/爱心之类的小特效 */
export interface Floater { x: number; y: number; text: string; life: number; color: string }

export function drawFloaters(ctx: CanvasRenderingContext2D, list: Floater[], dt: number) {
  for (let i = list.length - 1; i >= 0; i--) {
    const f = list[i];
    f.life -= dt;
    f.y -= 30 * dt;
    if (f.life <= 0) { list.splice(i, 1); continue; }
    ctx.globalAlpha = Math.min(1, f.life);
    text(ctx, f.text, f.x, f.y, 18, f.color, 'center', true);
    ctx.globalAlpha = 1;
  }
}
