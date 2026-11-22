# Verb Theater · DO IT!

[Play in English](https://holynova.github.io/verb-theater/?lang=en) · [中文试玩](https://holynova.github.io/verb-theater/?lang=zh) · [简体中文](README.zh-CN.md) · [Original installation](https://tha.jp/10179)

Follow ten gestures in the order of the Japanese Design Ah! Exhibition neo installation. Pull down to raise a blind, unroll paper and switch a bedside light. The independent browser reconstruction follows the 3:30 THA documentation film with hand-drawn gesture cues, stop-motion photographic sequences and synthesized sound. The chapter menu, speed control and loop switch support repeated practice.

The ten gestures use 48 illustrated key poses. The 28 photographic scenes use 168 independently generated exposures. Kick, clap, bass and action accents follow a 120 BPM audio clock that also drives the picture. Each downward tug feeds more paper while the returning hand opens. [View the animated GIF](projection/frames/paper-feed.gif).

![DO IT! · Pull](assets/screenshot.png)

Open `index.html` directly or run `npm run build` for the static site in `dist/`. GitHub Pages serves the root of `main`. The earlier game is available at [reel.html](https://holynova.github.io/verb-theater/reel.html).

For frame comparison, load a local copy of the corresponding THA film from the credits dialog. With FFmpeg installed, `npm run study -- "/path/to/film.mp4"` builds an offline personal study edition with synchronized gesture loops in the git-ignored `个人研究版/` directory. The projection view rectifies the angled screen. Close-up shots retain the people visible in the documentation film.

Original installation credits: direction by Yugo Nakamura, music by Shuta Hasunuma, voice by DJ KOO. [THA](https://tha.jp/10179)

Playback enters full screen. Tap the picture to pause and reveal the controls. The final screen has a completion message and Replay. The offline build includes explicit English and Chinese entries in en.html and zh.html.

[Cloudflare Pages](https://verb-theater.pages.dev/) · [GitHub](https://github.com/holynova/verb-theater)
