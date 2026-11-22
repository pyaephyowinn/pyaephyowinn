# The Pyae Phyo Times: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the profile README with a newspaper front page whose text lives in `content.yml` and whose images are re-rendered on every edit and every Monday.

**Architecture:** A Node script loads `content.yml` and works out the edition (date, issue, volume) and the weather (from the GitHub API). It builds one HTML page from templates that are ported from the approved sample, then uses Playwright to screenshot each `[data-piece]` element to a PNG with a hashed file name. Last, it writes a `README.md` that lays the PNGs out in rows. A GitHub Action runs it on push, on a weekly schedule and on manual dispatch, and commits only when something changed.

**Tech Stack:** Node ≥ 20 (ES modules), `node:test`, `playwright` (Chromium), `yaml`, `sharp` (PNG compression), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-23-newspaper-readme-design.md`. The approved look is `docs/superpowers/specs/assets/2026-11-23-newspaper-readme-sample.html`, and it is the visual reference for every template task.

## Global Constraints

- Repo: `~/dev/pyaephyowinn`, branch `newspaper-readme`. **Do not push or merge to `main` without Pyae's explicit go-ahead.** Pushing the `newspaper-readme` branch also needs Pyae's OK the first time.
- Fonts are committed in `fonts/` with their OFL licence: UnifrakturCook 700, Playfair Display 700/900 and italic, Old Standard TT 400/700 and italic. Nothing is fetched from Google Fonts at render time.
- One image per link target. Every `<img>` has meaningful alt text built from its story's text.
- Placeholder marker: any string in `content.yml` containing `TODO:` (anywhere in the string). Strict mode (the default, and always in CI) fails and lists every placeholder path. `--draft` renders placeholders highlighted, and writes only to `preview/` (gitignored), never to `img/` or `README.md`.
- Weather leaves out markup and style languages: `HTML`, `CSS`, `SCSS`, `Less`, `EJS`, `Handlebars`, `Pug`, `Stylus`. It counts only public, owned, non-fork repos.
- Issue number = ISO-8601 week of the render date (UTC). Volume = `renderYear - startYear` as Roman numerals. `startYear: 2022` is the default.
- If any step fails (render, fetch, screenshot), the Action exits non-zero and commits nothing.
- Each PNG should be under 300 KB. Print a warning, not an error, when one is over.
- The minimax / tic-tac-toe project does not appear anywhere.
- Copy: playful tabloid headlines, and plain, accurate story text. Use the copy from the approved sample word for word unless a task says otherwise.

## Review Focus

1. **Long text in one piece of a row.** A long Currently line or profile paragraph must not clip or leave a gap. Pieces that share a row come out at the same pixel height (Task 6 test `row pieces share height`).
2. **Special characters in content**, such as `&`, `<`, quotes, `⭐` and non-Latin text, must appear literally and never inject markup (Task 5 test `escapes content`).
3. **GitHub API failure or rate limit while fetching languages.** The run fails and the last good images stay. A wrong or empty forecast must never be committed (Task 4 test `fetch failure throws`).
4. **The avatar fetch fails.** The committed fallback avatar is used instead (Task 5 test `avatar falls back`).
5. **Year boundaries.** On 2027-01-01 the masthead shows No. 53, because ISO week 53 of 2026 is still running (Task 3 test `iso week at year boundary`).

---

## File Structure

| Path | Responsibility |
|---|---|
| `package.json` | `type: module`. Scripts: `test` (`node --test tests/`), `render` (`node scripts/render.js`), `render:draft` (`node scripts/render.js --draft`). |
| `.gitignore` | `node_modules/`, `preview/` |
| `content.yml` | All text and links |
| `src/layout.js` | `ROWS` and `PAGE_WIDTH`, shared by the page template and the README builder |
| `src/content.js` | Load, validate and find placeholders in `content.yml` |
| `src/edition.js` | Date label, ISO week, Roman-numeral volume |
| `src/weather.js` | Fetch language bytes and turn them into a forecast |
| `src/avatar.js` | Avatar as a data URI, with a fallback |
| `src/art.js` | Inline SVG drawings for the two side projects (ported from the sample) |
| `src/page.js` | Build the full HTML page from the model |
| `templates/styles.css` | The sample's newspaper CSS with local `@font-face` |
| `src/shoot.js` | Playwright: one PNG per piece, compressed |
| `src/readme.js` | Write `README.md` from pieces and model |
| `scripts/render.js` | Command-line entry point that ties everything together |
| `fonts/*.ttf`, `fonts/OFL.txt` | Committed fonts |
| `assets/avatar-fallback.png` | Committed copy of the GitHub avatar |
| `img/` | Generated PNGs (committed; old hashes removed on each render) |
| `.github/workflows/render.yml` | The CI that renders and commits |
| `tests/*.test.js` | `node:test` suites |

### Shared layout (`src/layout.js`)

`PAGE_WIDTH = 888` CSS px, split into 12 spans of 74 px each. Rows, top to bottom:

| Row | Pieces (id: span) | Link |
|---|---|---|
| 1 | `masthead`: 12 | site |
| 2 | `lead`: 8, `side`: 4 | lead → site; side has no link |
| 3 | `projects-bar`: 12 | none |
| 4 | `project-newspapercn`: 6, `project-sleight`: 6 | their project URLs |
| 5 | `business-bar`: 12 | none |
| 6 | `biz-f2f`, `biz-bizcopilot`, `biz-pos`, `biz-mmtrails`: 3 each | their URLs |
| 7 | `classifieds`: 7, `weather`: 5 | classifieds → site; weather has no link |

---

### Task 1: Scaffold and seam spike

This task decides how `README.md` puts images side by side and on top of each other without visible seams. Everything in Task 7 depends on it.

**Files:**
- Create: `package.json`, `.gitignore`, `src/layout.js`, `tests/layout.test.js`, `spike/make-tiles.js`, `spike/README-a.md`, `spike/README-b.md`, `spike/README-c.md`
- Create: `docs/superpowers/notes/seam-spike.md` (the result)

**Interfaces:**
- Produces: `export const PAGE_WIDTH = 888`, and `export const ROWS: Array<Array<{id: string, span: number}>>` exactly as in the table above.

- [ ] **Step 1:** `npm init -y`. Set `"type": "module"`, `"engines": {"node": ">=20"}` and the three scripts. Run `npm i playwright yaml sharp` and `npx playwright install chromium`. Write `.gitignore`.
- [ ] **Step 2: Failing test** `tests/layout.test.js`:
  - `spans sum to 12 per row`: every row's spans add up to 12.
  - `ids are unique and complete`: the flattened ids deep-equal the 13 ids from the table, in order.
- [ ] **Step 3:** Run `npm test`. Expected: FAIL (module not found).
- [ ] **Step 4:** Write `src/layout.js`. Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Write `spike/make-tiles.js`. It uses `sharp` to write solid `#f4ecd8` PNGs with a 2 px `#1a1a1a` border: `spike/full.png` (1776×200), `spike/two-thirds.png` (1184×300) and `spike/one-third.png` (592×300).
- [ ] **Step 6:** Write three README variants, each with one full-width row followed by a two-thirds + one-third row:
  - **a:** a single `<p>`, no whitespace between tags, `<img width="100%">` / `width="66.67%"` / `width="33.33%"`, and `<br>` between rows.
  - **b:** one `<p>` per row.
  - **c:** like **a**, but each image is wrapped in `<a href="#">`.
- [ ] **Step 7:** Ask Pyae for OK to push the `newspaper-readme` branch. Commit, push, and open each variant on github.com (`.../blob/newspaper-readme/spike/README-a.md`) in light and dark mode, at desktop width and at a phone width (DevTools).
- [ ] **Step 8:** Record in `docs/superpowers/notes/seam-spike.md`:
  - which variant has no horizontal or vertical seams;
  - whether percentage `width` survives GitHub's sanitiser;
  - the README pixel width seen on a profile page.

  If every variant shows a vertical gap of a few px between rows, the fix is in the art, not the markup. Every piece starts with a full-width 2 px ink rule along its top edge, so a gap reads as part of a rule. Note that decision in the same file.
- [ ] **Step 9:** Delete `spike/`. Commit `package.json`, `package-lock.json`, `.gitignore`, `src/layout.js`, `tests/layout.test.js` and the notes file with the message `chore: scaffold renderer and record seam spike`.

### Task 2: Content file and loader

**Files:**
- Create: `content.yml`, `src/content.js`, `tests/content.test.js`, `tests/fixtures/content-min.yml`

**Interfaces:**
- Produces:
  - `loadContent(path: string, {draft: boolean}): Content`
  - `findPlaceholders(obj: unknown, prefix = ''): string[]`, which returns dotted paths such as `profile.quote` and `currently.0.text`.
  - `Content` mirrors the YAML below.

**Schema (`content.yml`).** Fill it with the sample's exact copy. `TODO:` strings are where Pyae's words go.

```yaml
login: pyaephyowinn
name: Pyae Phyo Win
site: https://pyaephyowin.com
linkedin: https://www.linkedin.com/in/pyae-phyo-win-762792246/
startYear: 2022
masthead: { title: The Pyae Phyo Times, motto: "All the code that’s fit to commit", edition: Late City Edition, price: "One ⭐", role: Software engineer · full stack }
profile:
  kicker: Profile
  headline: Engineer Ships Products by Day, Builds Toys by Night
  dek: …            # from sample
  caption: Pyae Phyo Win, at the desk.
  paragraphs: [ …, … ]   # the two sample paragraphs (the v6 text, with no minimax mention)
  quote: "TODO: a line in your own words about what you love about building things"
  more: Full story at pyaephyowin.com →
letters:
  - { q: What does this engineer actually do?, from: A Curious Reader, a: Builds full-stack web apps and the AI features inside them. }
  - { q: Why does everything end up looking like a newspaper?, from: Concerned Designer, a: "TODO: your answer" }
  - { q: What’s the stack?, from: Fellow Developer, a: "TypeScript and JavaScript, TODO: plus your main tools" }
currently:
  - { label: Building, text: "TODO: what you're working on" }
  - { label: Learning, text: "TODO: something new" }
  - { label: Reading,  text: "TODO: a book or blog" }
  - { label: Next,     text: "TODO: the next side project" }
sections:
  projects: { title: Side Projects, tagline: Built for fun, shipped anyway }
  business: { title: Business & Industry, tagline: The day job, and the shops it keeps open }
projects:
  - { id: newspapercn, kicker: Design, headline: shadcn/ui Gets the Newspaper Treatment, caption: The Grand Line Gazette theme., body: …, more: Browse the gazette →, url: https://newspapercn-ui.vercel.app }
  - { id: sleight, kicker: Tools · Browser, headline: Man Escapes Endless Log-Out Loop, caption: "One click, another account.", body: …, more: Get it on the Chrome Web Store →, url: https://chromewebstore.google.com/detail/hnpganpikcekoecoeekdopjompljjndo }
business:
  - { id: f2f, name: F2F CRM, body: …, url: https://crm.firsttofly.com/ }
  - { id: bizcopilot, name: BizCoPilot, body: …, url: https://bizcopilot.triumsoft.net/ }
  - { id: pos, name: Triumsoft POS, body: …, url: https://pos.triumsoft.net/ }
  - { id: mmtrails, name: MM Trails, body: …, url: https://www.mmtrails.com/ }
classifieds: { text: "**WANTED:** interesting problems, odd ideas, and anyone who wants to build something that looks like something else. Write to _pyaephyowin.com_ or find me on _LinkedIn_." }
```

Inline markup in any text field: `**x**` means bold (`<b>`), `*x*` means italic (`<i>`), and `_x_` means underline (`<u>`). Nothing else is interpreted. The classifieds text starts with `**WANTED:**`, and the newspapercn body wraps `*newspapercn-ui*`, as in the sample.

- [ ] **Step 1: Failing tests** `tests/content.test.js`:
  - `finds nested placeholders`: `findPlaceholders({a:{b:'TODO: x'}, c:[{d:'ok'},{d:'x TODO: y'}]})` deep-equals `['a.b','c.1.d']`.
  - `strict load throws listing paths`: `loadContent('content.yml', {draft:false})` throws (`loadContent` is synchronous), and the message includes `profile.quote` and `currently.0.text`.
  - `draft load succeeds`: with `{draft:true}`, `content.projects.length === 2` and `content.business.length === 4`.
  - `rejects missing required field`: the fixture without `site` throws, with a message naming `site`.
  - `no minimax`: the raw text of `content.yml` does not match `/minimax|tic-tac-toe/i`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Write `content.yml` with the sample's copy and `src/content.js`. Required fields: everything in the schema except `startYear`, which defaults to 2022.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit with the message `feat: content file and loader with placeholder guard`.

### Task 3: Edition

**Files:**
- Create: `src/edition.js`, `tests/edition.test.js`

**Interfaces:**
- Produces:
  - `toRoman(n: number): string`
  - `editionInfo(date: Date, startYear: number): {volume: string, issue: number, dateLabel: string}`, all in UTC.

- [ ] **Step 1: Failing tests:**
  - `roman`: `toRoman(4)` is `'IV'`, `toRoman(9)` is `'IX'`, and `toRoman(14)` is `'XIV'`.
  - `approved sample date`: `editionInfo(new Date('2026-11-23T00:00:00Z'), 2022)` deep-equals `{volume:'IV', issue:48, dateLabel:'Monday, November 23, 2026'}`.
  - `iso week at year boundary`: `editionInfo(new Date('2027-01-01T12:00:00Z'), 2022).issue === 53`, and `editionInfo(new Date('2027-01-04T00:00:00Z'), 2022).issue === 1`.
  - `volume floor`: when `startYear` equals the render year, the volume is `'I'` (it never goes below 1).
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement. Use `Intl.DateTimeFormat('en-US', {timeZone:'UTC', weekday:'long', month:'long', day:'numeric', year:'numeric'})` for the label.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit with the message `feat: edition date, issue and volume`.

### Task 4: Weather

**Files:**
- Create: `src/weather.js`, `tests/weather.test.js`

**Interfaces:**
- Produces:
  - `fetchLanguageBytes(login: string, {token?: string, fetch?: typeof fetch}): Promise<Record<string, number>>`
  - `summarizeLanguages(bytes: Record<string, number>): {top: Array<{name, pct}>, otherPct: number, forecast: string}`

`fetchLanguageBytes` pages through `GET /users/{login}/repos?type=owner&per_page=100`, keeps `!fork && !private`, then calls `GET /repos/{owner}/{repo}/languages` for each repo and sums the results. Any response that isn't OK throws an `Error` naming the URL and status.

`summarizeLanguages` drops the excluded languages from Global Constraints and takes the top two by bytes. It rounds the percentages so that `top[0].pct + top[1].pct + otherPct === 100`. Forecast wording:
- two or more languages: `mostly {A}, with spells of {B} and a high chance of side projects.`
- one language: `{A} all week, with a high chance of side projects.`
- none: `clear skies and a high chance of side projects.`

- [ ] **Step 1: Failing tests** (with a fake `fetch`, so there's no network):
  - `sums owned public non-fork repos`: two pages of repos, one of them a fork. The fork's languages are not counted.
  - `fetch failure throws`: a fake that returns `{ok:false,status:403}` rejects with a message containing `403`.
  - `excludes markup`: `summarizeLanguages({JavaScript:760, TypeScript:190, CSS:5000, HTML:900, Python:50})` has a `top` named `['JavaScript','TypeScript']`, `top[0].pct === 76`, `otherPct === 5`, and a forecast that starts with `'mostly JavaScript, with spells of TypeScript'`.
  - `percentages sum to 100`: for `{A:1,B:1,C:1}`, the sum is 100.
  - `single and empty`: check the two fallback sentences exactly.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit with the message `feat: language weather from GitHub API`.

### Task 5: Fonts, avatar, art and page template

**Files:**
- Create: `fonts/` (TTFs and `OFL.txt`), `assets/avatar-fallback.png`, `templates/styles.css`, `src/avatar.js`, `src/art.js`, `src/page.js`, `tests/page.test.js`

**Interfaces:**
- Consumes: `ROWS` and `PAGE_WIDTH` (Task 1), `Content` (Task 2), `editionInfo` (Task 3), and the return shape of `summarizeLanguages` (Task 4).
- Produces:
  - `fetchAvatarDataUri(url: string, fallbackPath: string, {fetch?}): Promise<string>`
  - `ART: {newspapercn: string, sleight: string}` (SVG markup)
  - `renderPage(model: Model, {draft: boolean}): string`, a full HTML document
  - `Model = {content: Content, edition, weather, avatar: string}`

- [ ] **Step 1:** Download the fonts from `https://github.com/google/fonts/tree/main/ofl`. Use the `unifrakturcook`, `playfairdisplay` (the variable `PlayfairDisplay[wght].ttf` and `PlayfairDisplay-Italic[wght].ttf`) and `oldstandardtt` directories, taking the raw URLs from each directory listing. Add one `OFL.txt`. Check: `file fonts/*.ttf` reports TrueType for each file. Save `https://github.com/pyaephyowinn.png?size=300` as `assets/avatar-fallback.png`.
- [ ] **Step 2:** Port `templates/styles.css` from the sample's `<style>` block:
  - keep the newspaper rules (paper, grain, masthead, kicker, hed, dek, body, drop cap, lead, side, section bar, projects, biz, foot, letter, now, halftone, portrait, draft);
  - drop the GitHub chrome, `.note`, `xray` and `dark` rules;
  - replace the Google Fonts `<link>` with `@font-face` rules that point at `../fonts/` by absolute `file://` URL (`page.js` sets them in);
  - make rows `display:flex; align-items:stretch; width:888px` with each piece `flex:0 0 calc(span*74px)`.
- [ ] **Step 3: Failing tests** `tests/page.test.js` (draft content plus a fixed model, so there's no network):
  - `every piece is present`: the HTML has exactly one `data-piece="<id>"` for each id in `ROWS`.
  - `escapes content`: with `letters[0].q = 'A < B & "C" ⭐'`, the HTML contains `A &lt; B &amp; &quot;C&quot; ⭐` and no `<B`.
  - `inline markup`: `'**WANTED:** *x* _site_'` renders `<b>WANTED:</b> <i>x</i> <u>site</u>`.
  - `business url label`: the `biz-mmtrails` piece shows `mmtrails.com →` (the URL host without `www.` and without a trailing slash, followed by ` →`).
  - `draft highlights placeholders`: in draft mode, every `TODO:` text sits inside `<span class="draft">`.
  - `masthead shows edition`: the HTML contains `Vol. IV · No. 48` and `Monday, November 23, 2026` for the Task 3 sample date.
  - `avatar falls back`: `fetchAvatarDataUri` with a fake fetch that rejects returns a `data:image/png;base64,` URI of the fallback file's bytes.
- [ ] **Step 4:** Run `npm test`. Expected: FAIL.
- [ ] **Step 5:** Implement `avatar.js`, `art.js` (SVGs taken from the sample) and `page.js`. Port the markup for each piece from the sample v6 HTML. The `side` piece holds Letters (top) and Currently (bottom). Each `*-bar` piece holds only its section bar. The `classifieds` and `weather` pieces are the two footer blocks.
- [ ] **Step 6:** Run `npm test`. Expected: PASS.
- [ ] **Step 7:** Commit with the message `feat: newspaper page template`.

### Task 6: Screenshot pieces

**Files:**
- Create: `src/shoot.js`, `tests/shoot.test.js`

**Interfaces:**
- Produces: `screenshotPieces(html: string, outDir: string): Promise<Array<{id: string, file: string, width: number, height: number, bytes: number}>>`
  - It launches Chromium with `deviceScaleFactor: 2` and `viewport.width = PAGE_WIDTH`, uses `setContent`, and waits for `document.fonts.ready`.
  - It runs `locator('[data-piece=id]').screenshot()` for each id in `ROWS` order, then compresses each PNG with `sharp().png({compressionLevel: 9})`.
  - Files are named `{id}.{sha256(bytes).slice(0,8)}.png`.
  - It warns on stderr when `bytes > 300_000`.

- [ ] **Step 1: Failing tests** (these use a tiny hand-written HTML page with the real `styles.css`, and take a few seconds):
  - `one png per piece at 2x`: a page with two pieces of spans 8 and 4 gives files 1184 and 592 px wide.
  - `row pieces share height`: in that page, piece one holds 1 line of text and piece two holds 40 lines. Both PNGs have the same `height`.
  - `hashed names change with content`: rendering twice with different text gives different file names for the changed piece and the same name for the unchanged one.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit with the message `feat: per-piece screenshots`.

### Task 7: README builder and render command

**Files:**
- Create: `src/readme.js`, `scripts/render.js`, `tests/readme.test.js`
- Modify: `README.md` (generated)

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `buildReadme(pieces, model): string`
  - `altFor(id: string, model: Model): string`
  - The command `node scripts/render.js [--draft] [--date=YYYY-MM-DD]`

`buildReadme` uses the markup variant recorded in `docs/superpowers/notes/seam-spike.md`. Each piece's `width` is its `span/12` as a percentage with 2 decimals. A piece with a link is wrapped in `<a href>`, and pieces without one are not. After the paper, it adds a centred plain line: `[pyaephyowin.com](site) · [LinkedIn](linkedin)`.

Link map:
- `masthead`, `lead` and `classifieds` link to `site`.
- `project-*` and `biz-*` link to their `url`.
- `side`, the `*-bar` pieces and `weather` have no link.

Alt text is the piece's own text in reading order, with markup stripped. For example, the masthead's alt is `The Pyae Phyo Times. Vol. IV, No. 48. Monday, November 23, 2026.`

`render.js` does the following, in order:
1. Load the content (strict unless `--draft`).
2. Work out the edition from `--date` or today in UTC.
3. Fetch the weather with `process.env.GITHUB_TOKEN`.
4. Fetch the avatar.
5. Build the page and screenshot the pieces.
6. Write the output:
   - **Strict:** empty `img/`, write the PNGs there and write `README.md`.
   - **Draft:** write to `preview/img/`, `preview/README.md` and `preview/page.html` only.

Any error exits 1 without writing anything. Render into a temp directory first and move it into place last.

- [ ] **Step 1: Failing tests** `tests/readme.test.js`:
  - `links each target once`: the README contains exactly one `<a href="https://pos.triumsoft.net/">`, and no `<a` wraps the `side`, `weather` or `*-bar` images.
  - `widths match spans`: the `lead` img has `width="66.67%"` and the `weather` img has `width="41.67%"`.
  - `alt carries the story`: the alt for `project-sleight` contains `Man Escapes Endless Log-Out Loop` and `named profiles`, and the masthead alt equals the string above.
  - `text footer`: the README ends with the `pyaephyowin.com · LinkedIn` line and both URLs.
  - `hashed paths`: every `src` matches `/^img\/[a-z-]+\.[0-9a-f]{8}\.png$/`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `readme.js` and `render.js`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Run `GITHUB_TOKEN=$(gh auth token) npm run render:draft -- --date=2026-11-23`. Expected: exit 0 and 13 PNGs in `preview/img/`. Open `preview/page.html` next to the sample. Apart from the GitHub chrome and the language numbers, they should look the same.
- [ ] **Step 6:** Run `npm run render`. Expected: exit 1, with a message listing the `TODO:` paths. `img/` and `README.md` are unchanged (`git status` is clean apart from `preview/`, which is ignored).
- [ ] **Step 7:** Commit with the message `feat: README builder and render command`.

### Task 8: GitHub Action

**Files:**
- Create: `.github/workflows/render.yml`

The workflow:
- `on`: `push` to `main` (paths `content.yml`, `src/**`, `templates/**`, `fonts/**`, `scripts/**`, `package*.json`), `schedule: cron '0 0 * * 1'`, and `workflow_dispatch`.
- `permissions: contents: write`, and `concurrency: render`.
- Steps: checkout, `setup-node` (20, npm cache), `npm ci`, `npx playwright install --with-deps chromium`, `npm test`, then `npm run render` with `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`.
- Commit only when `git status --porcelain img README.md` is non-empty, as `github-actions[bot]` with the message `chore: print this week’s edition`. The push of that commit must not re-trigger the workflow: `README.md` and `img/` are not in `paths`.

- [ ] **Step 1:** Write the workflow. Check: `brew install actionlint` (if missing), then `actionlint .github/workflows/render.yml`, which should exit 0.
- [ ] **Step 2:** Commit with the message `ci: render the paper on push and every Monday`.
- [ ] **Step 3:** Hand over to Pyae for Task 9. The schedule can only run from `main`.

### Task 9: Fill in the copy and go live (with Pyae)

- [ ] **Step 1:** Ask Pyae for the `TODO:` texts (the quote, the newspaper answer, the main tools, the four Currently lines) and the real `startYear`. Put them in `content.yml`, rewording them into the newspaper voice only if Pyae asks.
- [ ] **Step 2:** Run `GITHUB_TOKEN=$(gh auth token) npm run render`. Expected: exit 0, 13 PNGs in `img/`, and `README.md` rewritten.
- [ ] **Step 3:** Commit with the message `feat: first edition of The Pyae Phyo Times`. Push the branch, and have Pyae look at `README.md` on the branch on github.com in light and dark mode, on desktop and on a phone.
- [ ] **Step 4:** With Pyae's go-ahead, merge to `main`. Run the workflow with `gh workflow run render.yml`. Expected: the run succeeds, makes no commit (the images haven't changed), and github.com/pyaephyowinn shows the paper.
