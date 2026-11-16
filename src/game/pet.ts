import type { CoatId, EyeId } from './coat';

export type BodyType = 'chubby' | 'normal' | 'slim';
export const BODY_LABEL: Record<BodyType, string> = { chubby: '胖嘟嘟', normal: '标准', slim: '苗条' };

export type ActivityKind = 'school' | 'work';

export interface PetState {
  version: 1;
  name: string;
  coat: CoatId;
  eye: EyeId;
  body: BodyType;
  hunger: number; // 0~100，越高越饱
  clean: number;
  mood: number;
  energy: number;
  smarts: number; // 学识，上学增长，影响打工收入
  coins: number;
  exp: number;
  activity: { kind: ActivityKind; endsAt: number } | null;
  lastTick: number;
  createdAt: number;
}

const HOUR = 3600_000;
/** 每小时变化量。离线也照样结算，但最多结算 24 小时，避免回来猫已经饿“没”了。 */
const DECAY = { hunger: -8, clean: -5, mood: -6 };
const ENERGY_REGEN = 12;

export const ACTIVITY = {
  school: { label: '上学', minutes: 30, energy: 20, hunger: 10 },
  work: { label: '打工', minutes: 30, energy: 25, hunger: 15 },
} as const;

export const COST = { feed: 5 };

const clamp = (v: number) => Math.max(0, Math.min(100, v));

export function newPet(name: string, coat: CoatId, eye: EyeId, body: BodyType = 'normal', now = Date.now()): PetState {
  return {
    version: 1, name, coat, eye, body,
    hunger: 80, clean: 90, mood: 80, energy: 100,
    smarts: 0, coins: 50, exp: 0,
    activity: null, lastTick: now, createdAt: now,
  };
}

export function level(p: PetState): number {
  return 1 + Math.floor(Math.sqrt(p.exp / 20));
}

/** 按真实时间推进状态。返回本次结算中完成的活动（用于弹提示）。 */
export function tick(p: PetState, now = Date.now()): string | null {
  let finished: string | null = null;
  if (p.activity && now >= p.activity.endsAt) finished = completeActivity(p);
  const hours = Math.min(Math.max(now - p.lastTick, 0), 24 * HOUR) / HOUR;
  p.hunger = clamp(p.hunger + DECAY.hunger * hours);
  p.clean = clamp(p.clean + DECAY.clean * hours);
  // 又饿又脏时心情掉得更快
  const sad = (p.hunger < 30 ? 1.5 : 1) * (p.clean < 30 ? 1.3 : 1);
  p.mood = clamp(p.mood + DECAY.mood * sad * hours);
  if (!p.activity) p.energy = clamp(p.energy + ENERGY_REGEN * hours);
  p.lastTick = now;
  return finished;
}

export function completeActivity(p: PetState): string | null {
  if (!p.activity) return null;
  const kind = p.activity.kind;
  p.activity = null;
  if (kind === 'school') {
    p.smarts += 5;
    p.exp += 10;
    return `${p.name}放学啦，学识 +5`;
  }
  const pay = 12 + Math.floor(p.smarts / 5) * 2;
  p.coins += pay;
  p.exp += 8;
  return `${p.name}下班啦，赚了 ${pay} 金币`;
}

export type ActionResult = { ok: true; msg: string } | { ok: false; msg: string };

export function feed(p: PetState): ActionResult {
  if (p.activity) return { ok: false, msg: `${p.name}不在家` };
  if (p.hunger >= 95) return { ok: false, msg: '已经吃饱啦' };
  if (p.coins < COST.feed) return { ok: false, msg: '金币不够，去打工吧' };
  p.coins -= COST.feed;
  p.hunger = clamp(p.hunger + 30);
  p.mood = clamp(p.mood + 5);
  p.exp += 2;
  return { ok: true, msg: `喵～好吃！(-${COST.feed} 金币)` };
}

export function bathe(p: PetState): ActionResult {
  if (p.activity) return { ok: false, msg: `${p.name}不在家` };
  if (p.clean >= 95) return { ok: false, msg: '已经很干净了' };
  p.clean = clamp(p.clean + 45);
  p.mood = clamp(p.mood - 5); // 猫不爱洗澡
  p.exp += 2;
  return { ok: true, msg: '洗得香喷喷，但有点不高兴' };
}

export function play(p: PetState): ActionResult {
  if (p.activity) return { ok: false, msg: `${p.name}不在家` };
  if (p.energy < 10) return { ok: false, msg: '太累了，让它睡会儿' };
  p.mood = clamp(p.mood + 20);
  p.energy = clamp(p.energy - 10);
  p.hunger = clamp(p.hunger - 5);
  p.exp += 3;
  return { ok: true, msg: '玩得好开心！' };
}

export function startActivity(p: PetState, kind: ActivityKind, now = Date.now()): ActionResult {
  const a = ACTIVITY[kind];
  if (p.activity) return { ok: false, msg: `${p.name}已经出门了` };
  if (p.energy < a.energy) return { ok: false, msg: '体力不够，先休息一下' };
  if (p.hunger < 20) return { ok: false, msg: '太饿了，先喂点吃的' };
  p.energy = clamp(p.energy - a.energy);
  p.hunger = clamp(p.hunger - a.hunger);
  p.activity = { kind, endsAt: now + a.minutes * 60_000 };
  return { ok: true, msg: `${p.name}出门${a.label}了，${a.minutes} 分钟后回来` };
}

/** 摸摸：免费的小互动，有冷却 */
export function pet(p: PetState): ActionResult {
  if (p.activity) return { ok: false, msg: '' };
  p.mood = clamp(p.mood + 2);
  return { ok: true, msg: '' };
}
