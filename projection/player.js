const el = (id) => document.getElementById(id);
const art = el("art"),
  ctx = art.getContext("2d"),
  film = el("film"),
  audio = new ExhibitAudio();

const state = {
  playing: false,
  started: false,
  time: 0,
  anchor: 0,
  epoch: 0,
  rate: 1,
  muted: false,
  loop: -1,
  mode: 0,
  source: false,
};
const fmt = (s) =>
  Math.floor(s / 60) + ":" + String(Math.floor(s) % 60).padStart(2, "0");
let frame = 0,
  lastLabel = "",
  lastLayout = "",
  size = { w: 0, h: 0 },
  objectURL = "",
  loadToken = 0,
  playToken = 0;
function now() {
  if (!state.playing) return state.time;
  return state.mode
    ? film.currentTime
    : state.anchor + (performance.now() - state.epoch) * 0.001 * state.rate;
}
function schedule() {
  if (!frame) frame = requestAnimationFrame(paint);
}
function resize() {
  const b = art.getBoundingClientRect(),
    d = Math.min(2, devicePixelRatio || 1);
  size = { w: b.width, h: b.height };
  art.width = Math.round(b.width * d);
  art.height = Math.round(b.height * d);
  ctx.setTransform(d, 0, 0, d, 0, 0);
  lastLayout = "";
  schedule();
}
new ResizeObserver(resize).observe(art);
function type(c, text, x, y, font) {
  c.font = font;
  c.fillStyle = "#f4f4f2";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(text, x, y);
}
function actor(x, y, w, h, s, time, labels = true) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const center = x + w / 2,
    full = s.id < 0 || s.scene < 0,
    scale = Math.min(h / 236, w / (full ? 217 : 150));
  ctx.translate(center - 120 * scale, y + h - 240 * scale);
  ctx.scale(scale, scale);
  drawGuide(ctx, s.id, time);
  ctx.restore();
  if (labels) {
    drawPrompt(x, y, w, h, s);
  }
}
function drawPrompt(x, y, w, h, s) {
  const cue = promptText(s),
    cap = Math.max(
      11,
      Math.min(
        h * 0.113,
        (w * 0.88) / (language === "en" ? cue.length * 0.57 : cue.length),
        58,
      ),
    );
  type(ctx, cue, x + w / 2, y + h * 0.16, "700 " + cap + "px sans-serif");
}
let guideSheet = null,
  guideID = -1;
