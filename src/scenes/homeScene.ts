import type { Game, Scene } from '../core/game';
import { Button, THEME, drawFloaters, roundRect, statBar, text, type Floater } from '../core/ui';
import { platform } from '../platform';
import { drawCat, type Expression } from '../game/catRenderer';
import * as P from '../game/pet';
import { savePet } from '../game/save';

/** 主界面：小猫 + 四项状态 + 互动按钮。出门时显示倒计时和“看视频立即回来”。 */
export class HomeScene implements Scene {
  private buttons: Button[] = [];
  private adButton: Button;
  private floaters: Floater[] = [];
  private tickTimer = 0;
  private petCooldown = 0;
  private catBox = { x: 0, y: 0, size: 0 };
  private dt = 0;

  constructor(private game: Game, private pet: P.PetState) {
    const msg = P.tick(pet);
    if (msg) platform().toast(msg);
    savePet(pet);

    const { width: W, height: H } = game;
    const gap = 10, bw = (W - 32 - gap * 4) / 5, by = H - 96;
    const mk = (i: number, label: string, sub: string, bg: string, fn: () => P.ActionResult) =>
      new Button(16 + i * (bw + gap), by, bw, 64, label, () => this.act(fn), { bg, sub, size: 15 });
    this.buttons = [
      mk(0, '喂食', `${P.COST.feed}金币`, THEME.hunger, () => P.feed(pet)),
      mk(1, '洗澡', '清洁', THEME.clean, () => P.bathe(pet)),
      mk(2, '陪玩', '心情', THEME.mood, () => P.play(pet)),
      mk(3, '上学', '30分钟', '#9B8CE0', () => P.startActivity(pet, 'school')),
      mk(4, '打工', '30分钟', THEME.energy, () => P.startActivity(pet, 'work')),
    ];
    this.adButton = new Button(W / 2 - 110, H * 0.62, 220, 50, '▶ 看视频立即回来', () => this.skipByAd(), { bg: '#FF6F61' });
    const size = Math.min(W * 0.55, H * 0.28);
    this.catBox = { x: W / 2, y: H * 0.47, size };
    if (game.stage) {
      game.stage.setMode('room', 0.5);
      game.stage.setCat({ coat: pet.coat, eye: pet.eye, body: pet.body });
      this.catBox = { x: W / 2, y: H * 0.47, size: size * 1.1 };
    }
  }

  private act(fn: () => P.ActionResult) {
    const r = fn();
    if (r.msg) this.float(r.msg, r.ok ? THEME.primary : '#B0675A');
    if (r.ok) { platform().vibrate(); savePet(this.pet); }
  }

  private async skipByAd() {
    const watched = await platform().showRewardedAd();
    if (!watched) { platform().toast('看完视频才能领取哦'); return; }
    const msg = P.completeActivity(this.pet);
    if (msg) this.float(msg, THEME.primary);
    savePet(this.pet);
  }

  private float(s: string, color: string) {
    const stacked = this.floaters.filter((f) => f.text !== '❤').length;
    this.floaters.push({ x: this.game.width / 2, y: this.catBox.y - this.catBox.size * 0.75 + stacked * 26, text: s, life: 1.8, color });
  }

  private expression(): Expression {
    const p = this.pet;
    if (p.energy < 20) return 'sleepy';
    if (p.hunger < 25 || p.clean < 25 || p.mood < 30) return 'sad';
    if (p.mood > 75) return 'happy';
    return 'normal';
  }

  update(dt: number) {
    this.dt = dt;
    this.petCooldown -= dt;
    this.tickTimer += dt;
    if (this.tickTimer >= 1) {
      this.tickTimer = 0;
      const msg = P.tick(this.pet);
      if (msg) { this.float(msg, THEME.primary); platform().toast(msg); }
      savePet(this.pet);
    }
    const away = !!this.pet.activity;
    for (const b of this.buttons) b.enabled = !away;
  }

