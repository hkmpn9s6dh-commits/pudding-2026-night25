# -*- coding: utf-8 -*-
"""30 座城市（按 UN WPP 2018 城市集聚区人口排序）与候选站点。

只用一份规则选站点：离市中心 60 km 以内、TMIN 覆盖 1960–2025 的年数最多、
且 1960–2025 期间有效观测日占比最高。选不到（覆盖率 < 60%）就如实记为"没有数据"。
"""

CITIES = [
    ("Tokyo", "东京", "Japan", 35.68, 139.69),
    ("Delhi", "德里", "India", 28.61, 77.21),
    ("Shanghai", "上海", "China", 31.23, 121.47),
    ("Dhaka", "达卡", "Bangladesh", 23.81, 90.41),
    ("Sao Paulo", "圣保罗", "Brazil", -23.55, -46.63),
    ("Cairo", "开罗", "Egypt", 30.04, 31.24),
    ("Mexico City", "墨西哥城", "Mexico", 19.43, -99.13),
    ("Beijing", "北京", "China", 39.90, 116.41),
    ("Mumbai", "孟买", "India", 19.08, 72.88),
    ("Osaka", "大阪", "Japan", 34.69, 135.50),
    ("Karachi", "卡拉奇", "Pakistan", 24.86, 67.01),
    ("Chongqing", "重庆", "China", 29.56, 106.55),
    ("Istanbul", "伊斯坦布尔", "Turkey", 41.01, 28.98),
    ("Buenos Aires", "布宜诺斯艾利斯", "Argentina", -34.60, -58.38),
    ("Kolkata", "加尔各答", "India", 22.57, 88.36),
    ("Manila", "马尼拉", "Philippines", 14.60, 120.98),
    ("Lagos", "拉各斯", "Nigeria", 6.52, 3.38),
    ("Rio de Janeiro", "里约热内卢", "Brazil", -22.91, -43.17),
    ("Tianjin", "天津", "China", 39.13, 117.20),
    ("Kinshasa", "金沙萨", "DR Congo", -4.44, 15.27),
    ("Guangzhou", "广州", "China", 23.13, 113.26),
    ("Los Angeles", "洛杉矶", "United States", 34.05, -118.24),
    ("Moscow", "莫斯科", "Russia", 55.75, 37.62),
    ("Shenzhen", "深圳", "China", 22.54, 114.06),
    ("Lahore", "拉合尔", "Pakistan", 31.55, 74.34),
    ("Bangalore", "班加罗尔", "India", 12.97, 77.59),
    ("Paris", "巴黎", "France", 48.86, 2.35),
    ("Bogota", "波哥大", "Colombia", 4.71, -74.07),
    ("Jakarta", "雅加达", "Indonesia", -6.21, 106.85),
    ("Chennai", "金奈", "India", 13.08, 80.27),
]

# 1975–2024 是主分析窗口：50 个整年，站点通常也在这段里连续。
YEAR_FROM = 1975
YEAR_TO = 2024

# GHCN 的 TMIN/TMAX 单位是 0.1 °C；缺测 -9999。
MISSING = -9999
