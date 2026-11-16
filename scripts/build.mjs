// 用法：node scripts/build.mjs [wechat|xhs|web]，不带参数则三个都构建
import { build } from 'esbuild';
import { mkdirSync, writeFileSync, cpSync, existsSync } from 'node:fs';


const targets = process.argv[2] ? [process.argv[2]] : ['wechat', 'xhs', 'web'];

const gameJson = { deviceOrientation: 'portrait', showStatusBar: false, networkTimeout: { request: 10000 } };

// 小游戏开发者工具识别的项目配置。appid 换成你在后台拿到的；touristappid 是微信的游客模式
const projectConfig = (appid) => ({
  compileType: 'game',
  appid,
  projectname: 'cat-pet',
  // 代码已经由 esbuild 转成 ES2017 并压缩，开发者工具不用再转一遍
  setting: { es6: false, enhance: false, minified: false, postcss: false, urlCheck: false },
});

for (const t of targets) {
  const out = `dist/${t}`;
  mkdirSync(out, { recursive: true });
  await build({
    entryPoints: ['src/main.ts'],
    bundle: true,
    outfile: `${out}/game.js`,
    format: 'iife',
    target: 'es2017',
    minify: t !== 'web',
    sourcemap: t === 'web',
    define: { __PLATFORM__: JSON.stringify(t) },
    logLevel: 'warning',
  });
  if (t === 'web') {
    writeFileSync(`${out}/index.html`, `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>小猫养成 预览</title>
<style>html,body{margin:0;height:100%;background:#2b2320;display:flex;justify-content:center}canvas{display:block;touch-action:none}</style>
</head><body><script src="game.js"></script></body></html>`);
  } else {
    writeFileSync(`${out}/game.json`, JSON.stringify(gameJson, null, 2));
    writeFileSync(`${out}/project.config.json`, JSON.stringify(projectConfig(t === 'wechat' ? 'touristappid' : 'YOUR_XHS_APPID'), null, 2));
  }
  if (existsSync('assets')) cpSync('assets', `${out}/assets`, { recursive: true });
  console.log(`✓ ${t} → ${out}`);
}
