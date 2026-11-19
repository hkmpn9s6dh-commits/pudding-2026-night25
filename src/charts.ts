import type { Lang } from "./i18n";

export type YearRow = {
  y: number;
  nights: number | null;
  tmin: number | null;
  tmax: number | null;
  cov: number;
};

export type City = {
  city_en: string;
  city_zh: string;
  country: string;
  lat: number;
  lon: number;
  season: number[];
  station: { sid: string; name: string; dist_km: number; begin: string; end: string };
  years: YearRow[];
  n_years: number;
  nights_then: number | null;
  nights_now: number | null;
  tmin_then: number | null;
  tmin_now: number | null;
  tmax_then: number | null;
  tmax_now: number | null;
  max_nights: number;
  max_year: number;
  trend_nights: number;
  trend_tmin: number;
  trend_tmax: number;
};

export type Missing = { city_en: string; city_zh: string; country: string; reason: string; usable?: number };

export type Series = {
  meta: {
    window: [number, number];
    then: [number, number];
    now: [number, number];
    threshold_c: number;
    min_cover: number;
    source: string;
    city_frame: string;
  };
  cities: City[];
  missing: Missing[];
};

const label = (c: City, lang: Lang) => (lang === "zh" ? c.city_zh : c.city_en);

/* ---------- colour ---------- */
const STOPS: [number, string][] = [
  [0, "#243350"],
  [0.08, "#22304a"],
  [0.28, "#3b3f63"],
  [0.48, "#7a4a4a"],
  [0.68, "#b4552c"],
  [0.86, "#e08a2e"],
  [1, "#ffd08a"],
];

function hex2rgb(h: string) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

export function nightColor(t: number): string {
  const v = Math.max(0, Math.min(1, t));
  for (let i = 1; i < STOPS.length; i++) {
    if (v <= STOPS[i][0]) {
      const [a, ca] = STOPS[i - 1];
      const [b, cb] = STOPS[i];
      const k = (v - a) / (b - a || 1);
      const A = hex2rgb(ca);
      const B = hex2rgb(cb);
      return `rgb(${Math.round(A[0] + (B[0] - A[0]) * k)},${Math.round(A[1] + (B[1] - A[1]) * k)},${Math.round(A[2] + (B[2] - A[2]) * k)})`;
    }
  }
  return STOPS[STOPS.length - 1][1];
}

/** 单夜的色：按 Tmin 直接映射，18–32 °C */
export function degreeColor(t: number | null): string {
  if (t === null) return "#0f131a";
  const v = Math.max(0, Math.min(1, (t - 18) / (32 - 18)));
  if (t >= 25) return nightColor(0.5 + v * 0.5);
  return nightColor(v * 0.45);
}

/* ---------- 1. two summers, one city ---------- */
export type Daily = Record<string, { then: { year: number; days: [string, number][] };
                                    now: { year: number; days: [string, number][] } }>;

export function renderPairStrip(el: HTMLElement, city: City, lang: Lang, daily: Daily) {
  const d = daily[city.city_en];
  el.innerHTML = "";
  el.classList.add("pairstrip");
  const rows: [string, { year: number; days: [string, number][] }][] = [
    [lang === "zh" ? "那时" : "then", d.then],
    [lang === "zh" ? "现在" : "now", d.now],
  ];
  const cells = rows[0][1].days.length || 92;
  el.style.setProperty("--cells", String(cells));
  rows.forEach(([tag, slot]) => {
    const row = document.createElement("div");
    row.className = "prow";
    const lab = document.createElement("div");
    lab.className = "prow__lab";
    lab.innerHTML = `<b>${slot.year}</b><span>${tag}</span>`;
    row.appendChild(lab);
    const grid = document.createElement("div");
    grid.className = "prow__grid";
    let hot = 0;
    slot.days.forEach(([, tmin]) => {
      const dd = document.createElement("i");
      dd.style.background = degreeColor(tmin);
      if (tmin >= 25) { dd.dataset.hot = "1"; hot++; }
      dd.dataset.tmin = String(tmin);
      grid.appendChild(dd);
    });
    row.appendChild(grid);
    const num = document.createElement("div");
    num.className = "prow__num";
    num.innerHTML = `<b>${hot}</b><span>${lang === "zh" ? "夜 ≥ 25°" : "nights ≥ 25°"}</span>`;
    row.appendChild(num);
    el.appendChild(row);
    row.dataset.hot = String(hot);
  });
}

