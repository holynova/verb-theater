"use strict";
const moves = [
  {
    id: "clap",
    name: "拍手",
    hint: "双手在胸前打开，听到重拍时轻轻合掌。",
    scenes: ["吐司起跳", "爆米花派对"],
  },
  {
    id: "pull",
    name: "下拉",
    hint: "双手前伸握住想象中的绳子，合拍向下拉。",
    scenes: ["港口摇铃", "山间缆车"],
  },
  {
    id: "fan",
    name: "扇风",
    hint: "抬起一只手，在脸侧随拍来回扇动。",
    scenes: ["纸风车", "海湾起航"],
  },
  {
    id: "knock",
    name: "轻敲",
    hint: "手指松松握起，在身前轻敲一扇想象中的门。",
    scenes: ["布谷报时", "蛋壳来客"],
  },
  {
    id: "twist",
    name: "转手腕",
    hint: "手肘放松，像拧旋钮一样转动手腕。",
    scenes: ["调频电台", "扭蛋出仓"],
  },
  {
    id: "walk",
    name: "踏步",
    hint: "左右脚交替踏步，坐着也可以交替点脚。",
    scenes: ["穿过街角", "溪上石桥"],
  },
];
const levels = [
  { name: "厨房开场", tempo: 84, order: [0, 3, 1], bars: 8, cover: 0 },
  { name: "海风巡游", tempo: 100, order: [2, 4, 5, 1], bars: 8, cover: 5 },
  {
    name: "动词大联演",
    tempo: 116,
    order: [1, 0, 2, 3, 4, 5],
    bars: 4,
    cover: 9,
  },
];
const $ = (id) => document.getElementById(id);
const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem("verb-theater." + key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const save = (key, value) => {
  try {
    localStorage.setItem("verb-theater." + key, JSON.stringify(value));
  } catch {}
};
const seen = read("completed", []),
  completed = new Set(Array.isArray(seen) ? seen : []);
let sound = read("audio", true) !== false,
  selected = 0,
  bpm = 84,
  stage = "home",
  timeline = [],
  offset = 0,
  started = 0,
  nextNote = 0,
  lastCue = "",
  lastBeat = -1;
let pendingLevel = 0,
  pendingBpm = 84;
let preview = 0,
  previewEpoch = performance.now(),
  savedOpener = null;
const coverSet = [0, 3, 4, 7, 8, 11],
  reduce = matchMedia("(prefers-reduced-motion: reduce)");
const format = (t) =>
  Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0");
const lengthOf = (level) => level.order.length * (4 + 2 * level.bars);
function show(panel) {
  ["home", "play", "finish"].forEach((id) => ($(id).hidden = id !== panel));
  window.scrollTo({ top: 0, behavior: "instant" });
}
function audioLabel() {
  Orchestra.mute(sound);
  $("sound").textContent = sound ? "声音 开" : "声音 关";
  $("sound").setAttribute("aria-pressed", String(sound));
}
$("sound").onclick = () => {
  sound = !sound;
  save("audio", sound);
  audioLabel();
  if (sound && stage === "play") Orchestra.open();
};
audioLabel();
const fullSupported =
  document.fullscreenEnabled && document.documentElement.requestFullscreen;
$("full").hidden = !fullSupported;
$("full").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    $("full").textContent = "全屏不可用";
  }
};
document.addEventListener("fullscreenchange", () => {
  $("full").textContent = document.fullscreenElement ? "退出全屏" : "全屏 ↗";
});
function previewLabel() {
  const id = coverSet[preview];
  $("previewNo").textContent =
    "PREVIEW　" + String(preview + 1).padStart(2, "0") + " / 06";
  $("previewName").textContent =
    moves[Math.floor(id / 2)].name +
    "！" +
    moves[Math.floor(id / 2)].scenes[id % 2];
}
$("change").onclick = () => {
  preview = (preview + 1) % coverSet.length;
  previewEpoch = performance.now();
  previewLabel();
};
function cards() {
  const wrap = $("cards");
  wrap.replaceChildren();
  levels.forEach((l, i) => {
    const b = document.createElement("button");
    b.className = "card";
    b.innerHTML =
      '<div class="cardart"><canvas width="540" height="190" aria-hidden="true"></canvas><span class="reel">REEL 0' +
      (i + 1) +
      '</span></div><div class="cardbody"><div class="cardtitle">' +
      l.name +
      "<span>↗</span></div><small>" +
      l.tempo +
      " BPM　/　" +
      l.order.length +
      " 个动作" +
      (completed.has(i) ? "　✓ 已放映" : "") +
      "</small></div>";
    b.onclick = () => config(i, b);
    wrap.append(b);
    StageArt.paint(b.querySelector("canvas"), l.cover, 0.26, "", true);
  });
}
function config(i, opener) {
  pendingLevel = i;
  savedOpener = opener;
  const l = levels[i];
  pendingBpm = l.tempo;
  $("configNo").textContent = "REEL 0" + (i + 1) + " / 03";
  $("configTitle").textContent = l.name;
  $("configMoves").textContent = l.order
    .map((k) => moves[k].name)
    .join("　→　");
  $("speeds").replaceChildren();
  [l.tempo - 16, l.tempo, l.tempo + 16].forEach((v, k) => {
    const b = document.createElement("button");
    b.textContent = ["舒缓", "标准", "明快"][k];
    b.dataset.bpm = v;
    b.onclick = () => {
      pendingBpm = v;
      speedLabels();
    };
    $("speeds").append(b);
  });
  speedLabels();
  $("options").showModal();
  $("launch").focus();
}
function speedLabels() {
  [...$("speeds").children].forEach((b) =>
    b.setAttribute(
      "aria-pressed",
      String(Number(b.dataset.bpm) === pendingBpm),
    ),
  );
  $("duration").textContent =
    pendingBpm +
    " BPM　·　约 " +
    Math.round((lengthOf(levels[pendingLevel]) * 60) / pendingBpm) +
    " 秒　·　" +
    levels[pendingLevel].order.length * 2 +
    " 幕场景";
}
$("start").onclick = () => config(0, $("start"));
$("closeConfig").onclick = () => $("options").close();
function begin() {
  if ($("options").open) {
    selected = pendingLevel;
    bpm = pendingBpm;
    $("options").close();
  }
  const l = levels[selected];
  timeline = [];
  l.order.forEach((k) => {
    for (const [part, count] of [
      [-1, 4],
      [0, l.bars],
      [1, l.bars],
    ])
      for (let j = 0; j < count; j++) timeline.push({ k, part, j, count });
  });
  show("play");
  stage = "play";
  offset = 0;
  started = performance.now();
  nextNote = 0;
  lastCue = "";
  lastBeat = -1;
  $("stageNo").textContent = "REEL 0" + (selected + 1) + "　/　" + bpm + " BPM";
  $("stageName").textContent = l.name;
  Orchestra.stop();
  if (sound) Orchestra.open();
  $("pause").focus();
}
$("launch").onclick = begin;
function elapsed(now = performance.now()) {
  return offset + (stage === "play" ? (now - started) / 1000 : 0);
}
function pause() {
  if (stage !== "play") return;
  offset = elapsed();
  stage = "hold";
  Orchestra.stop();
  $("hold").showModal();
  $("resume").focus();
}
function resume() {
  if (stage !== "hold") return;
  $("hold").close();
  stage = "play";
  started = performance.now();
  nextNote = Math.ceil((offset * bpm) / 60);
  if (sound) Orchestra.open();
  $("pause").focus();
}
$("pause").onclick = pause;
$("resume").onclick = resume;
$("hold").addEventListener("cancel", (e) => {
  e.preventDefault();
  resume();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
document.addEventListener("keydown", (e) => {
  if (e.repeat || e.altKey || e.metaKey || e.ctrlKey) return;
  if (stage === "play" && e.key === "Escape") {
    e.preventDefault();
    pause();
  } else if (
    e.code === "Space" &&
    !["BUTTON", "A", "INPUT"].includes(document.activeElement?.tagName)
  ) {
    if (stage === "play") {
      e.preventDefault();
      pause();
    } else if (stage === "hold") {
      e.preventDefault();
      resume();
    }
  }
});
function home() {
  Orchestra.stop();
  if ($("hold").open) $("hold").close();
  stage = "home";
  cards();
  show("home");
  ($("cards").children[selected] || savedOpener || $("start")).focus({
    preventScroll: true,
  });
}
$("leave").onclick = home;
$("back").onclick = home;
$("again").onclick = begin;
$("advance").onclick = () => {
  if (selected < levels.length - 1) config(selected + 1, $("advance"));
  else home();
};
function end() {
  stage = "finish";
  Orchestra.stop();
  completed.add(selected);
  save("completed", [...completed]);
  show("finish");
  const l = levels[selected];
  $("summary").textContent =
    l.name +
    "　·　" +
    bpm +
    " BPM　·　放映 " +
    format((timeline.length * 60) / bpm) +
    "。本场共 " +
    l.order.length +
    " 个动作、" +
    l.order.length * 2 +
    " 幕。";
  $("advance").textContent = selected < 2 ? "准备下一场　→" : "回到选场　→";
  $("advance").focus();
}
function playFrame(now) {
  const step = 60 / bpm,
    t = elapsed(now),
    position = t / step,
    n = Math.floor(position);
  if (n >= timeline.length) {
    end();
    return;
  }
  // Drop stale onsets after a slow frame. Schedule ahead against audio time.
  nextNote = Math.max(nextNote, Math.ceil((t - 0.09) / step));
  while (nextNote < timeline.length && nextNote * step <= t + 0.12) {
    const event = timeline[nextNote];
    if (sound && Orchestra.ready())
      Orchestra.score(
        nextNote,
        Orchestra.now() + Math.max(0.004, nextNote * step - t),
        step,
        event.part < 0 ? -1 : event.k * 2 + event.part,
        selected,
      );
    nextNote++;
  }
  const { k, part, j, count } = timeline[n],
    m = moves[k],
    key = k + "-" + part;
  if (key !== lastCue) {
    lastCue = key;
    $("sceneTitle").textContent = part < 0 ? "动作示范" : m.scenes[part];
    $("phase").textContent =
      part < 0 ? "LEARN　/　先学动作" : "FOLLOW　/　保持动作";
    $("move").textContent = m.name;
    $("hint").textContent = m.hint;
    const later = timeline[n + count - j];
    $("next").textContent =
      part === -1
        ? "示范结束后，保持动作，看第一幕揭晓。"
        : part === 0
          ? "下一幕　同一个动作，换件道具。"
          : later
            ? "下一个动作　" + moves[later.k].name
            : "最后一幕　跟着节拍到片尾。";
  }
  if (lastBeat !== n) {
    lastBeat = n;
    document
      .querySelectorAll(".beats i")
      .forEach((el, i) => el.classList.toggle("on", i === n % 4));
    $("remaining").textContent =
      format(Math.ceil(timeline.length * step - t)) +
      "　/　" +
      (j + 1) +
      "·" +
      count;
  }
  $("progress").style.width = (position / timeline.length) * 100 + "%";
  StageArt.paint(
    $("screenArt"),
    k * 2 + Math.max(0, part),
    j + position - n,
    part < 0 ? m.id : "",
  );
}
let previousDraw = -100;
function loop(now) {
  if (!document.hidden && now - previousDraw >= 25) {
    previousDraw = now;
    if (stage === "home")
      StageArt.paint(
        $("cover"),
        coverSet[preview],
        reduce.matches ? 0.3 : (now - previewEpoch) / 980 + 0.25,
      );
    else if (stage === "play") playFrame(now);
  }
  requestAnimationFrame(loop);
}
cards();
previewLabel();
requestAnimationFrame(loop);