  render(ctx: CanvasRenderingContext2D, t: number) {
    const { width: W, height: H, safeTop } = this.game;
    const p = this.pet;
    const stage = this.game.stage;
    if (stage) {
      stage.setCatVisible(!p.activity);
      const e = this.expression();
      stage.setExpression(e === 'sad' ? 'normal' : e);
      stage.mood = p.mood / 100;
    } else {
    // 房间：墙 + 地板 + 窗户（2D 后备）
    ctx.fillStyle = THEME.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = THEME.floor; ctx.fillRect(0, H * 0.58, W, H * 0.42);
    roundRect(ctx, W * 0.62, H * 0.24, W * 0.28, W * 0.22, 10);
    ctx.fillStyle = '#CFE8F5'; ctx.fill(); ctx.strokeStyle = '#E2C9AE'; ctx.lineWidth = 5; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(W / 2, this.catBox.y + this.catBox.size * 0.48, this.catBox.size * 0.5, this.catBox.size * 0.09, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(120,80,50,0.12)'; ctx.fill();
    }

    // 顶部信息卡
    const top = safeTop + 8;
    roundRect(ctx, 12, top, W - 24, 112, 16);
    ctx.fillStyle = THEME.card; ctx.fill();
    text(ctx, `${p.name}  Lv.${P.level(p)}`, 28, top + 22, 17, THEME.ink, 'left', true);
    text(ctx, `🪙 ${p.coins}   📖 ${p.smarts}`, W - 28, top + 22, 14, THEME.ink, 'right');
    const cw = (W - 24 - 48) / 2;
    statBar(ctx, 28, top + 46, cw, '饱腹', p.hunger, THEME.hunger);
    statBar(ctx, 28 + cw + 16, top + 46, cw, '清洁', p.clean, THEME.clean);
    statBar(ctx, 28, top + 76, cw, '心情', p.mood, THEME.mood);
    statBar(ctx, 28 + cw + 16, top + 76, cw, '体力', p.energy, THEME.energy);

    if (p.activity) {
      const left = Math.max(0, p.activity.endsAt - Date.now());
      const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
      const label = P.ACTIVITY[p.activity.kind].label;
      if (stage) { roundRect(ctx, W / 2 - 120, H * 0.36, 240, 150, 20); ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.fill(); }
      text(ctx, p.activity.kind === 'school' ? '🎒' : '💼', W / 2, H * 0.42, 56);
      text(ctx, `${p.name}正在${label}`, W / 2, H * 0.52, 18, THEME.ink, 'center', true);
      text(ctx, `${mm}:${String(ss).padStart(2, '0')} 后回家`, W / 2, H * 0.56, 14, THEME.sub);
      this.adButton.draw(ctx);
    } else {
      if (!stage) drawCat(ctx, this.catBox.x, this.catBox.y, this.catBox.size, { coat: p.coat, eye: p.eye, body: p.body }, this.expression(), t);
      text(ctx, stage ? '点它摸摸 · 左右拖动转一圈' : '摸摸它试试', W / 2, H - 116, 12, THEME.sub);
    }

    for (const b of this.buttons) b.draw(ctx);
    drawFloaters(ctx, this.floaters, this.dt);
  }

  onDrag(dx: number) { if (!this.pet.activity) this.game.stage?.drag(dx); }

  onTap(x: number, y: number) {
    if (this.pet.activity) { if (this.adButton.hit(x, y)) this.adButton.onTap(); return; }
    for (const b of this.buttons) if (b.hit(x, y)) { b.onTap(); return; }
    const c = this.catBox;
    if (Math.abs(x - c.x) < c.size * 0.45 && Math.abs(y - c.y) < c.size * 0.55 && this.petCooldown <= 0) {
      this.petCooldown = 0.6;
      P.pet(this.pet);
      this.floaters.push({ x, y: y - 10, text: '❤', life: 1, color: THEME.mood });
    }
  }
}