/* ---------- 2. the wall ---------- */
export function renderWall(
  el: HTMLElement,
  series: Series,
  lang: Lang,
  onHover: (ev: MouseEvent, city: City, row: YearRow) => void,
  onLeave: () => void,
) {
  const cities = [...series.cities].sort((a, b) => (b.nights_now ?? 0) - (a.nights_now ?? 0));
  const years = range(series.meta.window[0], series.meta.window[1]);
  const width = Math.max(320, el.clientWidth || 900);
  const labelW = width < 700 ? 88 : 148;
  const rowH = width < 700 ? 15 : 18;
  const height = cities.length * rowH + 58;
  const cellW = (width - labelW - 4) / years.length;
  const maxN = Math.max(...cities.map((c) => c.max_nights), 1);
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("height", String(height));
  svg.setAttribute("role", "img");

  cities.forEach((c, i) => {
    const y = i * rowH;
    const g = document.createElementNS(ns, "g");
    g.setAttribute("class", "row");
    g.dataset.city = c.city_en;
    const t = document.createElementNS(ns, "text");
    t.setAttribute("class", "row-label");
    t.setAttribute("x", String(labelW - 8));
    t.setAttribute("y", String(y + rowH * 0.72));
    t.setAttribute("text-anchor", "end");
    t.textContent = truncate(label(c, lang), width < 700 ? 10 : 18);
    g.appendChild(t);
    c.years.forEach((r, j) => {
      if (r.y < years[0] || r.y > years[years.length - 1]) return;
      const rect = document.createElementNS(ns, "rect");
      const x = labelW + (r.y - years[0]) * cellW;
      rect.setAttribute("x", x.toFixed(1));
      rect.setAttribute("y", String(y + 1));
      rect.setAttribute("width", Math.max(1, cellW - 0.7).toFixed(1));
      rect.setAttribute("height", String(rowH - 2.4));
      const isMissing = r.nights === null;
      rect.setAttribute("fill", isMissing ? "#e7e0d1" : nightColor(Math.sqrt((r.nights as number) / maxN)));
      rect.setAttribute("class", "cell" + (isMissing ? " cell--missing" : ""));
      if (isMissing) rect.setAttribute("stroke", "rgba(20,23,28,.10)");
      rect.dataset.city = c.city_en;
      rect.dataset.year = String(r.y);
      rect.dataset.nights = r.nights === null ? "" : String(r.nights);
      rect.addEventListener("mousemove", (ev) => onHover(ev, c, r));
      rect.addEventListener("mouseleave", onLeave);
      g.appendChild(rect);
    });
    svg.appendChild(g);
  });

  [years[0], 1990, 2000, 2010, years[years.length - 1]].forEach((yr) => {
    const x = labelW + (yr - years[0]) * cellW;
    const t = document.createElementNS(ns, "text");
    t.setAttribute("class", "year-tick");
    t.setAttribute("x", String(x + cellW / 2));
    t.setAttribute("y", String(height - 30));
    t.setAttribute("text-anchor", "middle");
    t.textContent = String(yr);
    svg.appendChild(t);
  });

  // 图例：一条 0→92 的渐变
  const defs = document.createElementNS(ns, "defs");
  const grad = document.createElementNS(ns, "linearGradient");
  grad.setAttribute("id", "nscale");
  STOPS.forEach(([o, c]) => {
    const st = document.createElementNS(ns, "stop");
    st.setAttribute("offset", `${o * 100}%`);
    st.setAttribute("stop-color", c);
    grad.appendChild(st);
  });
  defs.appendChild(grad);
  svg.appendChild(defs);
  const lw2 = width - 220;
  const bar = document.createElementNS(ns, "rect");
  bar.setAttribute("x", String(lw2));
  bar.setAttribute("y", String(height - 13));
  bar.setAttribute("width", "120");
  bar.setAttribute("height", "8");
  bar.setAttribute("fill", "url(#nscale)");
  svg.appendChild(bar);
  const lz = document.createElementNS(ns, "text");
  lz.setAttribute("class", "year-tick");
  lz.setAttribute("x", String(lw2 - 6));
  lz.setAttribute("y", String(height - 5));
  lz.setAttribute("text-anchor", "end");
  lz.textContent = "0";
  svg.appendChild(lz);
  const lh = document.createElementNS(ns, "text");
  lh.setAttribute("class", "year-tick");
  lh.setAttribute("x", String(lw2 + 126));
  lh.setAttribute("y", String(height - 5));
  lh.textContent = lang === "zh" ? "92 夜" : "92 nights";
  svg.appendChild(lh);

  const band = document.createElementNS(ns, "rect");
  band.setAttribute("class", "band");
  band.setAttribute("fill", "none");
  band.setAttribute("stroke", "#c8402c");
  band.setAttribute("stroke-width", "1.6");
  band.setAttribute("opacity", "0");
  band.dataset.labelw = String(labelW);
  band.dataset.cellw = String(cellW);
  band.dataset.rowh = String(rowH);
  band.dataset.y0 = String(years[0]);
  band.dataset.h = String(height);
  svg.appendChild(band);

  el.innerHTML = "";
  el.appendChild(svg);
  el.dataset.rows = String(cities.length);
  el.dataset.cells = String(cellsCount(cities, years));
}

