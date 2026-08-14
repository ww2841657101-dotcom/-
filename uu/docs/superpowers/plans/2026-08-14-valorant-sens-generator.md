# 无畏契约专属灵敏度生成器 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建单文件离线 HTML 页面 `valorant-sens-generator.html`，通过 4 项内嵌鼠标测试迭代校准，输出当前版本无畏契约可直接输入的灵敏度（3 位小数，区间 [0.001, 10]）。

**Architecture:** 单文件 HTML，`<script id="app">` 内按模块组织（MathX 换算 / Profile 档案 / Countdown 计时 / Geo 判定 / TestEngine 运行时 / TESTS 四项测试 / SensEngine 校准引擎 / Calibrator / Report 图表 / 守卫块内 UI 绑定）。模块定义期零 DOM 访问，`document.getElementById('app')` 守卫保证 Node vm 测试桩下可安全加载。

**Tech Stack:** 原生 HTML/CSS/JS（零依赖、离线），Node v24 内置 `node:vm` 做单元测试基座，SVG 图表。

## Global Constraints

- 单文件交付：`C:\Users\LENOVO\Desktop\uu\valorant-sens-generator.html`，零外部依赖（无 CDN/框架），断网可用
- 目标浏览器：Chrome / Edge 最新版（Windows 11）
- 全中文界面，无畏契约红黑主题（红 `#ff4655`、准星绿 `#00ff87`、底 `#0f1923`）
- 灵敏度输出：3 位小数，钳制区间 [0.001, 10]（`MathX.clampSens`）
- 测试目标**鼠标移动碰触即触发，全程无需点击**；测试区 `cursor: none` 并绘制绿色十字准星
- 倒计时一律 `performance.now()` 时间戳驱动（`Countdown` 类），**禁用 setInterval 递减**；`visibilitychange`/`blur` 自动暂停
- 不使用 Pointer Lock；测试区屏蔽右键菜单与文本选择
- 档案默认：DPI 800、垫宽 45cm、转身 180°、混合流；权重固定 50/30/20（规格 §6）
- 引擎常量：每计数 0.07°、cm/360 公式 `914.4 / (0.07 × DPI × sens)`、校准默认回退 37.8 px/cm
- 脚本块禁止在解析期访问 DOM（除 `document.getElementById('app')` 守卫本身）
- 模块插入锚点：`/* ==== INSERT-NEXT-MODULE ==== */`（模块区）与 `/* ==== INSERT-NEXT-UI ==== */`（UI 守卫块内），每任务替换锚点并保留锚点
- 测试命令（Git Bash）：`node tests/run-tests.mjs`，预期输出 `N 通过, 0 失败`

---

### Task 1: HTML 骨架 + 主题样式 + 档案模块 + 测试基座

**Files:**
- Create: `valorant-sens-generator.html`
- Create: `tests/run-tests.mjs`

**Interfaces:**
- Produces: `Profile`（`defaults/load/save/validate`）、`Flow`（`{profile, pxPerCm, traj, sens, round, metrics}`）、`showStep(name)`、`clamp`、`$`；测试基座 `loadApp()` 返回 `window.__SENS`

- [ ] **Step 1: 创建测试基座** `tests/run-tests.mjs`

```js
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'valorant-sens-generator.html');

export function loadApp() {
  const html = readFileSync(htmlPath, 'utf8');
  const m = html.match(/<script id="app">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('未找到 <script id="app"> 块');
  const sandbox = {
    console, Math, JSON, Date,
    performance: { now: () => 0 },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    localStorage: {
      _d: {},
      getItem(k) { return k in this._d ? this._d[k] : null; },
      setItem(k, v) { this._d[k] = String(v); },
      removeItem(k) { delete this._d[k]; },
    },
    navigator: {},
    document: {
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
      createElement: () => ({ style: {}, appendChild() {}, remove() {} }),
    },
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(m[1], sandbox);
  return sandbox.__SENS;
}

let passed = 0, failures = 0;
export function test(name, fn) {
  try { fn(); passed++; console.log('  \u2713 ' + name); }
  catch (e) { failures++; console.error('  \u2717 ' + name + '\n    ' + (e && e.message)); }
}
export function assertEq(actual, expected, msg = '') {
  if (actual !== expected) throw new Error(`${msg} 期望 ${expected}，实际 ${actual}`);
}
export function assertClose(actual, expected, eps = 1e-6, msg = '') {
  if (Math.abs(actual - expected) > eps) throw new Error(`${msg} 期望 \u2248${expected}，实际 ${actual}`);
}
export function summary() {
  console.log(`\n${passed} \u901a\u8fc7, ${failures} \u5931\u8d25`);
  if (failures > 0) process.exit(1);
}

const S = loadApp();

// ==== Task 1 测试 ====
test('基座可加载脚本', () => { if (!S) throw new Error('__SENS 未导出'); });
test('档案默认值', () => {
  assertEq(S.Profile.defaults().dpi, 800);
  assertEq(S.Profile.defaults().padCm, 45);
  assertEq(S.Profile.defaults().padDeg, 180);
  assertEq(S.Profile.defaults().style, 'hybrid');
});
test('档案校验：合法通过', () => {
  assertEq(S.Profile.validate({ dpi: 800, padCm: 45, padDeg: 180 }).length, 0);
});
test('档案校验：非法被拦截', () => {
  assertEq(S.Profile.validate({ dpi: 50, padCm: 45, padDeg: 180 }).length, 1);
  assertEq(S.Profile.validate({ dpi: 800, padCm: 200, padDeg: 180 }).length, 1);
  assertEq(S.Profile.validate({ dpi: 800, padCm: 45, padDeg: 90 }).length, 1);
});
test('档案存取往返', () => {
  S.Profile.save({ dpi: 1600, padCm: 90, padDeg: 270, style: 'arm' });
  const p = S.Profile.load();
  assertEq(p.dpi, 1600);
  assertEq(p.padDeg, 270);
  assertEq(p.style, 'arm');
});

summary();
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node tests/run-tests.mjs`
Expected: FAIL —— `未找到 <script id="app"> 块`

