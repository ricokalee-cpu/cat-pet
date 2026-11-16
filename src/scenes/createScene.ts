import type { Game, Scene } from '../core/game';
import { Button, THEME, roundRect, text } from '../core/ui';
import { platform } from '../platform';
import { analyzeCoat, coatById, COATS, EYES, type CoatId, type EyeId } from '../game/coat';
import { drawCat } from '../game/catRenderer';
import { BODY_LABEL, newPet, type BodyType, type PetState } from '../game/pet';

const NAMES = ['团子', '年糕', '布丁', '豆包', '可乐', '奶茶', '咪咪', '麻薯', '橙子', '芝麻', '雪球', '花卷'];

/** 建猫流程：选照片 → 本地识别花色 → 玩家确认/改选花色和眼睛 → 起名 → 进入主界面 */
export class CreateScene implements Scene {
  private coat: CoatId = 'orange';
  private eye: EyeId = 'amber';
  private body: BodyType = 'normal';
  private bodyBtns: { id: BodyType; x: number; y: number; w: number; h: number }[] = [];
  private name = NAMES[Math.floor(Math.random() * NAMES.length)];
  private suggested: CoatId | null = null;
  private photo: CanvasImageSource | null = null;
  private busy = false;
  private buttons: Button[] = [];
  private swatches: { id: CoatId; x: number; y: number; r: number }[] = [];
  private eyeDots: { id: EyeId; x: number; y: number; r: number }[] = [];

  constructor(private game: Game, private onDone: (p: PetState) => void) {
    this.layout();
    if (game.stage) game.stage.setMode('studio', this.catY / game.height, this.catSizePx);
  }

  // 布局从下往上排，保证矮屏幕上也不重叠
  private top = 0;
  private nameY = 0;
  private catY = 0;
  private catSizePx = 0;
  private catSize() { return this.catSizePx; }

  private layout() {
    const { width: W, height: H } = this.game;
    const bw = (W - 48 - 12) / 2;
    this.buttons = [
      new Button(24, H - 150, bw, 52, '📷 选照片识别', () => this.pickPhoto(), { bg: '#FFB38A' }),
      new Button(36 + bw, H - 150, bw, 52, '🎲 换个名字', () => {
        this.name = NAMES[(NAMES.indexOf(this.name) + 1) % NAMES.length];
      }, { bg: '#F2C46D' }),
      new Button(24, H - 86, W - 48, 56, '就是它了！', () => {
        this.onDone(newPet(this.name, this.coat, this.eye, this.body));
      }, { size: 18 }),
    ];
    const bodyY = H - 194;
    const eyeY = bodyY - 26;
    const row2 = eyeY - 58;
    const top = row2 - 64;
    this.top = top;
    this.nameY = top - 40;
    const catTop = this.game.safeTop + 72, catBottom = this.nameY - 16;
    this.catSizePx = Math.max(60, Math.min(W * 0.5, (catBottom - catTop) * 0.85));
    this.catY = (catTop + catBottom) / 2;
    const cols = 4, gap = (W - 48) / cols;
    this.swatches = COATS.map((c, i) => ({
      id: c.id, x: 24 + gap * (i % cols) + gap / 2, y: top + Math.floor(i / cols) * 64, r: 20,
    }));
    const eyeIds = Object.keys(EYES) as EyeId[];
    this.eyeDots = eyeIds.map((id, i) => ({ id, x: W / 2 + (i - 1.5) * 50, y: eyeY, r: 13 }));
    const bodyIds: BodyType[] = ['chubby', 'normal', 'slim'];
    this.bodyBtns = bodyIds.map((id, i) => ({ id, x: W / 2 - 75 + (i - 1) * 78 + 40, y: bodyY, w: 70, h: 30 }));
  }

  private async pickPhoto() {
    if (this.busy) return;
    const p = platform();
    const path = await p.chooseImage();
    if (!path) return;
    this.busy = true;
    try {
      const img = await p.loadImage(path);
      // 缩到 96px 再分析：够判断颜色，也快。只取中间 60% 区域，减少背景干扰
      const S = 96;
      const off = p.createOffscreen(S, S);
      const octx = off.getContext('2d') as CanvasRenderingContext2D;
      const sw = img.width * 0.6, sh = img.height * 0.6;
      octx.drawImage(img, img.width * 0.2, img.height * 0.2, sw, sh, 0, 0, S, S);
      const guesses = analyzeCoat(octx.getImageData(0, 0, S, S).data);
      this.coat = this.suggested = guesses[0].coat;
      this.photo = img;
      p.toast(`看起来像${coatById(this.coat).label}，不对可以手动改`);
    } catch (e) {
      p.toast('照片读取失败，请手动选花色');
    } finally {
      this.busy = false;
    }
  }

