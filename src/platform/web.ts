import type { Platform } from './types';

/** 浏览器预览用，方便不开开发者工具也能调试玩法。 */
export function createWebPlatform(): Platform {
  const w = Math.min(window.innerWidth, 430);
  // 试玩页面底部有一条调试工具栏时，给它留出高度
  const h = window.innerHeight - (document.getElementById('toolbar') ? 44 : 0);
  let app = document.getElementById('app');
  if (!app) { app = document.createElement('div'); app.id = 'app'; document.body.appendChild(app); }
  Object.assign(app.style, { position: 'relative', width: w + 'px', height: h + 'px', margin: '0 auto', overflow: 'hidden', touchAction: 'none' });
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, { position: 'absolute', left: '0', top: '0', width: w + 'px', height: h + 'px' });
  app.appendChild(canvas);
  let down = false;
  const pos = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const; };

  return {
    name: 'web',
    mainCanvas: () => canvas,
    createOffscreen(cw, ch) {
      const c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      return c;
    },
    systemInfo: () => ({ width: w, height: h, pixelRatio: window.devicePixelRatio || 1, safeTop: 12 }),
    onTouchStart(cb) {
      canvas.addEventListener('pointerdown', (e) => { down = true; cb(...pos(e)); });
      window.addEventListener('pointerup', () => { down = false; });
    },
    onTouchMove(cb) {
      canvas.addEventListener('pointermove', (e) => { if (down) cb(...pos(e)); });
    },
    createUICanvas(cw, ch) {
      const c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      return c;
    },
    raf: (cb) => requestAnimationFrame(cb),
    chooseImage() {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = () => {
          const f = input.files && input.files[0];
          resolve(f ? URL.createObjectURL(f) : null);
        };
        input.click();
      });
    },
    loadImage(src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    },
    getItem<T>(key: string) {
      try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch (_) { return null; }
    },
    setItem(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* 无痕模式 */ } },
    toast(msg) { console.log('[toast]', msg); (window as any).__lastToast = msg; },
    vibrate() { navigator.vibrate && navigator.vibrate(10); },
    showRewardedAd: () => Promise.resolve(true),
  };
}
