import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { PAGE_WIDTH } from './layout.js';

const MAX_BYTES = 300_000;

/** Screenshot every [data-piece] element (in page order) to {id}.{hash8}.png at 2x.
 *  A piece inside a [data-group] also takes its slice of the group's section bar above it. */
export async function screenshotPieces(html, outDir) {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: PAGE_WIDTH, height: 800 }, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const height = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
    await page.setViewportSize({ width: PAGE_WIDTH, height }); // whole page in view, so clips are page coordinates
    const boxes = await page.$$eval('[data-piece]', (els) => els.map((e) => {
      const r = e.getBoundingClientRect();
      const top = e.closest('[data-group]')?.getBoundingClientRect().top ?? r.top;
      return { id: e.dataset.piece, clip: { x: r.left, y: top, width: r.width, height: r.bottom - top } };
    }));
    const out = [];
    for (const { id, clip } of boxes) {
      const raw = await page.screenshot({ type: 'png', animations: 'disabled', clip });
      const png = await sharp(raw).png({ compressionLevel: 9, effort: 10 }).toBuffer();
      const { width, height } = await sharp(png).metadata();
      const file = `${id}.${createHash('sha256').update(png).digest('hex').slice(0, 8)}.png`;
      writeFileSync(join(outDir, file), png);
      if (png.length > MAX_BYTES) console.warn(`warning: ${file} is ${Math.round(png.length / 1000)} KB (over 300 KB)`);
      out.push({ id, file, width, height, bytes: png.length });
    }
    return out;
  } finally {
    await browser.close();
  }
}
