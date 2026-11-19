import seriesJson from "../data/derived/series.json";
import dailyJson from "../data/derived/daily.json";
import { copy, type Lang, type Summary } from "./i18n";
import {
  renderPairStrip, renderWall, renderSlope, highlightWall,
  type City, type Daily, type Series, type YearRow,
} from "./charts";

const S = seriesJson as unknown as Series;
const DAILY = dailyJson as unknown as Daily;
(window as any).__daily = DAILY;

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

const withNow = S.cities.filter((c) => c.nights_now !== null);
const hottest = withNow.slice().sort((a, b) => (b.nights_now as number) - (a.nights_now as number))[0];


const summary: Summary = {
  nCities: S.cities.length,
  nAttempted: S.cities.length + S.missing.length,
  from: S.meta.window[0],
  to: S.meta.window[1],
  nightsThen: mean(withNow.map((c) => c.nights_then as number)),
  nightsNow: mean(withNow.map((c) => c.nights_now as number)),
  ceiling: 92,
  rose: withNow.filter((c) => (c.nights_now as number) - (c.nights_then as number) >= 5).length,
  fell: withNow.filter((c) => (c.nights_now as number) - (c.nights_then as number) <= -5).length,
  flat: withNow.filter((c) => {
    const d = (c.nights_now as number) - (c.nights_then as number);
    return d > -5 && d < 5;
  }).length,
  cairo: pick("Cairo"),
  karachi: pick("Karachi"),
  delhi: pick("Delhi"),
  nightsFaster: S.cities.filter((c) => c.trend_tmin > c.trend_tmax).length,
  tminSlope: mean(S.cities.map((c) => c.trend_tmin)),
  tmaxSlope: mean(S.cities.map((c) => c.trend_tmax)),
  hottest: { en: hottest.city_en, zh: hottest.city_zh, now: Math.round(hottest.nights_now as number) },
  missingHot: S.missing.map((m) => m.city_en),
};

function pick(name: string) {
  const c = S.cities.find((x) => x.city_en === name);
  return {
    en: name,
    zh: c?.city_zh ?? name,
    then: Math.round(((c?.nights_then ?? 0) as number) * 10) / 10,
    now: Math.round(((c?.nights_now ?? 0) as number) * 10) / 10,
  };
}

/* ---------- i18n ---------- */
let lang: Lang = (localStorage.getItem("night25.lang") as Lang) || "en";
const texts = () => copy(summary, lang);

function applyLang(next: Lang, rerender = true) {
  lang = next;
  localStorage.setItem("night25.lang", lang);
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.body.dataset.lang = lang;
  const dict = texts();
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n as string;
    const v = dict[key];
    if (v === undefined) return;
    if (el.dataset.i18nHtml === "1") el.innerHTML = v;
    else el.textContent = v;
  });
  const btn = document.getElementById("lang") as HTMLButtonElement;
  btn.dataset.mode = lang;
  btn.setAttribute("aria-label", lang === "en" ? "切换到中文" : "Switch to English");
  if (rerender) renderAll();
}

/* ---------- tooltip ---------- */
const tip = document.getElementById("tip") as HTMLElement;
function showTip(ev: MouseEvent, city: City, row: YearRow) {
  const name = lang === "zh" ? city.city_zh : city.city_en;
  if (row.nights === null) {
    tip.innerHTML = `<b>${name}</b> · ${row.y} — <span style="opacity:.7">${lang === "zh" ? "没有可用记录" : "no usable record"}</span>`;
  } else {
    tip.innerHTML = `<b>${name}</b> · ${row.y} — <span class="tip__n">${row.nights}</span> ${lang === "zh" ? "夜 ≥ 25 °C" : "nights ≥ 25 °C"}`;
  }
  tip.classList.add("is-on");
  tip.style.left = `${Math.min(window.innerWidth - 80, Math.max(80, ev.clientX))}px`;
  tip.style.top = `${ev.clientY}px`;
}
function hideTip() { tip.classList.remove("is-on"); }

/* ---------- render ---------- */
const wallEl = document.getElementById("wallchart") as HTMLElement;

function renderAll() {
  renderWall(wallEl, S, lang, showTip, hideTip);
  wallEl.dataset.hottest = hottest.city_en;
  renderSlope(document.getElementById("slope") as HTMLElement, S, lang);
  const hero = S.cities.find((c) => c.city_en === "Cairo") ?? hottest;
  renderPairStrip(document.getElementById("strip") as HTMLElement, hero, lang, DAILY);
  const cap = document.getElementById("strip-cap");
  if (cap) {
    const p = DAILY[hero.city_en];
    const n = (days: [string, number][]) => days.filter(([, t]) => t >= 25).length;
    cap.textContent = lang === "zh"
      ? `${hero.city_zh}。1976 年夏：${n(p.then.days)} 夜。2024 年夏：${n(p.now.days)} 夜。`
      : `${hero.city_en}. Summer ${p.then.year}: ${n(p.then.days)} nights. Summer ${p.now.year}: ${n(p.now.days)} nights.`;
  }
  const miss = document.getElementById("missing-list") as HTMLElement;
  miss.innerHTML = S.missing.slice().sort((a, b) => (b.usable ?? 0) - (a.usable ?? 0)).map((m) => {
    const name = lang === "zh" ? m.city_zh : m.city_en;
    const why = lang === "zh"
      ? m.reason.replace("no airport station with a 1975–2024 record within 45 km", "45 km 内没有 1975–2024 年连续记录的站点")
                    .replace(/only (\d+) usable summers/, "只有 $1 个可用夏天")
      : m.reason;
    return `<li><span>${name}<span style="color:var(--muted)"> · ${m.country}</span></span><span class="why">${why}</span></li>`;
  }).join("");
}

/* ---------- scrolly ---------- */
const steps = Array.from(document.querySelectorAll<HTMLElement>(".step"));
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target as HTMLElement;
      steps.forEach((s) => s.classList.toggle("is-active", s === el));
      highlightWall(wallEl, Number(el.dataset.step));
    });
  },
  { threshold: 0.55, rootMargin: "-10% 0px -10% 0px" },
);
steps.forEach((s) => io.observe(s));

/* ---------- boot ---------- */
document.getElementById("lang")?.addEventListener("click", () => {
  applyLang(lang === "en" ? "zh" : "en");
});

const repo = document.getElementById("repo") as HTMLAnchorElement | null;
if (repo) repo.href = "https://github.com/hkmpn9s6dh-commits/pudding-2026-night25";

let t: number | undefined;
window.addEventListener("resize", () => {
  window.clearTimeout(t);
  t = window.setTimeout(() => renderAll(), 180);
});

applyLang(lang, true);

// 给 e2e 断言用：页面自己报出它的形状
(window as any).__night25 = {
  get lang() { return lang; },
  cities: S.cities.map((c) => c.city_en),
  missing: S.missing.map((m) => m.city_en),
  rows: () => document.querySelectorAll("#wallchart .row").length,
  cells: () => document.querySelectorAll("#wallchart .cell").length,
  hotYears: () => S.cities.reduce((n, c) => n + c.years.filter((y) => (y.nights ?? 0) >= 50).length, 0),
  summary,
};