  update() {}

  render(ctx: CanvasRenderingContext2D, t: number) {
    const { width: W, height: H, safeTop } = this.game;
    const stage = this.game.stage;
    if (!stage) { ctx.fillStyle = THEME.bg; ctx.fillRect(0, 0, W, H); }
    text(ctx, '领养你的小猫', W / 2, safeTop + 30, 22, THEME.ink, 'center', true);
    text(ctx, '上传自家猫咪照片，自动识别花色', W / 2, safeTop + 58, 13, THEME.sub);

    // 照片缩略图
    if (this.photo) {
      const s = 64, x = W - s - 20, y = safeTop + 80;
      ctx.save(); roundRect(ctx, x, y, s, s, 12); ctx.clip();
      const img = this.photo as any;
      const m = Math.min(img.width, img.height);
      ctx.drawImage(this.photo, (img.width - m) / 2, (img.height - m) / 2, m, m, x, y, s, s);
      ctx.restore();
    }

    const catSize = this.catSize();
    if (stage) {
      stage.setCat({ coat: this.coat, eye: this.eye, body: this.body });
      stage.setExpression('normal');
    } else {
      drawCat(ctx, W / 2, this.catY, catSize, { coat: this.coat, eye: this.eye, body: this.body }, 'happy', t);
    }
    text(ctx, this.name, W / 2, this.nameY, 20, THEME.ink, 'center', true);

    for (const s of this.swatches) {
      const c = coatById(s.id);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = c.base; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = c.id === 'tuxedo' ? c.belly : c.accent;
      ctx.fillRect(s.x, s.y - s.r, s.r, s.r * 2);
      ctx.restore();
      ctx.lineWidth = s.id === this.coat ? 3.5 : 1.5;
      ctx.strokeStyle = s.id === this.coat ? THEME.primary : '#CDBFB2';
      ctx.stroke();
      text(ctx, c.label + (s.id === this.suggested ? '✓' : ''), s.x, s.y + s.r + 12, 12, s.id === this.coat ? THEME.ink : THEME.sub);
    }
    text(ctx, '眼睛', 24, this.eyeDots[0].y, 13, THEME.sub, 'left');
    for (const d of this.eyeDots) {
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = EYES[d.id].color; ctx.fill();
      ctx.lineWidth = d.id === this.eye ? 3.5 : 1.5;
      ctx.strokeStyle = d.id === this.eye ? THEME.primary : '#CDBFB2'; ctx.stroke();
    }

    text(ctx, '体型', 24, this.bodyBtns[0].y + 15, 13, THEME.sub, 'left');
    for (const b of this.bodyBtns) {
      roundRect(ctx, b.x, b.y, b.w, b.h, 15);
      ctx.fillStyle = b.id === this.body ? THEME.primary : '#F1E6DA'; ctx.fill();
      text(ctx, BODY_LABEL[b.id], b.x + b.w / 2, b.y + b.h / 2, 13, b.id === this.body ? '#fff' : THEME.ink);
    }

    for (const b of this.buttons) b.draw(ctx);
    if (this.busy) text(ctx, '识别中…', W / 2, H - 170, 13, THEME.sub);
  }

  onDrag(dx: number) { this.game.stage?.drag(dx); }

  onTap(x: number, y: number) {
    for (const s of this.swatches) if ((x - s.x) ** 2 + (y - s.y) ** 2 <= (s.r + 6) ** 2) { this.coat = s.id; return; }
    for (const d of this.eyeDots) if ((x - d.x) ** 2 + (y - d.y) ** 2 <= (d.r + 6) ** 2) { this.eye = d.id; return; }
    for (const b of this.bodyBtns) if (x >= b.x && x <= b.x + b.w && y >= b.y - 4 && y <= b.y + b.h + 4) { this.body = b.id; return; }
    for (const b of this.buttons) if (b.hit(x, y)) { b.onTap(); return; }
  }
}