function cellsCount(cities: City[], years: number[]) {
  let n = 0;
  cities.forEach((c) => c.years.forEach((r) => {
    if (r.y >= years[0] && r.y <= years[years.length - 1]) n++;
  }));
  return n;
}

export function highlightWall(el: HTMLElement, mode: number) {
  const svg = el.querySelector("svg");
  if (!svg) return;
  const band = svg.querySelector<SVGRectElement>(".band");
  if (band) {
    const lw = Number(band.dataset.labelw);
    const cw = Number(band.dataset.cellw);
    const y0 = Number(band.dataset.y0);
    const h = Number(band.dataset.h);
    const win: [number, number] | null = mode === 0 ? [1975, 1985] : mode === 1 ? [2014, 2024] : null;
    if (win) {
      band.setAttribute("x", String(lw + (win[0] - y0) * cw - 1));
      band.setAttribute("y", "1");
      band.setAttribute("width", String((win[1] - win[0] + 1) * cw));
      band.setAttribute("height", String(h - 22));
      band.setAttribute("opacity", "0.9");
    } else {
      band.setAttribute("opacity", "0");
    }
  }
  const cells = svg.querySelectorAll<SVGRectElement>(".cell");
  const rows = svg.querySelectorAll<SVGGElement>(".row");
  rows.forEach((r) => r.classList.remove("is-focus"));
  cells.forEach((c) => {
    c.classList.remove("is-dim", "is-focus");
    const y = Number(c.dataset.year);
    if (mode === 0) { if (y > 1985) c.classList.add("is-dim"); }
    else if (mode === 1) { if (y < 2015) c.classList.add("is-dim"); }
    else if (mode === 2) { if (c.dataset.nights !== "") c.classList.add("is-dim"); }
    else if (mode === 3) { /* handled by row focus below */ }
  });
  if (mode === 3) {
    const hottest = el.dataset.hottest;
    if (hottest) {
      rows.forEach((r) => {
        const on = r.dataset.city === hottest;
        r.classList.toggle("is-focus", on);
        r.querySelectorAll(".cell").forEach((c) => c.classList.toggle("is-dim", !on));
      });
    }
  }
}

