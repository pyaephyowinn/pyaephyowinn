# The Pyae Phyo Times: a newspaper-style GitHub profile README

Date: 2026-11-23
Status: draft, awaiting approval
Approved layout sample: [`assets/2026-11-23-newspaper-readme-sample.html`](assets/2026-11-23-newspaper-readme-sample.html). Open it in a browser. "Show how it's built" outlines the image pieces. "Toggle GitHub dark mode" shows the page on a dark profile.

## Intent

The current profile README is a short CV summary: a greeting, "4+ years full-stack", and a list of links. The new one is for **other developers**, to show **what Pyae enjoys building**, and its creativity should show in the README itself rather than be described.

The README becomes the front page of a newspaper, *The Pyae Phyo Times*. The newspaper is only the look. The stories are about Pyae and Pyae's projects. newspapercn-ui (the One Piece newspaper-themed shadcn/ui variant) is one project among others and should not dominate the page.

## Goals

- A visitor understands within a few seconds who Pyae is, what Pyae builds, and what Pyae does for fun.
- Every project from the current README stays and links to its live site.
- It looks like a real broadsheet front page on github.com: paper tone, blackletter masthead, serif headlines, column rules.
- Updating the text, above all the **Currently** box, is a one-line edit in one text file.
- The masthead date and issue number stay current on their own, so the newspaper joke is true on any visit.

## Non-goals

- A "breaking news" strip or any feed generated from GitHub activity. This was considered and deferred. It could be added later.
- Third-party stats cards, badge walls or visitor counters.
- Any change to pyaephyowin.com or to the project repos.
- The minimax / tic-tac-toe visualizer. Pyae removed it from the page on purpose.

## Anti-goals (a failure even if it technically works)

- The page reads as an ad for newspapercn-ui.
- Text too small or blurry to read on a normal desktop GitHub page.
- A stuck or visibly stale masthead, or broken images, because the scheduled job failed.
- Yellow placeholder text going live.
- A generic-looking README: if it could be anyone's profile with the name swapped, it failed.

## Constraints

- GitHub READMEs strip `<style>`, `<script>` and most attributes. Anything styled must be an image. GitHub keeps `<a>`, `<img>` (with `width`/`height`/`alt`), `<picture>`/`<source>`, `<p align>`, `<br>`, and a few others.
- One image can have only one link. **Every link target needs its own image.**
- Images are shown through GitHub's image proxy (camo), which caches. Pieces that change weekly need a cache-busting file name or query string.
- The profile README renders from `README.md` on the default branch (`main`) of `pyaephyowinn/pyaephyowinn`.
- Fonts (OFL-licensed Google Fonts): **UnifrakturCook 700** (masthead), **Playfair Display** 700/900 and italic (headlines, decks), **Old Standard TT** 400/700 and italic (body). They are kept in the repo, not fetched at runtime.

## Approaches considered

| | Approach | Trade-off |
|---|---|---|
| A | Hand-made images committed once. A weekly job patches only the date and languages. | Quickest to go live, but every text change means hand-editing an image, which kills the Currently box. |
| **B (chosen)** | **One `content.yml` holds all text. A script renders the images from HTML/CSS templates based on the approved sample. A GitHub Action re-renders on edit and weekly.** | More to build at the start, but every later change is a one-line text edit. |
| C | Plain markdown with only the masthead as an image | Simplest, but it loses the paper look, which is the point. Dropped. |

Pyae picked **B** because the Currently box only works if updating it is painless.

## What Pyae decided

### Page structure (top to bottom), as in the sample

1. **Masthead** (links to pyaephyowin.com)
   - Ears: "Vol. IV · No. 48", "Late City Edition", "Price: One ⭐".
   - Title: *The Pyae Phyo Times*. Motto: "All the code that's fit to commit".
   - Dateline: the date, "Software engineer · full stack", "github.com/pyaephyowinn".
2. **Front-page row**
   - **Lead story, a profile of Pyae** (links to pyaephyowin.com).
     - Kicker "Profile". Headline "Engineer Ships Products by Day, Builds Toys by Night". A deck.
     - A halftone-treated GitHub avatar with a caption.
     - Two paragraphs: the production web apps and the AI work, then the side projects.
     - A pull-quote in Pyae's words, and "Full story at pyaephyowin.com →".
   - **Side column, top: Letters to the Editor.** Three reader letters with "ED. —" replies: "What does this engineer actually do?", "Why does everything end up looking like a newspaper?" and "What's the stack?". No link.
   - **Side column, bottom: Currently.** Building / Learning / Reading / Next. No link.
3. **Side Projects** section bar ("Built for fun, shipped anyway"), then two equal stories, each with a small drawing:
   - **newspapercn-ui**: "shadcn/ui Gets the Newspaper Treatment". Links to https://newspapercn-ui.vercel.app.
   - **Sleight**: "Man Escapes Endless Log-Out Loop". Links to the Chrome Web Store listing.
