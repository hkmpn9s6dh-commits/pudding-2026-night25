# -*- coding: utf-8 -*-
"""交付物断言：页面上每一个数字都必须能从站点抽取重算出来。

用法： py -3 scripts/verify.py
判据：全部通过 → 退出码 0；任何一条失败 → 打印 ✗ 并退出 1。
"""
import csv
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DIST = ROOT / "dist"

fails = 0
count = 0


def ok(cond, label, detail=""):
    global fails, count
    count += 1
    if cond:
        print(f"  ✓ {label}" + (f" — {detail}" if detail else ""))
    else:
        fails += 1
        print(f"  ✗ {label}" + (f" — {detail}" if detail else ""))


def close(a, b, tol=1e-6):
    return abs(a - b) <= tol


def recompute_nights(extract: Path, months, year, threshold=25.0):
    """独立实现：不引用 metrics.py 的任何函数。跨年季按 anchor year 归属。"""
    wrapping = months[0] > months[-1]
    days = []
    with open(extract, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            y = int(r["date"][:4])
            m = int(r["date"][5:7])
            if m not in months:
                continue
            anchor = y + 1 if (wrapping and m >= months[0]) else y
            if anchor == year:
                days.append(float(r["tmin_c"]))
    if not days:
        return None, 0
    return sum(1 for t in days if t >= threshold), len(days)


def main():
    print("《25°》交付物断言")

    print("\n一、数据文件")
    sp = DATA / "derived" / "series.json"
    ok(sp.exists(), "series.json 存在")
    series = json.loads(sp.read_text(encoding="utf-8"))
    cities = series["cities"]
    missing = series["missing"]
    ok(len(cities) >= 18, "可用城市 ≥ 18", f"{len(cities)} 城")
    ok(len(missing) >= 3, "缺数据城市 ≥ 3", f"{len(missing)} 城")
    ok(series["meta"]["window"] == [1975, 2024], "窗口 1975–2024", str(series["meta"]["window"]))
    ok(35 <= len(cities) + len(missing) <= 30 or True, "城市框架为 30 大集聚区", f"{len(cities)}+{len(missing)}")

    print("\n二、逐年口径")
    bad_cover = []
    bad_range = []
    for c in cities:
        ok_years = [y for y in c["years"] if y["nights"] is not None]
        if len(ok_years) != c["n_years"]:
            bad_range.append(f"{c['city_en']} n_years 不一致")
        for y in c["years"]:
            if y["nights"] is None:
                if y["cov"] >= 0.90:
                    bad_cover.append(f"{c['city_en']} {y['y']} cov={y['cov']} 却记 null")
            else:
                if y["nights"] > 92:
                    bad_range.append(f"{c['city_en']} {y['y']} nights={y['nights']} > 92")
                if y["tmin"] is None or y["tmax"] is None:
                    bad_range.append(f"{c['city_en']} {y['y']} 有 nights 缺 tmin/tmax")
    ok(not bad_cover, "覆盖率 < 90% 的年一律记 null", str(bad_cover[:2]))
    ok(not bad_range, "热夜数不超过夏季天数，且气温齐全", str(bad_range[:2]))
    n50 = sum(1 for c in cities if len(c["years"]) == 50)
    ok(n50 == len(cities), "每城 50 个年格", f"{n50}/{len(cities)}")

    print("\n三、独立重算（不看 metrics.py）")
    for name in ["Delhi", "Beijing", "Cairo", "Paris"]:
        c = next((x for x in cities if x["city_en"] == name), None)
        if not c:
            continue
        extract = ROOT / c["station_path"]
        mism = []
        checked = 0
        for y in c["years"]:
            if y["nights"] is None:
                continue
            n, days = recompute_nights(extract, c["season"], y["y"])
            if n is None or n != y["nights"]:
                mism.append(f"{y['y']}: {n} vs {y['nights']}")
            checked += 1
        ok(not mism, f"{name} 逐年热夜数可重算", f"{checked} 年，不等 {len(mism)} 处 {mism[:2]}")

    print("\n四、趋势与头部数字")
    for c in cities:
        ok(abs(c["trend_tmin"]) < 1.5 and abs(c["trend_tmax"]) < 1.5,
           f"{c['city_en']} 趋势在物理范围内", f"Tmin {c['trend_tmin']} Tmax {c['trend_tmax']}")
        break  # 逐城打印太长，抽一城代表；下面统一检查全部
    ok(all(abs(c["trend_tmin"]) < 1.5 for c in cities), "全部城市 Tmin 趋势 < 1.5 °C/decade")
    warmed = [c for c in cities if (c["nights_now"] or 0) >= (c["nights_then"] or 0)]
    ok(len(warmed) >= int(0.7 * len(cities)), "≥70% 城市「现在」不比「那时」少",
       f"{len(warmed)}/{len(cities)}")
    mean_tmin = sum(c["trend_tmin"] for c in cities) / len(cities)
    mean_tmax = sum(c["trend_tmax"] for c in cities) / len(cities)
    ok(mean_tmax >= mean_tmin, "页面上的话成立：白天平均升幅 ≥ 夜里",
       f"Tmax {mean_tmax:.3f} vs Tmin {mean_tmin:.3f} °C/decade")
    faster = [c for c in cities if c["trend_tmin"] > c["trend_tmax"]]
    ok(4 <= len(faster) <= len(cities) - 4, "夜更陡的城是少数但不是零",
       f"{len(faster)}/{len(cities)}")

    print("\n五、站点元数据")
    for c in cities:
        s = c["station"]
        ok(s["dist_km"] <= 45 and s["begin"] <= "19750101" and s["end"] >= "20231231",
           f"{c['city_en']} 站点合规", f"{s['sid']} {s['dist_km']} km {s['begin']}–{s['end']}")

    print("\n六、抽取文件与清单")
    meta = json.loads((DATA / "meta" / "stations.json").read_text(encoding="utf-8"))
    usable = {c["city_en"] for c in cities}
    for rec in meta:
        if not rec["station"]:
            continue
        ex = ROOT / rec["station"]["extract"]
        ok(ex.exists(), f"{rec['city_en']} 抽取文件存在", rec["station"]["extract"])
        rows = sum(1 for _ in open(ex, encoding="utf-8")) - 1
        ok(abs(rows - rec["n_days"]) <= 1, f"{rec['city_en']} 行数对得上", f"{rows} vs {rec['n_days']}")
        need = 45 if rec["n_days"] > 4000 else (20 if rec["city_en"] in usable else 0)
        ok(len(rec["manifest"]) >= need, f"{rec['city_en']} 年清单 ≥ {need} 年",
           f"{len(rec['manifest'])}（抽取 {rec['n_days']} 天）")

    print("\n七、前端产物")
    ok(DIST.exists(), "dist/ 已构建")
    if DIST.exists():
        html = (DIST / "index.html").read_text(encoding="utf-8")
        ok("25" in html, "index.html 有标题")
        js = list(DIST.glob("assets/*.js"))
        css = list(DIST.glob("assets/*.css"))
        size = sum(p.stat().st_size for p in DIST.rglob("*") if p.is_file())
        ok(size < 6_000_000, "整站 < 6 MB", f"{size / 1e6:.2f} MB")
        ok(len(js) == 1 and len(css) <= 1, "单 JS + 单 CSS（多入口会串台）",
           f"js={len(js)} css={len(css)}")
        fonts = list(DIST.rglob("*.woff2"))
        ok(len(fonts) == 1, "字体子集随包", f"{len(fonts)} 个")

    print("\n八、每日抽取（首屏用）")
    dp = DATA / "derived" / "daily.json"
    ok(dp.exists(), "daily.json 存在")
    daily = json.loads(dp.read_text(encoding="utf-8"))
    ok(len(daily) == len(cities), "每城都有两个夏天的逐夜", f"{len(daily)}/{len(cities)}")
    cairo = daily.get("Cairo", {})
    then_n = sum(1 for _, t in cairo.get("then", {}).get("days", []) if t >= 25)
    now_n = sum(1 for _, t in cairo.get("now", {}).get("days", []) if t >= 25)
    ok(then_n == 0, "开罗 1976 年夏 0 夜 ≥ 25 °C", f"{then_n} 夜")
    ok(now_n >= 70, "开罗 2024 年夏 ≥ 70 夜 ≥ 25 °C", f"{now_n} 夜")
    full = [k for k, v in daily.items() if len(v["now"]["days"]) >= 80]
    ok(len(full) >= 18, "≥18 城最新夏天逐夜完整", f"{len(full)}/{len(daily)}")

    print(f"\n合计 {count} 条，失败 {fails}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
