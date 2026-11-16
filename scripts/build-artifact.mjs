// 生成可以直接在浏览器 / Claude 窗口里试玩的单文件网页：artifact/catpet-play.html
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';

const r = await build({
  entryPoints: ['src/main.ts'], bundle: true, write: false, minify: true,
  format: 'iife', target: 'es2017', define: { __PLATFORM__: '"web"' },
});
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = `<title>小猫养成试玩</title>
<style>
  :root { --bg: #2B2320; --bar: #3A302B; --chip: #4A3E37; --chip-ink: #FFE9D6; --sub: #BFAA9A; color-scheme: dark; }
  html, body { height: 100%; }
  body { background: var(--bg); color: var(--chip-ink); overflow: hidden; font-family: "PingFang SC", "Microsoft YaHei", system-ui, sans-serif; }
  #toolbar { height: 44px; display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--bar); flex-wrap: nowrap; padding-inline: 12px; }
  #toolbar button { border: 0; border-radius: 16px; background: var(--chip); color: var(--chip-ink); font: inherit; font-size: 13px; padding: 6px 12px; cursor: pointer; white-space: nowrap; }
  #toolbar button:focus-visible { outline: 2px solid #FF8A5B; outline-offset: 2px; }
  #toolbar span { color: var(--sub); font-size: 12px; white-space: nowrap; }
</style>
<div id="app"></div>
<div id="toolbar">
  <span>测试工具</span>
  <button id="readopt" type="button">重新领养</button>
  <button id="skip" type="button">快进 2 小时</button>
</div>
<script>${js}</script>
<script>
  document.getElementById('readopt').onclick = function () { window.__catpet && window.__catpet.readopt(); };
  document.getElementById('skip').onclick = function () { window.__catpet && window.__catpet.skipHours(2); };
</script>
`;
mkdirSync('artifact', { recursive: true });
writeFileSync('artifact/catpet-play.html', html);
console.log('artifact/catpet-play.html', (html.length / 1024).toFixed(0) + 'KB');
