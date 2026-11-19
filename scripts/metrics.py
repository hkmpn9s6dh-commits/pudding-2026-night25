# -*- coding: utf-8 -*-
"""从夏季逐日抽取算指标：每城每年「热夜数」与夜/昼趋势。

口径（同一份写进页面脚注与 SPEC）：
- 夏季 = 1991–2020 基准期里月均 TMIN 最高的连续三个月（南半球自动落到 12–2 月）。
- 热夜 = 夏季里 TMIN ≥ 25.0 °C 的那一夜。WMO 的国际通用阈值是 20 °C；
  中国长三角（沪宁杭）气象部门按本地湿热气候采用 25 °C —— 本项目沿用 25 °C，
  因为问的是「能不能睡」，不是「会不会结霜」。
- 某年夏季有效观测 < 90% → 该年记 null，不插值。
- 「那时」= 1976–1995 平均，「现在」= 2005–2024 平均。
- 趋势 = 对有效年做最小二乘，有效年 < 35 的城市不出趋势。
"""
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from cities import YEAR_FROM, YEAR_TO  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
THRESHOLD = 25.0
BASE_MONTH_DAYS = {1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30,
                   7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31}
MIN_COVER = 0.90
MIN_YEARS = 35
THEN = (1976, 1995)
NOW = (2005, 2024)


def ols(xs, ys):
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs)
    if sxx == 0:
        return None, None
    b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx
    a = my - b * mx
    ss_tot = sum((y - my) ** 2 for y in ys)
    ss_res = sum((y - (a + b * x)) ** 2 for x, y in zip(xs, ys))
    return b, (1 - ss_res / ss_tot if ss_tot else 0.0)


def season_year(date, months):
    y, m = int(date[:4]), int(date[5:7])
    if months[0] > months[-1] and m >= months[0]:
        return y + 1
    return y


def load_extract(path, months):
    by_year = defaultdict(list)
    with open(path, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            by_year[season_year(r["date"], months)].append(
                (r["date"], float(r["tmin_c"]), float(r["tmax_c"])))
    return by_year


def main():
    meta = json.loads((DATA / "meta" / "stations.json").read_text(encoding="utf-8"))
    cities, missing = [], []
    for rec in meta:
        st = rec["station"]
        if not st:
            missing.append(dict(city_en=rec["city_en"], city_zh=rec["city_zh"],
                                country=rec["country"], usable=0,
                                reason="no airport station with a 1975–2024 record within 45 km"))
            continue
        months = rec["season"]
        expected = sum(BASE_MONTH_DAYS[m] for m in months)
        by_year = load_extract(ROOT / st["extract"], months)
        years = []
        for y in range(YEAR_FROM, YEAR_TO + 1):
            rows = by_year.get(y, [])
            cov = len(rows) / expected
            if cov < MIN_COVER:
                years.append(dict(y=y, nights=None, tmin=None, tmax=None, cov=round(cov, 3)))
                continue
            nights = sum(1 for _, tmin, _ in rows if tmin >= THRESHOLD)
            years.append(dict(
                y=y, nights=nights, cov=round(cov, 3),
                tmin=round(sum(t for _, t, _ in rows) / len(rows), 2),
                tmax=round(sum(x for _, _, x in rows) / len(rows), 2)))
        good = [r for r in years if r["nights"] is not None]
        if len(good) < MIN_YEARS:
            missing.append(dict(city_en=rec["city_en"], city_zh=rec["city_zh"],
                                country=rec["country"], usable=len(good),
                                reason=f"only {len(good)} usable summers"))
            continue
        xs = [r["y"] for r in good]
        b_n, r2_n = ols(xs, [r["nights"] for r in good])
        b_t, r2_t = ols(xs, [r["tmin"] for r in good])
        b_x, r2_x = ols(xs, [r["tmax"] for r in good])

        def mean_in(a, b, key):
            v = [r[key] for r in good if a <= r["y"] <= b]
            return round(sum(v) / len(v), 1) if v else None

        rec_out = dict(
            city_en=rec["city_en"], city_zh=rec["city_zh"], country=rec["country"],
            lat=rec["lat"], lon=rec["lon"], season=months,
            station=dict(sid=st["sid"], name=st["name"], dist_km=st["dist_km"],
                         begin=st["begin"], end=st["end"], extract=st["extract"]),
            station_path=st["extract"],
            years=years, n_years=len(good),
            nights_then=mean_in(*THEN, "nights"), nights_now=mean_in(*NOW, "nights"),
            tmin_then=mean_in(*THEN, "tmin"), tmin_now=mean_in(*NOW, "tmin"),
            tmax_then=mean_in(*THEN, "tmax"), tmax_now=mean_in(*NOW, "tmax"),
            max_nights=max(r["nights"] for r in good),
            max_year=max(good, key=lambda r: r["nights"])["y"],
            trend_nights=round(b_n * 10, 2), trend_nights_r2=round(r2_n, 3),
            trend_tmin=round(b_t * 10, 3), trend_tmin_r2=round(r2_t, 3),
            trend_tmax=round(b_x * 10, 3), trend_tmax_r2=round(r2_x, 3),
        )
        cities.append(rec_out)
        print(f"{rec_out['city_en']:15s} {months} n={len(good):2d} "
              f"nights {rec_out['nights_then']}→{rec_out['nights_now']} "
              f"tmin {rec_out['tmin_then']}→{rec_out['tmin_now']} "
              f"slope N={rec_out['trend_nights']}/dec Tmin={rec_out['trend_tmin']} Tmax={rec_out['trend_tmax']}")

    out = dict(meta=dict(window=[YEAR_FROM, YEAR_TO], then=list(THEN), now=list(NOW),
                         threshold_c=THRESHOLD, min_cover=MIN_COVER,
                         source="NOAA GSOD (global-summary-of-the-day), airport stations",
                         city_frame="UN WPP 2018 top-30 urban agglomerations"),
               cities=cities, missing=missing)
    (DATA / "derived").mkdir(parents=True, exist_ok=True)
    (DATA / "derived" / "series.json").write_text(
        json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    # 首屏那条「一个夏天 92 夜」：同一座城、相隔五十年的两个夏天
    daily = {}
    for c in cities:
        rows = load_extract(ROOT / c["station_path"], c["season"])
        by = {y: [(d, t) for d, t, _ in sorted(v)] for y, v in rows.items()}
        pair = {}
        for slot, want in (("then", 1976), ("now", 2024)):
            year = want if len(by.get(want, [])) >= 80 else max(
                (y for y in by if len(by[y]) >= 80), default=want)
            pair[slot] = dict(year=year, days=by.get(year, []))
        daily[c["city_en"]] = pair
    (DATA / "derived" / "daily.json").write_text(
        json.dumps(daily, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"\n{len(cities)} 城有数据；{len(missing)} 城没有")


if __name__ == "__main__":
    main()
