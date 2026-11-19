export type Lang = "en" | "zh";

export type CityNights = { en: string; zh: string; then: number; now: number };

export type Summary = {
  nCities: number;
  nAttempted: number;
  from: number;
  to: number;
  nightsThen: number;
  nightsNow: number;
  ceiling: number;
  rose: number;
  flat: number;
  fell: number;
  cairo: CityNights;
  karachi: CityNights;
  delhi: CityNights;
  nightsFaster: number;
  tminSlope: number;
  tmaxSlope: number;
  hottest: { en: string; zh: string; now: number };
  missingHot: string[];
};

const f1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

export function copy(S: Summary, lang: Lang): Record<string, string> {
  const en: Record<string, string> = {
    skip: "Skip to the story",
    kicker: "A data story · 2026",
    hero_eyebrow: "The night has a floor",
    hero_sub:
      "Twenty-two of the world's largest cities, fifty summers of nightly minimum temperatures, and the line at 25 °C that decides whether a body gets to rest.",
    byline: `Data: NOAA GSOD · ${S.nAttempted} attempted · ${S.nCities} usable · ${S.from}–${S.to}`,
    lede1:
      "A hot afternoon is uncomfortable. A hot night is different. When the air stays above 25 °C, the body keeps working at the job it was supposed to do while you slept: dumping the heat it built up all day. Heart rate stays elevated. Deep sleep thins out. You wake up as tired as you went to bed.",
    lede2:
      `I wanted to know how often that happens now, and how often it used to. So I took the ${S.nAttempted} largest cities on Earth and looked for a thermometer in each one that had been recording every night since ${S.from}. ${S.nCities} had one that survived the whole record.`,
    lede3:
      "The numbers that came back do not tell one story. Some cities crossed a line they had never crossed before. Others barely moved — because there was almost no room left to move. And eight of the thirty cities could not be measured at all.",
    on_title: "One city, two summers, forty-eight years apart",
    on_dek:
      "Every square is one night of summer in Cairo. In 1976 the whole season stayed under the line: the warmest night was 24.0 °C. In 2024, 76 of 91 nights never fell below 25 °C.",
    on_cap: "",
    wall_title: "Every summer since 1975, one window per city",
    wall_dek:
      "Each row is a city, each column a summer. The brighter the window, the more nights that summer failed to fall below 25 °C. Dark blue is a summer that never crossed the line. Blank means the thermometer was not recording, or recorded too little to count.",
    wall_cap: "Scroll to move through the record. Hover any window for the exact count.",
    step0: "Start at 1975. Bright windows are rare. A summer with a few 25-degree nights was still something people mentioned.",
    step1: `By the 2020s the bright windows have spread — unevenly. Across the ${S.nCities} cities the average summer went from ${f1(S.nightsThen)} nights above 25 °C to ${f1(S.nightsNow)}.`,
    step2: "The dark rows are not cold cities. They are cities where the thermometer stopped, or never started — and most of them are the hot ones.",
    step3: `One row jumps out: ${S.hottest.en}, where the average summer now spends ${S.hottest.now} of its 92 nights above the line.`,
    more_title: "Who had room to lose, and who did not",
    more_dek:
      "Each line connects the average summer of 1976–1995 to the average summer of 2005–2024. The dashed line on the right is the maximum any city can reach: every night of the summer. Cities stacked against it had nowhere left to go.",
    more_cap: "Nights per summer above 25 °C. Grey dot: average summer of 1976–1995. Red dot: 2005–2024. The number at right is the change.",
    nd_title: "What the average hides",
    nd_dek: "",
    nd_cap: "",
    nd_p1: `${S.rose} cities added five or more nights per summer. ${S.flat} barely moved — some because they are already pressed against the ceiling, some because they never reached it. ${S.fell} lost nights: Guangzhou fell from 61 to 50, Rio de Janeiro from 40 to 33.`,
    nd_p2: `The average also hides something that surprised me: the nights did not warm faster than the days. Summer afternoons across these cities warmed by ${S.tmaxSlope.toFixed(2)} °C per decade; nights by ${S.tminSlope.toFixed(2)}. In ${S.nightsFaster} of ${S.nCities} cities the night trend was the steeper one. A hotter night is a different kind of harm, not automatically a faster one.`,
    nd_p3: `And there is a floor under the floor. A summer has ${S.ceiling} nights. ${S.delhi.en} already spends ${S.delhi.now} of them above the line; it can add ${S.ceiling - S.delhi.now} before it runs out of nights. ${S.karachi.en} was at ${S.karachi.then} and still found ${S.karachi.now - S.karachi.then} more.`,
    miss_title: "The eight cities we cannot measure",
    miss_dek:
      "These are among the thirty largest cities on Earth, and none has a station with enough nightly data to carry a fifty-year record. They are not the cool ones. Lahore, Dhaka, Kolkata, Lagos, Kinshasa, Jakarta, Mexico City, São Paulo — the places where a hot night is already normal and where the next billion urban residents will live.",
    miss_note:
      "A station was accepted only if it began by 1975, still reported in 2023 or later, sat within 45 km of the city centre, and had at least 35 summers with 90% of days present. The eight above failed on the last test, not on distance.",
    body_title: "What 25 °C does to a body",
    body1:
      "The threshold has a history. The World Meteorological Organization's \"tropical night\" is a night that never falls below 20 °C; China's Yangtze Delta weather services, dealing with humid heat, use 25 °C instead. I used 25 °C because the question here is sleep, not frost: comfort research puts the sleeping range at 24–25 °C, and a 2026 review of 31 studies finds that nights above roughly 20–25 °C shorten total sleep, cut sleep efficiency and thin the deep stages that do the restoring.<sup class='cite'><a href='#sources'>2,3</a></sup>",
    body2:
      "It also scales. Large sleep studies find the effect is small per night and enormous in aggregate: a slightly shorter night, for everyone, all summer. And a night that does not cool leaves the next day starting from a warmer body, which is why consecutive hot nights carry more risk than the same number of hot afternoons.<sup class='cite'><a href='#sources'>3,4</a></sup> Air conditioning blunts this; the cities gaining the most nights above 25 °C here are, on the whole, not the ones where air conditioning is universal.",
    body3:
      "And a city that cannot measure its nights cannot plan for them. Eight of the thirty largest cities on Earth have no fifty-year nightly record at all — which is why the last chart on this page is mostly a list of names.",
    method_title: "How this was made",
    ai_note:
      "Disclosure: this story was built with AI assistance — code, charts and drafting. The station selection rule, the quality thresholds and every number on the page are enforced by scripts that ship with the story; each figure is recomputed from the raw files before publication, and the build fails if a number drifts. The analysis is mine to defend; the arithmetic is the scripts'.",
    repo_link: "Source code, station manifest and every extract",
    foot:
      "Built in November 2026. Summer is defined per city as the three consecutive months with the highest 1991–2020 mean minimum temperature, so southern-hemisphere cities use December–February. A night counts when the daily minimum is at or above 25.0 °C. Years with less than 90% of days present are dropped, never interpolated.",
    lang_label: "Language",
  };

  const zh: Record<string, string> = {
    skip: "跳到正文",
    kicker: "数据故事 · 2026",
    hero_eyebrow: "夜是有底板的",
    hero_sub:
      "全球最大城市里的二十二座，五十个夏天的夜间最低气温，以及 25 °C 那条线 —— 它决定一具身体能不能休息。",
    byline: `数据：NOAA GSOD · 试 ${S.nAttempted} 城 · 可用 ${S.nCities} 城 · ${S.from}–${S.to}`,
    lede1:
      "热的下午只是难受，热的夜是另一回事。气温停在 25 °C 以上，身体就没法做它本该在你睡着时做的事：把白天攒下的热散掉。心率降不下来，深睡变浅。你醒来时和躺下时一样累。",
    lede2:
      `我想知道现在这事有多频繁，过去又有多频繁。于是把地球上最大的 ${S.nAttempted} 座城市列出来，去每一座里找一个温度计 —— 要求它从 ${S.from} 年起每一夜都在记。${S.nCities} 座的温度计完整活到了最后。`,
    lede3:
      "回来的数字不是同一个故事。有的城市越过了它从没越过的线；有的几乎没动 —— 因为已经没多少地方可动。还有八座城市，根本量不到。",
    on_title: "一座城，两个夏天，隔四十八年",
    on_dek:
      "每一格是开罗夏天的一夜。1976 年整个夏天都在这条线下面：最热的一夜 24.0 °C。2024 年，九十一夜里有七十六夜没跌破 25 °C。",
    on_cap: "",
    wall_title: "从 1975 年起，每座城每年一扇窗",
    wall_dek:
      "一行一座城，一列一个夏天。窗越亮，那个夏天里没跌破 25 °C 的夜越多。深蓝是整夏都没越过那条线。空白是温度计那天没记，或记的天数不够。",
    wall_cap: "往下滚，整面墙跟着走。鼠标停在任意一扇窗上，能看到那一年的准确夜数。",
    step0: "先看 1975 年。亮窗很少。一个夏天里有几夜超过 25 °C，还是人们会提起的事。",
    step1: `到 2020 年代，亮窗铺开了 —— 但不均匀。这 ${S.nCities} 座城市平均，从每夏 ${f1(S.nightsThen)} 夜变成 ${f1(S.nightsNow)} 夜。`,
    step2: "最暗的几行不是冷城市，是温度计停了的城市，或者从来就没开始记的城市 —— 而且多半是热的那些。",
    step3: `有一行最扎眼：${S.hottest.zh}。它现在的平均夏天，九十二夜里有 ${S.hottest.now} 夜在那条线以上。`,
    more_title: "谁还有地方可输，谁已经没有了",
    more_dek:
      "每条线把 1976–1995 的平均夏天接到 2005–2024 的平均夏天。右侧那条虚线是任何城市能到的顶：整个夏天的每一夜。贴着它排的城，几乎没地方可去了。",
    more_cap: "每夏超过 25 °C 的夜数。灰点是 1976–1995 的平均夏天，红点是 2005–2024；右列是变化量。",
    nd_title: "平均数藏起来的东西",
    nd_dek: "",
    nd_cap: "",
    nd_p1: `${S.rose} 座城市每夏多出五夜以上；${S.flat} 座几乎没动 —— 有的已经顶到天花板，有的从来没够到过；${S.fell} 座少了：广州从 61 夜掉到 50 夜，里约从 40 夜掉到 33 夜。`,
    nd_p2: `平均数还藏了一件让我意外的事：夜并没有比昼暖得更快。这些城市的夏季午后每十年升 ${S.tmaxSlope.toFixed(2)} °C，夜里升 ${S.tminSlope.toFixed(2)} °C；${S.nCities} 座里有 ${S.nightsFaster} 座是夜更陡。更热的夜是另一种伤害，不一定来得更快。`,
    nd_p3: `而且底板下面还有一层：一个夏天只有 ${S.ceiling} 夜。${S.delhi.zh} 已经有 ${S.delhi.now} 夜在线上，最多还能再加 ${S.ceiling - S.delhi.now} 夜就到头。${S.karachi.zh} 原本 ${S.karachi.then} 夜，居然还找出了 ${S.karachi.now - S.karachi.then} 夜。`,
    miss_title: "量不到的八座城",
    miss_dek:
      "它们都在全球最大的三十座城市里，却没有一个站点能撑起五十年的逐夜记录。它们不是凉的那几座。拉合尔、达卡、加尔各答、拉各斯、金沙萨、雅加达、墨西哥城、圣保罗 —— 热夜早已是常态、而下一个十亿城市人口要住进去的地方。",
    miss_note:
      "站点入选条件：1975 年前开始记录、2023 年之后仍在报、距市中心 45 km 以内、且有至少 35 个夏天满足「90% 的天数在场」。上面这八座是卡在最后一条，不是卡在距离。",
    body_title: "25 °C 对身体做了什么",
    body1:
      "这条线是有来历的。世界气象组织的「热带夜」定义为夜间最低气温不低于 20 °C；中国长三角的气象部门面对湿热气候，改用 25 °C。我这里用 25 °C，因为要问的是睡觉，不是结霜：舒适睡眠的研究把卧室温度定在 24–25 °C，而 2026 年一篇汇总 31 项研究的综述发现，夜间气温超过大约 20–25 °C 就会缩短总睡眠、降低睡眠效率、压缩负责恢复的深睡阶段。",
    body2:
      "它还会放大。大规模睡眠研究发现，单夜的效应很小，加总起来很大：每一个人的每一个夏天，夜都短了一点。而且一夜没凉下来，第二天是从一具更热的身体开始的，所以连着几个热夜比同样数量的热白天更危险。<sup class='cite'><a href='#sources'>3,4</a></sup>空调能挡掉一部分；而这里超过 25 °C 的夜涨得最多的城市，总体上并不是空调普及的那些。",
    body3:
      "还有一层：量不出自己夜里的城，也规划不了夜里。全球最大的三十座城市里，有八座根本没有五十年的逐夜记录 —— 所以这一页最后那张图，基本上只是一串名字。",
    method_title: "这份东西是怎么做出来的",
    ai_note:
      "披露：这篇东西在 AI 协助下完成 —— 代码、图表、初稿。选站规则、质量门槛和页面上每一个数字，都由随故事一起发布的脚本强制执行；每个数字发布前都从原始文件重算一遍，数字漂了构建就失败。分析由我负责，算术由脚本负责。",
    repo_link: "源码、站点清单与全部抽取数据",
    foot:
      "2026 年 11 月制作。「夏季」按每座城市 1991–2020 年夜间最低气温最高的连续三个月定义，南半球因此落到 12–2 月。日最低气温 ≥ 25.0 °C 记为一夜。天数不足 90% 的年份直接丢弃，不做插值。",
    lang_label: "语言",
  };

  return lang === "zh" ? zh : en;
}
