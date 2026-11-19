# -*- coding: utf-8 -*-
"""把页面用到的汉字收成一个子集，随包带走（不依赖系统字体）。

用法： py -3 scripts/subset_fonts.py [--check]
  --check  只核对现有子集是否覆盖了页面上的字（构建/复验时用），不重新生成
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
SRC_FONT = Path("C:/Windows/Fonts/NotoSerifSC-VF.ttf")  # 本机可变字体
OUT = SRC / "fonts" / "noto-serif-sc-subset.woff2"
CJK = re.compile(r"[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef]")


def collect_chars():
    chars = set()
    for p in [ROOT / "index.html", *SRC.glob("*.ts")]:
        text = p.read_text(encoding="utf-8")
        chars.update(CJK.findall(text))
    # 城市中文名来自 cities.py，页面上的行标签与缺失清单都要用
    from cities import CITIES
    for _, zh, country, _, _ in CITIES:
        chars.update(CJK.findall(zh))
    return chars


def main():
    chars = collect_chars()
    text = "".join(sorted(chars))
    if "--check" in sys.argv:
        if not OUT.exists():
            print(f"缺字体子集：{OUT}")
            return 1
        # 用 fontTools 读 cmap，核对覆盖
        from fontTools.ttLib import TTFont
        font = TTFont(OUT)
        cmap = font.getBestCmap()
        missing = [c for c in text if ord(c) not in cmap]
        print(f"子集 {OUT.stat().st_size / 1024:.0f} KB，需要 {len(text)} 字，缺 {len(missing)}")
        if missing:
            print("缺字：" + "".join(missing[:40]))
            return 1
        return 0

    OUT.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUT.with_suffix(".txt")
    tmp.write_text(text, encoding="utf-8")
    cmd = [
        sys.executable, "-m", "fontTools.subset", str(SRC_FONT),
        f"--text-file={tmp}",
        "--flavor=woff2",
        f"--output-file={OUT}",
        "--layout-features=kern,liga",
        "--no-hinting",
        "--desubroutinize",
    ]
    subprocess.run(cmd, check=True)
    tmp.unlink(missing_ok=True)
    print(f"写出 {OUT.relative_to(ROOT)}  {OUT.stat().st_size / 1024:.0f} KB  覆盖 {len(text)} 字")
    return 0


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).parent))
    sys.exit(main())
