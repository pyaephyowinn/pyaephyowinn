# Seam spike (Task 1)

Date: 2026-11-23

## Method

The spike did not push to github.com. Each markdown variant went through GitHub's own renderer and sanitiser (`POST /markdown`, `mode=gfm`, context `pyaephyowinn/pyaephyowinn`). The returned HTML was then laid out in Chromium with `github-markdown-css` at an 898 px viewport, which gives an 850 px README body, and at a 360 px phone viewport. The script measured the bounding box of every image.

## Findings

- **The sanitiser keeps percentage widths.** `width="66.67%"` survives. GitHub adds `style="max-width: 100%"`.
- **GitHub wraps unlinked images in a link to the image file.** A piece with "no link" opens its PNG when clicked. That's acceptable, and we leave it.
- **Horizontal joins are seamless** when images in a row sit in one `<p>` with no whitespace between tags. At 850 px, 566.69 + 283.30 lines up exactly with 0 px gap.
- **Variant a and variant c** (one `<p>`, `<br>` between rows, with or without `<a>` wrappers) leave a **6 px vertical gap** between rows. That's the inline-image descender gap, and the size is the same at both viewport widths.
- **Variant b** (one `<p>` per row) leaves a 22 px gap. Rejected.
- **Floats** (`align="left"`) remove the vertical gap, but GitHub's CSS adds `padding-right: 20px` to `img[align=left]`, so the rows wrap. Rejected.

## Decision

- Use **variant c**: one `<p>` for the whole paper, every piece inline with no whitespace between tags, `<br>` between rows, and linked pieces wrapped in `<a href>`.
- The 6 px gap between rows can't be avoided with markup, so **it becomes part of the art**. Every piece draws a 2 px ink rule along its top and bottom edges. On a light page, the gap between two rows reads as a newspaper double rule (ink, paper-white, ink). On a dark page, it reads as one heavy rule.
- This still has to be checked on the real github.com in Task 9.
