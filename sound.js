// The score and foley share the same transport. Scheduled voices feed a
// per-run bus so pausing or leaving a reel can silence future notes, too.
const Orchestra = (() => {
  let ctx,
    master,
    bus,
    noiseBuffer,
    enabled = true;
  function open() {
    try {
      if (!ctx) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        ctx = new Audio();
        master = ctx.createGain();
        master.gain.value = enabled ? 0.46 : 0;
        master.connect(ctx.destination);
        noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      ctx.resume().catch(() => {});
      if (!bus) {
        bus = ctx.createGain();
        bus.connect(master);
      }
    } catch {}
  }
  function stop() {
    if (!bus) return;
    const old = bus;
    bus = null;
    old.gain.setTargetAtTime(0, ctx.currentTime, 0.008);
    setTimeout(() => old.disconnect(), 70);
  }
  function mute(on) {
    enabled = on;
    if (master)
      master.gain.setTargetAtTime(on ? 0.46 : 0, ctx.currentTime, 0.015);
  }
  function voice(source, output, t, d, v, attack = 0.006) {
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(v, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + d);
    output.connect(env);
    env.connect(bus);
    source.start(t);
    source.stop(t + d + 0.01);
    source.onended = () => {
      source.disconnect();
      if (output !== source) output.disconnect();
      env.disconnect();
    };
  }
  function tone(t, f, end, d, v, type = "sine") {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t);
    osc.frequency.exponentialRampToValueAtTime(end, t + d);
    voice(osc, osc, t, d, v);
  }
  function noise(t, f, end, d, v, kind = "bandpass") {
    const src = ctx.createBufferSource(),
      flt = ctx.createBiquadFilter();
    src.buffer = noiseBuffer;
    flt.type = kind;
    flt.frequency.setValueAtTime(f, t);
    flt.frequency.exponentialRampToValueAtTime(end, t + d);
    src.connect(flt);
    voice(src, flt, t, d, v);
  }
  function foley(id, t) {
    switch (id) {
      case 0:
        tone(t, 180, 1060, 0.21, 0.28, "triangle");
        tone(t + 0.13, 830, 440, 0.09, 0.12);
        break;
      case 1:
        for (let i = 0; i < 3; i++)
          tone(t + i * 0.055, 380 + i * 140, 85, 0.065, 0.22);
        break;
      case 2:
        [420, 1009, 1607].forEach((f, i) =>
          tone(t, f, f * 0.99, 0.64 - i * 0.13, 0.27 / (i + 1)),
        );
        break;
      case 3:
        for (let i = 0; i < 4; i++)
          noise(t + i * 0.046, 1250, 460, 0.025, 0.25);
        tone(t, 90, 151, 0.2, 0.11, "triangle");
        break;
      case 4:
        noise(t, 750, 3800, 0.29, 0.36);
        break;
      case 5:
        noise(t, 1600, 400, 0.32, 0.4, "lowpass");
        tone(t + 0.11, 682, 682, 0.26, 0.13);
        break;
      case 6:
        tone(t, 240, 132, 0.08, 0.45);
        tone(t + 0.09, 970, 830, 0.12, 0.17);
        tone(t + 0.22, 790, 680, 0.13, 0.13);
        break;
      case 7:
        noise(t, 3100, 930, 0.065, 0.47);
        tone(t + 0.08, 1500, 1920, 0.083, 0.14);
        break;
      case 8:
        noise(t, 2300, 460, 0.16, 0.2);
        tone(t + 0.05, 290, 740, 0.14, 0.14, "triangle");
        break;
      case 9:
        [0, 0.09, 0.15, 0.19].forEach((n, i) =>
          tone(t + n, 890 - i * 110, 395, 0.06, 0.21 - i * 0.03),
        );
        break;
      case 10:
        noise(t, 900, 210, 0.09, 0.34, "lowpass");
        tone(t, 109, 53, 0.12, 0.28);
        break;
      case 11:
        tone(t, 1010, 390, 0.17, 0.24);
        tone(t + 0.11, 660, 285, 0.16, 0.12);
        break;
    }
  }
  function score(n, t, step, scene, level) {
    if (!ctx || !bus || ctx.state !== "running") return;
    const roots = [130.81, 146.83, 164.81],
      root = roots[level],
      bass = [1, 1, 1.25, 0.75][Math.floor(n / 4) % 4];
    if (n % 2 === 0) tone(t, 127, 45, 0.19, 0.52);
    if (n % 2 === 1) noise(t, 1900, 850, 0.13, 0.35);
    noise(t, 6500, 5300, 0.042, 0.17, "highpass");
    if (level > 0) noise(t + step * 0.5, 6200, 5100, 0.04, 0.1, "highpass");
    tone(
      t,
      root * bass * 0.5,
      root * bass * 0.49,
      step * 0.64,
      0.27,
      "triangle",
    );
    const phrase = [2, 0, 2.5, 3, 0, 2.5, 1.5, 0],
      note = phrase[(n + level * 2) % 8];
    if (note)
      tone(t + step * 0.5, root * note, root * note, 0.18, 0.12, "triangle");
    if (scene >= 0) foley(scene, t);
    else tone(t, n % 4 === 0 ? 990 : 660, n % 4 === 0 ? 990 : 660, 0.07, 0.2);
  }
  return {
    open,
    stop,
    mute,
    score,
    now: () => ctx?.currentTime ?? 0,
    ready: () => ctx?.state === "running",
  };
})();
