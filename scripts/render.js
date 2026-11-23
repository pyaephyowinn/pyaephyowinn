#!/usr/bin/env node
// Render The Pyae Times: content.yml → img/*.png + README.md.
//   node scripts/render.js            strict: refuses TODO: placeholders, writes img/ and README.md
//   node scripts/render.js --draft    highlights placeholders, writes preview/ only
//   --date=YYYY-MM-DD                 render as of that date (UTC) instead of today
import { mkdtempSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { loadContent } from '../src/content.js';
import { editionInfo } from '../src/edition.js';
import { fetchLanguageBytes, summarizeLanguages } from '../src/weather.js';
import { fetchAvatarDataUri } from '../src/avatar.js';
import { fetchContributions, summarizeActivity } from '../src/activity.js';
import { renderPage } from '../src/page.js';
import { screenshotPieces } from '../src/shoot.js';
import { buildReadme } from '../src/readme.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function parseArgs(argv) {
  const args = { draft: false, date: new Date() };
  for (const a of argv) {
    if (a === '--draft') args.draft = true;
    else if (a.startsWith('--date=')) {
      const d = new Date(`${a.slice(7)}T00:00:00Z`);
      if (Number.isNaN(d.getTime())) throw new Error(`bad --date: ${a}`);
      args.date = d;
    } else throw new Error(`unknown argument: ${a}`);
  }
  return args;
}

async function main() {
  const { draft, date } = parseArgs(process.argv.slice(2));
  const content = loadContent(join(ROOT, 'content.yml'), { draft });
  const edition = editionInfo(date, content.startYear);
  const token = process.env.GITHUB_TOKEN;
  const weather = summarizeLanguages(await fetchLanguageBytes(content.login, { token }));
  const activity = summarizeActivity(await fetchContributions(content.login, { token, date }));
  const avatar = await fetchAvatarDataUri(`https://github.com/${content.login}.png?size=300`, join(ROOT, 'assets/avatar-fallback.png'));
  const model = { content, edition, weather, activity, avatar };

  const html = renderPage(model, { draft });
  const stage = mkdtempSync(join(tmpdir(), 'times-'));
  const pieces = await screenshotPieces(html, join(stage, 'img'));
  const readme = buildReadme(pieces, model);
  writeFileSync(join(stage, 'README.md'), readme);

  if (draft) {
    const out = join(ROOT, 'preview');
    rmSync(out, { recursive: true, force: true });
    mkdirSync(out, { recursive: true });
    cpSync(join(stage, 'img'), join(out, 'img'), { recursive: true });
    writeFileSync(join(out, 'README.md'), readme);
    writeFileSync(join(out, 'page.html'), html);
    console.log(`draft: ${pieces.length} pieces in preview/`);
  } else {
    const img = join(ROOT, 'img');
    rmSync(img, { recursive: true, force: true });
    cpSync(join(stage, 'img'), img, { recursive: true });
    renameSync(join(stage, 'README.md'), join(ROOT, 'README.md'));
    console.log(`printed Vol. ${edition.volume} No. ${edition.issue}: ${readdirSync(img).length} pieces`);
  }
  rmSync(stage, { recursive: true, force: true });
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
