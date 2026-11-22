import { cp, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
const film = process.argv[2];
const output = resolve(film ? "个人研究版" : "dist");
await mkdir(output, { recursive: true });
for (const file of [
  "index.html",
  "reel.html",
  "style.css",
  "scenes.js",
  "sound.js",
  "game.js",
]) {
  await copyFile(file, resolve(output, file));
}
await cp("projection", resolve(output, "projection"), { recursive: true });
if (film) {
  await copyFile(resolve(film), resolve(output, "exhibition.mp4"));
  // Pack a private two-second guide loop for each verb from the supplied film.
  const starts = vm.runInNewContext(
    (await readFile("projection/score.js", "utf8")) + ";movements.map(m=>m.at)",
  );
  await mkdir(resolve(output, "guides"), { recursive: true });
  for (const [i, at] of starts.entries()) {
    execFileSync("ffmpeg", [
      "-v",
      "error",
      "-y",
      "-ss",
      String(at + 0.04),
      "-i",
      resolve(film),
      "-an",
      "-vf",
      "fps=20,scale=512:288:flags=lanczos,unsharp=3:3:0.5,tile=8x5",
      "-frames:v",
      "1",
      "-q:v",
      "2",
      resolve(output, "guides", i + ".jpg"),
    ]);
  }
  const entry = resolve(output, "index.html");
  await writeFile(
    entry,
    (await readFile(entry, "utf8")).replace(
      "<head>",
      '<head><script>window.privateStudyFilm="exhibition.mp4";window.privateGuides=true</script>',
    ),
  );
}

if (film) {
  const original = await readFile(resolve(output, "index.html"), "utf8");
  for (const language of ["zh", "en"]) {
    await writeFile(
      resolve(output, language + ".html"),
      original.replace(
        "<head>",
        '<head><script>window.entryLanguage="' + language + '"</script>',
      ),
    );
  }
}
