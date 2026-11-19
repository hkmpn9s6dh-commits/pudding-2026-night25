#!/usr/bin/env bash
# 《25°》一条命令从取数到页面断言。clone 里也能跑（会重新下载 1500 个小文件）。
#
#   bash verify.sh            # 全流程
#   bash verify.sh --no-fetch # 不取数（数据已在 data/ 里）
#   bash verify.sh --local    # 只跑本地，不起 preview（跳过 e2e）
set -u
cd "$(dirname "$0")"

PY=python
command -v python >/dev/null 2>&1 || PY=py
if ! "$PY" -c "import csv" >/dev/null 2>&1; then PY="py -3"; fi

rc=0
step() { printf '\n=== %s ===\n' "$1"; }

step "1/6 取数（GSOD，按年一文件）"
if [ "${1:-}" = "--no-fetch" ]; then
  echo "跳过全量重下，改抽查 12 个（NOAA 会对全量重下限流）"
  $PY scripts/fetch_check.py --n 12 || { echo "抽查失败（取数路径不通）"; rc=1; }
else
  $PY scripts/fetch.py || { echo "取数失败"; rc=1; }
fi

step "2/6 指标"
$PY scripts/metrics.py || { echo "指标失败"; rc=1; }

step "3/6 字体子集核对"
$PY scripts/subset_fonts.py --check || { echo "字体子集缺字（改过文案就重跑 scripts/subset_fonts.py）"; rc=1; }

step "4/6 构建"
if [ ! -d node_modules ]; then
  echo "首次运行，装依赖（约 20 s）"
  npm install --no-audit --no-fund --silent || { echo "装依赖失败"; rc=1; }
fi
npm run build --silent || { echo "构建失败"; rc=1; }

step "5/6 数据与产物断言"
$PY scripts/verify.py || rc=1

if [ "${1:-}" != "--local" ]; then
  step "6/6 浏览器断言"
  npx vite preview --port 4173 --strictPort >/tmp/night25-preview.log 2>&1 &
  PREV=$!
  for i in $(seq 1 40); do
    if curl -s -o /dev/null http://127.0.0.1:4173/; then break; fi
    sleep 0.5
  done
  node scripts/e2e.mjs http://127.0.0.1:4173/ || rc=1
  kill $PREV 2>/dev/null
fi

echo
if [ $rc -eq 0 ]; then echo "全部通过"; else echo "有失败项"; fi
exit $rc