function sideGuide(x, y, w, h, s) {
  if (state.mode === 1 && window.privateGuides) {
    if (guideID !== s.id) {
      guideID = s.id;
      guideSheet = new Image();
      guideSheet.onload = schedule;
      guideSheet.src = "guides/" + s.id + ".jpg";
    }
    if (guideSheet.complete && guideSheet.naturalWidth) {
      const cell = Math.floor((s.elapsed % 2) * 20) % 40,
        offsetX = (cell % 8) * 512,
        offsetY = Math.floor(cell / 8) * 288;
      const span = [232, 122, 475, 156, 138, 130, 299, 183, 158, 360][s.id];
      const scale = Math.min(h / 280, w / span);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.drawImage(
        guideSheet,
        offsetX + 3,
        offsetY + 4,
        506,
        280,
        x + (w - 506 * scale) / 2,
        y + h - 280 * scale,
        506 * scale,
        280 * scale,
      );
      ctx.restore();
      ctx.fillStyle = "#030303";
      ctx.fillRect(x, y, w, h * 0.26);
      drawPrompt(x, y, w, h, s);
      return;
    }
  }
  actor(x, y, w, h, s, s.elapsed);
}
function centerRect() {
  const { w, h } = size;
  if (h > w * 1.28) {
    const height = (w * 9) / 16;
    return {
      x: 0,
      y: Math.max(0, (h - height - Math.min(h * 0.38, w * 0.78)) / 2),
      w,
      h: height,
    };
  }
  const width = Math.min(w * (w < 600 ? 0.58 : 0.5), (h * 16) / 9),
    height = (width * 9) / 16;
  return { x: (w - width) / 2, y: (h - height) / 2, w: width, h: height };
}
function screenRect() {
  const { w, h } = size,
    width = Math.min(w, (h * 16) / 9),
    height = (width * 9) / 16;
  return { x: (w - width) / 2, y: (h - height) / 2, w: width, h: height };
}
function project(rect, angle) {
  const { x, y, w, h } = rect,
    key = [x, y, w, h, angle].join("/");
  if (lastLayout !== key) {
    Object.assign(el("footage").style, {
      left: x + "px",
      top: y + "px",
      width: w + "px",
      height: h + "px",
    });
    film.style.transform = perspective(angles[angle], w, h);
    lastLayout = key;
  }
  el("footage").hidden = false;
}
function updateControls(t, s) {
  el("seek").value = t;
  el("counter").textContent = fmt(t) + " / 3:30";
  const label = !state.started
    ? ui().home
    : t >= runtime
      ? ui().done
      : s.id < 0
        ? t < 17
          ? ui().opening
          : t < 185
            ? ui().break
            : ui().end
        : moveName(s.id) +
          "　/　" +
          (s.scene < 0 ? ui().guide : objectName(s.id, s.scene));
  if (label !== lastLabel) {
    el("current").textContent = label;
    lastLabel = label;
  }
}
function paint() {
  frame = 0;
  let t = Math.max(0, Math.min(runtime, now()));
  if (state.playing && state.loop >= 0) {
    const m = movements[state.loop];
    if (t >= m.at + (state.loop === 9 ? 18 : 16)) {
      jump(m.at);
      t = m.at;
    }
  }
  if (state.playing && t >= runtime - 0.015) {
    finish();
    t = runtime;
  }
  const { w, h } = size;
  if (!w || !h) return;
  const s = scoreAt(t);
  ctx.fillStyle = "#030303";
  ctx.fillRect(0, 0, w, h);
  const local = state.source && state.mode !== 0 && state.started;
  el("footage").hidden = true;
  el("filmCue").hidden = true;
  if (!state.started) {
    ctx.save();
    const sh = Math.min(h * 1.02, w * 0.54),
      sw = sh * 1.05;
    actor(w * 0.72 - sw / 2, h - sh, sw, sh, { id: 0, scene: -1 }, 0.14, false);
    ctx.restore();
  } else if (local && state.mode === 2) {
    project(screenRect(), "front");
  } else if (s.id < 0) {
    const intro = t < 5 || t >= 203;
    if (!intro) actor(0, 0, w, h, s, t, false);
    const text = messageText(s.message),
      font = Math.min(
        h * (intro ? 0.2 : 0.112),
        (w * 0.79) / Math.max(text.length * 0.86, 4),
      );
    type(
      ctx,
      text,
      w / 2,
      h * (intro ? 0.48 : 0.2),
      "750 " + font + "px sans-serif",
    );
  } else if (s.scene < 0) {
    if (local) {
      const r = screenRect();
      project(r, "front");
      const label = el("filmCue");
      Object.assign(label.style, {
        left: r.x + "px",
        top: r.y + "px",
        width: r.w + "px",
        height: r.h * 0.28 + "px",
        fontSize:
          Math.min(
            r.h * 0.101,
            (r.w * 0.12) / Math.max(1, promptText(s).length / 8),
          ) + "px",
      });
      label.textContent = promptText(s);
      label.hidden = false;
    } else actor(0, 0, w, h, s, s.elapsed);
  } else {
    const r = centerRect(),
      side = r.x;
    if (side === 0) {
      const height = Math.min(h * 0.38, w * 0.78);
      sideGuide(0, r.y + r.h, w, height, s);
    } else {
      sideGuide(0, r.y, side, r.h, s);
      sideGuide(r.x + r.w, r.y, side, r.h, s);
    }
    if (local)
      project(r, s.id === 9 && s.scene === 2 ? "last" : s.m.shots[s.scene]);
    else {
      const im = objectFrame(s.id, s.scene, s.local);
      ctx.drawImage(im, 0, 10, W, H - 20, r.x, r.y, r.w, r.h);
    }
    ctx.strokeStyle = "#eeede8";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, r.y + 0.5, w - 1, r.h - 1);
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  }
  if (state.playing && !state.mode) audio.update(t, s, state.rate);
  updateControls(t, s);
  if (state.playing) schedule();
}
function transport() {
  const play = state.playing;
  const app = el("app"),
    done = !play && state.started && state.time >= runtime;
  el("transport").textContent = play
    ? "Ⅱ " + ui().pause
    : "▶ " + (done ? ui().again : ui().play);
  el("transport").setAttribute("aria-label", play ? ui().pause : ui().play);
  el("curtain").hidden = state.started;
  el("surface").hidden = !play;
  el("result").hidden = !done;
  app.classList.toggle("immersive", play);
  app.classList.toggle("finished", done);
  app.classList.toggle("inSession", state.started);
  if (play) el("surface").focus({ preventScroll: true });
  if (done) el("replay").focus({ preventScroll: true });
}
function jump(value) {
  state.time = Math.max(0, Math.min(runtime, value));
  state.anchor = state.time;
  state.epoch = performance.now();
  if (state.source && state.mode) film.currentTime = state.time;
  audio.last = -1;
  audio.cue = "";
  audio.silenceVoice();
  schedule();
}
function enterScreen() {
  const app = el("app");
  if (document.fullscreenElement || app.classList.contains("fullscreen"))
    return;
  if (app.requestFullscreen)
    app.requestFullscreen().catch(() => app.classList.add("fullscreen"));
  else app.classList.add("fullscreen");
}
async function play() {
  if (state.playing) return;
  enterScreen();
  const token = ++playToken;
  if (state.time >= runtime - 0.05)
    jump(state.loop >= 0 ? movements[state.loop].at : 0);
  try {
    if (state.mode) {
      film.currentTime = state.time;
      film.playbackRate = state.rate;
      film.muted = state.muted;
      await film.play();
    } else await audio.unlock();
    if (token !== playToken) return;
    state.started = true;
    state.playing = true;
    state.anchor = state.time;
    state.epoch = performance.now();
    transport();
    schedule();
  } catch {
    if (token === playToken) el("notice").textContent = ui().playError;
  }
}
function pause() {
  ++playToken;
  state.time = Math.max(0, Math.min(runtime, now()));
  state.playing = false;
  film.pause();
  audio.stop();
  transport();
  schedule();
}
function finish() {
  pause();
  state.time = runtime;
  state.started = true;
  transport();
  schedule();
}
function chooseLoop(id) {
  state.loop = id;
  el("loop").setAttribute("aria-pressed", String(id >= 0));
  el("loop").textContent =
    id >= 0 ? ui().looping + " · " + moveName(id) : ui().loop;
}
function chooseMode(value) {
  if (value && !state.source) return;
  const resume = state.playing;
  pause();
  state.mode = value;
  lastLayout = "";
  jump(state.time);
  for (const b of el("views").children)
    b.setAttribute("aria-pressed", String(Number(b.value) === value));
  el("variant").hidden = !state.source;
  el("variant").textContent = ui().modes[value] + " ⇄";
  if (resume) play();
  else schedule();
}
function openDialog(id) {
  if (state.playing) pause();
  el(id).showModal();
}
function chapter(id) {
  if (state.loop >= 0) chooseLoop(id);
  state.started = true;
  jump(movements[id].at);
  el("list").close();
  transport();
  play();
}
function localize() {
  const u = ui();
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.title = "DO IT! · " + u.brand;
  el("zh").setAttribute("aria-pressed", String(language === "zh"));
  el("en").setAttribute("aria-pressed", String(language === "en"));
  document.querySelector(".brand span").textContent = u.brand;
  el("about").textContent = u.about + " ↗";
  document.querySelector(".pitch p").textContent = u.hint;
  el("start").textContent = u.start + "　▶";
  el("chapters").textContent = u.list;
  el("mute").textContent = state.muted ? u.silent : u.sound;
  el("expand").textContent = u.full + " ⛶";
  el("resultText").textContent = u.done;
  el("replay").textContent = u.again;
  el("surface").setAttribute("aria-label", u.pause);
  el("art").setAttribute("aria-label", u.canvas);
  el("rate").setAttribute("aria-label", u.rate);
  el("seek").setAttribute("aria-label", u.seek);
  el("theater").setAttribute("aria-label", u.stage);
  document.querySelector("nav").setAttribute("aria-label", u.controls);
  document.querySelector(".seek .sr").textContent = u.seek;
  document.querySelector(".rate .sr").textContent = u.rate;
  el("list").querySelector("h2").textContent = u.list;
  el("info").querySelector("h2").textContent = u.about;
  document
    .querySelectorAll("[data-close]")
    .forEach((b) => b.setAttribute("aria-label", u.close));
  const paragraphs = el("info").querySelectorAll("p");
  paragraphs[0].textContent = u.credits;
  paragraphs[1].textContent = u.study;
  const links = el("info").querySelectorAll("a");
  links[0].textContent = u.official;
  links[1].textContent = u.floor;
  document.querySelector(".file").textContent = u.file;
  el("file").setAttribute("aria-label", u.file);
  el("localStatus").textContent = state.source ? u.aligned : u.private;
  document.querySelector("footer .dim").textContent = u.version + " · v2.1.0";
  el("moves").replaceChildren();
  movements.forEach((m, id) => {
    const b = document.createElement("button");
    for (const [tag, text] of [
      ["span", fmt(m.at)],
      ["b", moveName(id)],
      ["small", m.jp],
    ]) {
      const node = document.createElement(tag);
      node.textContent = text;
      b.append(node);
    }
    b.onclick = () => chapter(id);
    el("moves").append(b);
  });
  el("views").replaceChildren();
  u.modes.forEach((label, i) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.value = i;
    b.setAttribute("aria-pressed", String(i === state.mode));
    b.onclick = () => {
      chooseMode(i);
      el("info").close();
    };
    el("views").append(b);
  });
  el("variant").textContent = u.modes[state.mode] + " ⇄";
  chooseLoop(state.loop);
  lastLabel = "";
  transport();
  schedule();
}
function changeLanguage(choice) {
  language = choice;
  try {
    localStorage.setItem("verb-language", choice);
  } catch {}
  if (location.protocol.startsWith("http")) {
    const u = new URL(location.href);
    u.searchParams.set("lang", choice);
    history.replaceState(null, "", u);
  }
  localize();
}
el("zh").onclick = () => changeLanguage("zh");
el("en").onclick = () => changeLanguage("en");
el("surface").onclick = pause;
el("replay").onclick = play;
let wasFullscreen = false;
document.addEventListener("fullscreenchange", () => {
  const active = !!document.fullscreenElement;
  if (wasFullscreen && !active && state.playing) pause();
  wasFullscreen = active;
});
el("start").onclick = play;
el("transport").onclick = () => (state.playing ? pause() : play());
el("chapters").onclick = () => openDialog("list");
el("about").onclick = () => openDialog("info");
el("variant").onclick = () => chooseMode((state.mode + 1) % 3);
document
  .querySelectorAll("[data-close]")
  .forEach((b) => (b.onclick = () => b.closest("dialog").close()));