/* ---------- 3. dumbbell ---------- */
export function renderSlope(el: HTMLElement, series: Series, lang: Lang) {
  const cities = series.cities
    .filter((c) => c.nights_then !== null && c.nights_now !== null)
    .sort((a, b) => (b.nights_now as number) - (a.nights_now as number));
  const width = Math.max(620, el.clientWidth || 880);
  const rowH = 24;
  const pad = { l: width < 700 ? 100 : 150, r: 62, t: 30, b: 40 };
  const height = cities.length * rowH + pad.t + pad.b;
  const max = 92; // 一个夏天最多 92 夜 —— 这就是天花板，画出来
  const x = (v: number) => pad.l + (v / max) * (width - pad.l - pad.r);
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));

  const ticks = niceTicks(max, 4);
  ticks.forEach((tv) => {
    const g = document.createElementNS(ns, "line");
    g.setAttribute("class", "gridline");
    g.setAttribute("x1", String(x(tv)));
    g.setAttribute("x2", String(x(tv)));
    g.setAttribute("y1", String(pad.t - 12));
    g.setAttribute("y2", String(height - pad.b));
    svg.appendChild(g);
    const t = document.createElementNS(ns, "text");
    t.setAttribute("class", "tick");
    t.setAttribute("x", String(x(tv)));
    t.setAttribute("y", String(height - pad.b + 16));
    t.setAttribute("text-anchor", "middle");
    t.textContent = String(tv);
    svg.appendChild(t);
  });

  // 天花板
  const ceil = document.createElementNS(ns, "line");
  ceil.setAttribute("x1", String(x(max)));
  ceil.setAttribute("x2", String(x(max)));
  ceil.setAttribute("y1", String(pad.t - 16));
  ceil.setAttribute("y2", String(height - pad.b));
  ceil.setAttribute("stroke", "#c8402c");
  ceil.setAttribute("stroke-width", "1.2");
  ceil.setAttribute("stroke-dasharray", "4 4");
  svg.appendChild(ceil);
  const ceilLabel = document.createElementNS(ns, "text");
  ceilLabel.setAttribute("class", "tick");
  ceilLabel.setAttribute("x", String(x(max) - 6));
  ceilLabel.setAttribute("y", String(pad.t - 12));
  ceilLabel.setAttribute("text-anchor", "end");
  ceilLabel.textContent = lang === "zh" ? "92 夜 = 整个夏天" : "92 nights = every night";
  svg.appendChild(ceilLabel);

  cities.forEach((c, i) => {
    const y = pad.t + i * rowH + rowH / 2;
    const a = c.nights_then as number;
    const b = c.nights_now as number;
    const l = document.createElementNS(ns, "line");
    l.setAttribute("class", "conn");
    l.setAttribute("x1", String(x(a)));
    l.setAttribute("x2", String(x(b)));
    l.setAttribute("y1", String(y));
    l.setAttribute("y2", String(y));
    l.setAttribute("stroke", b >= a ? "#c8402c" : "#3a6b8f");
    l.setAttribute("opacity", "0.55");
    svg.appendChild(l);
    [
      [a, "#9c9484", 3.2],
      [b, "#c8402c", 4.6],
    ].forEach(([v, fill, r]) => {
      const dot = document.createElementNS(ns, "circle");
      dot.setAttribute("cx", String(x(v as number)));
      dot.setAttribute("cy", String(y));
      dot.setAttribute("r", String(r));
      dot.setAttribute("fill", fill as string);
      svg.appendChild(dot);
    });
    const t = document.createElementNS(ns, "text");
    t.setAttribute("class", "lbl");
    t.setAttribute("x", String(pad.l - 10));
    t.setAttribute("y", String(y + 4));
    t.setAttribute("text-anchor", "end");
    t.textContent = truncate(label(c, lang), width < 700 ? 11 : 16);
    svg.appendChild(t);
    const v = document.createElementNS(ns, "text");
    v.setAttribute("class", "tick tick--val");
    v.setAttribute("x", String(width - pad.r + 12));
    v.setAttribute("y", String(y + 4));
    const d = Math.round(b) - Math.round(a);
    v.textContent = d === 0 ? "0" : `${d > 0 ? "+" : "−"}${Math.abs(d)}`;
    v.setAttribute("fill", d > 0 ? "#c8402c" : d < 0 ? "#3a6b8f" : "#8d8779");
    svg.appendChild(v);
  });

  el.innerHTML = "";
  el.appendChild(svg);
}

