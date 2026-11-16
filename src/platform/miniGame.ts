import type { Platform, SystemInfo } from './types';
import { AD_UNIT_ID } from '../config';

/**
 * 微信与小红书共用的实现。小红书小游戏底层适配了微信 API，
 * 所以同一份代码分别传入 wx / xhs 全局对象即可。
 * 如果实测某个接口在小红书上有差异，就在这里按 name 分支处理。
 */
export function createMiniGamePlatform(api: any, name: 'wechat' | 'xhs'): Platform {
  const canvas: HTMLCanvasElement = api.createCanvas();
  let info: SystemInfo | null = null;
  let ad: any = null;

  return {
    name,
    mainCanvas: () => canvas,
    createOffscreen(w, h) {
      if (api.createOffscreenCanvas) {
        try {
          return api.createOffscreenCanvas({ type: '2d', width: w, height: h });
        } catch (_) { /* 旧基础库走下面 */ }
      }
      const c = api.createCanvas();
      c.width = w; c.height = h;
      return c;
    },
    systemInfo() {
      if (!info) {
        const s = (api.getWindowInfo ? api.getWindowInfo() : api.getSystemInfoSync()) as any;
        info = {
          width: s.windowWidth,
          height: s.windowHeight,
          pixelRatio: s.pixelRatio || 2,
          safeTop: (s.safeArea && s.safeArea.top) || s.statusBarHeight || 20,
        };
      }
      return info;
    },
    onTouchStart(cb) {
      api.onTouchStart((e: any) => {
        const t = e.changedTouches && e.changedTouches[0];
        if (t) cb(t.clientX, t.clientY);
      });
    },
    onTouchMove(cb) {
      api.onTouchMove((e: any) => {
        const t = e.changedTouches && e.changedTouches[0];
        if (t) cb(t.clientX, t.clientY);
      });
    },
    // 小游戏里第一次 createCanvas 是屏幕画布，之后创建的都是离屏画布
    createUICanvas(w, h) {
      const c = api.createCanvas();
      c.width = w; c.height = h;
      return c;
    },
    raf: (cb) => (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(cb) : setTimeout(() => cb(Date.now()), 16)),
    chooseImage() {
      return new Promise((resolve) => {
        const ok = (res: any) => {
          const f = (res.tempFiles && res.tempFiles[0]) || null;
          resolve(f ? f.tempFilePath || f.path : (res.tempFilePaths && res.tempFilePaths[0]) || null);
        };
        const opts = { count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'], success: ok, fail: () => resolve(null) };
        if (api.chooseMedia) api.chooseMedia({ ...opts, mediaType: ['image'] });
        else api.chooseImage(opts);
      });
    },
    loadImage(src) {
      return new Promise((resolve, reject) => {
        const img = api.createImage();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    },
    getItem<T>(key: string) {
      try {
        const v = api.getStorageSync(key);
        return v === '' || v === undefined ? null : (JSON.parse(v) as T);
      } catch (_) { return null; }
    },
    setItem(key, value) {
      try { api.setStorageSync(key, JSON.stringify(value)); } catch (_) { /* 存储满等情况忽略 */ }
    },
    toast(msg) { api.showToast({ title: msg, icon: 'none' }); },
    vibrate() { api.vibrateShort && api.vibrateShort({ type: 'light' }); },
    showRewardedAd() {
      const unit = AD_UNIT_ID[name];
      if (!unit || !api.createRewardedVideoAd) return Promise.resolve(true);
      if (!ad) ad = api.createRewardedVideoAd({ adUnitId: unit });
      return new Promise((resolve) => {
        const onClose = (res: any) => { ad.offClose(onClose); resolve(!res || res.isEnded); };
        ad.onClose(onClose);
        ad.show().catch(() => ad.load().then(() => ad.show()).catch(() => { ad.offClose(onClose); resolve(false); }));
      });
    },
  };
}
