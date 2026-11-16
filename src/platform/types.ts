/** 平台无关的能力接口。游戏代码只依赖这里，不直接调用 wx / xhs / DOM。 */
export interface SystemInfo {
  width: number; // 逻辑像素
  height: number;
  pixelRatio: number;
  safeTop: number; // 状态栏/刘海安全区
}

export type TouchHandler = (x: number, y: number) => void;

export interface ImageLike {
  width: number;
  height: number;
}

export interface Platform {
  readonly name: 'wechat' | 'xhs' | 'web';
  mainCanvas(): HTMLCanvasElement;
  createOffscreen(w: number, h: number): HTMLCanvasElement;
  systemInfo(): SystemInfo;
  onTouchStart(cb: TouchHandler): void;
  onTouchMove(cb: TouchHandler): void;
  /** 创建一块不上屏的 2D 画布，用来画界面，再作为贴图叠到 3D 画面上 */
  createUICanvas(w: number, h: number): HTMLCanvasElement;
  raf(cb: (t: number) => void): void;
  /** 让玩家选一张照片，返回可被 loadImage 加载的路径；取消返回 null */
  chooseImage(): Promise<string | null>;
  loadImage(src: string): Promise<ImageLike & CanvasImageSource>;
  getItem<T>(key: string): T | null;
  setItem(key: string, value: unknown): void;
  toast(msg: string): void;
  vibrate(): void;
  /** 激励视频：看完返回 true。没配置广告位时（开发期）直接返回 true */
  showRewardedAd(): Promise<boolean>;
}
