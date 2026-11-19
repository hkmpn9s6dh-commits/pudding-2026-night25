# 25° — 夜是有底板的

一个数据故事：全球最大的三十座城市，五十个夏天的夜间最低气温，以及 25 °C 这条线。

- 线上：https://hkmpn9s6dh-commits.github.io/pudding-2026-night25/
- 投稿：The Pudding Cup 2026（免费、一件、2026 年发布在公网、非商业）

## 一句话结论

22 座能测到五十年的城市里，每夏超过 25 °C 的夜从 **28.9** 涨到 **34.0**；但这不是一个故事：
开罗从 0 夜变成 76 夜，德里一直停在 80/92 夜动不了；另有 8 座城市连记录都撑不起来，而它们正是最热的那几座。

## 一条命令重建

```bash
bash verify.sh          # 取数 → 指标 → 字体核对 → 构建 → 数据断言 → 浏览器断言
bash verify.sh --no-fetch   # 数据已在 data/ 里时跳过下载
```

依赖：Python 3（numpy 不需要）、Node 20+、curl、Chromium（Playwright 的 `chromium-1248`，路径可用 `CHROME_PATH` 覆盖）。

## 目录

| 路径 | 内容 |
| --- | --- |
| `data/meta/stations.json` | 每城选中的站点、距离、每年 URL 与 sha256 |
| `data/extract/*.csv` | 每城夏季窗口的逐日 `date,tmin_c,tmax_c`（入库） |
| `data/derived/series.json` | 每城每年热夜数、趋势、均值（页面直接吃这一份） |
| `data/derived/daily.json` | 首屏两个夏天的逐夜值 |
| `scripts/fetch.py` | 选站 + 下载 GSOD + 抽夏季 |
| `scripts/metrics.py` | 指标与趋势 |
| `scripts/verify.py` | 139 条交付物断言（含独立重算） |
| `scripts/e2e.mjs` | 26 条浏览器断言 |
| `src/` | Vite + TypeScript 前端，手写 SVG 图表 |

## 口径

- 夏季 = 1991–2020 基准期里月均 TMIN 最高的连续三个月（南半球自动落到 12–2 月）。
- 热夜 = 夏季里日最低气温 ≥ 25.0 °C。WMO 的通用阈值是 20 °C，长三角气象部门用 25 °C；本项目取 25 °C，问的是睡眠不是结霜。
- 某年夏季有效天数 < 90% → 该年记 null，不插值。

详细见 `docs/02-METHOD.md` 与 `docs/03-DATA.md`。
