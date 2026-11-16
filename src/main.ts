import { Game } from './core/game';
import { CreateScene } from './scenes/createScene';
import { HomeScene } from './scenes/homeScene';
import { loadPet, savePet } from './game/save';
import { showFatal, installGlobalErrorHandler } from './core/fatal';
import { platform } from './platform';

declare const __PLATFORM__: string;

console.log('[catpet] game.js 开始执行，平台:', __PLATFORM__);
installGlobalErrorHandler();

let game!: Game;
try {
  game = new Game();
  console.log('[catpet] 画布就绪', platform().systemInfo());
} catch (e) {
  showFatal(e, '初始化');
  throw e;
}

function adopt() {
  game.setScene(new CreateScene(game, (pet) => {
    savePet(pet);
    game.setScene(new HomeScene(game, pet));
  }));
}

try {
  const saved = loadPet();
  if (saved) game.setScene(new HomeScene(game, saved));
  else adopt();
  game.start();
  console.log('[catpet] 主循环已启动');
} catch (e) {
  showFatal(e, '进入场景');
}

// 网页预览：方便测试的调试入口
if (__PLATFORM__ === 'web') {
  const w = window as any;
  w.__catpet = {
    readopt: () => { try { localStorage.removeItem('catpet_save_v1'); } catch (_) { /* ignore */ } adopt(); },
    /** 快进 n 小时，用来看状态下降 */
    skipHours: (n: number) => {
      const p = loadPet(); if (!p) return;
      p.lastTick -= n * 3600_000; if (p.activity) p.activity.endsAt -= n * 3600_000;
      savePet(p); game.setScene(new HomeScene(game, p));
    },
  };
}
