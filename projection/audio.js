class ExhibitAudio {
  constructor() {
    this.muted = false;
    this.timer = null;
    this.cue = "";
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
    clearInterval(this.timer);
    this.timer = null;
    if (this.bus) this.bus.disconnect();
    this.bus = null;
    this.cue = "";
    this.silenceVoice();
  }
  start(position, rate) {
    this.stop();
    if (!this.ctx || this.ctx.state !== "running") return;
    this.bus = this.ctx.createGain();
    this.bus.connect(this.out);
    this.origin = this.ctx.currentTime + 0.035;
    this.position = position;
    this.rate = rate;
    this.nextTick = Math.ceil(position * 8 - 1e-7);
    this.queue();
    this.timer = setInterval(() => this.queue(), 25);
  }
  time() {
    if (!this.bus) return null;
    const timestamp = this.ctx.getOutputTimestamp?.();
    const audible =
      timestamp?.performanceTime > 0
        ? Math.min(
            this.ctx.currentTime,
            timestamp.contextTime +
              (performance.now() - timestamp.performanceTime) / 1000,
          )
        : this.ctx.currentTime - (this.ctx.outputLatency || 0);
    return this.position + Math.max(0, audible - this.origin) * this.rate;
  }
  queue() {
    const now = this.ctx.currentTime;
    const from = this.position + (now - this.origin) * this.rate;
    // Skip audio lost to background throttling; never fire missed hits in a burst.
    this.nextTick = Math.max(this.nextTick, Math.ceil((from - 0.012) * 8));
    while (this.nextTick / 8 <= from + 0.14 * this.rate) {
      const tick = this.nextTick++;
      const t = tick / 8;
      if (t < 5 || t >= 203) continue;
      const at = Math.max(now, this.origin + (t - this.position) / this.rate);
      this.playTick(tick, at, scoreAt(t));
    }
  }
  tone(now, freq, end, len, vol, wave = "sine") {
    const a = this.ctx;
    if (!a) return;
    const o = a.createOscillator(),
      g = a.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(freq, now);
    o.frequency.exponentialRampToValueAtTime(end, now + len);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + len);
    o.connect(g);
    g.connect(this.bus);
    o.start(now);
    o.stop(now + len + 0.01);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  hiss(now, hz, len, vol, kind = "highpass") {
    const a = this.ctx;
    if (!a) return;
    const o = a.createBufferSource(),
      f = a.createBiquadFilter(),
      g = a.createGain();
    o.buffer = this.noise;
    f.type = kind;
    f.frequency.value = hz;
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + len);
    o.connect(f);
    f.connect(g);
    g.connect(this.bus);
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
    if (this.muted || t < 5 || t >= 203) return;
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
  }
  playTick(tick, at, s) {
    const step = tick % 16; // One bar, sixteen sixteenth notes at 120 BPM.
    const beat = Math.floor(tick / 4);
    const active = s.id >= 0;
    const root = [98, 82.41, 110, 87.31][Math.floor(tick / 16) % 4];
    const hit = step % 4 === 0;
    if (hit) {
      // A brief higher tap keeps the downbeat audible on small speakers.
      this.tone(at, 178, 49, 0.17, step === 0 ? 0.92 : 0.75);
      this.tone(at, 980, 170, 0.027, 0.17, "triangle");
    }
    if (step === 4 || step === 12) {
      this.tone(at, 230, 142, 0.09, 0.3, "triangle");
      this.hiss(at, 1750, 0.105, 0.43, "bandpass");
      this.hiss(at + 0.013, 2600, 0.072, 0.2, "bandpass");
    }
    if (step % 2 === 0)
      this.hiss(
        at,
        7100,
        step % 4 === 2 ? 0.075 : 0.034,
        step % 4 === 2 ? 0.16 : 0.09,
      );
    if (active && (step === 0 || step === 6 || step === 8 || step === 14)) {
      const note = step === 6 ? root * 1.5 : step === 14 ? root * 2 : root;
      this.tone(
        at,
        note,
        note * 0.98,
        step % 8 ? 0.12 : 0.23,
        0.28,
        "triangle",
      );
      this.tone(at, note * 2, note * 2, 0.085, 0.07);
    }
    if (!active) return;
    const localTick = Math.round(s.elapsed * 8);
    if (s.scene >= 0 && s.local === 0)
      this.tone(at, 784, 523, 0.09, 0.18, "triangle");
    const cycle = gesturePeriod(s.id) * 8;
    const contact =
      s.id === 6 || s.id === 8
        ? localTick % (cycle / 2) === 0
        : localTick % cycle === cycle / 2;
    if (!contact) return;
    this.tone(at, 720, 465, 0.055, 0.27, "triangle");
    if (s.scene < 0) return;
    const k = s.id * 3 + s.scene;
    if ([3, 4, 7, 10, 12, 13, 21, 24, 25, 27].includes(k))
      this.hiss(at, [4000, 1800, 5500][s.scene], 0.19, 0.28, "bandpass");
    else if ([2, 6, 17, 18, 19].includes(k))
      this.tone(
        at,
        k === 19 ? 122 : 640,
        k === 19 ? 48 : 197,
        0.125,
        0.36,
        "triangle",
      );
    else if ([5, 8, 9, 11, 15].includes(k))
      this.tone(
        at,
        k === 15 ? 880 : 410,
        k === 15 ? 878 : 105,
        k === 15 ? 0.22 : 0.07,
        0.18,
        "sine",
      );
    else if ([22, 0, 1, 14].includes(k)) {
      this.hiss(at, 1200, 0.08, 0.23, "bandpass");
      this.tone(at, 290, 98, 0.08, 0.13);
    } else
      this.tone(at, [391, 493, 587, 659][beat % 4], 280, 0.1, 0.09, "triangle");
  }
}
