# 数据清单

窗口 1975–2024；阈值 25.0 °C；覆盖率下限 0.9；来源 NOAA GSOD (global-summary-of-the-day), airport stations。

## 22 座可用城市

| 城市 | 站点 | 距市中心 km | 有记录年数 | 首末记录 | 夏季月份 |
| --- | --- | --- | --- | --- | --- |
| Bangalore / 班加罗尔 | 43295099999 BANGALORE | 0.8 | 48 | 1973–2025 | [4, 5, 6] |
| Beijing / 北京 | 54511099999 BEIJING - CAPITAL INTERNATIO | 25.0 | 50 | 1945–2025 | [6, 7, 8] |
| Bogota / 波哥大 | 80222099999 EL DORADO INTL | 8.6 | 50 | 1941–2025 | [4, 5, 6] |
| Buenos Aires / 布宜诺斯艾利斯 | 87582099999 AEROPARQUE JORGE NEWBERY | 5.6 | 44 | 1973–2025 | [12, 1, 2] |
| Cairo / 开罗 | 62366099999 CAIRO INTL | 18.4 | 50 | 1943–2025 | [7, 8, 9] |
| Chennai / 金奈 | 43279099999 CHENNAI INTL | 13.6 | 48 | 1944–2025 | [4, 5, 6] |
| Chongqing / 重庆 | 57516099999 JIANGBEI | 19.8 | 38 | 1944–2025 | [6, 7, 8] |
| Delhi / 德里 | 42182099999 SAFDARJUNG | 2.8 | 49 | 1942–2025 | [6, 7, 8] |
| Guangzhou / 广州 | 59287099999 BAIYUN INTL | 29.4 | 49 | 1945–2025 | [6, 7, 8] |
| Istanbul / 伊斯坦布尔 | 17060099999 ATATURK | 13.8 | 50 | 1945–2025 | [6, 7, 8] |
| Karachi / 卡拉奇 | 41780099999 JINNAH INTL | 16.1 | 40 | 1942–2025 | [5, 6, 7] |
| Los Angeles / 洛杉矶 | 72295023174 LOS ANGELES INTERNATIONAL AI | 18.4 | 50 | 1944–2025 | [7, 8, 9] |
| Manila / 马尼拉 | 98430099999 SCIENCE GARDEN | 9.4 | 38 | 1945–2025 | [5, 6, 7] |
| Moscow / 莫斯科 | 27612099999 MOSKVA VDNH (DOLGOPRUDNYJ) | 9.2 | 40 | 1932–2025 | [6, 7, 8] |
| Mumbai / 孟买 | 43003099999 CHHATRAPATI SHIVAJI MAHARAJ  | 1.6 | 49 | 1944–2025 | [5, 6, 7] |
| Osaka / 大阪 | 47772099999 OSAKA | 1.7 | 49 | 1952–2025 | [7, 8, 9] |
| Paris / 巴黎 | 07150099999 LE BOURGET | 13.8 | 47 | 1928–2025 | [6, 7, 8] |
| Rio de Janeiro / 里约热内卢 | 83755099999 SANTOS DUMONT | 0.7 | 46 | 1938–2025 | [1, 2, 3] |
| Shanghai / 上海 | 58367099999 HONGQIAO INTL | 13.2 | 50 | 1956–2025 | [6, 7, 8] |
| Shenzhen / 深圳 | 59493099999 BAOAN INTL | 27.8 | 50 | 1957–2025 | [6, 7, 8] |
| Tianjin / 天津 | 54527099999 TIANJIN | 4.4 | 49 | 1956–2025 | [6, 7, 8] |
| Tokyo / 东京 | 47662099999 TOKYO | 7.0 | 49 | 1952–2025 | [7, 8, 9] |

## 8 座量不到的城市

| 城市 | 最近的站点 | 距市中心 km | 为何不成 |
| --- | --- | --- | --- |
| Dhaka / 达卡 | 41922099999 HAZRAT SHAHJALAL INTL | 3.9 | only 24 usable summers |
| Sao Paulo / 圣保罗 | 83779099999 CAMPO DE MARTE | 4.6 | only 19 usable summers |
| Mexico City / 墨西哥城 | 76680099999 MEXICO (CENTRAL)   D.F. | 6.5 | only 14 usable summers |
| Kolkata / 加尔各答 | 42807099999 BEHALA | 10.0 | only 9 usable summers |
| Lagos / 拉各斯 | 65202099999 OSHODI | 2.2 | only 0 usable summers |
| Kinshasa / 金沙萨 | 64220099999 KINSHASA/BINZA | 8.4 | only 0 usable summers |
| Lahore / 拉合尔 | 41640099999 LAHORE CITY | 0.7 | only 25 usable summers |
| Jakarta / 雅加达 | 96745099999 JAKARTA/OBSERVATORY | 3.5 | only 20 usable summers |

## 每年抽取

`data/extract/<city>.csv` 是每城夏季窗口内的逐日 `date,tmin_c,tmax_c`；原始 GSOD 年度 CSV 不入库（约 200 MB），`data/meta/stations.json` 里存了每一年的 URL 与 sha256，`scripts/fetch.py` 可原样重下并核对。
