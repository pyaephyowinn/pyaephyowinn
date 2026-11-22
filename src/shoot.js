import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { PAGE_WIDTH } from './layout.js';

const MAX_BYTES = 300_000;

/** Screenshot every [data-piece] element (in page order) to {id}.{hash8}.png at 2x. */
export async function screenshotPieces(html, outDir) {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: PAGE_WIDTH, height: 800 }, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const ids = await page.$$eval('[data-piece]', (els) => els.map((e) => e.dataset.piece));
    const out = [];
    for (const id of ids) {
      const raw = await page.locator(`[data-piece="${id}"]`).screenshot({ type: 'png', animations: 'disabled' });
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
