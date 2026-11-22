import { copyFile, mkdir } from 'node:fs/promises';

const files = ['index.html', 'style.css', 'game.js', 'scenes.js', 'sound.js'];
const output = new URL('./dist/', import.meta.url);
await mkdir(output, { recursive: true });
for (const file of files) {
  await copyFile(new URL(file, import.meta.url), new URL(file, output));
}
