import * as THREE from 'three';
import { buildCat, type CatRig } from './catModel';
import { buildRoom, setupLights } from './room';
import type { CoatId, EyeId } from '../game/coat';
import type { BodyType } from '../game/pet';
import { getMaterialTier, litMaterial, setMaterialTier, setWebGL1, type MaterialTier } from './materials';

export interface Look3D { coat: CoatId; eye: EyeId; body: BodyType }
export type StageMode = 'studio' | 'room';

/**
 * 3D 舞台：放在 2D 界面下面一层，负责画房间和小猫。
 * 2D 层（按钮、状态条）照常画在上面，背景透明的地方就能看到 3D。
 */
export class Stage3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private room: THREE.Group;
  private studioFloor: THREE.Mesh;
  private rig: CatRig | null = null;
  private lookKey = '';
  private yaw = 0; // 玩家拖动产生的额外转角
  private idle = 0;
  private mode: StageMode = 'studio';
  private catScreenY = 0.4;
  private catPx = 0; // 展台模式下小猫希望占的像素高度，0 表示用默认缩放
  private expr: 'normal' | 'happy' | 'sleepy' = 'normal';
  mood = 0.7;

  private overlayScene = new THREE.Scene();
  private overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private uiTex: THREE.CanvasTexture;
  private shaderFailed = false;
  private lastLook: Look3D | null = null;

  constructor(canvas: HTMLCanvasElement, private w: number, private h: number, pixelRatio: number, private makeCanvas: (w: number, h: number) => HTMLCanvasElement, ui: HTMLCanvasElement) {
    // 小游戏的画布没有 addEventListener，three.js 初始化时要用（监听 WebGL 上下文丢失），补一个空实现
    const c = canvas as any;
    if (typeof c.addEventListener !== 'function') { c.addEventListener = () => {}; c.removeEventListener = () => {}; }
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.autoClear = false;
    const gl1 = !this.renderer.capabilities.isWebGL2;
    setWebGL1(gl1);
    setMaterialTier(gl1 ? 'lambert' : 'standard');
    console.log('[catpet] WebGL' + (gl1 ? '1' : '2') + '，材质档位 ' + getMaterialTier());
    // 着色器编译失败时（老设备、模拟器）自动降一档材质重建场景
    this.renderer.debug.onShaderError = (gl: WebGLRenderingContext, program: WebGLProgram, vs: WebGLShader, fs: WebGLShader) => {
      console.error('[catpet] 着色器编译失败 (' + getMaterialTier() + '):', gl.getProgramInfoLog(program), gl.getShaderInfoLog(vs), gl.getShaderInfoLog(fs));
      this.shaderFailed = true;
    };
    // 界面层：一张铺满屏幕的贴图，每帧更新。用最简单的着色器原样输出像素，不做颜色空间转换
    this.uiTex = new THREE.CanvasTexture(ui as any);
    this.uiTex.colorSpace = THREE.NoColorSpace;
    this.uiTex.generateMipmaps = false; // 非 2 的幂尺寸，WebGL1 下不能用 mipmap
    this.uiTex.minFilter = THREE.LinearFilter;
    this.uiTex.magFilter = THREE.LinearFilter;
    this.uiTex.premultiplyAlpha = true; // 避免文字、按钮边缘出现黑边
    const overlay = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: { map: { value: this.uiTex } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main() { gl_FragColor = texture2D(map, vUv); }',
      transparent: true, premultipliedAlpha: true, depthTest: false, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    }));
    this.overlayScene.add(overlay);
    this.renderer.setPixelRatio(Math.min(pixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.background = new THREE.Color('#FFF6EC');
    setupLights(this.scene);
    this.room = buildRoom();
    this.scene.add(this.room);
    this.studioFloor = this.makeFloor();
    this.scene.add(this.studioFloor);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    this.setMode('studio', 0.36);
  }

  private makeFloor() {
    const f = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), litMaterial({ color: '#F6E3CF', roughness: 0.9 }));
    f.rotation.x = -Math.PI / 2;
    f.position.y = 0.005;
    f.receiveShadow = true;
    return f;
  }

  /** 降一档材质（或关阴影）后重建房间、展台和小猫 */
  private downgrade() {
    const order: MaterialTier[] = ['standard', 'lambert', 'basic'];
    const cur = getMaterialTier();
    if (this.renderer.shadowMap.enabled) {
      this.renderer.shadowMap.enabled = false; // 第一步先关阴影
    } else {
      const next = order[order.indexOf(cur) + 1];
      if (!next) return;
      setMaterialTier(next);
    }
    console.warn('[catpet] 降级渲染：阴影=' + this.renderer.shadowMap.enabled + '，材质=' + getMaterialTier());
    const dispose = (o: THREE.Object3D) => o.traverse((m: any) => { m.geometry?.dispose?.(); m.material?.dispose?.(); });
    this.scene.remove(this.room); dispose(this.room);
    this.scene.remove(this.studioFloor); dispose(this.studioFloor);
    this.room = buildRoom(); this.scene.add(this.room);
    this.studioFloor = this.makeFloor(); this.scene.add(this.studioFloor);
    this.room.visible = this.mode === 'room';
    this.studioFloor.visible = this.mode === 'studio';
    if (this.lastLook) { this.lookKey = ''; this.setCat(this.lastLook); }
  }

  /** studio：领养界面的纯色展台；room：主界面的小房间。catScreenY 是小猫中心在屏幕上的高度比例 */
  setMode(mode: StageMode, catScreenY: number, catPx = 0) {
    this.mode = mode;
    this.catScreenY = catScreenY;
    this.catPx = catPx;
    this.room.visible = mode === 'room';
    this.studioFloor.visible = mode === 'studio';
    this.scene.background = new THREE.Color(mode === 'room' ? '#F7E6D3' : '#FFF6EC');
    this.updateCamera();
  }

  private updateCamera() {
    const a = this.w / this.h;
    // 画面宽度固定能装下房间/小猫，高度按屏幕比例算
    let halfW = this.mode === 'room' ? 3.2 : 1.9;
    // 展台模式按可用高度缩放：小猫约 2.4 个单位高，要正好占 catPx 像素
    if (this.mode === 'studio' && this.catPx > 0) halfW = Math.max(halfW, (this.h / 2) * (2.4 / this.catPx) * a);
    const halfH = halfW / a;
    const target = this.mode === 'room' ? new THREE.Vector3(0.3, 0.9, 0.6) : new THREE.Vector3(0, 0.95, 0);
    if (this.mode === 'room') this.camera.position.set(target.x + 8, target.y + 7, target.z + 8);
    else this.camera.position.set(0, target.y + 3.2, 10);
    this.camera.lookAt(target);
    // 让 target 落在屏幕 catScreenY 处
    const top = this.catScreenY * 2 * halfH;
    this.camera.left = -halfW; this.camera.right = halfW;
    this.camera.top = top; this.camera.bottom = top - 2 * halfH;
    this.camera.updateProjectionMatrix();
  }

  setCat(look: Look3D) {
    this.lastLook = look;
    const key = `${look.coat}|${look.eye}|${look.body}`;
    if (key === this.lookKey) return;
    this.lookKey = key;
    if (this.rig) {
      this.scene.remove(this.rig.root);
      this.rig.root.traverse((o: any) => { o.geometry?.dispose?.(); o.material?.map?.dispose?.(); o.material?.dispose?.(); });
    }
    this.rig = buildCat(look.coat, look.eye, this.makeCanvas, look.body);
    this.rig.setExpression(this.expr);
    this.scene.add(this.rig.root);
  }

  setCatVisible(v: boolean) { if (this.rig) this.rig.root.visible = v; }
  setExpression(e: 'normal' | 'happy' | 'sleepy') { this.expr = e; this.rig?.setExpression(e); }

  /** 手指横向拖动转小猫 */
  drag(dx: number) { this.yaw += dx * 0.012; this.idle = 0; }

  /** 小猫在屏幕上的大致位置和大小（像素），用于点击判定 */
  catRect() {
    const unit = this.w / (this.camera.right - this.camera.left);
    const size = 2.2 * unit;
    return { x: this.w / 2 + (this.mode === 'room' ? 0 : 0), y: this.catScreenY * this.h, size };
  }

  render(t: number, dt: number) {
    if (this.rig) {
      this.idle += dt;
      if (this.idle > 2) this.yaw *= Math.pow(0.1, dt); // 松手 2 秒后慢慢转回正面
      const face = this.mode === 'room' ? Math.PI / 4 : 0;
      this.rig.root.rotation.y = face + this.yaw;
      this.rig.root.position.set(this.mode === 'room' ? 0.3 : 0, 0, this.mode === 'room' ? 0.6 : 0);
      this.rig.animate(t, this.mood);
    }
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.drawUI();
    if (this.shaderFailed) { this.shaderFailed = false; this.downgrade(); }
  }

  private drawUI() {
    this.uiTex.needsUpdate = true;
    this.renderer.clearDepth();
    this.renderer.render(this.overlayScene, this.overlayCamera);
  }

  /** 出错时只把界面层画到屏幕上 */
  presentUIOnly() {
    this.renderer.setClearColor('#3B1F1F');
    this.renderer.clear();
    this.drawUI();
  }
}
