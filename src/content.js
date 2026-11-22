import { readFileSync } from 'node:fs';
import YAML from 'yaml';
import { ROWS } from './layout.js';

const MARKER = 'TODO:';

const REQUIRED = [
  'login', 'name', 'site', 'linkedin',
  'masthead.title', 'masthead.motto', 'masthead.edition', 'masthead.price', 'masthead.role',
  'profile.kicker', 'profile.headline', 'profile.dek', 'profile.caption', 'profile.paragraphs', 'profile.quote', 'profile.more',
  'letters', 'currently',
  'sections.projects.title', 'sections.projects.tagline', 'sections.business.title', 'sections.business.tagline',
  'projects', 'business', 'classifieds.text',
];
const ITEM_FIELDS = {
  letters: ['q', 'from', 'a'],
  currently: ['label', 'text'],
  projects: ['id', 'kicker', 'headline', 'caption', 'body', 'more', 'url'],
  business: ['id', 'name', 'body', 'url'],
};

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const missing = (v) => v == null || v === '' || (Array.isArray(v) && v.length === 0);

/** Dotted paths of every string that contains the placeholder marker. */
export function findPlaceholders(obj, prefix = '') {
  if (typeof obj === 'string') return obj.includes(MARKER) ? [prefix] : [];
  if (obj && typeof obj === 'object') {
    return Object.entries(obj).flatMap(([k, v]) => findPlaceholders(v, prefix ? `${prefix}.${k}` : k));
  }
  return [];
}

function validate(data) {
  const errors = REQUIRED.filter((p) => missing(get(data, p)));
  for (const [list, fields] of Object.entries(ITEM_FIELDS)) {
    const items = get(data, list);
    if (!Array.isArray(items)) continue;
    items.forEach((item, i) => fields.forEach((f) => missing(item?.[f]) && errors.push(`${list}.${i}.${f}`)));
  }
  if (errors.length) throw new Error(`content.yml is missing required fields: ${errors.join(', ')}`);
  checkSlots(data, 'projects', 'project-');
  checkSlots(data, 'business', 'biz-');
}

/** Every project/business entry needs a place on the page (src/layout.js), and every place needs an entry. */
function checkSlots(data, list, prefix) {
  const slots = ROWS.flat().map((p) => p.id).filter((id) => id.startsWith(prefix)).map((id) => id.slice(prefix.length));
  const ids = data[list].map((x) => x.id);
  const extra = ids.filter((id) => !slots.includes(id));
  const absent = slots.filter((id) => !ids.includes(id));
  if (extra.length || absent.length) {
    throw new Error(`content.yml ${list} must match the page layout (src/layout.js): `
      + [extra.length && `no slot for ${extra.join(', ')}`, absent.length && `missing ${absent.join(', ')}`].filter(Boolean).join('; '));
  }
}

/** Load and validate content.yml. Strict mode (draft: false) refuses any placeholder. */
export function loadContent(path, { draft = false } = {}) {
  const data = YAML.parse(readFileSync(path, 'utf8')) ?? {};
  validate(data);
  data.startYear ??= 2022;
  if (!draft) {
    const todos = findPlaceholders(data);
    if (todos.length) throw new Error(`content.yml still has placeholders (TODO:) at: ${todos.join(', ')}`);
  }
  return data;
}