- [ ] **Step 3: 创建 HTML 骨架** `valorant-sens-generator.html`（完整内容，后续任务只改 `<script id="app">` 内部）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>无畏契约专属灵敏度生成器</title>
<style>
:root { --bg:#0f1923; --panel:#1b2735; --line:#2f4050; --red:#ff4655; --green:#00ff87; --text:#e8f0f5; --muted:#8fa3b3; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: var(--bg); color: var(--text); font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif; min-height: 100vh; }
.top { padding: 18px 24px; border-bottom: 1px solid var(--line); }
h1 { font-size: 22px; color: #fff; }
h1::before { content: "\25C6 "; color: var(--red); }
.steps { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.step { background: transparent; color: var(--muted); border: 1px solid var(--line); padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 14px; }
.step.active { color: #fff; border-color: var(--red); background: rgba(255,70,85,.12); }
main { max-width: 1100px; margin: 0 auto; padding: 24px; }
.panel { display: none; }
.panel.active { display: block; }
h2 { margin-bottom: 14px; font-size: 18px; }
h3 { margin: 16px 0 8px; font-size: 16px; }
.form-row { margin: 10px 0; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
label { font-size: 15px; }
input, select { background: var(--panel); color: var(--text); border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font-size: 15px; width: 180px; }
.btn { background: var(--panel); color: var(--text); border: 1px solid var(--line); border-radius: 6px; padding: 10px 18px; cursor: pointer; font-size: 15px; }
.btn:hover { border-color: var(--muted); }
.btn.primary { background: var(--red); border-color: var(--red); color: #fff; }
.btn:disabled { opacity: .4; cursor: not-allowed; }
.errors { color: var(--red); min-height: 18px; font-size: 14px; }
.note { color: var(--muted); font-size: 13px; margin-top: 14px; line-height: 1.7; }
.muted { color: var(--muted); font-size: 13px; }
.warn-banner { background: rgba(255,180,60,.12); border: 1px solid #ffb43c; color: #ffd98a; border-radius: 8px; padding: 10px 14px; margin: 10px 0; font-size: 14px; }
#cal-zone { height: 180px; border: 2px dashed var(--line); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--muted); user-select: none; cursor: crosshair; margin: 10px 0; }
#cal-zone.done { border-color: var(--green); color: var(--green); }
.test-area { position: relative; width: 100%; aspect-ratio: 16/9; background: radial-gradient(ellipse at center, #16222e 0%, #0c141d 100%); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; user-select: none; }
.test-area.testing { cursor: none; }
#test-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
#intro-big { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 72px; font-weight: 700; color: #fff; text-shadow: 0 0 24px var(--red); pointer-events: none; }
#pause-overlay { position: absolute; inset: 0; background: rgba(0,0,0,.65); display: flex; align-items: center; justify-content: center; text-align: center; font-size: 20px; cursor: pointer; z-index: 5; }
#hud { display: flex; align-items: center; gap: 12px; margin-top: 10px; }
#hud-bar { flex: 1; height: 8px; background: var(--panel); border-radius: 4px; overflow: hidden; }
#hud-fill { height: 100%; width: 100%; background: var(--red); }
#hud-label, #hud-hits { color: var(--muted); font-size: 14px; }
.sens-big { display: flex; align-items: center; gap: 16px; margin: 10px 0 18px; }
#rep-sens { font-size: 64px; font-weight: 700; color: var(--green); letter-spacing: 2px; }
.rep-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 20px; }
.rep-card { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 14px; text-align: center; }
.rep-card b { display: block; font-size: 24px; color: var(--green); margin-bottom: 4px; }
.rep-card span { color: var(--muted); font-size: 13px; }
.charts { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin: 18px 0; }
.charts > div { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 14px; }
.charts h3 { margin: 0 0 10px; font-size: 15px; }
.steps-list { margin: 8px 0 0 20px; line-height: 2; font-size: 15px; }
#rep-history { margin: 8px 0 16px 20px; color: var(--muted); font-size: 14px; line-height: 1.9; }
.round-result { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 14px; margin: 12px 0; }
</style>
</head>
<body>
<header class="top">
  <h1>无畏契约专属灵敏度生成器</h1>
  <nav class="steps">
    <button class="step active" data-step="profile">1 习惯档案</button>
    <button class="step" data-step="calibrate">2 物理校准</button>
    <button class="step" data-step="test">3 测试中心</button>
    <button class="step" data-step="report">4 灵敏度报告</button>
  </nav>
</header>
<main id="app">
  <section id="step-profile" class="panel active">
    <h2>你的习惯档案</h2>
    <div class="form-row"><label>鼠标 DPI <input id="f-dpi" type="number" min="100" max="30000" value="800"></label></div>
    <div class="form-row"><label>鼠标垫宽度(cm) <input id="f-pad" type="number" min="10" max="150" value="45"></label></div>
    <div class="form-row"><label>一整垫转身角度 <select id="f-paddeg"><option value="180">180°（经典推荐）</option><option value="270">270°（偏慢）</option><option value="360">360°（偏快）</option></select></label></div>
    <div class="form-row"><label>瞄准风格 <select id="f-style"><option value="hybrid">混合流（手臂大转向+手腕微调）</option><option value="arm">手臂流</option><option value="wrist">手腕流</option></select></label></div>
    <p id="profile-errors" class="errors"></p>
    <div class="form-row"><button id="btn-profile-next" class="btn primary">保存并进入校准 →</button></div>
    <div class="note">提示：测试前请在 Windows 设置中关闭「提高指针精确度」（鼠标加速）。无畏契约游戏内使用原始输入，不受系统设置影响。</div>
  </section>

  <section id="step-calibrate" class="panel">
    <h2>物理校准：测出你的 px/cm</h2>
    <p>拿一把尺子放在鼠标垫旁。在下方区域内按下鼠标左键不放，<b>水平移动鼠标恰好 10cm</b> 后松开。系统将自动测出像素/厘米换算比。</p>
    <div id="cal-zone"><span>在此按住并水平拖动 10cm</span></div>
    <p id="cal-result"></p>
    <div class="form-row">
      <button id="btn-cal-skip" class="btn">跳过校准（用默认值）</button>
      <button id="btn-cal-next" class="btn primary" disabled>进入测试中心 →</button>
    </div>
  </section>

  <section id="step-test" class="panel">
    <div id="test-pre">
      <h2>测试中心</h2>
      <p id="round-info"></p>
      <button id="btn-start-round" class="btn primary">开始测试</button>
    </div>
    <div id="test-run" style="display:none">
      <div id="test-area" class="test-area">
        <canvas id="test-canvas"></canvas>
        <div id="intro-big"></div>
        <div id="pause-overlay" style="display:none"><div>已暂停<br><span class="muted">点击此处继续</span></div></div>
      </div>
      <div id="hud">
        <div id="hud-bar"><div id="hud-fill"></div></div>
        <span id="hud-label"></span>
        <span id="hud-hits"></span>
      </div>
      <div class="form-row"><button id="btn-abort" class="btn">中止本轮</button></div>
    </div>
  </section>

  <section id="step-report" class="panel">
    <h2>你的专属灵敏度</h2>
    <div class="sens-big"><span id="rep-sens">—</span><button id="rep-copy" class="btn">复制</button></div>
    <div class="rep-grid">
      <div class="rep-card"><b id="rep-edpi">—</b><span>eDPI</span></div>
      <div class="rep-card"><b id="rep-cm360">—</b><span>cm / 360°</span></div>
      <div class="rep-card"><b id="rep-pad-deg">—</b><span>一整垫转身</span></div>
      <div class="rep-card"><b>1.0</b><span>瞄准镜倍率建议</span></div>
    </div>
    <div class="charts">
      <div><h3>校准收敛曲线（灵敏度）</h3><svg id="rep-line-svg" viewBox="0 0 600 220"></svg></div>
      <div><h3>测试成绩雷达</h3><svg id="rep-radar-svg" viewBox="0 0 300 300"></svg></div>
    </div>
    <h3>游戏内设置步骤</h3>
    <ol class="steps-list">
      <li>打开无畏契约 → 右上角「设置」（齿轮）</li>
      <li>「鼠标」标签 → 找到「灵敏度：瞄准」</li>
      <li>点击数值输入框，直接输入生成的三位小数数值 <b id="rep-sens2">—</b></li>
      <li>关闭设置即自动生效；「灵敏度：瞄准镜倍率」建议保持 <b>1.0</b></li>
    </ol>
    <div class="note">参考：职业选手 eDPI 常见区间 150–450（主流 250–400），数值仅供参考，以手感为准。生成值已按当前版本游戏格式（0.001–10，三位小数）输出。</div>
    <h3>历史记录</h3>
    <ul id="rep-history"></ul>
    <button id="btn-restart" class="btn primary">重新开始</button>
  </section>
</main>
<script id="app">
'use strict';
/* ===== 通用工具 ===== */
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const $ = sel => document.querySelector(sel);

/* ===== 全局流程状态 ===== */
const Flow = { profile: null, pxPerCm: null, traj: [], sens: null, round: 1, metrics: {}, aborted: false };

/* ===== 页面导航（模块级：控制台可调用，仅调用时访问 DOM） ===== */
const showStep = name => {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('step-' + name).classList.add('active');
  document.querySelectorAll('.step').forEach(b => b.classList.toggle('active', b.dataset.step === name));
};

/* ===== Profile：习惯档案 ===== */
const Profile = {
  KEY: 'vse.profile',
  defaults() { return { dpi: 800, padCm: 45, padDeg: 180, style: 'hybrid' }; },
  load() {
    try {
      const raw = localStorage.getItem(Profile.KEY);
      return raw ? { ...Profile.defaults(), ...JSON.parse(raw) } : Profile.defaults();
    } catch (e) { return Profile.defaults(); }
  },
  save(p) { localStorage.setItem(Profile.KEY, JSON.stringify(p)); },
  validate(p) {
    const errs = [];
    if (!p.dpi || p.dpi < 100 || p.dpi > 30000) errs.push('DPI 需在 100–30000 之间');
    if (!p.padCm || p.padCm < 10 || p.padCm > 150) errs.push('鼠标垫宽度需在 10–150cm 之间');
    if (![180, 270, 360].includes(Number(p.padDeg))) errs.push('转身角度需为 180/270/360');
    return errs;
  },
};

/* ==== INSERT-NEXT-MODULE ==== */

/* ===== 测试钩子（Node 测试读取） ===== */
window.__SENS = { Profile, Flow, clamp, $ };

/* ===== 浏览器自动初始化（Node 桩的 getElementById 返回 null，自动跳过） ===== */
if (typeof document !== 'undefined' && document.getElementById('app')) {
  /* ==== INSERT-NEXT-UI ==== */
}
</script>
</body>
</html>
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node tests/run-tests.mjs`
Expected: PASS —— `5 通过, 0 失败`

- [ ] **Step 5: 添加档案表单 UI 绑定**：替换 `/* ==== INSERT-NEXT-UI ==== */` 为以下代码（保留锚点在末尾）

```js
  /* ==== 页面导航 ==== */
  document.querySelectorAll('.step').forEach(b => {
    b.addEventListener('click', () => showStep(b.dataset.step));
  });

  /* ==== 档案表单 ==== */
  $('#btn-profile-next').addEventListener('click', () => {
    const p = {
      dpi: Number($('#f-dpi').value),
      padCm: Number($('#f-pad').value),
      padDeg: Number($('#f-paddeg').value),
      style: $('#f-style').value,
    };
    const errs = Profile.validate(p);
    $('#profile-errors').textContent = errs.join('；');
    if (errs.length) return;
    Profile.save(p);
    Flow.profile = p;
    showStep('calibrate');
  });
  (function initProfileForm() {
    const p = Profile.load();
    $('#f-dpi').value = p.dpi;
    $('#f-pad').value = p.padCm;
    $('#f-paddeg').value = p.padDeg;
    $('#f-style').value = p.style;
  })();

  /* ==== INSERT-NEXT-UI ==== */
```

注意：`showStep` 已在模块级定义（Task 1 Step 3 骨架），控制台可直接调用，便于 Task 5–9 手动验证；此处仅绑定导航按钮。

- [ ] **Step 6: 浏览器手动验证**

双击打开 `valorant-sens-generator.html`：① 页面显示 4 步导航与红黑主题；② 档案表单默认 800 / 45 / 180 / 混合流；③ 清空 DPI 点「保存」→ 显示红色错误提示；④ 填入合法值点保存 → 跳到第 2 步且导航高亮；⑤ 刷新页面表单值保留（localStorage）。

- [ ] **Step 7: Commit**

```bash
git add valorant-sens-generator.html tests/run-tests.mjs
git commit -m "feat: 页面骨架、主题样式、档案模块与测试基座"
```

---

### Task 2: MathX 游戏↔网页换算模块

**Files:**
- Modify: `valorant-sens-generator.html`（替换模块锚点）
- Modify: `tests/run-tests.mjs`（在 `summary();` 前插入 Task 2 测试）

**Interfaces:**
- Produces: `MathX`：`DEG_PER_COUNT`(0.07)、`degPerCm(sens,dpi)`、`cmPer360(sens,dpi)`、`baselineSens(dpi,padCm,padDeg)`、`pxPerDeg(sens,dpi,pxPerCm)`、`degToPx(deg,sens,dpi,pxPerCm)`、`pxToDeg(px,sens,dpi,pxPerCm)`、`round3(x)`、`clampSens(x)`

- [ ] **Step 1: 写失败测试**（插入到 `summary();` 之前）

```js
// ==== Task 2 测试 ====
const M = S.MathX;
test('度/厘米换算', () => { assertClose(M.degPerCm(0.3, 800), 6.6142, 1e-3); });
test('cm/360 换算（职业常识校验）', () => { assertClose(M.cmPer360(0.3, 800), 54.4286, 1e-3); });
test('基准灵敏度：800 DPI / 45cm / 180°', () => { assertClose(M.baselineSens(800, 45, 180), 0.18143, 1e-4); });
test('像素换算与互逆', () => {
  assertClose(M.pxPerDeg(0.3, 800, 37.8), 5.715, 1e-3);
  assertClose(M.degToPx(12, 0.3, 800, 37.8), 68.58, 1e-2);
  assertClose(M.pxToDeg(M.degToPx(30, 0.3, 800, 37.8), 0.3, 800, 37.8), 30, 1e-6);
});
test('三位小数取整', () => {
  assertEq(M.round3(0.181428571), 0.181);
  assertEq(M.round3(1.2346), 1.235);
});
test('游戏区间钳制', () => {
  assertEq(M.clampSens(-5), 0.001);
  assertEq(M.clampSens(50), 10);
  assertEq(M.clampSens(0.314), 0.314);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node tests/run-tests.mjs`
Expected: FAIL —— `S.MathX 未定义`（`undefined` 报错）

- [ ] **Step 3: 实现**：替换 `/* ==== INSERT-NEXT-MODULE ==== */` 为：

```js
/* ===== MathX：游戏↔网页换算（纯函数） ===== */
const MathX = {
  DEG_PER_COUNT: 0.07,
  degPerCm(sens, dpi) { return MathX.DEG_PER_COUNT * sens * dpi / 2.54; },
  cmPer360(sens, dpi) { return 914.4 / (MathX.DEG_PER_COUNT * dpi * sens); },
  baselineSens(dpi, padCm, padDeg) { return padDeg * 2.54 / (MathX.DEG_PER_COUNT * dpi * padCm); },
  pxPerDeg(sens, dpi, pxPerCm) { return pxPerCm * 2.54 / (MathX.DEG_PER_COUNT * sens * dpi); },
  degToPx(deg, sens, dpi, pxPerCm) { return deg * MathX.pxPerDeg(sens, dpi, pxPerCm); },
  pxToDeg(px, sens, dpi, pxPerCm) { return px / MathX.pxPerDeg(sens, dpi, pxPerCm); },
  round3(x) { return Math.round(x * 1000) / 1000; },
  clampSens(x) { return clamp(x, 0.001, 10); },
};

/* ==== INSERT-NEXT-MODULE ==== */
```

并把 `window.__SENS = ...` 行替换为 `window.__SENS = { Profile, Flow, clamp, $, MathX };`

- [ ] **Step 4: 运行确认通过**

Run: `node tests/run-tests.mjs`
Expected: PASS —— `11 通过, 0 失败`

- [ ] **Step 5: Commit**

```bash
git add valorant-sens-generator.html tests/run-tests.mjs
git commit -m "feat: MathX 游戏↔网页换算模块"
```

---

### Task 3: Countdown 时间戳倒计时类

**Files:**
- Modify: `valorant-sens-generator.html`
- Modify: `tests/run-tests.mjs`

**Interfaces:**
- Produces: `Countdown` 类：构造 `(durationMs, now = () => performance.now())`；方法 `reset()`、`start()`、`tick()`、`pause()`、`resume()`、`remainingMs()`、`done()`、`progress()`；属性 `running`、`elapsed`

- [ ] **Step 1: 写失败测试**

```js
// ==== Task 3 测试 ====
test('倒计时正常推进', () => {
  let t = 0;
  const cd = new S.Countdown(10000, () => t);
  cd.start();
  t = 200; cd.tick();
  assertEq(cd.remainingMs(), 9800);
  t = 2000; cd.pause();
  assertEq(cd.remainingMs(), 8000);
  assertEq(cd.running, false);
  t = 2001; cd.tick();
  assertEq(cd.remainingMs(), 8000, '暂停时 tick 无效');
  t = 99999; cd.resume();
  t = 100500; cd.tick();
  assertEq(cd.remainingMs(), 7499, '恢复后只累加真实流逝时间');
  t = 100501; cd.tick();
  assertEq(cd.remainingMs(), 7498);
});
test('倒计时到点归零不冻结', () => {
  let t = 0;
  const cd = new S.Countdown(5000, () => t);
  cd.start(); t = 20000; cd.tick();
  assertEq(cd.done(), true);
  assertEq(cd.remainingMs(), 0);
  assertEq(cd.progress(), 1);
});
test('倒计时可重复使用', () => {
  let t = 0;
  const cd = new S.Countdown(1000, () => t);
  cd.start(); t = 1200; cd.tick();
  assertEq(cd.done(), true);
  cd.reset(); cd.start(); t = 1500; cd.tick();
  assertEq(cd.remainingMs(), 700);
});
```

- [ ] **Step 2: 运行确认失败**：`node tests/run-tests.mjs` → FAIL（`S.Countdown is not a constructor`）

- [ ] **Step 3: 实现**：替换模块锚点为：

```js
/* ===== Countdown：时间戳倒计时（绝不卡死） ===== */
class Countdown {
  constructor(durationMs, now = () => performance.now()) {
    this.duration = durationMs;
    this.now = now;
    this.reset();
  }
  reset() { this.elapsed = 0; this.running = false; this.lastTick = 0; }
  start() { if (!this.running) { this.running = true; this.lastTick = this.now(); } }
  tick() {
    if (!this.running) return;
    const t = this.now();
    this.elapsed += Math.max(0, t - this.lastTick);
    this.lastTick = t;
  }
  pause() { this.tick(); this.running = false; }
  resume() { if (!this.running) { this.running = true; this.lastTick = this.now(); } }
  remainingMs() { return Math.max(0, this.duration - this.elapsed); }
  done() { return this.remainingMs() <= 0; }
  progress() { return clamp(this.elapsed / this.duration, 0, 1); }
}

/* ==== INSERT-NEXT-MODULE ==== */
```

更新 `window.__SENS` 增加 `Countdown`。

- [ ] **Step 4: 运行确认通过**：`node tests/run-tests.mjs` → `14 通过, 0 失败`

- [ ] **Step 5: Commit**

```bash
git add valorant-sens-generator.html tests/run-tests.mjs
git commit -m "feat: Countdown 时间戳倒计时类"
```

---

### Task 4: Calibrator 物理校准（纯函数 + 拖拽 UI）

**Files:**
- Modify: `valorant-sens-generator.html`（模块锚点 + UI 锚点）
- Modify: `tests/run-tests.mjs`

**Interfaces:**
- Produces: `Calibrator`：`DEFAULT_PX_PER_CM`(37.8)、`calcPxPerCm(distPx, cm = 10)`
- UI：`#cal-zone` 按住拖动 10cm 松开 → `Flow.pxPerCm` 赋值、`#cal-result` 显示、`#btn-cal-next` 启用

- [ ] **Step 1: 写失败测试**

```js
// ==== Task 4 测试 ====
test('px/cm 计算', () => {
  assertClose(S.Calibrator.calcPxPerCm(378, 10), 37.8, 1e-9);
  assertEq(S.Calibrator.calcPxPerCm(0, 10), 0);
  assertEq(S.Calibrator.calcPxPerCm(500, 0), 0, 'cm 为 0 时返回 0');
});
test('默认回退值', () => { assertEq(S.Calibrator.DEFAULT_PX_PER_CM, 37.8); });
```

- [ ] **Step 2: 运行确认失败**：FAIL（`S.Calibrator` 未定义）

- [ ] **Step 3: 实现模块**：替换模块锚点为：

```js
/* ===== Calibrator：px/cm 物理校准 ===== */
const Calibrator = {
  DEFAULT_PX_PER_CM: 37.8,
  calcPxPerCm(distPx, cm = 10) { return cm > 0 ? distPx / cm : 0; },
};

/* ==== INSERT-NEXT-MODULE ==== */
```

更新 `window.__SENS` 增加 `Calibrator`。

- [ ] **Step 4: 实现校准 UI**：替换 UI 锚点为：

```js
  /* ==== 校准步骤 ==== */
  const calZone = $('#cal-zone');
  let calStart = null;
  calZone.addEventListener('pointerdown', e => {
    e.preventDefault();
    calZone.setPointerCapture(e.pointerId);
    calStart = { x: e.clientX, y: e.clientY };
    calZone.classList.remove('done');
    $('#cal-result').textContent = '移动中…松开鼠标完成测量';
  });
  calZone.addEventListener('pointerup', e => {
    if (!calStart) return;
    const dist = Math.hypot(e.clientX - calStart.x, e.clientY - calStart.y);
    const pxPerCm = Calibrator.calcPxPerCm(dist, 10);
    Flow.pxPerCm = pxPerCm;
    calZone.classList.add('done');
    $('#cal-result').textContent = '测量完成：移动了 ' + dist.toFixed(0) + 'px \u2248 ' + pxPerCm.toFixed(1) + ' px/cm';
    $('#btn-cal-next').disabled = false;
    calStart = null;
  });
  $('#btn-cal-skip').addEventListener('click', () => { Flow.pxPerCm = null; showStep('test'); });
  $('#btn-cal-next').addEventListener('click', () => showStep('test'));

  /* ==== INSERT-NEXT-UI ==== */
```

注意：两个按钮暂时都进入空白的测试面板；Task 11 会把这两个处理器替换为 `enterTest()`。

- [ ] **Step 5: 运行确认通过**：`node tests/run-tests.mjs` → `16 通过, 0 失败`

- [ ] **Step 6: 浏览器手动验证**

① 档案 → 校准页；② 在 `#cal-zone` 按住左键水平移动约 10cm 松开 → 边框变绿、显示 px/cm 数值、「进入测试中心」按钮启用；③ 刷新后重新校准仍正常；④ 跳过按钮可进第 3 步。

- [ ] **Step 7: Commit**

```bash
git add valorant-sens-generator.html tests/run-tests.mjs
git commit -m "feat: Calibrator 物理校准与拖拽 UI"
```

---

### Task 5: TestEngine 通用运行时 + Geo 判定 + 准星绘制

**Files:**
- Modify: `valorant-sens-generator.html`
- Modify: `tests/run-tests.mjs`

**Interfaces:**
- Produces: `TestEngine`（`start(key, ctx)` / `pause()` / `resume()` / `abort()`）、`Geo`（`dist` / `inCircle` / `classifyFlick(samples, tx, ty, thrPx, stopSpeed=0.05, stopTimeMs=250)`）、`drawCrosshair(ctx, x, y)`
- Consumes: `Countdown`、`TESTS`（Task 6–9 提供，本任务仅约定结构：`TESTS[key] = {name, durationMs, update(st, now), onCursor(st), metrics(st), hudText?(st)}`）
- ctx 形状：`{sens, dpi, pxPerCm, area, canvas, ctx, onComplete(metrics), onAbort()}`；引擎内部 `st.ctx` 即此对象

- [ ] **Step 1: 写失败测试**

```js
// ==== Task 5 测试 ====
test('圆形碰撞判定', () => {
  assertEq(S.Geo.inCircle(10, 10, 10, 10, 5), true);
  assertEq(S.Geo.inCircle(16, 10, 10, 10, 5), false);
});
test('甩枪过冲识别', () => {
  const samples = [
    { x: 0, y: 0, t: 0 }, { x: 50, y: 0, t: 100 }, { x: 112, y: 0, t: 200 },
  ];
  assertEq(S.Geo.classifyFlick(samples, 100, 0, 10).overshoot, true);
});
test('甩枪欠冲识别（末段停顿）', () => {
  const samples = [];
  let t = 0;
  for (let x = 0; x <= 80; x += 20) samples.push({ x, y: 0, t: t += 100 });
  for (let i = 0; i < 10; i++) samples.push({ x: 80, y: 0, t: t += 50 });
  const c = S.Geo.classifyFlick(samples, 100, 0, 10);
  assertEq(c.undershoot, true);
  assertEq(c.overshoot, false);
});
test('干净命中不误判', () => {
  const samples = [
    { x: 0, y: 0, t: 0 }, { x: 40, y: 0, t: 80 }, { x: 80, y: 0, t: 160 }, { x: 99, y: 0, t: 240 },
  ];
  const c = S.Geo.classifyFlick(samples, 100, 0, 10);
  assertEq(c.overshoot, false);
  assertEq(c.undershoot, false);
});
```

- [ ] **Step 2: 运行确认失败**：FAIL（`S.Geo` 未定义）

- [ ] **Step 3: 实现 Geo**：替换模块锚点为：

```js
/* ===== Geo：几何与甩枪判定（纯函数） ===== */
const Geo = {
  dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); },
  inCircle(px, py, cx, cy, r) { return Geo.dist(px, py, cx, cy) <= r; },
  /* 甩枪分类：samples 为 {x,y,t} 时间序列，轴取首个采样→靶心方向。
     过冲：任一采样沿轴越过靶心超过 thrPx；
     欠冲：存在持续 stopTimeMs 的低速窗口，期间始终停在靶心前 thrPx 以外。 */
  classifyFlick(samples, tx, ty, thrPx, stopSpeed = 0.05, stopTimeMs = 250) {
    if (!samples.length) return { overshoot: false, undershoot: false };
    const f = samples[0];
    const ax = tx - f.x, ay = ty - f.y;
    const len = Math.hypot(ax, ay) || 1;
    const ux = ax / len, uy = ay / len;
    const d = s => (s.x - tx) * ux + (s.y - ty) * uy;
    let overshoot = false;
    for (const s of samples) if (d(s) > thrPx) { overshoot = true; break; }
    let undershoot = false;
    for (let i = 0; i < samples.length && !undershoot; i++) {
      if (d(samples[i]) >= -thrPx) continue;
      let j = i + 1;
      while (j < samples.length && samples[j].t - samples[i].t <= stopTimeMs) j++;
      if (j - i < 2) continue;
      let slow = true, far = true;
      for (let k = i + 1; k < j; k++) {
        const dt = Math.max(1, samples[k].t - samples[k - 1].t);
        if (Geo.dist(samples[k].x, samples[k].y, samples[k - 1].x, samples[k - 1].y) / dt >= stopSpeed) slow = false;
        if (d(samples[k]) >= -thrPx) far = false;
      }
      if (slow && far) undershoot = true;
    }
    return { overshoot, undershoot };
  },
};

/* ===== 准星绘制（无畏契约同款绿十字） ===== */
function drawCrosshair(ctx, x, y) {
  const g = 3, L = 9, w = 2;
  ctx.lineCap = 'round';
  for (const [color, lw] of [['rgba(0,0,0,0.9)', w + 1.6], ['#00ff87', w]]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      ctx.moveTo(x + dx * g, y + dy * g);
      ctx.lineTo(x + dx * (g + L), y + dy * (g + L));
    }
    ctx.stroke();
  }
  ctx.fillStyle = '#00ff87';
  ctx.beginPath();
  ctx.arc(x, y, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

/* ==== INSERT-NEXT-MODULE ==== */
```

更新 `window.__SENS` 增加 `Geo`。

- [ ] **Step 4: 运行确认通过**：`node tests/run-tests.mjs` → `20 通过, 0 失败`

- [ ] **Step 5: 实现 TestEngine**：再次替换模块锚点为（接在 Geo 之后）：

```js
/* ===== TestEngine：通用测试运行时 ===== */
const TestEngine = {
  state: null,
  start(key, ctx) {
    const t = TESTS[key];
    const st = {
      key, t, ctx,
      countdown: new Countdown(t.durationMs),
      intro: new Countdown(3000),
      cursor: { x: ctx.area.clientWidth / 2, y: ctx.area.clientHeight / 2 },
      running: false, paused: false, _dead: false,
      target: null, samples: [],
      hits: 0, pops: [], devSamples: [], reactions: [], flashMisses: [], misses: 0, total: 0, fixes: [], lastSpawnT: 0, t0: null,
    };
    this.state = st;
    ctx.area.classList.add('testing');
    this.bindInput(st);
    this.loop(st);
  },
  bindInput(st) {
    const area = st.ctx.area;
    const onMove = e => {
      const r = area.getBoundingClientRect();
      st.cursor = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (!st.running || st.paused || st._dead) return;
      const logic = TESTS[st.key];
      if (logic.onCursor) logic.onCursor(st);
    };
    area.addEventListener('mousemove', onMove);
    st._cleanup = () => area.removeEventListener('mousemove', onMove);
  },
  loop(st) {
    const frame = () => {
      if (st._dead) return;
      this.update(st);
      this.draw(st);
      if (!st._dead) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  },
  update(st) {
    if (st._dead) return;
    if (!st.intro.done()) { st.intro.tick(); return; }
    if (!st.running) { st.running = true; st.countdown.start(); }
    if (st.paused) return;
    st.countdown.tick();
    const now = performance.now();
    const logic = TESTS[st.key];
    if (logic.update) logic.update(st, now);
    if (st.countdown.done()) this.finish(st);
  },
  finish(st) {
    st._dead = true;
    st.ctx.area.classList.remove('testing');
    if (st._cleanup) st._cleanup();
    const cb = st.ctx.onComplete;
    st.ctx.onComplete = null;
    if (cb) cb(TESTS[st.key].metrics(st));
  },
  abort() {
    const st = this.state;
    if (!st || st._dead) return;
    st._dead = true;
    st.ctx.area.classList.remove('testing');
    if (st._cleanup) st._cleanup();
    const cb = st.ctx.onAbort;
    st.ctx.onAbort = null;
    if (cb) cb();
  },
  pause() {
    const st = this.state;
    if (!st || st._dead || st.paused) return;
    st.paused = true;
    st.countdown.pause();
  },
  resume() {
    const st = this.state;
    if (!st || !st.paused) return;
    st.paused = false;
    st.countdown.resume();
  },
  draw(st) {
    const c = st.ctx.ctx;
    const w = st.ctx.area.clientWidth, h = st.ctx.area.clientHeight;
    c.clearRect(0, 0, w, h);
    const t = st.target;
    if (t && st.running && !st.paused) {
      c.beginPath();
      c.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      c.fillStyle = '#ff4655';
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = 'rgba(255,255,255,.6)';
      c.stroke();
    }
    drawCrosshair(c, st.cursor.x, st.cursor.y);
    const p = st.intro.done() ? st.countdown.progress() : 1;
    $('#hud-fill').style.width = (p * 100).toFixed(1) + '%';
    const sec = Math.max(0, Math.ceil(st.countdown.remainingMs() / 1000));
    $('#hud-label').textContent = st.t.name + ' · 剩余 ' + sec + 's';
    const logic = TESTS[st.key];
    $('#hud-hits').textContent = logic.hudText ? logic.hudText(st) : '';
    const intro = $('#intro-big');
    if (!st.intro.done()) {
      const n = Math.ceil(st.intro.remainingMs() / 1000);
      intro.textContent = n > 0 ? n : 'GO!';
    } else if (st.running && st.countdown.elapsed < 800) {
      intro.textContent = 'GO!';
    } else {
      intro.textContent = '';
    }
  },
};

/* ==== INSERT-NEXT-MODULE ==== */
```

更新 `window.__SENS` 增加 `TestEngine`。

- [ ] **Step 6: 运行确认通过**：`node tests/run-tests.mjs` → `20 通过, 0 失败`

- [ ] **Step 7: Commit**（浏览器端完整验证推迟到 Task 6 网格射击落地后一并进行）

```bash
git add valorant-sens-generator.html tests/run-tests.mjs
git commit -m "feat: TestEngine 运行时、Geo 甩枪判定与准星绘制"
```

---

### Task 6: 网格射击测试（碰触触发）

**Files:**
- Modify: `valorant-sens-generator.html`
- Modify: `tests/run-tests.mjs`

**Interfaces:**
- Produces: `TESTS.grid = {name, durationMs, targetRadiusDeg, refHits, angleOffsets(), update(st,now), onCursor(st), metrics(st), hudText(st)}`
- metrics 返回 `{hits, avgPopMs, overshootRate, undershootRate}`

- [ ] **Step 1: 写失败测试**

```js
// ==== Task 6 测试 ====
test('网格射击：角度布局 3×3 且间距 12°', () => {
  const offs = S.TESTS.grid.angleOffsets();
  assertEq(offs.length, 9);
  assertEq(offs.some(([dx, dy]) => dx === 0 && dy === 0), true);
  assertEq(Math.max(...offs.map(([dx]) => Math.abs(dx))), 12);
});
test('网格射击：干净命中指标', () => {
  const st = {
    ctx: { sens: 0.3, dpi: 800, pxPerCm: 37.8 },
    hits: 3,
    pops: [
      { x: 100, y: 100, popMs: 500, samples: [{ x: 40, y: 100, t: 0 }, { x: 99, y: 100, t: 450 }] },
      { x: 100, y: 100, popMs: 600, samples: [{ x: 40, y: 100, t: 0 }, { x: 99, y: 100, t: 550 }] },
      { x: 100, y: 100, popMs: 700, samples: [{ x: 40, y: 100, t: 0 }, { x: 99, y: 100, t: 650 }] },
    ],
  };
  const m = S.TESTS.grid.metrics(st);
  assertEq(m.hits, 3);
  assertEq(m.overshootRate, 0);
  assertEq(m.undershootRate, 0);
  assertClose(m.avgPopMs, 600, 0.001);
});
test('网格射击：过冲统计', () => {
  const st = {
    ctx: { sens: 0.3, dpi: 800, pxPerCm: 37.8 },
    hits: 2,
    pops: [
      { x: 100, y: 100, popMs: 500, samples: [{ x: 40, y: 100, t: 0 }, { x: 130, y: 100, t: 300 }, { x: 101, y: 100, t: 450 }] },
      { x: 100, y: 100, popMs: 600, samples: [{ x: 40, y: 100, t: 0 }, { x: 99, y: 100, t: 550 }] },
    ],
  };
  const m = S.TESTS.grid.metrics(st);
  assertEq(m.overshootRate, 0.5);
  assertEq(m.undershootRate, 0);
});
```

- [ ] **Step 2: 运行确认失败**：FAIL（`S.TESTS` 未定义）

- [ ] **Step 3: 实现**：替换模块锚点为（含 TESTS 容器与 grid 定义）：

```js
/* ===== TESTS：四项测试定义 ===== */
const TESTS = {
  grid: {
    name: '网格射击', durationMs: 20000, targetRadiusDeg: 1.5, refHits: 22,
    angleOffsets() {
      const o = [];
      for (const dx of [-12, 0, 12]) for (const dy of [-12, 0, 12]) o.push([dx, dy]);
      return o;
    },
    spawn(st) {
      const offs = TESTS.grid.angleOffsets();
      const prev = st.target ? st.target.i : -1;
      let i = prev;
      while (i === prev) i = Math.floor(Math.random() * offs.length);
      const [dx, dy] = offs[i];
      const { sens, dpi, pxPerCm } = st.ctx;
      st.target = {
        i,
        x: st.ctx.area.clientWidth / 2 + MathX.degToPx(dx, sens, dpi, pxPerCm),
        y: st.ctx.area.clientHeight / 2 + MathX.degToPx(dy, sens, dpi, pxPerCm),
        r: Math.max(12, MathX.degToPx(TESTS.grid.targetRadiusDeg, sens, dpi, pxPerCm)),
        spawnT: performance.now(),
        samples: [],
      };
    },
    update(st) { if (!st.target) TESTS.grid.spawn(st); },
    onCursor(st) {
      if (!st.target) return;
      st.target.samples.push({ x: st.cursor.x, y: st.cursor.y, t: performance.now() });
      if (Geo.inCircle(st.cursor.x, st.cursor.y, st.target.x, st.target.y, st.target.r)) {
        const popT = performance.now();
        st.hits++;
        st.pops.push({ x: st.target.x, y: st.target.y, popMs: popT - st.target.spawnT, samples: st.target.samples });
        st.target = null;
      }
    },
    metrics(st) {
      const { sens, dpi, pxPerCm } = st.ctx;
      const thrPx = MathX.degToPx(2, sens, dpi, pxPerCm);
      let over = 0, under = 0;
      for (const p of st.pops) {
        const c = Geo.classifyFlick(p.samples, p.x, p.y, thrPx);
        if (c.overshoot) over++;
        else if (c.undershoot) under++;
      }
      const n = st.pops.length || 1;
      return {
        hits: st.hits,
        avgPopMs: st.pops.reduce((a, p) => a + p.popMs, 0) / n,
        overshootRate: over / n,
        undershootRate: under / n,
      };
    },
    hudText(st) { return '命中 ' + st.hits; },
  },
};

/* ==== INSERT-NEXT-MODULE ==== */
```

更新 `window.__SENS` 增加 `TESTS`。

- [ ] **Step 4: 运行确认通过**：`node tests/run-tests.mjs` → `23 通过, 0 失败`

- [ ] **Step 5: 浏览器手动验证（同时覆盖 Task 5 引擎）**

① 打开页面，F12 控制台粘贴运行：
```js
TestEngine.start('grid', {
  sens: 0.181, dpi: 800, pxPerCm: 37.8,
  area: $('#test-area'), canvas: $('#test-canvas'),
  ctx: $('#test-canvas').getContext('2d'),
  onComplete: m => console.log('完成', m), onAbort: () => console.log('中止'),
});
```
先点击页面任意处让控制台外页面可见，再手动先显示测试区：执行 `showStep('test'); $('#test-run').style.display='block';` 后运行上面代码。
验证：② 系统光标在测试区隐藏，绿色十字准星跟随；③ 3-2-1 倒计时正常流动，随后红色圆靶出现在 3×3 网格位置；④ **不点击鼠标**，仅移动准星碰触圆靶即爆、命中数 +1、新靶立即出现；⑤ 计时条平滑递减，剩余秒数实时变化；⑥ 20 秒到点自动结束，控制台打印指标对象。

- [ ] **Step 6: Commit**

```bash
git add valorant-sens-generator.html tests/run-tests.mjs
git commit -m "feat: 网格射击测试（碰触触发）"
```

---

### Task 7: 跟枪追踪测试

**Files:**
- Modify: `valorant-sens-generator.html`
- Modify: `tests/run-tests.mjs`

**Interfaces:**
- Produces: `TESTS.tracking = {name, durationMs, targetRadiusDeg, refDevDeg, path(t)→{degX,degY}, update(st,now), metrics(st), hudText(st)}`
- metrics 返回 `{avgDevDeg, jerk}`

- [ ] **Step 1: 写失败测试**

```js
// ==== Task 7 测试 ====
test('追踪路径幅度有界', () => {
  for (let t = 0; t <= 15; t += 0.05) {
    const p = S.TESTS.tracking.path(t);
    if (Math.abs(p.degX) > 13.1 || Math.abs(p.degY) > 13.1) throw new Error('t=' + t + ' 越界: ' + p.degX + ', ' + p.degY);
  }
});
test('追踪指标：直线匀速移动抖动度为 0', () => {
  const ctx = { sens: 0.3, dpi: 800, pxPerCm: 37.8 };
  const devSamples = [];
  for (let i = 0; i <= 20; i++) devSamples.push({ x: i * 5, y: 0, devPx: 10, t: i * 16 });
  const m = S.TESTS.tracking.metrics({ ctx, devSamples });
  assertClose(m.avgDevDeg, S.MathX.pxToDeg(10, 0.3, 800, 37.8), 1e-6);
  assertEq(m.jerk, 0);
});
```

- [ ] **Step 2: 运行确认失败**：FAIL（`S.TESTS.tracking` 未定义）

- [ ] **Step 3: 实现**：在 `TESTS = {` 对象内、`grid` 定义之后（`};` 之前）插入：

```js
  tracking: {
    name: '跟枪追踪', durationMs: 15000, targetRadiusDeg: 2, refDevDeg: 3,
    path(t) {
      return {
        degX: 9 * Math.sin(0.9 * t) + 4 * Math.sin(2.3 * t + 1.3),
        degY: 9 * Math.sin(0.7 * t + 2.1) + 4 * Math.sin(1.7 * t + 0.6),
      };
    },
    update(st, now) {
      if (st.t0 === null) st.t0 = now;
      const t = (now - st.t0) / 1000;
      const { degX, degY } = TESTS.tracking.path(t);
      const { sens, dpi, pxPerCm } = st.ctx;
      const cx = st.ctx.area.clientWidth / 2, cy = st.ctx.area.clientHeight / 2;
      const px = cx + MathX.degToPx(degX, sens, dpi, pxPerCm);
      const py = cy + MathX.degToPx(degY, sens, dpi, pxPerCm);
      st.target = { x: px, y: py, r: Math.max(16, MathX.degToPx(TESTS.tracking.targetRadiusDeg, sens, dpi, pxPerCm)) };
      st.devSamples.push({ devPx: Geo.dist(st.cursor.x, st.cursor.y, px, py), x: st.cursor.x, y: st.cursor.y, t: now });
    },
    metrics(st) {
      const { sens, dpi, pxPerCm } = st.ctx;
      const n = st.devSamples.length || 1;
      const avgDevPx = st.devSamples.reduce((a, s) => a + s.devPx, 0) / n;
      const dirs = [];
      for (let i = 1; i < st.devSamples.length; i++) {
        const a = st.devSamples[i], b = st.devSamples[i - 1];
        if (a.x !== b.x || a.y !== b.y) dirs.push(Math.atan2(a.y - b.y, a.x - b.x));
      }
      let jerk = 0;
      if (dirs.length > 1) {
        const diffs = [];
        for (let i = 1; i < dirs.length; i++) {
          let d = dirs[i] - dirs[i - 1];
          while (d > Math.PI) d -= 2 * Math.PI;
          while (d < -Math.PI) d += 2 * Math.PI;
          diffs.push(d);
        }
        const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        jerk = diffs.reduce((a, b) => a + (b - mean) ** 2, 0) / diffs.length;
      }
      return { avgDevDeg: MathX.pxToDeg(avgDevPx, sens, dpi, pxPerCm), jerk };
    },
    hudText(st) {
      if (!st.devSamples.length) return '';
      const last = st.devSamples[st.devSamples.length - 1];
      const dev = MathX.pxToDeg(last.devPx, st.ctx.sens, st.ctx.dpi, st.ctx.pxPerCm);
      return '当前偏差 ' + dev.toFixed(1) + '°';
    },
  },
```

- [ ] **Step 4: 运行确认通过**：`node tests/run-tests.mjs` → `25 通过, 0 失败`

- [ ] **Step 5: 浏览器手动验证**

按 Task 6 Step 5 方式运行 `TestEngine.start('tracking', {...})`：红色圆靶沿平滑曲线游走（不跳变）；移动鼠标贴合圆靶，HUD 实时显示当前偏差度数；15 秒自动结束并打印 `{avgDevDeg, jerk}`；倒计时全程流动。

- [ ] **Step 6: Commit**

```bash
git add valorant-sens-generator.html tests/run-tests.mjs
git commit -m "feat: 跟枪追踪测试"
```

---

### Task 8: 微调精度测试

**Files:**
- Modify: `valorant-sens-generator.html`
- Modify: `tests/run-tests.mjs`

**Interfaces:**
- Produces: `TESTS.micro = {name, durationMs, targetRadiusPx, minDeg, maxDeg, refHitRate, update(st,now), onCursor(st), metrics(st), hudText(st)}`
- metrics 返回 `{hitRate, avgFixMs}`

- [ ] **Step 1: 写失败测试**

```js
// ==== Task 8 测试 ====
test('微调指标：命中率与平均修正时间', () => {
  const st = { total: 10, hits: 8, fixes: [300, 400, 500, 600, 700, 800, 900, 1000] };
  const m = S.TESTS.micro.metrics(st);
  assertEq(m.hitRate, 0.8);
  assertClose(m.avgFixMs, 650, 0.001);
});
```

- [ ] **Step 2: 运行确认失败**：FAIL（`S.TESTS.micro` 未定义）

- [ ] **Step 3: 实现**：在 TESTS 对象内插入：

```js
  micro: {
    name: '微调精度', durationMs: 15000, targetRadiusPx: 6, minDeg: 3, maxDeg: 7, refHitRate: 0.8,
    spawn(st, now) {
      const ang = TESTS.micro.minDeg + Math.random() * (TESTS.micro.maxDeg - TESTS.micro.minDeg);
      const dir = Math.random() * 2 * Math.PI;
      const { sens, dpi, pxPerCm } = st.ctx;
      st.target = {
        x: st.ctx.area.clientWidth / 2 + Math.cos(dir) * MathX.degToPx(ang, sens, dpi, pxPerCm),
        y: st.ctx.area.clientHeight / 2 + Math.sin(dir) * MathX.degToPx(ang, sens, dpi, pxPerCm),
        r: TESTS.micro.targetRadiusPx,
        spawnT: now,
      };
      st.total++;
    },
    update(st, now) { if (!st.target) TESTS.micro.spawn(st, now); },
    onCursor(st) {
      if (!st.target) return;
      if (Geo.inCircle(st.cursor.x, st.cursor.y, st.target.x, st.target.y, st.target.r)) {
        st.hits++;
        st.fixes.push(performance.now() - st.target.spawnT);
        st.target = null;
      }
    },
    metrics(st) {
      return {
        hitRate: st.total ? st.hits / st.total : 0,
        avgFixMs: st.fixes.length ? st.fixes.reduce((a, b) => a + b, 0) / st.fixes.length : 0,
      };
    },
    hudText(st) { return st.total ? ('命中率 ' + Math.round(st.hits / st.total * 100) + '%') : ''; },
  },
```

- [ ] **Step 4: 运行确认通过**：`node tests/run-tests.mjs` → `26 通过, 0 失败`

- [ ] **Step 5: 浏览器手动验证**

运行 `TestEngine.start('micro', {...})`：出现 6px 极小目标（半径 6px、偏移 3–7°），碰触即爆并立即刷新；HUD 显示命中率；15 秒结束打印 `{hitRate, avgFixMs}`。

- [ ] **Step 6: Commit**

```bash
git add valorant-sens-generator.html tests/run-tests.mjs
git commit -m "feat: 微调精度测试"
```

---

### Task 9: 反射闪点测试

**Files:**
- Modify: `valorant-sens-generator.html`
- Modify: `tests/run-tests.mjs`

**Interfaces:**
- Produces: `TESTS.flash = {name, durationMs, flashMs, gapMs, minDeg, maxDeg, targetRadiusDeg, refHitRate, update(st,now), onCursor(st), metrics(st), hudText(st)}`
- metrics 返回 `{hitRate, avgReactionMs, overshootRate, undershootRate}`

- [ ] **Step 1: 写失败测试**

```js
// ==== Task 9 测试 ====
test('闪点：窗口内目标存活', () => {
  const st = { target: { spawnT: 0, samples: [] }, hits: 0, misses: 0, lastSpawnT: 0, flashMisses: [], reactions: [] };
  S.TESTS.flash.update(st, 300);
  assertEq(st.target !== null, true);
  assertEq(st.misses, 0);
});
test('闪点：到时未命中即消失', () => {
  const st = { target: { spawnT: 0, samples: [] }, hits: 0, misses: 0, lastSpawnT: 0, flashMisses: [], reactions: [], cursor: { x: 500, y: 500 } };
  S.TESTS.flash.update(st, 750);
  assertEq(st.target, null);
  assertEq(st.misses, 1);
});
test('闪点指标：过冲/欠冲分类', () => {
  const st = {
    ctx: { sens: 0.3, dpi: 800, pxPerCm: 37.8 },
    hits: 1, misses: 2, reactions: [320],
    flashMisses: [
      { target: { x: 100, y: 0 }, samples: [{ x: 0, y: 0, t: 0 }, { x: 130, y: 0, t: 200 }] },
      { target: { x: 100, y: 0 }, samples: [{ x: 0, y: 0, t: 0 }, { x: 80, y: 0, t: 200 }, { x: 80, y: 0, t: 250 }, { x: 80, y: 0, t: 300 }, { x: 80, y: 0, t: 350 }, { x: 80, y: 0, t: 400 }, { x: 80, y: 0, t: 450 }, { x: 80, y: 0, t: 500 }] },
    ],
  };
  const m = S.TESTS.flash.metrics(st);
  assertEq(m.hitRate, 1 / 3);
  assertEq(m.overshootRate, 0.5);
  assertEq(m.undershootRate, 0.5);
  assertClose(m.avgReactionMs, 320, 0.001);
});
```

- [ ] **Step 2: 运行确认失败**：FAIL（`S.TESTS.flash` 未定义）

- [ ] **Step 3: 实现**：在 TESTS 对象内插入：

```js
  flash: {
    name: '反射闪点', durationMs: 15000, flashMs: 700, gapMs: 700, minDeg: 15, maxDeg: 60, targetRadiusDeg: 1.5, refHitRate: 0.7,
    spawn(st, now) {
      const ang = TESTS.flash.minDeg + Math.random() * (TESTS.flash.maxDeg - TESTS.flash.minDeg);
      const dir = Math.random() * 2 * Math.PI;
      const { sens, dpi, pxPerCm } = st.ctx;
      st.target = {
        x: st.ctx.area.clientWidth / 2 + Math.cos(dir) * MathX.degToPx(ang, sens, dpi, pxPerCm),
        y: st.ctx.area.clientHeight / 2 + Math.sin(dir) * MathX.degToPx(ang, sens, dpi, pxPerCm),
        r: Math.max(14, MathX.degToPx(TESTS.flash.targetRadiusDeg, sens, dpi, pxPerCm)),
        spawnT: now,
        samples: [],
      };
      st.lastSpawnT = now;
    },
    update(st, now) {
      if (!st.target) {
        if (now - st.lastSpawnT >= TESTS.flash.gapMs) TESTS.flash.spawn(st, now);
        return;
      }
      if (now - st.target.spawnT >= TESTS.flash.flashMs) {
        st.target.samples.push({ x: st.cursor.x, y: st.cursor.y, t: now });
        st.misses++;
        st.flashMisses.push({ target: st.target, samples: st.target.samples });
        st.target = null;
      }
    },
    onCursor(st) {
      if (!st.target) return;
      const t = performance.now();
      st.target.samples.push({ x: st.cursor.x, y: st.cursor.y, t });
      if (Geo.inCircle(st.cursor.x, st.cursor.y, st.target.x, st.target.y, st.target.r)) {
        st.hits++;
        st.reactions.push(t - st.target.spawnT);
        st.target = null;
      }
    },
    metrics(st) {
      const { sens, dpi, pxPerCm } = st.ctx;
      const thrPx = MathX.degToPx(2, sens, dpi, pxPerCm);
      let over = 0, under = 0;
      for (const m of st.flashMisses) {
        const c = Geo.classifyFlick(m.samples, m.target.x, m.target.y, thrPx);
        if (c.overshoot) over++;
        else if (c.undershoot) under++;
      }
      const total = st.hits + st.misses;
      return {
        hitRate: total ? st.hits / total : 0,
        avgReactionMs: st.reactions.length ? st.reactions.reduce((a, b) => a + b, 0) / st.reactions.length : 0,
        overshootRate: st.misses ? over / st.misses : 0,
        undershootRate: st.misses ? under / st.misses : 0,
      };
    },
    hudText(st) { return '命中 ' + st.hits + ' / ' + (st.hits + st.misses); },
  },
```

- [ ] **Step 4: 运行确认通过**：`node tests/run-tests.mjs` → `29 通过, 0 失败`

- [ ] **Step 5: 浏览器手动验证**

运行 `TestEngine.start('flash', {...})`：目标在 15–60° 范围随机闪现约 0.7 秒后消失（没碰到记一次未命中），间隔约 0.7 秒再出现；碰到即命中并记录反应时间；HUD 显示 命中 x / 总数；15 秒结束打印 `{hitRate, avgReactionMs, overshootRate, undershootRate}`。

- [ ] **Step 6: Commit**

```bash
git add valorant-sens-generator.html tests/run-tests.mjs
git commit -m "feat: 反射闪点测试"
```

---

### Task 10: SensEngine 迭代校准引擎

**Files:**
- Modify: `valorant-sens-generator.html`
- Modify: `tests/run-tests.mjs`

**Interfaces:**
- Produces: `SensEngine`：`WEIGHTS`、`CAPS`、`gridScore/trackScore/flashScore/microScore(m)`、`composite(m)→{score, parts}`、`correction(m, round)→factor`、`converged(prevScore, score, factor)→bool`、`step(sens, m, round, prevScore)→{score, parts, factor, next, done}`、`finalize(sens)`
- Consumes: `MathX`、`TESTS.*.refHits/refDevDeg/refHitRate`

- [ ] **Step 1: 写失败测试**

```js
// ==== Task 10 测试 ====
const refM = () => ({
  grid: { hits: 22, avgPopMs: 600, overshootRate: 0, undershootRate: 0 },
  track: { avgDevDeg: 0, jerk: 0 },
  flash: { hitRate: 0.7, avgReactionMs: 400, overshootRate: 0, undershootRate: 0 },
  micro: { hitRate: 0.8, avgFixMs: 600 },
});
test('综合得分：参考值全满分为 100', () => {
  const r = S.SensEngine.composite(refM());
  assertEq(r.score, 100);
  assertEq(r.parts.grid, 100);
});
test('修正系数：过冲降灵敏度（第 1 轮 15%）', () => {
  const m = refM();
  m.grid.overshootRate = 0.8; m.flash.overshootRate = 0.8; m.flash.hitRate = 0.5; m.micro.hitRate = 0.5; m.track.avgDevDeg = 1.0;
  assertClose(S.SensEngine.correction(m, 1), 0.85, 1e-9);
});
test('修正系数：欠冲升灵敏度', () => {
  const m = refM();
  m.grid.undershootRate = 0.8; m.flash.undershootRate = 0.8; m.flash.hitRate = 0.5; m.micro.hitRate = 0.5; m.track.avgDevDeg = 1.0;
  assertClose(S.SensEngine.correction(m, 1), 1.15, 1e-9);
});
test('修正系数：叠加项受轮次幅度上限约束', () => {
  const m = refM();
  m.grid.overshootRate = 0.8; m.flash.overshootRate = 0.8; m.flash.hitRate = 0.5; m.micro.hitRate = 0.5; m.track.avgDevDeg = 3.0;
  assertClose(S.SensEngine.correction(m, 1), 0.85, 1e-9, '0.85×0.95 被钳回 15% 下限');
  assertClose(S.SensEngine.correction(m, 3), 0.96, 1e-9, '第 3 轮上限 4%');
});
test('收敛判定', () => {
  assertEq(S.SensEngine.converged(null, 60, 0.85), false);
  assertEq(S.SensEngine.converged(60, 60.5, 0.998), true);
  assertEq(S.SensEngine.converged(60, 61.5, 0.95), true);
  assertEq(S.SensEngine.converged(60, 63, 0.95), false);
});
test('单轮推进：灵敏度更新与取整', () => {
  const m = refM();
  m.grid.hits = 10; m.grid.overshootRate = 0.8;
  m.flash.hitRate = 0.5; m.flash.overshootRate = 0.8;
  m.micro.hitRate = 0.5; m.track.avgDevDeg = 1.0;
  const r = S.SensEngine.step(0.2, m, 1, null);
  assertEq(r.factor, 0.85);
  assertEq(r.next, 0.17);
  assertEq(r.done, false);
});
test('最终处理：三位小数与区间钳制', () => {
  assertEq(S.SensEngine.finalize(0.181428571), 0.181);
  assertEq(S.SensEngine.finalize(-5), 0.001);
  assertEq(S.SensEngine.finalize(50), 10);
});
test('三轮模拟：过冲逐轮降灵敏度且幅度衰减', () => {
  const mk = hits => {
    const m = refM();
    m.grid.hits = hits; m.grid.overshootRate = 0.9;
    m.flash.hitRate = 0.4; m.flash.overshootRate = 0.9;
    m.micro.hitRate = 0.4; m.track.avgDevDeg = 1.0;
    return m;
  };
  let sens = 0.2, prev = null;
  const traj = [];
  for (let r = 1; r <= 3; r++) {
    const step = S.SensEngine.step(sens, mk(10 + r * 4), r, prev);
    sens = step.next; prev = step.score;
    traj.push({ round: r, sens });
    if (step.done) break;
  }
  assertEq(traj.length, 3);
  assertEq(traj[0].sens, 0.17);
  assertEq(traj[1].sens, 0.156);
  assertEq(traj[2].sens, 0.15);
});
```

- [ ] **Step 2: 运行确认失败**：FAIL（`S.SensEngine` 未定义）

- [ ] **Step 3: 实现**：替换模块锚点为：

```js
/* ===== SensEngine：迭代校准引擎（纯函数） ===== */
const SensEngine = {
  WEIGHTS: { grid: 30, flash: 20, track: 30, micro: 20 },
  CAPS: [0, 0.15, 0.08, 0.04],

  gridScore(m) { return clamp(100 * m.hits / TESTS.grid.refHits, 0, 100); },
  trackScore(m) { return clamp(100 * (1 - m.avgDevDeg / TESTS.tracking.refDevDeg), 0, 100); },
  flashScore(m) { return clamp(100 * m.hitRate / TESTS.flash.refHitRate, 0, 100); },
  microScore(m) { return clamp(100 * m.hitRate / TESTS.micro.refHitRate, 0, 100); },

  composite(m) {
    const parts = {
      grid: SensEngine.gridScore(m.grid),
      track: SensEngine.trackScore(m.track),
      flash: SensEngine.flashScore(m.flash),
      micro: SensEngine.microScore(m.micro),
    };
    let total = 0;
    for (const k in SensEngine.WEIGHTS) total += parts[k] * SensEngine.WEIGHTS[k] / 100;
    return { score: Math.round(total * 10) / 10, parts };
  },

  correction(m, round) {
    const cap = SensEngine.CAPS[Math.min(round, 3)];
    const over = (m.grid.overshootRate + m.flash.overshootRate) / 2;
    const under = (m.grid.undershootRate + m.flash.undershootRate) / 2;
    let f = 1;
    if (over > 0.45) f *= 1 - cap;
    else if (under > 0.45) f *= 1 + cap;
    if (m.track.avgDevDeg > 2) f *= 0.95;
    else if (m.track.avgDevDeg < 0.8 && m.flash.hitRate > 0.6) f *= 1.03;
    if (m.micro.hitRate > 0.8 && over <= 0.45) f *= 1.05;
    return clamp(f, 1 - cap, 1 + cap);
  },

  converged(prevScore, score, factor) {
    return Math.abs(factor - 1) < 0.005 || (prevScore !== null && score - prevScore < 2);
  },

  step(sens, m, round, prevScore) {
    const { score, parts } = SensEngine.composite(m);
    const factor = SensEngine.correction(m, round);
    return {
      score, parts, factor,
      next: MathX.round3(sens * factor),
      done: SensEngine.converged(prevScore, score, factor),
    };
  },

  finalize(sens) { return MathX.round3(MathX.clampSens(sens)); },
};

/* ==== INSERT-NEXT-MODULE ==== */
```

更新 `window.__SENS` 增加 `SensEngine`。

- [ ] **Step 4: 运行确认通过**：`node tests/run-tests.mjs` → `36 通过, 0 失败`

- [ ] **Step 5: Commit**

```bash
git add valorant-sens-generator.html tests/run-tests.mjs
git commit -m "feat: SensEngine 迭代校准引擎"
```

---

### Task 11: 测试中心多轮迭代流程 UI

**Files:**
- Modify: `valorant-sens-generator.html`（仅 UI 锚点）

**Interfaces:**
- Consumes: `TestEngine`、`SensEngine`、`MathX`、`Calibrator`、`Flow`、`TESTS`、`showStep`
- Produces: `enterTest()`（校准页进入测试中心）、`runRound()`、`startRound()`、`updateRoundInfo()`、`abortRound()`、`sizeCanvas()`

- [ ] **Step 1: 实现 UI 流程**：替换 UI 锚点为（并修改 Task 4 的两个按钮处理器）：

先修改 Task 4 中的两行处理器（Edit 精确匹配）：
```js
  $('#btn-cal-skip').addEventListener('click', () => { Flow.pxPerCm = null; showStep('test'); });
  $('#btn-cal-next').addEventListener('click', () => showStep('test'));
```
替换为：
```js
  $('#btn-cal-skip').addEventListener('click', () => { Flow.pxPerCm = null; enterTest(); });
  $('#btn-cal-next').addEventListener('click', () => enterTest());
```

再替换 UI 锚点为：

```js
  /* ==== 测试中心：多轮迭代流程 ==== */
  const TEST_ORDER = ['grid', 'tracking', 'micro', 'flash'];
  const area = $('#test-area');
  const canvas = $('#test-canvas');
  const ctx2d = canvas.getContext('2d');

  function sizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = area.clientWidth * dpr;
    canvas.height = area.clientHeight * dpr;
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', sizeCanvas);

  function showWarn(text) {
    const b = document.createElement('div');
    b.className = 'warn-banner';
    b.textContent = text;
    document.querySelector('.panel.active').prepend(b);
    setTimeout(() => b.remove(), 8000);
  }

  function enterTest() {
    Flow.sens = MathX.baselineSens(Flow.profile.dpi, Flow.profile.padCm, Flow.profile.padDeg);
    if (!Flow.pxPerCm) {
      Flow.pxPerCm = Calibrator.DEFAULT_PX_PER_CM;
      showWarn('未校准：使用默认 37.8 px/cm。建议回到第 2 步做一次 10cm 校准，结果更准。');
    }
    Flow.round = 1;
    Flow.traj = [];
    updateRoundInfo();
    $('#test-pre').style.display = 'block';
    $('#test-run').style.display = 'none';
    $('#btn-start-round').style.display = '';
    document.querySelectorAll('#test-pre .round-result').forEach(el => el.remove());
    showStep('test');
  }

  function updateRoundInfo() {
    $('#round-info').innerHTML =
      '第 <b>' + Flow.round + '</b> 轮 / 最多 3 轮 &nbsp;·&nbsp; 当前灵敏度 <b>' + Flow.sens.toFixed(3) + '</b><br>' +
      '<span class="muted">每轮 4 项测试（网格射击 → 跟枪追踪 → 微调精度 → 反射闪点），约 2 分钟。倒计时结束自动进入下一项。</span>';
  }

  function startRound() {
    Flow.aborted = false;
    $('#test-pre').style.display = 'none';
    $('#test-run').style.display = 'block';
    sizeCanvas();
    runRound();
  }

  async function runRound() {
    const roundStartSens = Flow.sens;
    Flow.metrics = {};
    for (const key of TEST_ORDER) {
      if (Flow.aborted) return abortRound(roundStartSens);
      const result = await new Promise(resolve => {
        TestEngine.start(key, {
          sens: Flow.sens, dpi: Flow.profile.dpi, pxPerCm: Flow.pxPerCm,
          area, canvas, ctx: ctx2d,
          onComplete: m => resolve(m),
          onAbort: () => resolve(null),
        });
      });
      if (result === null) return abortRound(roundStartSens);
      Flow.metrics[key] = result;
    }
    const prevScore = Flow.traj.length ? Flow.traj[Flow.traj.length - 1].score : null;
    const step = SensEngine.step(Flow.sens, Flow.metrics, Flow.round, prevScore);
    Flow.sens = step.next;
    Flow.traj.push({ round: Flow.round, sens: step.next, score: step.score });
    renderRoundResult(step);
  }

  function renderRoundResult(step) {
    $('#test-run').style.display = 'none';
    $('#test-pre').style.display = 'block';
    const div = document.createElement('div');
    div.className = 'round-result';
    div.innerHTML =
      '<p>第 ' + Flow.round + ' 轮完成：灵敏度 <b>' + Flow.sens.toFixed(3) + '</b>，综合得分 <b>' + step.score + '</b></p>' +
      '<p class="muted">修正系数 ×' + step.factor.toFixed(3) + (step.done ? '（已收敛）' : '') + '</p>';
    const next = (step.done || Flow.round >= 3) ? null : Flow.round + 1;
    if (next) {
      Flow.round = next;
      const b = document.createElement('button');
      b.className = 'btn primary';
      b.textContent = '开始第 ' + next + ' 轮';
      b.addEventListener('click', () => { div.remove(); startRound(); });
      div.appendChild(b);
    } else {
      const b = document.createElement('button');
      b.className = 'btn primary';
      b.textContent = '生成专属灵敏度报告 →';
      b.addEventListener('click', () => showStep('report'));
      div.appendChild(b);
    }
    $('#test-pre').appendChild(div);
  }

  function abortRound(roundStartSens) {
    TestEngine.abort();
    Flow.aborted = false;
    Flow.sens = roundStartSens;
    $('#test-run').style.display = 'none';
    $('#test-pre').style.display = 'block';
    $('#btn-start-round').style.display = '';
    updateRoundInfo();
  }

  $('#btn-start-round').addEventListener('click', startRound);
  $('#btn-abort').addEventListener('click', () => {
    Flow.aborted = true;
    TestEngine.abort();
  });

  /* ==== INSERT-NEXT-UI ==== */
```

注意：报告按钮暂时只切换步骤；Task 12 会把 `() => showStep('report')` 替换为 `() => finishAll()`。

- [ ] **Step 2: 浏览器手动验证**

① 档案 → 校准（跳过）→ 测试中心：显示「第 1 轮 / 最多 3 轮 · 当前灵敏度 0.181」与警示横幅；② 开始测试：3-2-1 → 网格射击 20s → 自动进入追踪 15s → 微调 15s → 闪点 15s，全程倒计时流动、准星可见、碰触爆靶；③ 轮末显示「第 1 轮完成」卡片（灵敏度、得分、修正系数）；④ 点「开始第 2 轮」→ 第二轮灵敏度已更新；⑤ 中途点「中止本轮」→ 回到测试中心且灵敏度回到本轮开始值；⑥ 第 3 轮结束（或提前收敛）出现「生成专属灵敏度报告」按钮。

- [ ] **Step 3: Commit**

```bash
git add valorant-sens-generator.html
git commit -m "feat: 测试中心多轮迭代流程"
```

---

### Task 12: 报告页 + 图表 + 复制 + 历史

**Files:**
- Modify: `valorant-sens-generator.html`（模块锚点 + UI 锚点）
- Modify: `tests/run-tests.mjs`

**Interfaces:**
- Produces: `Report.chartData(traj, w=600, h=200, pad=30)→{pts, sMin, sMax}`、`Report.radarPoints(scores, cx=150, cy=150, r=110)`、`History`（`load/add`）；UI `finishAll()`、`renderReport(res)`、`drawLineChart()`、`drawRadar(parts)`、`saveHistory/renderHistory/copyText`

- [ ] **Step 1: 写失败测试**

```js
// ==== Task 12 测试 ====
test('收敛曲线数据映射', () => {
  const traj = [
    { round: 1, sens: 0.2, score: 55 },
    { round: 2, sens: 0.17, score: 61 },
    { round: 3, sens: 0.15, score: 66 },
  ];
  const d = S.Report.chartData(traj, 600, 200, 30);
  assertEq(d.pts.length, 3);
  assertEq(d.pts[0].x, 30);
  assertEq(d.pts[2].x, 570);
  assertClose(d.pts[0].y, 30, 1e-9, '最大灵敏度在最上方');
  assertClose(d.pts[2].y, 170, 1e-9, '最小灵敏度在最下方');
  assertEq(d.sMin, 0.15);
  assertEq(d.sMax, 0.2);
});
test('雷达图：满分为正上方顶点', () => {
  const pts = S.Report.radarPoints({ grid: 100, track: 100, flash: 100, micro: 100 }, 150, 150, 110);
  assertEq(pts.length, 4);
  assertClose(pts[0].x, 150, 1e-9);
  assertClose(pts[0].y, 40, 1e-9);
});
test('雷达图：零分为圆心', () => {
  const pts = S.Report.radarPoints({ grid: 0, track: 0, flash: 0, micro: 0 }, 150, 150, 110);
  for (const p of pts) {
    assertClose(p.x, 150, 1e-9);
    assertClose(p.y, 150, 1e-9);
  }
});
```

- [ ] **Step 2: 运行确认失败**：FAIL（`S.Report` 未定义）

- [ ] **Step 3: 实现模块**：替换模块锚点为：

```js
/* ===== Report：图表数据（纯函数） ===== */
const Report = {
  chartData(traj, w = 600, h = 200, pad = 30) {
    const n = Math.max(2, traj.length);
    const sMin = Math.min(...traj.map(t => t.sens));
    const sMax = Math.max(...traj.map(t => t.sens));
    const range = (sMax - sMin) || 1;
    const pts = traj.map((t, i) => ({
      x: pad + (w - 2 * pad) * i / (n - 1),
      y: h - pad - (h - 2 * pad) * (t.sens - sMin) / range,
      sens: t.sens, score: t.score,
    }));
    return { pts, sMin, sMax };
  },
  radarPoints(scores, cx = 150, cy = 150, r = 110) {
    const keys = ['grid', 'track', 'flash', 'micro'];
    return keys.map((k, i) => {
      const a = -Math.PI / 2 + i * 2 * Math.PI / keys.length;
      const v = clamp(scores[k], 0, 100) / 100;
      return {
        key: k,
        x: cx + r * v * Math.cos(a),
        y: cy + r * v * Math.sin(a),
        labelX: cx + (r + 24) * Math.cos(a),
        labelY: cy + (r + 24) * Math.sin(a),
      };
    });
  },
};

/* ===== History：历史记录 ===== */
const History = {
  KEY: 'vse.history',
  load() {
    try { return JSON.parse(localStorage.getItem(History.KEY)) || []; }
    catch (e) { return []; }
  },
  add(entry) {
    const h = History.load();
    h.unshift(entry);
    localStorage.setItem(History.KEY, JSON.stringify(h.slice(0, 20)));
  },
};

/* ==== INSERT-NEXT-MODULE ==== */
```

更新 `window.__SENS` 增加 `Report, History`。

- [ ] **Step 4: 运行确认通过**：`node tests/run-tests.mjs` → `39 通过, 0 失败`

- [ ] **Step 5: 实现报告 UI**：替换 UI 锚点为（同时把 Task 11 的报告按钮处理器改为 `() => finishAll()`）：

```js
  /* ==== 报告 ==== */
  function finishAll() {
    const raw = Flow.traj.length ? Flow.traj[Flow.traj.length - 1].sens : Flow.sens;
    const sens = SensEngine.finalize(raw);
    const clamped = sens !== raw;
    const edpi = Math.round(Flow.profile.dpi * sens * 10) / 10;
    const cm360 = MathX.cmPer360(sens, Flow.profile.dpi);
    const padDegTurn = Flow.profile.padCm * MathX.degPerCm(sens, Flow.profile.dpi);
    const parts = Flow.traj.length ? SensEngine.composite(Flow.metrics).parts : null;
    renderReport({ sens, raw, clamped, edpi, cm360, padDegTurn, parts });
    showStep('report');
  }

  function renderReport(res) {
    $('#rep-sens').textContent = res.sens.toFixed(3);
    $('#rep-sens2').textContent = res.sens.toFixed(3);
    $('#rep-edpi').textContent = res.edpi.toFixed(1);
    $('#rep-cm360').textContent = res.cm360.toFixed(1);
    $('#rep-pad-deg').textContent = res.padDegTurn.toFixed(0) + '°';
    drawLineChart();
    if (res.parts) drawRadar(res.parts);
    if (res.clamped) showWarn('原始计算值 ' + res.raw.toFixed(3) + ' 超出游戏区间 [0.001, 10]，已钳制为 ' + res.sens.toFixed(3) + '。');
    saveHistory(res);
    renderHistory();
  }

  function drawLineChart() {
    const d = Report.chartData(Flow.traj);
    const pts = d.pts;
    const poly = pts.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
    let labels = '';
    pts.forEach(p => {
      labels += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="4" fill="#ff4655"/>' +
        '<text x="' + p.x.toFixed(1) + '" y="' + (p.y - 10).toFixed(1) + '" text-anchor="middle" fill="#8fa3b3" font-size="11">' + p.sens.toFixed(3) + '</text>';
    });
    $('#rep-line-svg').innerHTML =
      '<line x1="30" y1="170" x2="570" y2="170" stroke="#2f4050"/>' +
      '<polyline points="' + poly + '" fill="none" stroke="#00ff87" stroke-width="2"/>' + labels;
  }

  function drawRadar(parts) {
    const keys = ['grid', 'track', 'flash', 'micro'];
    const names = ['网格', '跟枪', '闪点', '微调'];
    const scores = { grid: parts.grid, track: parts.track, flash: parts.flash, micro: parts.micro };
    const svg = $('#rep-radar-svg');
    let s = '';
    [25, 50, 75, 100].forEach(v => {
      const ring = Report.radarPoints({ grid: v, track: v, flash: v, micro: v });
      s += '<polygon points="' + ring.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ') + '" fill="none" stroke="#2f4050"/>';
    });
    const full = Report.radarPoints({ grid: 100, track: 100, flash: 100, micro: 100 });
    full.forEach(p => { s += '<line x1="150" y1="150" x2="' + p.x.toFixed(1) + '" y2="' + p.y.toFixed(1) + '" stroke="#2f4050"/>'; });
    const pts = Report.radarPoints(scores);
    s += '<polygon points="' + pts.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ') + '" fill="rgba(255,70,85,.25)" stroke="#ff4655" stroke-width="2"/>';
    full.forEach((p, i) => {
      s += '<text x="' + p.labelX + '" y="' + p.labelY + '" text-anchor="middle" fill="#8fa3b3" font-size="12">' + names[i] + ' ' + scores[keys[i]].toFixed(0) + '</text>';
    });
    svg.innerHTML = s;
  }

  function saveHistory(res) {
    History.add({
      t: new Date().toLocaleString(),
      sens: res.sens, edpi: res.edpi, cm360: res.cm360,
      score: Flow.traj.length ? Flow.traj[Flow.traj.length - 1].score : null,
    });
  }

  function renderHistory() {
    $('#rep-history').innerHTML = History.load().map(h =>
      '<li>' + h.t + ' — 灵敏度 <b>' + h.sens.toFixed(3) + '</b> · eDPI ' + h.edpi + ' · cm/360 ' + h.cm360.toFixed(1) + (h.score !== null ? ' · 得分 ' + h.score : '') + '</li>'
    ).join('');
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch (e2) { return false; }
    }
  }

  $('#rep-copy').addEventListener('click', async () => {
    const v = $('#rep-sens').textContent;
    const ok = await copyText(v);
    const btn = $('#rep-copy');
    btn.textContent = ok ? '已复制 ✓' : '复制失败，请手动选中';
    setTimeout(() => (btn.textContent = '复制'), 1500);
  });

  $('#btn-restart').addEventListener('click', () => {
    Object.assign(Flow, { traj: [], round: 1, sens: null, metrics: {}, aborted: false });
    showStep('profile');
  });

  (function initReport() { renderHistory(); })();

  /* ==== INSERT-NEXT-UI ==== */
```

- [ ] **Step 6: 浏览器手动验证**

① 完成一轮流程 → 报告页显示大号绿色三位小数灵敏度、eDPI、cm/360、一整垫角度；② 点「复制」→ 按钮变「已复制 ✓」，粘贴到别处是该数值；③ 收敛曲线显示每轮灵敏度点与连线，雷达图显示 4 项得分；④ 游戏内设置步骤与数值一致；⑤ 刷新页面历史记录保留；⑥「重新开始」回到档案页。

- [ ] **Step 7: Commit**

```bash
git add valorant-sens-generator.html tests/run-tests.mjs
git commit -m "feat: 报告页、SVG 图表、复制与历史记录"
```

---

### Task 13: 收尾——暂停恢复、边界防护、E2E 验证

**Files:**
- Modify: `valorant-sens-generator.html`（仅 UI 锚点）

**Interfaces:**
- Produces: `pauseGame()`；页面级 `visibilitychange`/`blur` 监听；右键/文本选择屏蔽

- [ ] **Step 1: 实现收尾代码**：替换 UI 锚点为（最终版本不再保留锚点）：

```js
  /* ==== 暂停恢复 ==== */
  function pauseGame() {
    const st = TestEngine.state;
    if (!st || st._dead || st.paused) return;
    if (st.running && !st.countdown.done()) {
      TestEngine.pause();
      $('#pause-overlay').style.display = 'flex';
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseGame();
  });
  window.addEventListener('blur', pauseGame);
  $('#pause-overlay').addEventListener('click', () => {
    TestEngine.resume();
    $('#pause-overlay').style.display = 'none';
  });

  /* ==== 边界防护 ==== */
  area.addEventListener('contextmenu', e => e.preventDefault());
  area.addEventListener('selectstart', e => e.preventDefault());
```

- [ ] **Step 2: 运行测试**：`node tests/run-tests.mjs` → `39 通过, 0 失败`

- [ ] **Step 3: 完整 E2E 手动验证清单**（规格 §9 逐项过）

1. 公式自检（已有单元测试覆盖）：800 DPI / 45cm / 180° 基准 ≈ 0.181；输出 [0.001, 10] 三位小数
2. 倒计时：秒表对照 5 秒一致；测试中 Alt+Tab 切走 10 秒回来 → 显示「已暂停」，点击继续后剩余时间与切走前一致，不冻结不跳变
3. 碰触触发：全程不按鼠标键，仅移动鼠标连续爆靶
4. 准星：测试区系统光标隐藏，绿十字跟随流畅，目标在准星之下
5. 完整流程：档案 → 校准（拖 10cm）→ 3 轮测试（或提前收敛）→ 报告；中途中止一轮功能正常
6. 兼容：Chrome 与 Edge 各跑一遍完整流程
7. 离线：断开网络双击打开，全部功能可用（无外链资源）
8. 边界：DPI 填 50 被拦截；校准跳过有警示；报告数值复制进游戏设置框格式正确

- [ ] **Step 4: 最终 Commit**

```bash
git add valorant-sens-generator.html tests/run-tests.mjs docs/
git commit -m "feat: 暂停恢复、边界防护与 E2E 验证收尾"
```

---

## Self-Review 记录

- **规格覆盖**：§2 四步流程→Task 1/4/11/12；§3 模块划分→Task 1-12 一一对应；§4 数学换算→Task 2（含公式单元验证）；§5 四项测试+倒计时+准星+碰触→Task 3/5/6/7/8/9；§6 迭代算法→Task 10（含三轮模拟测试）；§7 报告→Task 12；§8 错误处理→Task 1（校验）、Task 11（中止）、Task 13（暂停/边界）；§9 验证清单→各任务测试+Task 13 E2E；§10 YAGNI 排除项未引入
- **类型一致性**：`metrics` 形状（grid/track/flash/micro 各字段）在 Task 6-9 定义与 Task 10 引擎消费一致；`TESTS[key].update(st, now)/onCursor(st)/metrics(st)/hudText(st)` 约定在 Task 5 声明、Task 6-9 实现；`st` 状态字段（hits/pops/devSamples/reactions/flashMisses/misses/total/fixes/lastSpawnT/t0）在 Task 5 `start()` 初始化全集；`Report.chartData/radarPoints` 签名 Task 12 定义与测试一致
- **占位符扫描**：无 TBD/TODO；所有步骤含完整代码与预期输出
