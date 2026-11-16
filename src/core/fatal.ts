import { platform } from '../platform';

declare const wx: any;
declare const xhs: any;
declare const __PLATFORM__: string;

let shown = false;
let surface: { ctx: CanvasRenderingContext2D; present: () => void } | null = null;

/** Game 初始化后告诉这里往哪画错误信息（开了 3D 时界面画在离屏画布上，需要 present 才会上屏） */
export function setFatalSurface(ctx: CanvasRenderingContext2D, present: () => void) { surface = { ctx, present }; }

/** 出错时把错误信息直接画在屏幕上（开发期用），方便在开发者工具或真机上定位问题。 */
export function showFatal(err: unknown, where: string) {
  const msg = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack || ''}` : String(err);
  console.error('[catpet] 出错 @' + where, err);
  if (shown) return;
  shown = true;
  try {
    const p = platform();
    const info = p.systemInfo();
    let ctx: CanvasRenderingContext2D;
    if (surface) {
      ctx = surface.ctx;
    } else {
      ctx = p.mainCanvas().getContext('2d') as CanvasRenderingContext2D;
      ctx.setTransform(info.pixelRatio, 0, 0, info.pixelRatio, 0, 0);
    }
    ctx.fillStyle = '#3B1F1F';
    ctx.fillRect(0, 0, info.width, info.height);
    ctx.fillStyle = '#FFD6D6';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('游戏出错了（截图发给 Claude）', 16, info.safeTop + 16);
    ctx.font = '12px monospace';
    const lines = ('位置: ' + where + '\n' + msg).split('\n');
    let y = info.safeTop + 48;
    for (const raw of lines) {
      // 按宽度折行
      let line = raw;
      while (line.length && y < info.height - 20) {
        let n = line.length;
        while (n > 1 && ctx.measureText(line.slice(0, n)).width > info.width - 32) n--;
        ctx.fillText(line.slice(0, n), 16, y);
        line = line.slice(n);
        y += 16;
      }
    }
    if (surface) surface.present();
  } catch (e) {
    console.error('[catpet] 连错误页都画不出来', e);
  }
}

/** 全局兜底：异步回调里的报错也能显示出来 */
export function installGlobalErrorHandler() {
  const api = __PLATFORM__ === 'wechat' ? (typeof wx !== 'undefined' ? wx : null) : __PLATFORM__ === 'xhs' ? (typeof xhs !== 'undefined' ? xhs : null) : null;
  if (api && api.onError) api.onError((e: any) => showFatal(e && (e.message || e), 'onError'));
  if (api && api.onUnhandledRejection) api.onUnhandledRejection((e: any) => showFatal(e && e.reason, 'promise'));
}
