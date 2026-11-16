import { platform } from '../platform';
import { SAVE_KEY } from '../config';
import type { PetState } from './pet';

/**
 * 首发版存在本地。后续若做排行榜、防改时间作弊、换手机同步，
 * 再接云开发/自建服务器，把这里换成云端读写即可。
 */
export function loadPet(): PetState | null {
  const p = platform().getItem<PetState>(SAVE_KEY);
  if (!p || p.version !== 1) return null;
  if (!p.body) p.body = 'normal'; // 旧存档没有体型字段
  return p;
}

export function savePet(p: PetState): void {
  platform().setItem(SAVE_KEY, p);
}
