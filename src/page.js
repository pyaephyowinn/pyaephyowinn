import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ROWS, SECTION_HEADS, SPAN_PX } from './layout.js';
import { ART } from './art.js';
import { num } from './activity.js';


const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FONTS = [
  ['UnifrakturCook', 'UnifrakturCook-Bold.ttf', '700', 'normal'],
  ['Playfair Display', 'PlayfairDisplay.ttf', '400 900', 'normal'],
  ['Playfair Display', 'PlayfairDisplay-Italic.ttf', '400 900', 'italic'],
  ['Old Standard TT', 'OldStandard-Regular.ttf', '400', 'normal'],
  ['Old Standard TT', 'OldStandard-Bold.ttf', '700', 'normal'],
  ['Old Standard TT', 'OldStandard-Italic.ttf', '400', 'italic'],
];

let cssCache;
function css() {
  if (cssCache) return cssCache;
  const faces = FONTS.map(([family, file, weight, style]) => {
    const data = readFileSync(`${ROOT}fonts/${file}`).toString('base64');
    return `@font-face { font-family:'${family}'; src:url(data:font/ttf;base64,${data}) format('truetype'); font-weight:${weight}; font-style:${style}; }`;
  }).join('\n');
  cssCache = readFileSync(`${ROOT}templates/styles.css`, 'utf8').replace('/*FONTS*/', faces);
  return cssCache;
}

export const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Escape, then apply the content.yml inline markup: **bold**, *italic*, _underline_. */
export function inline(s, { draft = false } = {}) {
  let out = escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<i>$1</i>')
    .replace(/(^|[\s(])_(.+?)_(?=$|[\s.,;:!?)])/g, '$1<u>$2</u>');
  if (draft) out = out.replace(/TODO:[\s\S]*$/, (m) => `<span class="draft">${m}</span>`);
  return out;
}

export const urlLabel = (url) => new URL(url).host.replace(/^www\./, '') + new URL(url).pathname.replace(/\/$/, '') + ' →';

function pieces(model, t) {
  const { content: c, edition: e, weather: w, activity: a, avatar } = model;
  const p = {};
  p.masthead = `
    <div class="ears"><span>Vol. ${e.volume} · No. ${e.issue}</span><span>${t(c.masthead.edition)}</span><span>Price: ${t(c.masthead.price)}</span></div>
    <div class="title">${t(c.masthead.title)}</div>
    <div class="motto">${t(c.masthead.motto)}</div>
    <div class="dateline"><span>${escapeHtml(e.dateLabel)}</span><span>${t(c.masthead.role)}</span><span>github.com/${escapeHtml(c.login)}</span></div>`;
  p.about = `
    <div class="halftone"><img class="portrait" src="${avatar}" alt=""></div>
    <div>
      <div class="kicker">${t(c.about.kicker)}</div>
      <div class="byline"><h2 class="hed">${t(c.name)}</h2><span class="role">${t(c.about.role)}</span></div>
      <div class="body"><p>${t(c.about.text)}</p></div>
      <div class="more">${t(c.about.more)}</div>
    </div>`;
  const stat = (n, label, unit = '') => `<div><span class="n">${n}${unit ? `<small>${unit}</small>` : ''}</span><b>${label}</b></div>`;
  p.activity = `
    <div class="mkt-head"><span class="kicker">Markets · The Commit Index</span><span class="src">github.com/${escapeHtml(c.login)} →</span></div>
    <h2 class="hed">${escapeHtml(a.headline)}</h2>
    <div class="mkt-grid">
      <div class="mkt-fig"><div class="big">${num(a.total)}</div><div class="cap">contributions in the last year</div></div>
      <div class="mkt-stats">
        ${stat(num(a.allTime), 'All-time')}
        ${stat(num(a.activeDays), 'Active days', ` of ${num(a.dayCount)}`)}
        ${stat(num(a.longestStreak), 'Longest streak', ' days')}
        ${stat(num(a.currentStreak), 'Current streak', ' days')}
        ${a.bestMonth ? stat(num(a.bestMonth.count), 'Best month', ` ${escapeHtml(a.bestMonth.label)}`) : ''}
      </div>
    </div>`;
  for (const pr of c.projects) {
    p[`project-${pr.id}`] = `
      <div class="kicker">${t(pr.kicker)}</div>
      <h3 class="hed">${t(pr.headline)}</h3>
      ${ART[pr.id] ? `<figure>${ART[pr.id]}<figcaption>${t(pr.caption)}</figcaption></figure>` : ''}
      <div class="body"><p>${t(pr.body)}</p></div>
      <div class="more">${t(pr.more)}</div>`;
  }
  for (const b of c.business) {
    p[`biz-${b.id}`] = `
      <h4 class="hed">${t(b.name)}</h4>
      <div class="body"><p>${t(b.body)}</p></div>
      <div class="url">${escapeHtml(urlLabel(b.url))}</div>`;
  }
  p.classifieds = `<div class="kicker">Classifieds</div><div class="ad">${t(c.classifieds.text)}</div>`;
  const bar = w.top.length
    ? `<div class="bar">${w.top.map((x, i) => `<i style="width:${x.pct}%;background:${i ? '#7a705e' : '#1a1a1a'}"></i>`).join('')}<i style="flex:1;background:#d3c7a8"></i></div>
       <div class="legend">${[...w.top.map((x) => `${escapeHtml(x.name)} ${x.pct}%`), w.otherPct ? `Other ${w.otherPct}%` : ''].filter(Boolean).join(' · ')}</div>`
    : '';
  p.weather = `<div class="kicker">Weather</div><div><b>Forecast:</b> ${escapeHtml(w.forecast)}</div>${bar}`;
  return p;
}

const CLASS = (id) => id === 'masthead' ? 'mast' : id.startsWith('project-') ? 'project' : id.startsWith('biz-') ? 'biz' : id;

/** The whole front page as one HTML document; every [data-piece] is screenshotted on its own. */
export function renderPage(model, { draft = false } = {}) {
  const t = (s) => inline(s, { draft });
  const p = pieces(model, t);
  const sections = model.content.sections;
  const rows = ROWS.map((row) => {
    const pieceHtml = row.map(({ id, span }) => {
      if (p[id] == null) throw new Error(`no template for piece ${id}`);
      return `<section class="piece ${CLASS(id)}" data-piece="${id}" style="flex:0 0 ${span * SPAN_PX}px;width:${span * SPAN_PX}px">${p[id]}</section>`;
    }).join('');
    const head = SECTION_HEADS[row[0].id];
    if (!head) return `<div class="row">${pieceHtml}</div>`;
    return `<div class="group" data-group><div class="section-bar"><b>${t(sections[head].title)}</b><span>${t(sections[head].tagline)}</span></div><div class="row">${pieceHtml}</div></div>`;
  }).join('\n');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(model.content.masthead.title)}</title><style>${css()}</style></head><body>${rows}</body></html>`;
}