4. **Business & Industry** section bar ("The day job, and the shops it keeps open"), then four equal one-liners, each linking to its live site:
   - F2F CRM: https://crm.firsttofly.com/
   - BizCoPilot: https://bizcopilot.triumsoft.net/
   - Triumsoft POS: https://pos.triumsoft.net/
   - MM Trails: https://www.mmtrails.com/
5. **Footer row**
   - **Classifieds:** "WANTED: interesting problems…" with pyaephyowin.com and LinkedIn.
   - **Weather:** "mostly JavaScript, with spells of TypeScript…", a language bar and percentages.

Tone: playful tabloid headlines, plain and accurate story text. The project one-liners are based on each site's own description.

### Updates

- **Light updates.** A scheduled job updates the masthead date and issue number and the Weather languages every week. Everything else is hand-written in `content.yml`.
- Re-render on every push that changes the content or templates, and on manual dispatch.

### Content Pyae still has to supply (must not go live as placeholders)

- The pull-quote: one line about what Pyae loves about building things.
- The answer to "Why does everything end up looking like a newspaper?".
- Main tools besides TypeScript/JavaScript, for "What's the stack?".
- The four Currently lines.
- The volume start year (the year Pyae started building professionally). The sample's "IV" fits 2022, which is the default until Pyae confirms.

The build can go ahead with these as placeholders. Publishing to `main` waits until they're filled. The renderer should **fail the build** if any placeholder marker is left in `content.yml`, in CI and on `main`. A **draft mode** for local previews and the `newspaper-readme` branch renders placeholders highlighted instead.

## My calls (Claude's, not yet confirmed by Pyae)

- **Rendering:** each piece is a **PNG rendered by headless Chromium (Playwright)** from one HTML page built from the templates, screenshotted per piece at 2× device scale.
  - Why: it reproduces the approved sample exactly (columns, justified text, drop caps, halftone, grain), with no font embedding and no cross-browser `foreignObject` quirks.
  - Cost: larger files than SVG. Keep each piece reasonably small (aim < 300 KB) with PNG optimisation.
  - The builder may switch to SVG if that turns out clearly better, as long as it looks the same as the sample.
- **How pieces are cut:** one image per link target. Pieces with no link (Letters + Currently, section bars, Weather) may be merged with a neighbour if it simplifies the row layout. A natural cut:
  - Masthead.
  - Front-page row as two images: the lead (link) and the side column (no link).
  - Side Projects bar plus the two stories.
  - Business bar plus the four one-liners.
  - Classifieds plus Weather.
  The rows must join seamlessly with no visible gaps at GitHub's README width on desktop.
- **LinkedIn link:** the Classifieds image can only carry one link (pyaephyowin.com). So a plain one-line markdown footer under the paper gives text links to pyaephyowin.com and LinkedIn (https://www.linkedin.com/in/pyae-phyo-win-762792246/). It also helps people using screen readers or text-only views.
- **Alt text:** every image gets meaningful alt text that carries its story, not just "masthead".
- **Issue number** = ISO week of the year. **Date** = the date of the render. **Volume** = years since a start year set in `content.yml`, shown as a Roman numeral. The sample's "IV" assumes a start year that gives 4. Pyae should set the real one.
- **Avatar:** fetched at render time from `https://github.com/pyaephyowinn.png`, grayscale + halftone treatment as in the sample. If the fetch fails, fall back to a committed copy.
- **Weather:** the share of bytes by language across Pyae's **public, non-fork, owned** repos, from the GitHub API using the Action's token. Leave out markup and style languages (HTML, CSS, Less, EJS and similar) so the forecast never says "spells of CSS". Show the top two by name plus "Other". The forecast sentence picks wording from the top languages: "mostly X, with spells of Y, and a high chance of side projects."
- **Schedule:** every Monday 00:00 UTC, plus on push and manual dispatch. The Action commits regenerated images only when they changed. Cache busting uses a content hash or the date in the image URL, written into `README.md` by the renderer.
- **Testing the schedule:** GitHub runs scheduled workflows only from the default branch, so the weekly run can only be checked after merging to `main`. Before that, test it with manual dispatch.
- **Failure handling:** if rendering fails, the Action fails without committing, so the last good images stay live.
- **The old README** content is replaced. The current file is in git history.
- **Work happens on the branch `newspaper-readme`** in a local clone at `~/dev/pyaephyowinn`. Nothing is pushed or merged to `main` without Pyae's go-ahead.

## Left to the builder

- Repo layout, script language (Node is a natural fit since Playwright is involved), template engine, YAML schema.
- Exact pixel widths and how rows are put together in markdown, as long as they join seamlessly on desktop and stay as readable as possible on mobile. `<picture>` with `media` queries for a narrow layout is worth trying, but not required.
- The drawings for the two side projects can be refined from the sample's sketches. Keep them simple ink-on-paper line art, and don't copy One Piece artwork.
- How to preview locally before committing.
