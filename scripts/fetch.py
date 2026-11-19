# -*- coding: utf-8 -*-
"""选机场站 + 下载 GSOD 逐日 + 抽夏季窗口 + 记录来源。

数据源：NOAA GSOD（Global Summary of the Day），按年一文件，
`https://www.ncei.noaa.gov/data/global-summary-of-the-day/access/<year>/<USAF><WBAN>.csv`

产出
  data/cache/<station>/<year>.csv      原始 CSV（不入库，只在本机缓存）
  data/extract/<slug>.csv              每城夏季窗口的逐日 TMIN/TMAX（入库）
  data/meta/stations.json              站点、距离、覆盖、每年 URL 与 sha256
"""
import csv
import hashlib
import json
import math
import subprocess
import sys
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from cities import CITIES, YEAR_FROM, YEAR_TO  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
CACHE = DATA / "cache"
EXTRACT = DATA / "extract"
META = DATA / "meta"
GSOD = "https://www.ncei.noaa.gov/data/global-summary-of-the-day/access"
HIST = "https://www.ncei.noaa.gov/pub/data/noaa/isd-history.csv"
UA = {"User-Agent": "night25/1.0 (data story)"}


def haversine(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def load_history():
    path = META / "isd-history.csv"
    if not path.exists():
        req = urllib.request.Request(HIST, headers=UA)
        path.write_bytes(urllib.request.urlopen(req, timeout=180).read())
    rows = []
    with open(path, encoding="utf-8", errors="replace") as f:
        for r in csv.DictReader(f):
            if not r["USAF"] or not r["WBAN"] or not r["LAT"] or not r["LON"]:
                continue
            try:
                lat, lon = float(r["LAT"]), float(r["LON"])
            except ValueError:
                continue
            rows.append(dict(sid=r["USAF"] + r["WBAN"], lat=lat, lon=lon,
                             name=r["STATION NAME"].strip(), country=r["CTRY"].strip(),
                             begin=r["BEGIN"], end=r["END"]))
    return rows


def candidate_sites(lat, lon, history):
    cands = []
    for s in history:
        if s["begin"] > "19750101" or s["end"] < "20231231":
            continue
        d = haversine(lat, lon, s["lat"], s["lon"])
        if d <= 45:
            cands.append((d, s))
    cands.sort(key=lambda x: x[0])
    return cands


def year_url(sid, year):
    return f"{GSOD}/{year}/{sid}.csv"


def fetch_year(args):
    """用 curl 下：同一台机器上 urllib 比 curl 慢三倍，1500 个文件差一小时。"""
    sid, year, force = args
    dest = CACHE / sid / f"{year}.csv"
    if dest.exists() and dest.stat().st_size > 1000 and not force:
        return year, dest, None
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(".part")
    r = subprocess.run(["curl", "-sSf", "-m", "60", "-o", str(tmp), year_url(sid, year)],
                       capture_output=True)
    if r.returncode != 0 or not tmp.exists() or tmp.stat().st_size < 500:
        tmp.unlink(missing_ok=True)
        return year, None, "http"
    tmp.replace(dest)
    return year, dest, None


def parse_year(path):
    """[(date, tmin_c, tmax_c)]；GSOD 的 MIN/MAX 是华氏度，缺测 9999.9。"""
    out = []
    with open(path, encoding="utf-8", errors="replace") as f:
        for r in csv.DictReader(f):
            try:
                tmin = float(r["MIN"])
                tmax = float(r["MAX"])
            except (TypeError, ValueError):
                continue
            if tmin > 9000 or tmax > 9000:
                continue
            out.append((r["DATE"], round((tmin - 32) * 5 / 9, 2),
                        round((tmax - 32) * 5 / 9, 2)))
    return out


def pick_season(days):
    """用 1991–2020 的月均 TMIN 定"夏季"三个月（可跨年）。"""
    acc = defaultdict(list)
    for d, tmin, _ in days:
        y = int(d[:4])
        if 1991 <= y <= 2020:
            acc[int(d[5:7])].append(tmin)
    means = {m: (sum(v) / len(v) if len(v) >= 20 else None) for m, v in acc.items()}
    best = None
    for start in range(1, 13):
        months = [(start + k - 1) % 12 + 1 for k in range(3)]
        if any(means.get(m) is None for m in months):
            continue
        score = sum(means[m] for m in months)
        if best is None or score > best[0]:
            best = (score, months)
    return (best[1] if best else [6, 7, 8])


def slug(s):
    return "".join(c if c.isalnum() else "-" for c in s.lower()).strip("-")


def main():
    force = "--force" in sys.argv
    for d in (CACHE, EXTRACT, META):
        d.mkdir(parents=True, exist_ok=True)
    history = load_history()
    out = []
    for en, zh, country, lat, lon in CITIES:
        cands = candidate_sites(lat, lon, history)
        rec = dict(city_en=en, city_zh=zh, country=country, lat=lat, lon=lon, station=None)
        if not cands:
            out.append(rec)
            print(f"{en:15s} NO STATION within 45 km")
            continue
        dist, st = cands[0]
        tasks = [(st["sid"], y, force) for y in range(YEAR_FROM, YEAR_TO + 1)]
        results = {}
        with ThreadPoolExecutor(max_workers=24) as ex:
            for year, path, err in ex.map(fetch_year, tasks):
                results[year] = (path, err)
        days, manifest = [], {}
        for y in range(YEAR_FROM, YEAR_TO + 1):
            path, err = results[y]
            if not path:
                continue
            rows = parse_year(path)
            days.extend(rows)
            manifest[y] = dict(url=year_url(st["sid"], y), rows=len(rows),
                               sha256=hashlib.sha256(path.read_bytes()).hexdigest())
        months = pick_season(days)
        keep = [r for r in days if int(r[0][5:7]) in months]
        ex_path = EXTRACT / f"{slug(en)}.csv"
        with open(ex_path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["date", "tmin_c", "tmax_c"])
            for d, tmin, tmax in sorted(keep):
                w.writerow([d, tmin, tmax])
        rec.update(
            station=dict(sid=st["sid"], name=st["name"], lat=st["lat"], lon=st["lon"],
                         country=st["country"], dist_km=round(dist, 1),
                         begin=st["begin"], end=st["end"],
                         extract=ex_path.relative_to(ROOT).as_posix()),
            season=months, n_days=len(keep), manifest=manifest,
        )
        out.append(rec)
        print(f"{en:15s} {st['sid']} {st['name'][:28]:28s} {dist:5.1f}km "
              f"yrs={len(manifest):3d} days={len(keep):5d} season={months}")
    (META / "stations.json").write_text(json.dumps(out, ensure_ascii=False, indent=1),
                                        encoding="utf-8")
    n = sum(1 for r in out if r["station"])
    print(f"\n{n}/{len(out)} 座城市有站")


if __name__ == "__main__":
    main()
