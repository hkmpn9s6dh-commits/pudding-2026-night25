// 页面断言：真浏览器里量。用法 node scripts/e2e.mjs <url>
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const URL = process.argv[2] || "http://127.0.0.1:4173/";
const EXE = process.env.CHROME_PATH ||
  "C:/Users/张一/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe";

const series = JSON.parse(fs.readFileSync(path.resolve("data/derived/series.json"), "utf8"));
const N = series.cities.length;
const M = series.missing.length;

let fails = 0;
let count = 0;
function ok(cond, label, detail = "") {
  count++;
  if (cond) console.log(`  ✓ ${label}${detail ? " — " + detail : ""}`);
  else { fails++; console.log(`  ✗ ${label}${detail ? " — " + detail : ""}`); }
}

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const errors = [];

async function page(width, height = 900) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.waitForFunction(() => Boolean(window.__night25));
  return p;
}

const p = await page(1440);
console.log("一、结构");
ok((await p.title()).includes("Twenty-Five"), "标题正确", await p.title());
const citiesOnPage = await p.evaluate(() => window.__night25.cities.length);
ok(citiesOnPage === N, "页内城市数 = 数据城市数", `${citiesOnPage} vs ${N}`);
const rows = await p.evaluate(() => window.__night25.rows());
ok(rows === N, "墙的行数 = 城市数", `${rows}`);
const cells = await p.evaluate(() => window.__night25.cells());
ok(cells === N * 50, "墙的格子数 = 城市 × 50 年", `${cells} vs ${N * 50}`);
const miss = await p.locator("#missing-list li").count();
ok(miss === M, "缺失清单条目数", `${miss} vs ${M}`);

console.log("二、图表元素");
const slopeDots = await p.locator("#slope circle").count();
ok(slopeDots === N * 2, "哑铃图两端点数", `${slopeDots}`);
const ceilLabel = await p.evaluate(() =>
  Array.from(document.querySelectorAll("#slope text")).map((e) => e.textContent || ""));
ok(ceilLabel.some((t) => t.includes("92")), "哑铃图画出 92 夜天花板",
  ceilLabel.filter((t) => t.includes("92")).join(" "));
const stripDays = await p.locator("#strip .prow__grid i").count();
ok(stripDays >= 160, "首屏两夏逐夜格数 ≥ 160", `${stripDays}`);
const hot = await p.locator("#strip i[data-hot='1']").count();
ok(hot >= 60, "首屏有 ≥ 60 夜 ≥ 25 °C", `${hot} 夜`);
const rows2 = await p.locator("#strip .prow").count();
ok(rows2 === 2, "首屏两行（那时 / 现在）", `${rows2}`);

console.log("三、交互");
await p.locator("#wallchart .cell[data-nights]:not([data-nights=''])").first().hover();
await p.waitForTimeout(120);
const tipText = await p.locator("#tip").innerText();
ok(/nights|夜/.test(tipText) && tipText.length > 4, "悬停出提示", tipText.replace(/\n/g, " "));
const tipOn = await p.locator("#tip").evaluate((el) => el.classList.contains("is-on"));
ok(tipOn, "提示可见");

await p.locator("#lang").click();
await p.waitForTimeout(260);
const zhMode = await p.evaluate(() => document.body.dataset.lang);
ok(zhMode === "zh", "切到中文");
const zhTitle = await p.locator("[data-i18n='wall_title']").innerText();
ok(/窗/.test(zhTitle), "中文文案生效", zhTitle);
const fontOk = await p.evaluate(async () => {
  await document.fonts.ready;
  return document.fonts.check('16px "Night Serif SC"');
});
ok(fontOk, "中文字体随包加载");
const zhCells = await p.evaluate(() => window.__night25.cells());
ok(zhCells === N * 50, "切语言后图表重绘且不丢格子", `${zhCells}`);
await p.locator("#lang").click();
await p.waitForTimeout(220);
ok((await p.evaluate(() => document.body.dataset.lang)) === "en", "切回英文");

console.log("四、版面（三种宽度）");
for (const w of [390, 768, 1440]) {
  const q = await page(w, w === 390 ? 844 : 900);
  const over = await q.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    win: window.innerWidth,
    wide: Array.from(document.querySelectorAll("body *"))
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1.5)
      .slice(0, 3).map((el) => el.className || el.tagName),
  }));
  ok(over.doc <= over.win + 1, `${w}px 无横向溢出`, `${over.doc} vs ${over.win} ${JSON.stringify(over.wide)}`);
  const contrast = await q.evaluate(() => {
    const rgb = (s) => s.match(/\d+/g).map(Number);
    const lum = ([r, g, b]) => {
      const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const el = document.querySelector(".lede__p");
    const cs = getComputedStyle(el);
    const l1 = lum(rgb(cs.color));
    const l2 = lum(rgb(getComputedStyle(document.body).backgroundColor));
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  });
  ok(contrast > 4.5, `${w}px 正文对比度 > 4.5`, contrast.toFixed(2));
  await q.context().close();
}

console.log("五、滚动叙事");
const s = await page(1440, 900);
const steps = s.locator(".step");
await steps.nth(1).scrollIntoViewIfNeeded();
await s.waitForTimeout(500);
const active = await s.locator(".step.is-active").count();
ok(active >= 1, "滚动到第二步时 step 被激活");
const dimmed = await s.locator("#wallchart .cell.is-dim").count();
ok(dimmed > 0, "激活后有时间窗高亮", `${dimmed} 格变暗`);
await s.context().close();

console.log("六、健康度");
ok(errors.length === 0, "无控制台错误", errors.slice(0, 2).join(" | "));

await browser.close();
console.log(`\n合计 ${count} 条，失败 ${fails}`);
process.exit(fails ? 1 : 0);