el("loop").onclick = () => {
  if (state.loop >= 0) {
    chooseLoop(-1);
    return;
  }
  const s = scoreAt(now());
  const i =
    s.id >= 0
      ? s.id
      : Math.max(
          0,
          movements.findIndex((m) => m.at > now()),
        );
  chooseLoop(i);
  if (s.id < 0) {
    state.started = true;
    jump(movements[i].at);
    transport();
  }
};
el("seek").oninput = (e) => {
  chooseLoop(-1);
  state.started = true;
  jump(Number(e.target.value));
  transport();
};
el("rate").onchange = (e) => {
  const t = now();
  state.rate = Number(e.target.value);
  state.anchor = t;
  state.time = t;
  state.epoch = performance.now();
  film.playbackRate = state.rate;
};
el("mute").onclick = () => {
  state.muted = !state.muted;
  film.muted = state.muted;
  audio.volume(state.muted);
  el("mute").textContent = state.muted ? ui().silent : ui().sound;
  el("mute").setAttribute("aria-pressed", String(state.muted));
};
el("expand").onclick = async () => {
  const app = el("app");
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  if (app.classList.contains("fullscreen")) {
    app.classList.remove("fullscreen");
    return;
  }
  try {
    await app.requestFullscreen();
  } catch {
    app.classList.add("fullscreen");
  }
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    el("app").classList.remove("fullscreen");
    if (state.playing) pause();
  }
  if (
    document.querySelector("dialog[open]") ||
    e.target.closest("button,input,select,a")
  )
    return;
  if (e.code === "Space") {
    e.preventDefault();
    state.playing ? pause() : play();
  }
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
    e.preventDefault();
    chooseLoop(-1);
    state.started = true;
    jump(now() + (e.key === "ArrowRight" ? 4 : -4));
    transport();
  }
});
window.addEventListener("pagehide", () => {
  if (state.playing) pause();
});
film.addEventListener("seeked", schedule);
film.addEventListener("loadeddata", schedule);
film.addEventListener("ended", () => {
  if (!state.mode) return;
  if (state.loop >= 0) {
    jump(movements[state.loop].at);
    film.play().catch(pause);
  } else finish();
});
function loadFilm(src, temporary) {
  pause();
  const token = ++loadToken;
  state.source = false;
  chooseMode(0);
  el("views").hidden = true;
  if (objectURL) URL.revokeObjectURL(objectURL);
  objectURL = temporary ? src : "";
  film.onloadedmetadata = () => {
    if (token !== loadToken) return;
    if (
      Math.abs(film.duration - runtime) > 1.1 ||
      Math.abs(film.videoWidth / film.videoHeight - 16 / 9) > 0.05
    ) {
      el("localStatus").textContent = ui().mismatch;
      return;
    }
    state.source = true;
    el("views").hidden = false;
    el("localStatus").textContent = ui().aligned;
    chooseMode(1);
  };
  film.onerror = () => {
    if (token !== loadToken) return;
    pause();
    state.source = false;
    chooseMode(0);
    el("views").hidden = true;
    el("localStatus").textContent = ui().unreadable;
  };
  film.src = src;
  film.load();
}
el("file").onchange = (e) => {
  const f = e.target.files[0];
  if (f) loadFilm(URL.createObjectURL(f), true);
};
localize();
if (window.privateStudyFilm) loadFilm(window.privateStudyFilm, false);
atlasesReady
  .then(() => {
    el("start").disabled = false;
    schedule();
  })
  .catch(() => {
    el("notice").textContent = ui().loadError;
  });
resize();
