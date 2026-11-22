// The time axis matches the public 210-second THA documentation film.
const movements = [
  {
    at: 17,
    jp: "おろす",
    en: "CHOP IT",
    zh: "向下落",
    scenes: ["黄瓜切片", "给煎蛋撒胡椒", "把钉子敲进木板"],
    shots: ["left", "front", "right"],
  },
  {
    at: 33,
    jp: "ひっぱる",
    en: "PULL IT",
    zh: "向下拉",
    scenes: ["拉起百叶窗", "拉动卫生纸", "拉绳开关床头灯"],
    shots: ["left", "right", "front"],
  },
  {
    at: 49,
    jp: "はらう",
    en: "FLICK IT",
    zh: "向旁挥",
    scenes: ["乒乓回球", "甩落水珠", "甩走桌面文件"],
    shots: ["left", "front", "right"],
  },
  {
    at: 73,
    jp: "まわす",
    en: "TURN IT",
    zh: "转动再转回",
    scenes: ["转动炉火", "开关花洒", "镜头推近拉远"],
    shots: ["left", "front", "right"],
  },
  {
    at: 89,
    jp: "にぎる",
    en: "SQUEEZE IT",
    zh: "握紧",
    scenes: ["挤出水花", "翻动书页", "挤牙膏"],
    shots: ["left", "right", "front"],
  },
  {
    at: 105,
    jp: "ゆびさす",
    en: "POINT IT",
    zh: "向前指",
    scenes: ["按下车铃", "同学回头", "投中飞镖"],
    shots: ["left", "front", "right"],
  },
  {
    at: 129,
    jp: "交互におろす",
    en: "TAP IT",
    zh: "双手交替落下",
    scenes: ["给长辈捶背", "左右击鼓", "卡拉 OK 应援"],
    shots: ["left", "right", "front"],
  },
  {
    at: 145,
    jp: "ふる",
    en: "SHAKE IT",
    zh: "摇动手腕",
    scenes: ["洒上糖粉", "扇旺炭火", "逗宝宝笑"],
    shots: ["left", "right", "front"],
  },
  {
    at: 161,
    jp: "こする",
    en: "RUB IT",
    zh: "双手对搓",
    scenes: ["搓木取火", "雪中暖手", "向人求情"],
    shots: ["left", "right", "front"],
  },
  {
    at: 185,
    jp: "大きく手を振る",
    en: "WAVE IT",
    zh: "大幅挥手",
    scenes: ["擦掉板书", "窗前挥别", "窗前挥别 · 远景"],
    shots: ["left", "front", "right"],
  },
];
const messages = [
  [0, "DO IT!", ""],
  [5, "DO IT!", ""],
  [9, "映像にあわせて、うごいてみよう！", ""],
  [13, "ARE YOU READY?", ""],
  [65, "GREAT!", ""],
  [67, "なかなかいいんじゃなーい？", ""],
  [69, "もういっかいいくよー？", ""],
  [121, "EXCELLENT!", ""],
  [123, "すーばらしいじゃーん！", ""],
  [125, "レベルアップしていくぜー？", ""],
  [177, "WELL DONE!", ""],
  [179, "みんな、おつかれー！", ""],
  [181, "最後はこれで、締めくくろう！", ""],
  [203, "DO IT!", ""],
];
const runtime = 210;
function scoreAt(time) {
  const id = movements.findIndex(
    (m) => time >= m.at && time < m.at + (m.at === 185 ? 18 : 16),
  );
  if (id < 0)
    return {
      id,
      message: messages.findLast((m) => time >= m[0]) || messages[0],
    };
  const m = movements[id],
    elapsed = time - m.at;
  const scene = Math.min(2, Math.floor(elapsed / 4) - 1);
  const back = id === 3 && elapsed % 2 >= 1;
  return {
    id,
    m,
    scene,
    elapsed,
    local: scene < 0 ? elapsed : elapsed - 4 * (scene + 1),
    jp: back ? "もどす" : m.jp,
    en: back ? "AND BACK" : m.en,
  };
}
