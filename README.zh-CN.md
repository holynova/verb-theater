# 动词放映室 · DO IT!

[中文试玩](https://verb-theater.xiaosang.cc/?lang=zh) · [Play in English](https://verb-theater.xiaosang.cc/?lang=en) · [制作方的展览记录](https://tha.jp/10179) · [English](README.md)

跟着黑底白线的手势向下一拉，百叶窗升起。下一镜，同样的手势拉长卷纸，再下一镜，它成了床头灯的拉绳。网页对照日本「デザインあ展 neo」的《DO IT!》重建十组动作，沿用制作方 3 分 30 秒现场影片的段落和切点。公开版用 48 幅人物和手部关键姿势示范十组动作，28 个实景镜头由 168 张独立生成的定格照片组成，卷纸镜头随下拉逐次放纸。底鼓、拍手、贝斯和动作音效按 120 BPM 编排，画面跟随音频时钟播放。[逐帧动画 GIF](projection/frames/paper-feed.gif)

点「开始跟练」播放全场，也可以从「动作目录」直接进入任意一段。支持变速、暂停、单段循环和全屏。「作品与对照」可以读取本机上的 THA 对应版本，切换同一时间点的网页重建、透视校正投影和原镜头。现场近景会保留画面中的观众。

![DO IT! · Pull](assets/screenshot.png)

## 本地使用

直接打开 `index.html` 即可玩。运行 `npm run build` 检查脚本并生成静态目录 `dist/`。运行 `git push origin main` 后，Cloudflare Pages 构建并发布 `dist/`。

安装 FFmpeg 并准备对应影片后，运行 `npm run study -- "/本机路径/影片.mp4"` 可生成「个人研究版」目录。打开其中的 `index.html` 即可使用原声和从本机影片提取的同步手势。该目录由 Git 忽略。先前的十二幕原创游戏仍可通过 [旧版入口](https://verb-theater.xiaosang.cc/reel.html) 游玩。

## 原作署名

《DO IT!》导演中村勇吾，音乐蓮沼執太，声音 DJ KOO。[THA 作品页](https://tha.jp/10179)

点开始即进入全屏，点画面暂停并调出控制。结束只显示「完成」和「重播」。本地研究版提供 zh.html 和 en.html 两个独立入口。

[Cloudflare Pages](https://verb-theater.xiaosang.cc/) · [GitHub](https://github.com/holynova/verb-theater)

<a href="https://verb-theater.xiaosang.cc/"><img src="assets/qr.png" width="112" alt="扫码进入放映室"></a>
