import { platform } from '../platform';
import { Stage3D } from '../render3d/stage';
import { showFatal, setFatalSurface } from './fatal';

export interface Scene {
  update(dt: number, t: number): void;
  render(ctx: CanvasRenderingContext2D, t: number): void;
  onTap(x: number, y: number): void;
  onDrag?(dx: number, dy: number): void;
}

/**
 * 主循环。小游戏只有一块屏幕画布，所以：
 * - 能开 WebGL 时：屏幕画布给 three.js 画 3D；界面画在一块离屏 2D 画布上，再作为贴图盖在 3D 上面。
 * - 开不了 WebGL 时：退回纯 2D，屏幕画布直接画界面和 2D 小猫。
 */
export class Game {
  readonly ctx: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;
  readonly safeTop: number;
  readonly stage: Stage3D | null = null;
  private scene: Scene | null = null;
  private lastTouch: [number, number] | null = null;
  private firstFrame = false;
  private last = 0;
  private t = 0;

  constructor() {
    const p = platform();
    const screen = p.mainCanvas();
    const info = p.systemInfo();
    this.width = info.width;
    this.height = info.height;
    this.safeTop = info.safeTop;
    screen.width = info.width * info.pixelRatio;
    screen.height = info.height * info.pixelRatio;

    // 界面画布分辨率最多 2 倍，避免高分屏每帧上传太大的贴图
    const uiRatio = Math.min(info.pixelRatio, 2);
    let stage: Stage3D | null = null;
    let ui: HTMLCanvasElement | null = null;
    try {
      ui = p.createUICanvas(Math.round(info.width * uiRatio), Math.round(info.height * uiRatio));
      stage = new Stage3D(screen, info.width, info.height, info.pixelRatio, (w, h) => p.createUICanvas(w, h), ui);
      console.log('[catpet] 3D 已开启');
    } catch (e) {
      console.warn('[catpet] 3D 初始化失败，退回 2D', e);
      stage = null;
    }
    this.stage = stage;
    if (stage && ui) {
      this.ctx = ui.getContext('2d') as CanvasRenderingContext2D;
      this.ctx.scale(uiRatio, uiRatio);
      setFatalSurface(this.ctx, () => stage!.presentUIOnly());
    } else {
      this.ctx = screen.getContext('2d') as CanvasRenderingContext2D;
      this.ctx.scale(info.pixelRatio, info.pixelRatio);
      setFatalSurface(this.ctx, () => {});
    }

    p.onTouchStart((x, y) => { this.lastTouch = [x, y]; this.scene && this.scene.onTap(x, y); });
    p.onTouchMove((x, y) => {
      if (this.lastTouch && this.scene && this.scene.onDrag) this.scene.onDrag(x - this.lastTouch[0], y - this.lastTouch[1]);
      this.lastTouch = [x, y];
    });
  }

  setScene(s: Scene) { this.scene = s; }

  start() {
    const loop = (now: number) => {
      const dt = this.last ? Math.min((now - this.last) / 1000, 0.1) : 0;
      this.last = now;
      this.t += dt;
      try {
        if (this.scene) {
          this.scene.update(dt, this.t);
          this.ctx.clearRect(0, 0, this.width, this.height);
          this.scene.render(this.ctx, this.t);
          if (this.stage) this.stage.render(this.t, dt); // 先画 3D，再把界面贴上去
        }
        if (!this.firstFrame) { this.firstFrame = true; console.log('[catpet] 第一帧已绘制'); }
      } catch (e) {
        showFatal(e, '第 ' + Math.round(this.t * 60) + ' 帧');
        return; // 停止主循环，保留错误画面
      }
      platform().raf(loop);
    };
    platform().raf(loop);
  }
}
