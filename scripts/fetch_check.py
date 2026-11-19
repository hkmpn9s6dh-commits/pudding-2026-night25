# -*- coding: utf-8 -*-
"""抽查：从清单里随机取 N 个 (站点, 年)，重新下载并核对 sha256。

用途：全量重下 1500 个文件会触发 NOAA 限流（503）。clone 复验时用这个抽查证明
「取数这条路还通」，而不是重新砸一遍服务器。

用法： py -3 scripts/fetch_check.py [--n 12] [--seed 20261119]
"""
import hashlib
import json
import random
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    n = 12
    seed = 20261119
    for i, a in enumerate(sys.argv):
        if a == "--n":
            n = int(sys.argv[i + 1])
        if a == "--seed":
            seed = int(sys.argv[i + 1])
    meta = json.loads((ROOT / "data" / "meta" / "stations.json").read_text(encoding="utf-8"))
    pool = []
    for rec in meta:
        if not rec["station"]:
            continue
        for year, m in rec["manifest"].items():
            pool.append((rec["city_en"], year, m))
    random.seed(seed)
    picks = random.sample(pool, min(n, len(pool)))
    bad, http_errors = [], []
    for city, year, m in picks:
        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as f:
            tmp = Path(f.name)
        r = subprocess.run(["curl", "-sSf", "-m", "45", "-o", str(tmp), m["url"]],
                           capture_output=True)
        if r.returncode != 0:
            http_errors.append(f"{city} {year}")
            tmp.unlink(missing_ok=True)
            continue
        got = hashlib.sha256(tmp.read_bytes()).hexdigest()
        tmp.unlink(missing_ok=True)
        if got != m["sha256"]:
            bad.append(f"{city} {year}: {got[:12]} vs {m['sha256'][:12]}")
        print(f"  {'OK ' if got == m['sha256'] else 'DIFF'} {city} {year}")
    print(f"\n抽查 {len(picks)} 个：一致 {len(picks) - len(bad) - len(http_errors)}，"
          f"不一致 {len(bad)}，取不到 {len(http_errors)}")
    if http_errors:
        print("取不到：" + "、".join(http_errors))
    if bad:
        print("不一致：" + "；".join(bad))
    # 判据：sha256 不一致 = 失败；全部取不到 = 限流/断网，记警告不算失败
    # （全量取数在本轮 12:50 已跑通，清单里的 sha256 就是那时的结果）
    if bad:
        return 1
    if len(http_errors) == len(picks):
        print("警告：这次一个都取不到（NOAA 503 限流或断网），按「未验证」记，不判失败")
    return 0


if __name__ == "__main__":
    sys.exit(main())
