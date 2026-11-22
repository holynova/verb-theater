class ExhibitAudio {
  constructor() {
    this.muted = false;
    this.last = -1;
    this.cue = "";
    this.voices = [];
  }
  async unlock() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    if (!this.ctx) {
      this.ctx = new Context();
      this.out = this.ctx.createGain();
      this.out.gain.value = this.muted ? 0 : 0.48;
      const limiter = this.ctx.createDynamicsCompressor();
      this.out.connect(limiter);
      limiter.connect(this.ctx.destination);
      const n = this.ctx.sampleRate,
        buf = this.ctx.createBuffer(1, n, n),
        a = buf.getChannelData(0);
      for (let i = 0; i < n; i++) a[i] = Math.random() * 2 - 1;
      this.noise = buf;
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }
  volume(muted) {
    this.muted = muted;
    if (this.out)
      this.out.gain.setTargetAtTime(
        muted ? 0 : 0.48,
        this.ctx.currentTime,
        0.015,
      );
    if (muted) this.silenceVoice();
  }
  silenceVoice() {
    if (window.speechSynthesis) speechSynthesis.cancel();
  }
  stop() {
    this.last = -1;
    this.cue = "";
    this.silenceVoice();
    if (this.ctx?.state === "running") this.ctx.suspend().catch(() => {});
  }
  tone(freq, end, len, vol, wave = "sine") {
    const a = this.ctx;
    if (!a) return;
    const now = a.currentTime,
      o = a.createOscillator(),
      g = a.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(freq, now);
    o.frequency.exponentialRampToValueAtTime(end, now + len);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + len);
    o.connect(g);
    g.connect(this.out);
    o.start(now);
    o.stop(now + len + 0.01);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  hiss(hz, len, vol, kind = "highpass") {
    const a = this.ctx;
    if (!a) return;
    const now = a.currentTime,
      o = a.createBufferSource(),
      f = a.createBiquadFilter(),
      g = a.createGain();
    o.buffer = this.noise;
    f.type = kind;
    f.frequency.value = hz;
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + len);
    o.connect(f);
    f.connect(g);
    g.connect(this.out);
    o.start(now, Math.random() * 0.4);
    o.stop(now + len);
    o.onended = () => {
      o.disconnect();
      f.disconnect();
      g.disconnect();
    };
  }
  say(text, lang, rate) {
    if (
      this.muted ||
      !window.speechSynthesis ||
      !window.SpeechSynthesisUtterance
    )
      return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 1.08 * rate;
    u.pitch = 0.79;
    u.volume = 0.75;
    const voice = speechSynthesis
      .getVoices()
      .find((v) => v.lang.startsWith(lang.slice(0, 2)));
    if (voice) u.voice = voice;
    this.silenceVoice();
    speechSynthesis.speak(u);
  }
  update(t, s, rate) {
    if (this.muted || !this.ctx || this.ctx.state !== "running") return;
    const tick = Math.floor(t * 4 + 0.002);
    if (tick === this.last) return;
    this.last = tick;
    const beat = Math.floor(tick / 2),
      bar = beat % 8;
    if (t < 5 || t >= 203) return;
    if (tick % 2 === 0) {
      this.tone(136, 46, 0.18, 0.68);
      this.tone(
        [65.4, 65.4, 77.8, 58.3][Math.floor(beat / 4) % 4],
        47,
        0.19,
        0.14,
        "triangle",
      );
      if (beat % 2) {
        this.hiss(1050, 0.12, 0.25, "bandpass");
        this.tone(173, 92, 0.09, 0.16);
      }
      if ([0, 3, 6].includes(bar))
        this.tone(
          [261, 311, 391, 233][Math.floor(beat / 4) % 4],
          160,
          0.09,
          0.056,
          "square",
        );
    }
    this.hiss(7200, tick % 4 === 3 ? 0.075 : 0.035, tick % 2 ? 0.09 : 0.17);
    const label = s.id < 0 ? "m" + s.message[0] : "g" + s.id;
    if (label !== this.cue) {
      this.cue = label;
      if (s.id >= 0)
        this.say(promptText(s), language === "en" ? "en-US" : "zh-CN", rate);
      else if (t >= 5)
        this.say(
          messageText(s.message),
          language === "en" ? "en-US" : "zh-CN",
          rate,
        );
    }
    if (
      s.id < 0 ||
      s.scene < 0 ||
      tick % 2 ||
      ((s.id === 0 || s.id === 5) && beat % 2)
    )
      return;
    const k = s.id * 3 + s.scene;
    if ([3, 4, 7, 10, 12, 13, 21, 24, 25, 27].includes(k))
      this.hiss([4000, 1800, 5500][s.scene], 0.19, 0.28, "bandpass");
    else if ([2, 6, 17, 18, 19].includes(k))
      this.tone(
        k === 19 ? 122 : 640,
        k === 19 ? 48 : 197,
        0.125,
        0.36,
        "triangle",
      );
    else if ([5, 8, 9, 11, 15].includes(k))
      this.tone(
        k === 15 ? 880 : 410,
        k === 15 ? 878 : 105,
        k === 15 ? 0.22 : 0.07,
        0.18,
        "sine",
      );
    else if ([22, 0, 1, 14].includes(k)) {
      this.hiss(1200, 0.08, 0.23, "bandpass");
      this.tone(290, 98, 0.08, 0.13);
    } else
      this.tone([391, 493, 587, 659][beat % 4], 280, 0.1, 0.09, "triangle");
  }
}
