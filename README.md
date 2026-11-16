# 小猫养成（暂名）

原创小猫养成小游戏，一套代码同时构建 **微信小游戏**、**小红书小游戏** 和 **网页预览** 三个版本。

## 玩法（首发版）
1. 领养：选一张自家猫咪的照片，在手机本地识别花色（照片不上传服务器），玩家可确认或改选 8 种花色和 4 种眼睛颜色。
2. 养成：饱腹、清洁、心情、体力四项状态按真实时间变化（离线最多结算 24 小时）。
3. 互动：喂食（花金币）、洗澡、陪玩、摸摸；上学（加学识）和打工（赚金币，学识越高赚得越多），各 30 分钟。
4. 变现：出门期间可以看激励视频立即回家。

## 目录
```
src/
  platform/   平台适配层：types.ts 定义接口；miniGame.ts 同时服务 wx 和 xhs；web.ts 是浏览器预览
  core/       主循环 game.ts、按钮/进度条等 UI 组件 ui.ts
  game/       coat.ts 花色与照片识别；pet.ts 养成数值；catRenderer.ts 分层画猫；save.ts 存档
  scenes/     createScene.ts 领养流程；homeScene.ts 主界面
  config.ts   广告位 ID、存档 key
scripts/build.mjs  构建脚本
```

## 开发
```bash
npm install
npm run build          # 生成 dist/wechat、dist/xhs、dist/web
npm run build:web      # 只生成网页预览，用浏览器打开 dist/web/index.html
npm run typecheck
```

- **微信**：用「微信开发者工具」导入 `dist/wechat`，没有 AppID 时可用测试号/游客模式；拿到 AppID 后改 `scripts/build.mjs` 里的 `touristappid`。
- **小红书**：用小红书小游戏开发者工具导入 `dist/xhs`，在 `project.config.json` 填上你的 AppID。目前按“小红书兼容微信 API”的说法实现，第一次真机跑通后，如有接口差异在 `src/platform/miniGame.ts` 里按平台分支处理。
- **广告**：开通流量主/广告后，把广告位 ID 填到 `src/config.ts`。留空时看视频按钮直接视为看完，方便开发。

## 上线前要做
- 微信后台填写《用户隐私保护指引》，声明“选中的照片”用途（仅在本地识别花色）。
- 软著、小游戏备案、自审自查报告、防沉迷（见方案文档）。

## 美术接入
现在的小猫是代码画的占位图，已经按“尾巴 → 身体 → 花纹 → 头 → 耳朵 → 脸”分层。美术风格定下后，按出图规范把各层 PNG 放进 `assets/`，替换 `src/game/catRenderer.ts` 中对应的绘制即可，其他代码不用动。
