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

// ==== Task 4 测试 ====
test('px/cm 计算', () => {
  assertClose(S.Calibrator.calcPxPerCm(378, 10), 37.8, 1e-9);
  assertEq(S.Calibrator.calcPxPerCm(0, 10), 0);
  assertEq(S.Calibrator.calcPxPerCm(500, 0), 0, 'cm 为 0 时返回 0');
});
test('默认回退值', () => { assertEq(S.Calibrator.DEFAULT_PX_PER_CM, 37.8); });

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

// ==== Task 8 测试 ====
test('微调指标：命中率与平均修正时间', () => {
  const st = { total: 10, hits: 8, fixes: [300, 400, 500, 600, 700, 800, 900, 1000] };
  const m = S.TESTS.micro.metrics(st);
  assertEq(m.hitRate, 0.8);
  assertClose(m.avgFixMs, 650, 0.001);
});

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

// ==== Task 13 测试 ====
test('TestEngine.draw 终止后不再渲染多余帧', () => {
  const st = {
    _dead: true,
    ctx: {
      ctx: { clearRect() { throw new Error('终止后不应再调用 clearRect'); } },
      area: { clientWidth: 800, clientHeight: 600 },
    },
    target: null,
    cursor: { x: 0, y: 0 },
  };
  S.TestEngine.draw(st);
});

// ==== 修复回归：开场倒计时必须推进（intro 未启动会永远卡在 3 秒） ====
test('TestEngine.update 自动启动并推进 intro，测试正常开始', () => {
  let t = 0;
  const clock = () => t;
  const st = {
    key: 'grid', t: S.TESTS.grid,
    ctx: {
      area: { clientWidth: 1000, clientHeight: 500, classList: { add() {}, remove() {} } },
      sens: 0.3, dpi: 800, pxPerCm: 37.8,
    },
    countdown: new S.Countdown(60000, clock),
    intro: new S.Countdown(3000, clock), // 与 TestEngine.start 创建时一致：从未被 start()
    cursor: { x: 500, y: 250 },
    running: false, paused: false, _dead: false,
    target: null, samples: [],
    hits: 0, pops: [], devSamples: [], reactions: [], flashMisses: [], misses: 0, total: 0, fixes: [], lastSpawnT: 0, t0: null,
  };
  for (let i = 0; i < 240; i++) { t += 16.7; S.TestEngine.update(st); }
  assertEq(st.intro.done(), true);    // intro 完成，不卡 3 秒
  assertEq(st.running, true);         // 已交接给测试计时
  assertEq(st.target !== null, true); // 测试已开始出靶
});

summary();
