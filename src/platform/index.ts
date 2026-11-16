import type { Platform } from './types';
import { createMiniGamePlatform } from './miniGame';
import { createWebPlatform } from './web';

declare const __PLATFORM__: 'wechat' | 'xhs' | 'web';
declare const wx: any;
declare const xhs: any;

let current: Platform | null = null;

export function platform(): Platform {
  if (!current) {
    if (__PLATFORM__ === 'wechat') current = createMiniGamePlatform(wx, 'wechat');
    else if (__PLATFORM__ === 'xhs') current = createMiniGamePlatform(xhs, 'xhs');
    else current = createWebPlatform();
  }
  return current;
}

export type { Platform } from './types';