/* ---------- 4. scatter ---------- */
export function renderScatter(el: HTMLElement, series: Series, lang: Lang) {
  const cities = series.cities.filter(
    (c) => Number.isFinite(c.trend_tmin) && Number.isFinite(c.trend_tmax),
  );
  const width = Math.max(600, el.clientWidth || 860);
  const height = Math.round(width * 0.62);
  const pad = { l: 58, r: 26, t: 22, b: 52 };
  const xs = cities.map((c) => c.trend_tmax);
  const ys = cities.map((c) => c.trend_tmin);
  const lo = Math.min(...xs, ...ys) - 0.1;
  const hi = Math.max(...xs, ...ys, 0.6) + 0.1;
  const x = (v: number) => pad.l + ((v - lo) / (hi - lo)) * (width - pad.l - pad.r);
  const y = (v: number) => height - pad.b - ((v - lo) / (hi - lo)) * (height - pad.t - pad.b);
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));

  const ticks = niceTicks(hi, 5).filter((t) => t >= lo);
  ticks.forEach((tv) => {
    [["x1", x(tv), "x2", x(tv), "y1", pad.t, "y2", height - pad.b],
     ["x1", pad.l, "x2", width - pad.r, "y1", y(tv), "y2", y(tv)]].forEach((arr) => {
      const g = document.createElementNS(ns, "line");
      g.setAttribute("class", "gridline");
      for (let i = 0; i < arr.length; i += 2) g.setAttribute(arr[i] as string, String(arr[i + 1]));
      svg.appendChild(g);
    });
    const tx = document.createElementNS(ns, "text");
    tx.setAttribute("class", "tick");
    tx.setAttribute("x", String(x(tv)));
    tx.setAttribute("y", String(height - pad.b + 18));
    tx.setAttribute("text-anchor", "middle");
    tx.textContent = tv.toFixed(1);
    svg.appendChild(tx);
    const ty = document.createElementNS(ns, "text");
    ty.setAttribute("class", "tick");
    ty.setAttribute("x", String(pad.l - 10));
    ty.setAttribute("y", String(y(tv) + 4));
    ty.setAttribute("text-anchor", "end");
    ty.textContent = tv.toFixed(1);
    svg.appendChild(ty);
  });

  // 1:1
  const d1 = document.createElementNS(ns, "line");
  d1.setAttribute("x1", String(x(lo)));
  d1.setAttribute("y1", String(y(lo)));
  d1.setAttribute("x2", String(x(hi)));
  d1.setAttribute("y2", String(y(hi)));
  d1.setAttribute("stroke", "#e8a33d");
  d1.setAttribute("stroke-width", "1.4");
  d1.setAttribute("stroke-dasharray", "5 5");
  svg.appendChild(d1);

  cities.forEach((c) => {
    const dot = document.createElementNS(ns, "circle");
    dot.setAttribute("cx", String(x(c.trend_tmax)));
    dot.setAttribute("cy", String(y(c.trend_tmin)));
    dot.setAttribute("r", "4.6");
    dot.setAttribute("fill", c.trend_tmin > c.trend_tmax ? "#e8a33d" : "#7f8ba3");
    dot.dataset.city = c.city_en;
    svg.appendChild(dot);
  });

  // 只给三个极端贴标签，避免糊成一团
  const labelled = [
    ...cities.slice().sort((a, b) => b.trend_tmin - a.trend_tmin).slice(0, 2),
    ...cities.slice().sort((a, b) => a.trend_tmin - b.trend_tmin).slice(0, 1),
  ];
  labelled.forEach((c) => {
    const t = document.createElementNS(ns, "text");
    t.setAttribute("class", "lbl lbl--night");
    t.setAttribute("x", String(x(c.trend_tmax) + 8));
    t.setAttribute("y", String(y(c.trend_tmin) - 7));
    t.textContent = label(c, lang);
    svg.appendChild(t);
  });

  el.innerHTML = "";
  el.appendChild(svg);
}

/* ---------- helpers ---------- */
export function range(a: number, b: number) {
  const out: number[] = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}

function niceTicks(max: number, n: number) {
  const raw = max / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag;
  const out: number[] = [];
  for (let v = 0; v <= max + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
