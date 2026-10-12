// Renders render.html frame by frame and pipes JPEGs into ffmpeg.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { openBrowser } from './cdp.mjs';
const [w, h, out, stills] = [Number(process.argv[2] || 1080), Number(process.argv[3] || 1920), process.argv[4] || 'out.mp4', process.argv[5]];
const page = await openBrowser({ width: 400, height: 400, scale: 1, mobile: false });
await page.goto(`file://${process.cwd()}/render.html?w=${w}&h=${h}`, 1500);
const info = await page.evaluate('window.ready');
console.log('ready', info);
if (stills) {
  mkdirSync('previews', { recursive: true });
  for (const s of stills.split(',')) { const f = Math.round(Number(s) * 30); writeFileSync(`previews/${s}.jpg`, Buffer.from(await page.evaluate(`window.frame(${f})`), 'base64')); }
  page.close(); process.exit(0);
}
const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', '30', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
for (let i = 0; i < info.frames; i++) {
  const buf = Buffer.from(await page.evaluate(`window.frame(${i})`), 'base64');
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % 60 === 0) process.stdout.write(`${i}/${info.frames} `);
}
ff.stdin.end(); await new Promise((r) => ff.on('close', r));
console.log('\nwrote', out); page.close();
