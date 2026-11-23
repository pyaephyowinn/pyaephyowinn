import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ROWS, SPAN_PX } from './layout.js';
import { ART } from './art.js';
import { num } from './activity.js';

const INK = ['#e2d6b6', '#b8ab8e', '#857a65', '#4a443a', '#1a1a1a'];
const CELL = 10;
const STEP = 12;
const SHORT_MONTH = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short' });

/** The contribution calendar as an ink-on-paper SVG: one column per week, one square per day. */
export function heatmap(weeks) {
  const top = 13;
  let labels = [];
  weeks.forEach((w, col) => {
    const first = w.find((d) => d.date.endsWith('-01')) ?? (col === 0 ? w[0] : null); // a month starts this week
    const key = first?.date.slice(0, 7);
    if (key && labels.at(-1)?.key !== key) labels.push({ key, col, text: SHORT_MONTH.format(new Date(`${key}-01T00:00:00Z`)) });
  });
  labels = labels.filter((l, i) => (labels[i + 1]?.col ?? weeks.length) - l.col >= 3);
  const cells = weeks.flatMap((w, col) => w.map((d) =>
    `<rect x="${col * STEP}" y="${top + d.weekday * STEP}" width="${CELL}" height="${CELL}" fill="${INK[d.level]}"/>`));
  const text = labels.map((l) => `<text x="${l.col * STEP}" y="9" font-family="Old Standard TT" font-size="9" letter-spacing=".5">${l.text.toUpperCase()}</text>`);
  return `<svg viewBox="0 0 ${weeks.length * STEP - (STEP - CELL)} ${top + 7 * STEP - (STEP - CELL)}" xmlns="http://www.w3.org/2000/svg">${text.join('')}${cells.join('')}</svg>`;
}

const legend = () => `<span class="scale">Less ${INK.map((c) => `<i style="background:${c}"></i>`).join('')} More</span>`;

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
  p.lead = `
    <div class="kicker">${t(c.profile.kicker)}</div>
    <h2 class="hed">${t(c.profile.headline)}</h2>
    <div class="dek">${t(c.profile.dek)}</div>
    <div class="lead-grid">
      <figure><div class="halftone"><img class="portrait" src="${avatar}" alt=""></div><figcaption>${t(c.profile.caption)}</figcaption></figure>
      <div class="body dropcap">
        ${c.profile.paragraphs.map((x) => `<p>${t(x)}</p>`).join('')}
        <div class="quote">“${t(c.profile.quote)}”</div>
        <div class="more">${t(c.profile.more)}</div>
      </div>
    </div>`;
  p.side = `
    <div class="block">
      <div class="kicker">Letters to the Editor</div>
      ${c.letters.map((l) => `<div class="letter"><div class="q">“${t(l.q)}” <span class="from">— ${t(l.from)}</span></div><div class="a">${t(l.a)}</div></div>`).join('')}
    </div>
    <div class="block now">
      <div class="kicker">Currently</div>
      ${c.currently.map((x) => `<div class="item"><b>${t(x.label)}</b><span>${t(x.text)}</span></div>`).join('')}
    </div>`;
  const arrow = (n) => (n > 0 ? '▲' : n < 0 ? '▼' : '');
  p.activity = `
    <div class="mkt-head"><span class="kicker">Markets · The Commit Index</span><span class="src">github.com/${escapeHtml(c.login)} →</span></div>
    <h2 class="hed">${escapeHtml(a.headline)}</h2>
    <div class="mkt-grid">
      <div class="mkt-fig">
        <div class="big">${num(a.total)}</div>
        <div class="cap">contributions in the last year</div>
        <div class="stats">
          <div><b>Active days</b><span>${num(a.activeDays)} of ${num(a.dayCount)}</span></div>
          <div><b>Longest streak</b><span>${num(a.longestStreak)} days</span></div>
          <div><b>Current streak</b><span>${num(a.currentStreak)} days</span></div>
          ${a.busiest ? `<div><b>Busiest day</b><span>${escapeHtml(a.busiest.short)} · ${num(a.busiest.count)}</span></div>` : ''}
        </div>
      </div>
      <div class="mkt-chart">
        <figure>${heatmap(a.weeks)}<figcaption><span>One square a day. The darker the ink, the busier the desk.</span>${legend()}</figcaption></figure>
        <div class="ticker">${a.months.map((m) => `<span><b>${escapeHtml(m.label)}</b> ${num(m.count)}${m.trend ? ` <em class="${m.trend > 0 ? 'up' : 'down'}">${arrow(m.trend)}</em>` : ''}</span>`).join('')}</div>
      </div>
    </div>`;
  p['projects-bar'] = `<b>${t(c.sections.projects.title)}</b><span>${t(c.sections.projects.tagline)}</span>`;
  p['business-bar'] = `<b>${t(c.sections.business.title)}</b><span>${t(c.sections.business.tagline)}</span>`;
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

const CLASS = (id) => id === 'masthead' ? 'mast' : id === 'side' ? 'side stack' : id.endsWith('-bar') ? 'section-bar'
  : id.startsWith('project-') ? 'project' : id.startsWith('biz-') ? 'biz' : id;

/** The whole front page as one HTML document; every [data-piece] is screenshotted on its own. */
export function renderPage(model, { draft = false } = {}) {
  const t = (s) => inline(s, { draft });
  const p = pieces(model, t);
  const rows = ROWS.map((row) => `<div class="row">${row.map(({ id, span }) => {
    if (p[id] == null) throw new Error(`no template for piece ${id}`);
    return `<section class="piece ${CLASS(id)}" data-piece="${id}" style="flex:0 0 ${span * SPAN_PX}px;width:${span * SPAN_PX}px">${p[id]}</section>`;
  }).join('')}</div>`).join('\n');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>The Pyae Phyo Times</title><style>${css()}</style></head><body>${rows}</body></html>`;
}
