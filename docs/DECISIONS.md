# Idan.Lab — Decisions Log

> Newest at top. Superseded entries move to `DECISIONS-ARCHIVE.md` rather than being deleted. Each
> entry records a decision and *why*, so future-you (and Claude) never re-litigate settled questions.
> Format: date · decision · rationale · status. When a ROADMAP item is resolved, record the decision here.

---

### 2026-09-03 · A component override in `astro.config.mjs` silently disables a Starlight plugin's override of the same component

- **Context, not a supersession:** 2026-09-03 · The Principle coda keeps the pager, and `principle:` is
  HackTheBox-only with a build guard introduced the `MarkdownContent` override this entry repairs.
  Nothing in that entry is retired and it is not archived: the coda is still appended by an additive
  override rendering `<Default><slot />{coda}</Default>`, still HackTheBox-only, still guarded. The only
  thing that changes is which module `Default` resolves to, which that entry never states.
- **Decision:** `src/components/overrides/MarkdownContent.astro` imports its `Default` from
  `starlight-image-zoom/overrides/MarkdownContent.astro`, NOT from
  `@astrojs/starlight/components/MarkdownContent.astro`. The plugin's override is itself
  `<ImageZoom /><StarlightMarkdownContent><slot /></StarlightMarkdownContent>`, so chaining through it is
  exactly Starlight's behaviour plus the zoom, and the coda still lands inside the real
  `.sl-markdown-content`.
- **The failure, and why it is silent.** `starlight-image-zoom` claims `MarkdownContent` DEFENSIVELY. Its
  `config:setup` hook runs `if (!config.components?.MarkdownContent)` before assigning its own override,
  so it yields to a user override rather than fighting it. Naming ANY `MarkdownContent` override in
  `astro.config.mjs` therefore makes the plugin skip its own, with no warning, no error, and a green
  build. Its `<ImageZoom />` element, which carries BOTH the zoom script and the zoom stylesheet, never
  renders. Image zoom died on every writeup the moment the coda override landed, and was found the same
  day while authoring the first PicoCTF page.
- **Two symptoms, one cause,** which is the reason this is worth an entry rather than a commit message.
  (1) No zoom anywhere, on all 13 content images. (2) The italic caption under every content image had a
  clickable first character: with the plugin stylesheet absent, `.starlight-image-zoom-control` fell back
  to `position: static` and laid out INLINE in the following text run, landing on the caption's opening
  characters. Symptom 2 was reported as a caption bug and symptom 1 as a plugin bug; they are the same
  defect, and chasing either one alone would have missed it.
- **Why no build guard catches this,** and why one is not being written. A Starlight plugin's component
  claims are internal to its `config:setup` hook, which receives the config and mutates it; nothing
  exposes "the overrides this plugin WOULD have taken" for another pass to compare against. A guard would
  have to hardcode each plugin's claim list and re-derive it on every upgrade, which is a second source
  of truth for a two-plugin site. The mitigation is the standing rule below plus a comment at the import
  in `MarkdownContent.astro` naming the trap, placed where the next person will be editing.
- **Standing rule:** adding an entry to `components:` in `astro.config.mjs` requires checking every
  Starlight plugin for a claim on that same component, and chaining through the plugin's override when
  one exists. Today that is `starlight-image-zoom` and `MarkdownContent`. The check is per component, not
  per plugin: `PageSidebar` and `Head` were both safe, which is why the collision went unnoticed for two
  prior overrides.
- **Rejected:** moving the coda back to a `Footer` seam to free the slot (that seam deleted the page's
  pagination, which is the entire reason the coda moved to `MarkdownContent`); re-implementing
  `<ImageZoom />` inside our override (forks plugin internals, drifts on upgrade, and is exactly the
  "never rebuild a Starlight component" rule); dropping `starlight-image-zoom` (screenshots on writeups
  want zoom, and the caption bug would survive anyway since it comes from the plugin's own stylesheet);
  ordering `plugins` after `components` in the config (the guard is a value test, not an order test, so
  it changes nothing).
- **Verified:** build green at 47 pages. On `astro preview` at 1280px:
  `customElements.get('starlight-image-zoom')` true and the control opens the dialog;
  `.starlight-image-zoom-control` back to `position: absolute` inside the image (x 315, y 1539) with
  caption overlap false, against x 296 / y 2060 overlapping a caption box starting x 296 / y 2045 before
  the fix; Busqueda keeps its coda as the last child inside `.sl-markdown-content` with the pager
  beneath, and all 7 of its images are zoomable; Bandit unaffected; console clean.
- **Status:** Adopted + shipped.

---

### 2026-09-03 · The Principle coda keeps the pager, and `principle:` is HackTheBox-only with a build guard
- **Supersedes in part:** 2026-07-04 · Principle coda auto-appends from frontmatter; JetBrains Mono
  italic loaded. Only the "Auto-append" bullet dies: the Footer seam, the pagination suppression ("the
  silence"), and the hand-made `.sl-markdown-content` wrapper. The schema field, the italic face and
  frontmatter-only authoring stand.
- **Decision:** the coda is appended INSIDE the content wrapper by an additive
  `src/components/overrides/MarkdownContent.astro` (`<Default><slot />{coda}</Default>`), and the Footer
  override is deleted, so Starlight's default Prev/Next pagination renders beneath the coda on every
  writeup. `principle:` is valid ONLY on `src/content/docs/hackthebox/<tier>/<slug>.mdx`, stays optional
  there, and `plugins/remark-inject-writeupmeta.mjs` fails the build on one anywhere else or on an empty
  value. The override's render test and the guard agree; the guard is the one that can fail loudly.
- **Why the pager comes back:** the owner dislikes losing Prev/Next. The "nothing should render after the
  coda" follow-up in 2026-07-04 · Principle: a closing epigraph component for writeups (centered italic
  mono maxim) was an aesthetic default, not a constraint. The coda is content, so it closes the content;
  the pager is chrome, so it stays last.
- **Why HackTheBox only:** Bandit is a minigame, one command per level, and a coda there is noise. On a
  progressive wargame the old seam would also have deleted the primary navigation.
- **Why the guard lives in the injector:** Zod (`content.config.ts`) has no file path in scope, and the
  taxonomy guard was scoped away from frontmatter (2026-07-20 · WriteupMeta is injected from frontmatter,
  platform is derived from the directory). The injector already derives platform from the path and
  already throws on a bad frontmatter value (`badges`), so it is the one pass that sees both. One place,
  so writeup #51 costs one frontmatter line.
- **Rejected:** a coda on Bandit or any non-HTB page; the pager above the coda; narrowing the render
  test without a guard (silent ignore, the failure mode at scale); a separate plugin for one check;
  making `principle:` required on HTB now (a three-line flip in the same guard, deferred until the mass
  import has landed).
- **Verified:** build green at 46 pages; three negative probes (Bandit level, HTB hub, empty value) each
  fail with the guard's message naming the file; on `astro preview`, busqueda measures 57.59px above the
  coda and 96px from coda to pager (6rem by construction: 1.5rem collapsed sibling margin, 3rem `.meta`,
  1.5rem footer gap, the rhythm every Bandit page already has), identical at 375px with no overflow;
  one `.sl-markdown-content` per page; Bandit keeps its pager with no coda; console clean.
- **Status:** Adopted + shipped.

### 2026-08-29 · Astro 6 to 7 and Starlight 0.39 to 0.41, upgraded in phases against a byte-reproducible build
- **Supersedes in part:** 2026-05-31 · Stay on current package versions (no upgrade). Only the "remain on
  Astro 6.3.3 / Starlight 0.39.2" half dies. That entry's actual POLICY, upgrade only from a stable
  checkpoint and never hand-bump, stands and is what this migration followed.
- **Supersedes in part:** 2026-08-01 · Thirteen Dependabot alerts triaged and deliberately deferred. Only
  the deferral dies: all 13 are cleared and `npm audit` is 0. That entry's threat-model analysis, and its
  framing of the fix as presentation rather than security, stand unchanged.
- **Decision:** the framework moves to `astro` 7.2.9 and `@astrojs/starlight` 0.41.10, carrying
  `@astrojs/mdx` 7.0.8, `astro-expressive-code` 0.44.1, `starlight-image-zoom` 0.15.0, `sharp` 0.35.4 and
  `vite` 8.2.2, plus three newly DIRECT dependencies: `@astrojs/markdown-remark` at `7.2.4` exact,
  `unist-util-visit` at `^5.1.0` and `acorn` at `^8.16.0`. Current state in CORE_SPEC §3.
- **The range forms are a decision and look inconsistent on purpose.** The invariant is ONE PHYSICAL COPY
  SHARED WITH THE CONSUMER: the custom remark and rehype plugins bind to `unist-util-visit` and `acorn`
  directly, and `astro.config.mjs` imports `unified` from `@astrojs/markdown-remark`. Resolve to a
  different copy than the code running the pipeline and the plugin binds one instance while the engine
  uses another, which fails SILENTLY on a green build. The mechanical answer therefore depends on what the
  CONSUMER declares, and inverts: `@mdx-js/mdx` requires `acorn` by RANGE, so a caret shares the hoisted
  copy while an exact pin would force a second one; `astro` requires `@astrojs/markdown-remark` by EXACT
  pin, so an exact pin shares it while a caret would float above astro's copy. Measured rather than
  argued: the Phase 5 lockfile regeneration moved `acorn` to 8.18.0 and it still resolved to one copy
  shared by all three consumers.
- **Why phased, in six phases rather than one upgrade:** ONE VARIABLE PER PHASE, so a regression has one
  suspect. Phase 1 declared the two transitive packages the plugins already used. Phase 2 took Astro 6.4
  and Starlight 0.40. Phase 3 moved the markdown pipeline onto `markdown.processor: unified({...})` and
  pinned `compressHTML: true` ahead of Astro 7 changing its default. Phase 4 was the framework jump
  itself. Phase 4b re-tested one result that had passed for the wrong reason. Phase 5 was tree hygiene.
  Phase 3 turned out to be a hard PREREQUISITE rather than tidying: `starlight-image-zoom` 0.15.0 requires
  a `unified()` processor and throws without one.
- **Phase 0c was not planned and had to happen first.** `FlagCapture.astro` generated its LOCKED
  cyphertext with `Math.random()` in component frontmatter, which runs at BUILD time, not in the browser.
  The scramble was therefore baked into static HTML, identical for every visitor, and re-rolled on every
  build. The randomness bought nothing observable: no visitor could see two different scrambles, so its
  only effect was to make `dist/` differ between two builds of identical source. That is fatal to a
  verification method whose whole premise is that an unexplained byte difference is a defect. Replaced
  with a small deterministic PRNG seeded once from the flag string, decorrelated so repeated characters in
  a flag do not produce repeated glyphs. **The build's byte-reproducibility now depends on this**, which
  is the durable fact: reintroducing `Math.random()` there does not break the site, it breaks every
  zero-difference assertion the harness makes, and it breaks them silently.
- **The one unplanned change of shape:** `astro@7.2.8` narrowed `sharp` from `^0.34.0 || ^0.35.0` to
  `^0.35.4` mid-migration, pulling the planned Phase 5 sharp bump into Phase 4. Caught in pre-flight
  research rather than discovered in a diff, which mattered: `sharp` is an `optionalDependency` of astro
  rather than a peer, so npm would NOT have raised ERESOLVE. It would have hoisted 0.34.5, nested astro's
  own 0.35.x, and left `astro:assets` using the nested copy. A silent skew, not a loud failure. All 21
  generated images are byte-identical afterwards, from a cold cache, so the bump changed nothing.
- **Deliberately NOT done.** Sätteri is not adopted, and cannot be while `starlight-image-zoom` is used:
  0.15.0 throws outright on a Sätteri processor. `@astrojs/markdown-satteri` is nonetheless IN the tree as
  a hard dependency of astro and Starlight, so its presence is not a decision. The CSS minifier was not
  pinned back with `build.cssMinify: 'esbuild'` either, which would have required declaring `esbuild` as a
  direct devDependency to buy back a comparison method only the harness needed. Both recorded in
  CORE_SPEC §3.
- **One visible consequence, on wide-gamut displays only.** Lightning CSS PRESERVES authored `oklch()`
  where the previous minifier lowered it to sRGB hex, so the four `.ec-cmd-*` command colours and
  `.port-label` now ship as authored and render at full chroma on a P3 display, identically on sRGB. The
  palette in 2026-06-15 · Command-highlight palette rebuilt on a principled OKLCH basis (+ bold weight)
  therefore ships as specified for the FIRST time, and that entry is not superseded by this one.
  **Caveat worth carrying: the WCAG AA ratios recorded there were measured on the CLAMPED sRGB values and
  have not been re-measured on wide gamut.** The build-time-evaluation half of the same mechanism is
  recorded separately in 2026-08-29 · Lightning CSS evaluates `color-mix()` at build time, so CSS bytes
  vary by build machine.
- **The verification method is the most reusable output, and is worth more than the version bump.** It
  rests on one idea: the build is byte-reproducible, so any unexplained difference in `dist/` is a defect.
  Everything else exists to catch what a byte comparison cannot see.
  - **Silent-failure counters** count things in built HTML that can each reach ZERO while the build stays
    green, because remark and rehype plugins and Astro components fail silently rather than throwing. The
    four `ec-cmd-*` counts (9 / 9 / 13 / 74) are the sharpest: they are the only thing standing between a
    green build and an Expressive Code plugin that has silently bound to a second `@expressive-code/core`
    copy and stopped colouring anything. The image-zoom pair is counted as TWO numbers, plugin wrappers
    and override roots, because the plugin and the component override fail independently and one combined
    number would mask either.
  - **The settled computed-style probe** records the resolved value AND the full matching-rule list per
    target. Its predecessor sampled at a fixed 250ms after flipping the theme, landing inside the 300ms
    transition on `/about` and reporting two colour differences that were pure measurement error, drifting
    run to run. Replaced with two-sample stabilization: wait, then require two consecutive full samples to
    agree on every property before recording, and report anything that never settles instead of recording
    it. A fixed delay is not a fix; agreement between samples is.
  - **Layer-order and per-rule-layer assertions** are what catch a cascade reorder, where every token
    value stays identical and a different rule wins. No value comparison can see that, which is why the
    probe records the winning-rule list and why layer membership is asserted per rule.
  - **The direct WASM-in-worker probe** exists because a search smoke test is NOT sufficient evidence:
    Pagefind runs WebAssembly in a Web Worker, and worker-context CSP violations do not surface on the
    main-thread listener or in the page console, so blocked WASM can look like a clean search that
    silently fell back. The probe drives the real production worker by hand and asserts an empty error
    log. It only runs against a deployed origin, because `astro preview` does not serve the Cloudflare
    `_headers` file and so does not enforce the CSP.
- **Verified:** 46 pages at every phase; `dist/` byte-identical across Phases 3, 4b and 5 including from a
  COLD cache twice; zero computed-style value differences and zero cascade reorders in the final phases;
  every silent-failure counter unchanged; the effective layer order and every authored rule's layer
  unchanged; single physical copy of `@expressive-code/core`, `unist-util-visit`, `acorn`,
  `@astrojs/markdown-remark` and `sharp`; `npm audit` from 10 findings (6 high) to **0**. Deployed and
  probed on the Cloudflare preview: enforced CSP, WASM instantiated in a same-origin worker, search
  correctly ranked, zero CSP violations across five pages.
- **Status:** Adopted and shipped on `dev` (`0b1f7dc`, `b586608`, `d07744c`, `9c92ac4`, `4d52fa3`,
  `834de41`), reconciled with `main` in `d53513f`. Full record in
  `../idanlab-migration-baseline/MIGRATION-COMPLETE.md`, which carries the per-phase detail and the
  findings that did not earn a place here. Documented 2026-08-29.

### 2026-08-29 · Lightning CSS evaluates `color-mix()` at build time, so CSS bytes vary by build machine
- **Decision:** `dist/` CSS is byte-comparable ACROSS BUILDS ON ONE MACHINE and is NOT byte-comparable
  across platforms. A local-versus-deployed CSS hash difference is expected and is not a finding. HTML,
  JavaScript and generated images are unaffected and stay comparable everywhere. Recorded as a durable
  fact about the build rather than as a bug: nothing is broken and nothing needs fixing.
- **What changed:** before the Astro 7 upgrade the CSS minifier left `color-mix()` alone and shipped it
  unevaluated, so the browser computed it at paint time and identical source produced identical CSS on
  any machine. Astro 7 makes Lightning CSS the default minifier, and Lightning CSS RESOLVES a
  `color-mix()` whose operands are all literal into an absolute colour at build time. The build machine's
  floating-point result is therefore baked into the output, and into the content hash.
- **The evidence, one source tree, two machines:** `common.css` is 108210 bytes on both the Windows local
  build and the Linux Cloudflare builder, and differs at character 1376. Local
  `--sl-color-bg-nav:oklab(13.7599% -.00308788 -.00327165/.78)`, deployed
  `--sl-color-bg-nav:oklab(13.7599% -.00308787 -.00327167/.78)`. That is a difference in the eighth
  significant digit of two oklab channels, and both are the resolved form of the authored
  `color-mix(in oklab, #07090a 78%, transparent)`.
- **Rendering impact: none.** A difference of ~1e-8 in an oklab channel is orders of magnitude below
  8-bit quantisation, so the two builds paint the same pixels. The 66 `color-mix()` calls whose operands
  include a `var()` cannot be resolved statically and still ship unevaluated, exactly as before.
- **Why it matters anyway:** the whole five-phase upgrade rested on byte-identical `dist/` comparison as
  its primary correctness assertion. That method is still sound, but its scope is now narrower than it
  looks, and the narrowing is silent: a future check that compares a local manifest against deployed
  output will report a CSS difference that means nothing, and will look exactly like a real regression.
  Per-platform reproducibility was re-verified cold-to-cold after this surfaced and still holds at
  159/159 files.
- **The same mechanism has a second, visible consequence.** Lightning CSS also PRESERVES authored
  `oklch()` instead of lowering it to sRGB hex, which the previous minifier did. The four `.ec-cmd-*`
  command colours and `.port-label` now ship as the `oklch()` / `oklab()` the design authored, so on a
  wide-gamut display they render at full authored chroma instead of sRGB-clamped, and identically on an
  sRGB display. That makes the palette in DECISIONS 2026-06-15 · Command-highlight palette rebuilt on a
  principled OKLCH basis (+ bold weight) ship as specified for the first time, so that entry stands and
  is NOT superseded by this one.
- **Rejected: pinning the minifier back with `build.cssMinify: 'esbuild'`.** It would restore both the
  old lowering and platform-identical bytes, but it costs declaring `esbuild` as a direct devDependency
  (today it is only transitive via Vite) and gives up Lightning CSS everywhere else, to buy back a
  comparison method only the migration harness needed and a colour clamp the design never wanted.
  Reconsider only if cross-platform byte-identity becomes a real requirement.
- **Verified:** found during the Phase 4b deployed check, comparing `/hackthebox/easy/busqueda/` built
  locally against the same page on `dev.idanlab.pages.dev`. Two other differences in that comparison were
  run down and are NOT this one: 31 CRLF pairs, from `core.autocrlf=true` putting CRLF into checked-out
  `.svg` sources (`linux.svg` is identical after newline normalisation, 14813 bytes local against 14723
  deployed), and the `.svg` content hash that follows from it. Every generated image hash is identical
  local and deployed, so `astro:assets` and sharp 0.35.4 are platform-stable.
- **Status:** Recorded 2026-08-29. No code change and no configuration change. Written down so the next
  local-versus-deployed CSS diff is recognised in a minute instead of costing an afternoon.

### 2026-08-25 · Open Graph and Twitter Cards on both surfaces, from a static card and an additive Head override
- **Decision:** every page emits Open Graph and Twitter Card metadata, and `og:image` points at one
  site-wide static card, `public/og.jpg` (1200x630, RGB, no alpha). The Starlight docs get the tags
  Starlight omits from a third additive component override, `src/components/overrides/Head.astro`. The
  two marketing pages own their `<head>`, so they carry the full set inline with their own values plus a
  canonical link. State recorded in CORE_SPEC §2 "Social and SEO metadata".
- **Why an override rather than the `head` array in `astro.config.mjs`:** the config array is STATIC and
  cannot vary per page. A `twitter:title` declared there would have pinned one constant string over every
  writeup, contradicting the per-page `og:title` Starlight already emits correctly. The override renders
  `<Default />` untouched and appends only what is missing (`og:image`, `twitter:image`, `twitter:title`,
  `twitter:description`, later joined by `author` and the `og:image:*` set), reading title and description
  from the page's own frontmatter with a site-level fallback. No default markup is reimplemented and no tag
  is declared twice. Same additive pattern as the PageSidebar and Footer overrides, and the third instance
  of it.
- **Why a static card rather than a generated one:** the share surface is one identity, not per-page art,
  so a generator would add an image-generation dependency to a build that currently has none, in order to
  produce 46 near-identical cards. The card is drawn from the site's own self-hosted faces rather than a
  lookalike: Syne 800 for the headline, carrying the same synthesized italic the hero uses on Curiosity,
  JetBrains Mono for the eyebrow, subline and footer chrome, and the landing page's ink, lime, cyan and
  magenta including the three atmospheric glows. Living in `public/` also keeps it outside `astro:assets`
  hashing, and it falls under the `/*` header rule rather than the immutable `/_astro/*` or `/fonts/*`
  rules, so it can be replaced in place with no cache-busting rename.
- **Size:** a raw export was 772 KB, because smooth 24-bit gradients do not pack in PNG. Quantizing to 64
  levels per channel is invisible on these ink-dark tones and landed at 330 KB. Coarser steps halve it
  again but band visibly across the glows, which this design cannot afford.
- **The debugging, in the order it happened, because most of it was aimed at the wrong layer.** LinkedIn
  reported "no image found" for the landing page while `/about` and every Starlight page, all pointing at
  the same URL, rendered fine. Three rounds followed, each eliminating something in the HTML: the bare `&`
  in "CTF Writeups & Security Notes" (literal text in an `.astro` template passes through verbatim, which
  is legal HTML5 but stops a strict scraper mid-head, and everything LinkedIn did report came from tags
  declared before it); the HTML comments in the head, two of which held tag-like strings that a
  regex-scanning scraper can match inside, as our own check did when it extracted a preload link from
  within a comment; and the `name="image" property="og:image"` pair from LinkedIn's documentation, reverted
  to the plain `property=` form that demonstrably worked on the pages that were already fine.
- **The re-framing that ended it:** Post Inspector read a `name="author"` tag 80 seconds after it went
  live, which proved the PARSER was healthy and reading current markup, so every round spent on tag syntax
  was debugging a layer the evidence showed was working. LinkedIn runs two pipelines, a bot that parses the
  HTML and a separate media service that refetches and re-encodes the image, and "no image found" is a
  misleading label for a failure in the second. `og.png` was emitted by canvas with an alpha channel (color
  type 6) that `sharp` reported as uniformly opaque, so it carried no information at 3.6x the file size,
  and alpha is the usual differentiator when a re-encoder handles PNG less reliably than JPEG. The PNG was
  flattened onto the ink background (330 KB to 98 KB, identical pixels) and `og:image` moved to a new
  `og.jpg` (RGB, 80 KB, quality 88, 4:4:4 chroma subsampling so the colored text edges do not bleed).
- **The escaping and comment fixes are KEPT even though neither was the fix,** because both are correct
  independently: a bound expression cannot regress into a bare ampersand when someone edits the copy, and a
  comment-free head gives a regex scanner nothing to trip on. They are recorded as standing rules in
  CORE_SPEC §2 rather than as one-off repairs.
- **CSP needed NO change.** The card is same-origin, so the enforced `img-src 'self' data:` already covers
  it. An externally hosted og:image would need its origin added to the policy, which is a standing argument
  for keeping the card same-origin. Noted in the CORE_SPEC security-headers bullet.
- **Does NOT supersede 2026-07-07 · Font `<link rel=preload>` hints removed site-wide (Firefox "preloaded
  but not used").** No preload is re-added and each of the three sources still carries its rationale
  comment. On the two marketing pages that comment moved from an HTML comment inside `<head>` to page
  frontmatter, so it no longer emits; the `astro.config.mjs` copy is untouched. That entry stands in full.
- **Verified:** `npm run build` green (46 pages, exit 0). Across `dist/`, all 46 pages carry exactly one
  `og:image`, all pointing at `https://idanlab.dev/og.jpg`, and exactly one `author`; a doc page carries
  one each of `twitter:card`, `twitter:title`, `twitter:description` and `twitter:image`, so the override
  duplicates nothing Starlight emits; the landing page head contains zero HTML comments.
- **Status:** Adopted and shipped, on `dev` as `6d6df91`, `881271d`, `af8b7f8`, `b560705`, `6245a60`,
  `844c017` (2026-08-24 and 2026-08-25). CONFIRMED: LinkedIn renders the card. The final commit bundled
  three changes (alpha removal, format and URL) as one hypothesis about the media service, so which of the
  three mattered is unknown, and the clean-bisect test it named is no longer needed. Documented 2026-08-29.

### 2026-08-06 · Supersession has two forms: `Supersedes:` archives, `Supersedes in part:` does not
- **Decision:** the supersession protocol distinguishes two markers. `Supersedes: <date> · <title>` means
  WHOLESALE: the old entry is entirely replaced, gains `Superseded by: <date> · <title>`, and moves to
  `DECISIONS-ARCHIVE.md` in the same edit. `Supersedes in part: <date> · <title>` means only some of the old
  entry is replaced; the new entry NAMES the bullet or claim that dies, and the old entry stays live in
  `DECISIONS.md`, is not archived, and gains no `Superseded by:` line, because it is not superseded.
- **When unsure, the partial form is correct, because the two errors are not symmetric.** Archiving a
  still-live entry removes its surviving content from the default context set with nothing signalling the
  loss, so it gets re-litigated or silently violated. Retaining a partly-stale entry costs only tidiness,
  and it is self-correcting: the next session working that area sees both and resolves it. Prefer the
  recoverable error.
- **This EXTENDS rather than replaces 2026-08-01 · DECISIONS splits by STATUS, and entries move at the
  moment of supersession.** That entry already found the category, counting 26 partially superseded entries
  across 925 lines where a live constraint and a dead mechanism share one entry, and already stated the
  asymmetry: an over-inclusive live file is a correct outcome, an over-inclusive archive is not. What was
  missing is NOTATION. The discipline lived in DECISIONS while `CLAUDE.md`, the document a session actually
  loads, described only the wholesale case. That mismatch is the real gap, and it is what this closes.
- **Partial supersession is not new here, and the correction strengthens the case.** 2026-08-06 · Merges to
  `main` run from the command line, not through a pull request was the first to use the `Supersedes in part:`
  LABEL, not the first partial supersession. The log already carried four incompatible ad hoc spellings:
  `Supersedes:` naming one bullet (2026-07-07 · Font `<link rel=preload>` hints removed site-wide (Firefox
  "preloaded but not used")); "supersedes a line in" (2026-07-17 · Code-block focus ring wraps the whole EC
  frame, not just the `<pre>`, and 2026-07-17 · Toggle focus ring aligns to its tab (re-pairs Starlight's
  orphaned summary margin)); "NOT reverted, only partly superseded" (2026-07-27 · The recon rail, in three
  attempts: grid on the list, two components, then a remark transform); and a bare `Supersedes` naming a
  single color (2026-06-29 · Inline code is its own object: a rounded red hairline chip (theme-tuned)). Four
  spellings for one relationship is why the rule could not be applied by pattern matching.
- **The hazard is live in the file right now, not hypothetical.** 2026-07-07 · Font `<link rel=preload>`
  hints removed site-wide (Firefox "preloaded but not used") carries a bare `Supersedes:` pointing at
  2026-07-04 · Self-hosted fonts (subset WOFF2 + metric-matched fallbacks), Google Fonts removed, while
  actually killing only its "Preloads" bullet. That target is still live and carries the whole self-hosted
  font architecture: the `@font-face` contract, the subsetting rationale, and the metric-matched fallbacks.
  A session applying the old protocol literally would archive all of it to retire one bullet.
- **Fixed by rule, not by rewriting the past.** No archive move is performed and no existing marker is
  relabelled. Reclassifying prior entries is a separate pass with its own judgement calls, and doing it
  incidentally here would be the exact over-reach this entry argues against.
- **Status:** Adopted. Recorded in `CLAUDE.md` under the supersession check. First exercised by 2026-08-06 ·
  Merges to `main` run from the command line, not through a pull request, which used the partial form and
  deliberately left 2026-07-27 · The release hold is lifted and `dev` ships to production live.

### 2026-08-06 · Merges to `main` run from the command line, not through a pull request
- **Supersedes in part:** 2026-07-27 · The release hold is lifted and `dev` ships to production. Only that
  entry's sequencing bullet ("Each ships as its own pull request into `main`") is replaced here. Its core
  decision, the lift of the hold and the list of what shipped knowingly unfixed, stands unchanged, so the
  entry is deliberately NOT archived. Whether it leaves the live file is the owner's call.
- **Decision:** `dev` reaches `main` by `git merge --no-ff dev` run locally, followed by a plain push. No
  pull request, and never the GitHub web UI. `--no-ff` keeps an explicit two-parent merge commit. `--squash`
  is forbidden, because collapsing a cluster into one commit destroys the atomic history this project
  preserves on purpose.
- **What this fixes in the documentation itself:** `CLAUDE.md` carried "`main` is reached ONLY through a
  pull request" two bullets above a newer rule saying to merge from the command line. Those contradicted
  each other while sitting adjacent, which is precisely the drift the four-document architecture exists to
  prevent. The two are now one rule.
- **Reason one, identity.** The account has "keep my email addresses private" enabled, so a merge performed
  in the web UI authors as `users.noreply.github.com`. That reintroduces a second author identity into a
  history that was deliberately normalized to exactly one. See 2026-08-01 · One identity across all history:
  the repository is rewritten and force-pushed.
- **Reason two, refs that cannot be retracted.** Opening a pull request mints a server-managed
  `refs/pull/N/head` that pins its entire ancestry permanently. It is not writable by push, so nothing done
  locally retracts it. A pull request opened today would pin today's ancestry forever.
- **The second reason is demonstrated, not predicted.** A GitHub Support request is currently open to remove
  the existing `refs/pull/N/head` refs, which still hold pre-rewrite commits carrying the removed address.
  The same audit found 17 commits reachable from NO ref at all, orphaned by the rewrite yet still served
  publicly by the remote. Unreferenced is not unreachable, and a pull request ref makes that condition
  permanent by design rather than by accident. Opening a new pull request while that request is mid-flight
  would also add a ref to the very set being swept.
- **Both reasons are standing, not situational.** Neither expires when the Support request resolves: privacy
  mode stays on, and PR refs stay unremovable by push. If Support declines, nothing changes either.
- **What is unchanged:** force pushes, rebases, amends and resets remain forbidden absent an explicit owner
  request. Pushing `main` still requires an explicit instruction; the 2026-07-25 delegated authority covers
  `dev` only.
- **Status:** Adopted. Practiced on the two most recent merges to `main`, both run from the command line with
  `--no-ff`, each producing a two-parent merge commit authored `Idan-Babayan <contact@idanlab.dev>`.
  Recorded in `CLAUDE.md` under Git policy. `docs/CORE_SPEC.md` still carries the superseded pull-request
  wording in its RELEASE STATE bullet; that is flagged for the owner, not edited here.

### 2026-08-01 · Four documents, four jobs: DECISIONS leaves the default context set
- **Decision:** the project runs on four documents with four jobs. `CLAUDE.md` is the ROUTER (always
  loaded: how to operate, what to load, what not to load). `docs/CORE_SPEC.md` is CURRENT STATE (always
  loaded: what is true, what is forbidden, plus `Rejected and settled` for what was already decided
  against). `docs/ROADMAP.md` is THE FUTURE (always loaded, forward-looking only). `docs/DECISIONS.md` and
  `docs/DECISIONS-ARCHIVE.md` are THE WHY, loaded ON DEMAND ONLY. **The default session context set is
  `CLAUDE.md` plus `CORE_SPEC.md` plus `ROADMAP.md`, and nothing else.**
- **Why: this file had two conflicting jobs.** At roughly 2,700 lines it was serving as both an
  append-only provenance log and an always-loaded context document. A log must grow forever or it stops
  being provenance. A context document must stay small or it stops being affordable. Those two
  requirements move in opposite directions, so one document cannot satisfy both, and the fix is to split
  the JOBS rather than to trim the log.
- **What a session actually needs from the always-loaded set:** what is true, what is forbidden, and what
  was already decided against. CORE_SPEC carries all three, the third through its `Rejected and settled`
  section. That is what makes dropping DECISIONS from the default load safe rather than lossy.
- **The exclusion is stated as deliberate, in the router, in the strongest terms available.** An absent
  file reads as a missing file, and the predictable failure is a future session "helpfully" re-adding it
  to the default set. So `CLAUDE.md` states that the two decision files exist, are current, are
  maintained, and are excluded ON PURPOSE.
- **The router rewrite and the context-set change ship in ONE commit,** for the same reason: either alone
  leaves a window where the absence looks accidental.
- **Status:** Adopted. `CLAUDE.md` rewritten from 170 lines to 138, with every operating instruction
  retained (verified by audit) and current-state facts dropped rather than duplicated, since CORE_SPEC
  already carries them.

### 2026-08-01 · DECISIONS splits by STATUS, and entries move at the moment of supersession
- **Decision:** `docs/DECISIONS.md` holds decisions that are IN FORCE. `docs/DECISIONS-ARCHIVE.md` holds
  decisions that are SUPERSEDED, with their full reasoning intact. Nothing is ever deleted; entries MOVE.
  This is deliberately the opposite of the ROADMAP rule, which deletes on completion, because provenance
  is exactly what this file is for.
- **The organizing axis is STATUS, never DATE.** Age does not predict relevance. Some of the earliest
  decisions are fully in force (no Starlight forks, pinned versions, no em dashes), while several from the
  past two weeks are already superseded (the platform-in-frontmatter injector design, `.machine-meta`, the
  `notion_cleaner.py` pipeline, the `<Findings>` and `<Finding>` component pair). Sorting by date would
  archive live constraints and keep dead ones.
- **The move happens at the MOMENT of supersession, in the SAME edit that records the superseding
  decision.** Never on a periodic cleanup pass. Miss it and the superseded entry stays live while a newer
  one contradicts it, which is silent rot. Both directions are written: the archived entry gains
  `Superseded by: <date> · <title>` and the live entry gains `Supersedes: <date> · <title>`, so a chain is
  walkable without touching git.
- **The finding that made the migration far smaller than planned:** a classification pass over all 94
  entries found only **107 of 2,741 lines cleanly superseded**. The bulk sits in **925 lines across 26
  PARTIALLY superseded entries**, where a live constraint and a dead mechanism share a single entry.
- **Those 26 are deliberately left live.** Splitting them is 26 entry-level surgeries, each a judgement
  call about which half still binds and each carrying real risk of archiving something still in force.
  They resolve through the move-on-supersession discipline over time instead. An over-inclusive live file
  is a correct outcome of a classification pass; an over-inclusive archive is not, because archiving a
  live decision removes it from context and it then gets re-litigated or silently violated.
- **Status:** Adopted. Eight entries moved: six cleanly superseded, plus two git-process records that were
  never decisions. Live file 94 entries to 86.

### 2026-08-01 · Cross-references use date and title, never a hash and never a position
- **Decision:** a DECISIONS entry is referenced by **DATE AND TITLE**. Never by git hash. Never by
  positional language ("the entry above", "the entry below", "the top entry", "the previous entry").
- **Why not a hash:** a hash points at history that may be rewritten, and this repository rewrote its
  history on the same day this rule was written, invalidating every hash the file contained.
- **Why positional is the WORSE of the two, which is the non-obvious part:** a broken hash fails to
  resolve and is therefore detectable. A stale positional reference silently resolves to the WRONG entry
  and reads as correct. In a newest-first log, "the top entry" decays on its own every time an entry is
  prepended, with no migration required to break it.
- **Found live, not theorised:** three entries had been pointing at the wrong decision for weeks by
  exactly this mechanism, and the archive migration broke six more. Nine were rewritten. Seven positional
  references remain, each pointing at an immediately adjacent entry that has not moved, verified by
  adjacency and left alone as latent rather than broken.
- **Status:** Adopted (standing rule, recorded in `CLAUDE.md`).

### 2026-08-01 · One identity across all history: the repository is rewritten and force-pushed
- **Decision:** all 185 commits on `main` and `dev` are rewritten to a single author identity,
  `Idan-Babayan <contact@idanlab.dev>`. Three author-name variants sharing one old email are normalized:
  `Idan-Babayan` (160 commits), a GitHub default-derived username from the old account (29), and
  `Idan Babayan` (18). That third variant is deliberately not reproduced here: its local part matches the
  removed address's, so naming it would point straight back at what the rewrite removed. The Hebrew
  username is removed from `docs/CORE_SPEC.md` across 176 commits, in TWO line variants (the current path
  and a pre-rebrand one that a single-variant rule would have missed). Executed with `git filter-repo` as
  standalone tooling, then force-pushed with `--force-with-lease` pinned to the recorded pre-rewrite tips.
  This is a ONE-TIME owner-authorized exception to the standing no-history-rewrite policy, which is
  otherwise unchanged.
- **`GitHub <noreply@github.com>` is deliberately left untouched** as committer on 18 web-UI merge
  commits. It is accurate, it is not the owner's address, and remapping it would falsify who performed
  those merges.
- **The root cause, which the rewrite alone would NOT have fixed:** the machine's GLOBAL git config still
  defaulted to the old address. This repository escaped it only because of a local override, which is why
  every other repository on the account carried it. The global default is corrected; without that, the
  next `git init` reintroduces the problem immediately.
- **`MobileCApp` received the same treatment,** including removal of Claude attribution from its commits,
  since it is public and carried the old address on four of its five commits.
- **The residual, recorded honestly:** GitHub's server-managed `refs/pull/N/head` refs still hold the
  pre-rewrite history. There are 23 of them, holding 181 commits of which 177 carry the old address, and
  they are not writable by push. A support request is pending. GitHub's documented policy is that Support
  removes sensitive data only where the risk cannot be mitigated by rotating credentials, and an email
  address is not a credential, so the request may well be declined. **The rewrite cleans canonical
  history; it does not retroactively unpublish.** Existing clones, forks and caches are outside its reach
  entirely.
- **Status:** Adopted and shipped. Verified from a fresh clone of the remote: branch refs carry exactly one
  author identity and zero Hebrew blobs. Commit counts and merge topology unchanged (170 on `main`, 181 on
  `dev`, 19 merges preserved), and the only content difference against a pre-rewrite backup mirror is the
  single `CORE_SPEC` line.

### 2026-08-01 · Secrets audit: clean, and the scoping is what made it meaningful
- **Decision:** a read-only secrets and hygiene audit over all history found **zero committed secrets,
  tokens, keys, or credentials**. No remediation was required and none was performed.
- **The scoping constraint is the load-bearing part.** This repository intentionally publishes roughly 90
  credential-shaped strings as EDITORIAL CONTENT: Bandit level passwords, HackTheBox flag hashes, NTLM
  hashes, truncated PEM markers, and the Gitea credentials in the Busqueda writeup. `src/content/docs/`
  and `src/assets/` are therefore excluded from all entropy and generic-credential rules. Without that
  exclusion the scan returns a wall of intentional hits and buries any real signal.
- **Proven rather than asserted:** a scoped Gitleaks run (provider rules PLUS entropy, closing the gap a
  provider-only scanner leaves) returned **0 findings**, while an unscoped control run returned **35
  findings, every one of them inside the excluded content paths and none outside**. GitHub's own secret
  scanning independently reports zero alerts over the same history.
- **Why the surface is structurally small,** which is the honest reason for a clean result rather than
  luck: static SSG with no server and no runtime, no database, no API keys, no CI, `dist/` gitignored and
  never committed, no `.env` or `.npmrc` or wrangler config in any commit, and Cloudflare Pages deploying
  through the GitHub App rather than a committed token. There is very little here for a secret to be.
- **What the audit did find was metadata, not secrets:** three author-name variants and a Hebrew username
  in a documented path, both handled by the identity rewrite of the same date.
- **Status:** Adopted (finding recorded, no action taken). Read-only throughout; working tree unchanged.

### 2026-08-01 · Dual licensing: MIT for code, CC BY-NC-SA 4.0 for content, because licenses cover FILES
- **Decision:** code is MIT and written content and images are CC BY-NC-SA 4.0, split on paths that
  already exist in the repository. `LICENSE` covers `plugins/`, `src/components/`, `src/styles/`,
  `src/lib/`, `src/pages/` and the root configuration files. `LICENSE-CONTENT` covers
  `src/content/docs/`, `src/assets/`, `docs/`, `README.md` and `CLAUDE.md`.
- **The principle that made the boundary tractable: a license covers FILES, not abstract works.** An
  earlier framing tried to license "the visual design expressed by the theme", which is not a licensable
  object, and that framing was the entire source of the `src/styles/` ambiguity. Copyright already
  protects expressive copying of CSS without a license needing to describe an aesthetic, and attempting to
  describe one makes the document weaker rather than stronger. Once the question becomes "which files",
  `src/styles/` is obviously code and goes to MIT.
- **Every boundary falls on a directory or file-type line that already existed.** No directory is
  subdivided. Where a path could not be assigned it was reported for an owner decision rather than
  resolved creatively.
- **`public/` is deliberately UNCLAIMED, and both license files say so explicitly** so the omission reads
  as intentional rather than as an oversight. It contains no original work by the owner: third-party fonts
  and icons, the Astro starter favicon, a third-party image, and two deployment configuration files with
  no meaningfully copyrightable content.
- **SIL OFL 1.1 text added at `public/fonts/OFL.txt`, closing a real compliance gap.** The OFL requires its
  text to accompany redistributed fonts, and none shipped. The cause is mechanical: subsetting with
  `pyftsubset` strips the `licenseDescription` and `licenseURL` name-table fields, confirmed absent in all
  12 shipped WOFF2 files. Geist, JetBrains Mono and Syne were each verified OFL 1.1 against their upstream
  projects rather than assumed.
- **Status:** Adopted and shipped to `main`. `src/assets/houston.webp` (the Astro starter mascot, not the
  owner's work, referenced nowhere in source or build output) deleted in the same commit.

### 2026-08-01 · Thirteen Dependabot alerts triaged and deliberately deferred
- **Decision:** Dependabot is enabled (both vulnerability alerts and automated security updates, both
  previously off) and its 13 open alerts (6 high, 5 moderate, 2 low) are triaged and DEFERRED. None is
  patched. Pinned versions stand.
  - **Partly superseded by:** 2026-08-29 · Astro 6 to 7 and Starlight 0.39 to 0.41, upgraded in phases
    against a byte-reproducible build. The DEFERRAL is over: all 13 are cleared and `npm audit` reports
    0, without the `overrides` block this entry proposed. The threat-model analysis below, and the
    framing of the fix as presentation rather than security, are unaffected and still hold.
- **Zero of the 13 have a realistic path in this threat model,** and this was verified against BUILT
  OUTPUT rather than assumed. `dist/` carries no view transitions, no hydrated islands, and none of the
  alerted build tooling; source carries no spread props in any component. Every exploit requires one of: a
  running server (there is none), attacker-controlled build input (all content is authored locally by the
  owner), or a code path the site does not use.
- **The split, so the deferral reads as a decision rather than an omission:** seven alerts are cheaply
  fixable through an `overrides` block without touching any pinned direct dependency. The remaining six
  are one in-range Astro minor, one breaking `sharp` bump with no in-range fix, and three that are the
  deferred Astro 7 upgrade wearing a security label.
- **Recorded as PRESENTATION rather than security,** which is the only honest argument for acting: a
  visitor or a recruiter checking the Dependabot tab will not run the threat model first, and a public
  repository showing six HIGH alerts reads badly regardless of whether any of them is exploitable here.
- **Status:** Adopted (deferred, tracked). Read-only analysis; no dependency, `package.json`, or lockfile
  change.

### 2026-07-31 · The platform ink family, and the wash that was causing the failure it hid

- **Decision:** each platform gains a `--pf-ink` beside its `--pf-accent`, and the light hero wash moves
  off the hero type. Four platform-index eyebrows, plus the filter pill, now clear WCAG AA on paper.
  `--pf-accent` is NOT retinted. The tail shrinks from 14 rules to 13.
- **The cluster began from a premise that measurement destroyed.** The brief was "two platforms fail,
  PicoCTF passes, and OverTheWire's amber is the dark outlier to be re-solved downward". Measured
  against the surface that actually renders, all four failed, PicoCTF worst-of-the-passing at 3.59, and
  amber was the only one passing, by 0.29 rather than the 1.26 the record implied. Every light figure in
  the project's history reproduced EXACTLY when re-measured against bare paper, which is how the cause
  was identified: the hero carries a wash mixed from the platform's own accent, and nobody had ever
  composited it. See the composite rule now in CORE_SPEC section 8.
- **Three levers were modelled and two were rejected on the numbers, not on taste:**
  1. **Ink only, wash untouched.** Solving each ink on the current washed surface needs OKLCH lightness
     drops of 0.107 to 0.159 from the accent, landing every platform BELOW the darkest value the project
     has ever shipped for that hue, with three of four gamut-clamping. Rejected: the family stops
     reading as platform colour.
  2. **Dim the wash.** Rejected by a ceiling, which is the load-bearing finding of the whole cluster:
     **no alpha fixes HackTheBox or VulnHub.** Their bare paper ceilings are 4.11 and 4.16, under the
     4.5 bar even with the wash removed entirely. Dimming pays full identity (peak alpha 0.322 to 0.161
     at 16%) and still needs a near-full ink solve.
  3. **Move the wash. ADOPTED.** Pooling the accent at 86% x and the cyan at 95%, behind the platform
     mark instead of the type, recovers 0.75 to 1.11 of contrast at FULL wash strength: peak alpha goes
     0.322 to 0.316, and the hero's darkest point gains depth (dL 0.284 to 0.364) because the two pools
     now overlap. Contrast is not bought by dimming the atmosphere; the atmosphere is relocated.
- **Two geometric alternatives measure well and are traps, both recorded in the CSS so they are not
  retried.** Shifting the glow box up is a percentage of the HERO's height, and heroes differ (279px on
  HackTheBox, 183px on VulnHub), so `top: -95%` reached bare paper on two platforms and only 3.65 on
  VulnHub; horizontal relocation is uniform because the gradient position resolves against the glow box,
  a fixed 360px everywhere. And pulling the gradient's own centre up measures identically to switching
  the wash off, because peak visible alpha collapses to 0.076: it is lever 2 wearing a geometry costume.
  Pooling downward was rejected outright, it breaks `.pi-num` from 4.11 to 3.23.
- **The band converged on 5.76:1 from three independent directions,** which is why it was chosen over
  the 4.8 to 5.2 the brief opened with. It is where OverTheWire's existing ink already sat once the wash
  moved, so the other three come up to meet amber and amber does not move at all. It is the only band
  where ONE ink token also clears the filter pill (the 5.00 band ink fails there even at a 14% fill).
  And it is where the per-pixel floor stays above 4.5. Family OKLCH lightness spread 0.035, hue drift
  under half a degree, and all four land lighter than the `--wm-c` chip already shipping in that hue.
- **The tail shrank rather than grew, and that was the real architectural result.** The brief expected
  either a shared token plus one tail rule or three separate ones. The OverTheWire tail rule existed
  only because the 2026-07-26 pass declined to edit `PlatformIndex.astro` and so needed the unlayered
  tail to beat that component's own scoped `color`. Since this cluster edits the component anyway, the
  ink is declared where the colour is declared, and the tail rule had nothing left to beat. Its evidence
  comment was deleted rather than migrated: every figure in it was measured against the wrong surface.
- **What shipped:** wash geometry (light only), `--pf-ink` (`#3b6400` / `#b60115` / `#7f30b7` /
  `var(--otw-amber-ink)`, with dark declared once as `var(--pf-accent)`), the eyebrow and the "All"
  filter label reading it via a local `--accent-ink`, and the active pill fill 22% to 16% on light.
- **Known and deliberately unfixed.** OverTheWire's `.pi-name` reads **3.41 against a 3:1 bar**, up from
  3.05 and from a per-pixel failure at 2.93, but still thin. It is display type, so no ink reaches it;
  the only remedy is retinting the OverTheWire light accent, which drags `.pi-num`, the empty panel, the
  card bar, the glare and the focus ring with it. Left as an owner call. The filter pill's own per-pixel
  floor is 4.31 active and 4.52 at rest, because it is the one consumer stacking a translucent fill on a
  textured surface; model B, the authority, reads 4.74 and 4.97. And the four DIFFICULTY pills fail on
  light (2.26 to 3.43), which this cluster measured and left alone as badge-consolidation work.
- **Verified per commit at exactly-these-diffs.** The shipped component CSS differs from pre-cluster in
  five declarations and nothing else, with **zero motion declarations in the delta** and both
  `prefers-reduced-motion` blocks intact. Rendered: 1 changed cell of 11,634 for the wash, 9 for the ink
  (8 of them unpainted `currentColor` followers on the one element), 0 for OverTheWire's ink (the tail
  deletion is pixel-neutral, only the route changed), 3 for the pill. **Dark measured byte-identical at
  every commit**, 0 changed cells of 11,634. Zero `package.json` or lockfile diff. `npm run build` green
  at 46 pages throughout.
- **Instrument correction worth keeping:** a grid sampler can MISS the light dot-grid (a 2px dot on a
  22px pitch) and silently report the model B figure as model C. HackTheBox did exactly that. When the
  per-pixel floor matters, compute it analytically; it is a uniform 0.56 to 0.57 below the paper figure.
- **Status:** Adopted; committed to `dev` across five commits, pushed, not merged. No dependency
  changes, pinned versions unchanged, no Starlight fork, no new component.

### 2026-07-27 · The release hold is lifted and `dev` ships to production
- **Supersedes:** 2026-07-26 · `dev` holds the finished CSS refactor and does NOT merge to `main` until the Geist retune lands
- **Decision:** the release hold recorded on 2026-07-26 is LIFTED by owner instruction, and `dev`
  (29 commits ahead of `main`) merges to `main` by pull request. This is the first production deploy of the
  Geist body face, the cascade-layer CSS architecture, the derived prose foundation, and the recon rail
  rearchitecture. `main` had been at `51edb9c` since PR #18 and predated the entire Geist arc.
- **What the hold was for, stated fairly:** `dev` carried a DESIGN change that was only half done. Geist was
  the body face but the surfaces around it were still tuned for mono, and a half-refitted body face reads as
  "the site looks off" to a visitor while every individual rule is correct. Splitting the refactor out and
  shipping it alone was considered and rejected then, because the refactor's verification baseline was
  captured against a Geist-carrying tree.
- **Why the purpose is judged satisfied now:** the four foundation dials stopped being eye-calls and became
  a derivation. `--sl-content-width` 46rem with `--prose-measure` aliased to it, `--prose-size` 1.125rem,
  `--prose-leading` 1.7 and `--prose-paragraph-gap` 1em, measured live at 87.6 characters per line against
  Geist's 0.467em average advance. The body face production will serve is tuned. Everything still open is
  chrome (the small-chrome type scale), component internals (AttackPath), per-platform ink (the eyebrows) or
  a single parked cap. None of it is the body face, so none of it is the thing the hold protected against.
- **The sequencing changes with it:** the outstanding clusters no longer accumulate on `dev` waiting for one
  release. Each ships as its own pull request into `main`. Holding them together was correct while the body
  face was half done and is not correct now that it is not.
  **Partly superseded by:** 2026-08-06 · Merges to `main` run from the command line, not through a pull
  request, specifically the pull-request mechanism named in this bullet, now a local `git merge --no-ff dev`
  followed by a plain push. That clusters ship independently rather than accumulating for one release is
  unchanged, and the rest of this entry stays in force.
- **What ships knowingly unfixed, so nobody discovers these as surprises:**
  1. **The small-chrome type scale is still frozen at 16px-era ratios.** Eight declarations are round
     fractions of a 16px body (0.6, 0.625, 0.64, 0.688, 0.69, 0.70, 0.72, 0.75) and scatter against the
     current 18px. Seventeen distinct sizes sit below 12px with a 9.60px floor.
  2. **AttackPath internals read at about 0.533 of body size,** confirmed too small, and `.ap-panel-head`
     declares no font-size at all so the dossier's largest text inherits `--prose-size` while its siblings
     sit at 11.52px and 11.2px.
  3. **The HackTheBox and VulnHub platform-index eyebrows fail WCAG AA on paper:** 4.11:1 and 4.16:1
     measured by canvas readback on the real element, as 12.8px body text needing 4.5:1. PicoCTF passes at
     4.86:1 and OverTheWire was fixed by the amber pair. This is a real accessibility failure shipping
     knowingly, and it is the first cluster queued after the merge for that reason.
     **CORRECTED 2026-07-31:** all four figures in this item were measured against BARE PAPER for
     elements that sit on the hero wash. The real composite read 3.36 / 3.05 / 3.59 / 4.79, so PicoCTF
     was NOT passing and the amber pair had not fully landed either. Two more consumers were failing
     unrecorded: the filter pill at 3.15 and OverTheWire's `.pi-name` at 3.05. Resolved by Cluster F.
  4. **The `46ch` principle cap is still the open third instance of the context law.** `ch` resolves on the
     aside at 18px mono while the text it caps is 22.4px, so the maxim measures 36.97 characters and never
     measured 46 in any era. Parked because honouring the declared 46 widens the block by about 120px,
     which is a design decision rather than a correction.
  5. **The recon rail's mobile layout is undesigned.** The rail was built and measured at desktop width;
     at 375px the chip track plus its new gutter takes 96.2px of the column and one Forest row wraps to
     three lines. Nothing overflows and the continuation error is 0.00, but no one has decided what the
     rail should look like on a phone.
- **The pre-flight that preceded the merge,** because measurement in a headless pane had been the only gate
  for the whole arc and it cannot see a missing asset or a case-sensitivity fault: cold build from a deleted
  `dist`, `.astro`, `node_modules/.vite` and `node_modules/.astro` (46 pages, exit 0, all 12 images
  regenerated rather than reused, one pre-existing `/404` route-priority warning that also occurs on `main`);
  byte-for-byte case comparison of all five `autogenerate.directory` values, 34 resolvable import specifiers
  and 12 content image paths (all exact); all 12 `@font-face` files present, exactly cased, tracked, and
  shipped to `dist` with zero unreferenced; `site` confirmed as `https://idanlab.dev`; and a dead-reference
  sweep confirming `custom.css`, `Findings.astro`, `Finding.astro`, `notion_cleaner.py` and
  `--prose-heading-gap` exist nowhere as live code.
- **One staleness finding recorded rather than fixed:** roughly thirty comments across `astro.config.mjs`,
  `src/lib/`, `src/components/` and `src/styles/` still name `custom.css`, a file deleted in the refactor.
  None is a live reference (no import, no `customCss` entry, no href), so none affects the build, but they
  now point at nothing. Folded into the hygiene cluster.
- **Status:** Adopted (owner instruction). Docs only in this commit; the merge itself follows.

### 2026-07-27 · The rail's column rule gets a gutter, so its clearance is symmetric by construction
- **Decision:** `.findings` declares two local custom properties, `--findings-gutter` (0.8rem) and
  `--findings-rule-width` (2px). `column-gap` reads the gutter, the `dt` takes
  `padding-right: calc(gutter + rule width)`, and `dt::after` reads the rule width. One value with two
  consumers, so the space on each side of the rule is equal by construction rather than by arithmetic
  someone has to redo.
- **The defect:** the `dt` is `justify-self: stretch` over a `max-content` track, so the track was exactly
  the widest chip, and the rule (absolutely positioned at `right: 0`) therefore landed at that chip's own
  right border. Measured at dpr 1.25, clearance from a chip's right border edge to the rule's LEFT edge ran
  14.80 / 6.40 / **-2.00**px at six, seven and eight characters. On the longest tokens the rule painted over
  the chip's border.
- **The defect is the WIDEST chip on a rail, not an eight character token,** which corrects how the task was
  framed. Busqueda's widest token is six characters and collided at -2.00 as well. Token length is a proxy;
  the track is what decides.
- **Why padding rather than re-anchoring the rule:** anchoring it to the chip would make its x ragged per
  row and destroy the rail, which is the design (chips left-align at natural widths, one rule marks the
  column boundary). The track was simply one gutter too narrow. `max-content` counts padding, so the padding
  grows the track by itself and no literal about port token widths exists anywhere. Same instinct as remedy
  1 of the context law: let a layout primitive compute the relationship.
- **Why gutter PLUS rule width, and not the gutter alone:** the rule occupies its own 2px inside that
  padding, so padding by the gutter alone would leave the chip side short by exactly the rule's width. Sized
  as the sum, both sides measure 12.80px exactly rather than approximately.
- **`right: 0` resolves against the dt's PADDING box,** which is the mechanism that carries the rule out to
  the track's new right edge instead of squeezing it inward. Recorded in the CSS, because "add right padding"
  and "the rule does not move relative to the track" are not obviously compatible claims.
- **Two deliberate zero-diff token substitutions, used as a check:** `column-gap` and the rule width had to
  compute to exactly what they did before (12.80px and 2px). Both did. Had either moved, the substitution
  would have been wrong.
- **Verified by in-page diffing over 48,723 comparable cells across six captures** (forest dark, light and
  375px, return, busqueda, plus bandit 16-17 as a no-rail control): 469 changed cells, every one of them the
  enumerated horizontal shift, and the control at **0 of 1,887**. Chip left edges, chip paint across nineteen
  properties, the rule's own width, height and colour, row heights, the `.findings` box, the `.cl-recon` box,
  and the Assessment hairline and eyebrow all held at zero in both themes. Clearance is now 12.80 on every
  widest chip, 21.20 at seven characters and 29.60 at six, and equals the 12.80 gap to the description.
  `npm run build` green at 46 pages.
- **One consequence at 375px, recorded rather than tuned away:** the description column narrows by 14.80px,
  which pushed Forest's `5985/tcp` row from two lines to three and grew that callout by 30.60px. No
  horizontal overflow, and the wrapped row's continuation error stays 0.00. Whether a narrow screen wants
  the same 0.8rem gutter as a wide one is a taste call for the retune, and it is now a one-token change.
- **Line endings, measured because two prior handoffs asserted opposite things:** the index blob is LF and
  the working tree is CRLF (`core.autocrlf=true`, `text=auto`). Neither "the repo is CRLF" nor "the working
  copies are LF" is the whole statement; `git ls-files --eol` is.
- **Status:** Adopted; committed as `73cb444` to `dev`, pushed, not merged. One theme-pass module
  (`src/styles/components.css`), no component, plugin, config or content edits, no new dependencies.

### 2026-07-27 · The recon rail, in three attempts: grid on the list, two components, then a remark transform
- **Decision:** the recon findings rail is authored as a PLAIN MARKDOWN LIST inside `<Callout type="recon">`
  and converted at build time by `plugins/remark-transform-recon-rail.mjs` into
  `<dl class="findings">` with a `<dt>` chip and a `<dd>` note per row. Chips left-align in a computed
  `max-content` column and a 2px CSS rule marks the column boundary. Three coupled CSS literals, two
  components, two import lines per file, and an authored separator glyph are all gone.
- **This entry records the whole arc, because two of the three attempts are instructive and one of them
  shipped before it was withdrawn.** An earlier draft of this entry described the component mechanism as
  adopted; that is superseded here.
  1. **Grid directly on the markdown list. HALTED, and the measurement is the reusable part.** The plan
     was `display: grid` on the `ul` with `grid-template-columns: subgrid` per `li`. It produced perfect
     alignment (colon spread 13.20 to 0.00) and then broke 3 of 15 rows: grid generates an anonymous item
     only around contiguous TEXT, so an element child becomes its own grid item and is BLOCKIFIED. A row
     containing inline `` `htb.local` `` put the code alone on a new grid row in the tag column and grew
     28.80px to 51.83px. Blockification is a used-value change with no opt-out, so no CSS fixes it. The
     markup had to gain a boundary; the CSS could not invent one.
  2. **Two components, `<Findings>` / `<Finding port="...">`. SHIPPED as `426a4fd`, then withdrawn.** They
     produced exactly the right DOM: description x spread 13.20 to 0.00, chips at natural widths, inline
     code inline, 375px continuation error to 0.00. The structure was right and is kept. The MECHANISM was
     wrong, and it failed the rule that same commit's own docs had just written into CORE_SPEC section 8:
     content carries data, never presentation. Two import lines and a JSX tree per rail is presentation in
     a content file, just a different flavour of it than the class names and separator they replaced.
  3. **A remark transform. ADOPTED.** Keyed on the `<Callout type="recon">` already wrapping the rail, so
     it needs no new authored signal: the port and the note were already being typed. Authoring is now
     simpler than before ANY of this work, which is the tell that the boundary is finally in the right
     place.
- **The lesson, now written into CORE_SPEC section 8:** a component that must be imported into a content
  file is itself presentation in that file. The original rule's test ("if changing the look requires
  editing content files, the boundary is wrong") was passed by the components and still missed this. The
  sharper test counts what a content file must know about how the thing looks, and an import line counts.
  When a transform can produce the same structure from data the author already writes, prefer the transform.
- **All-or-nothing conversion per list, deliberately.** A list converts only if EVERY item parses as
  `/^(\S+)\s:\s/` on its first text node. Convert partially and the build stays green while a row silently
  loses its structure; leave the list alone and it renders with bullets, which is visibly wrong at a
  glance. Loud beats quiet wherever the build cannot tell which the author meant.
- **`dt` and `dd` are emitted as SIBLINGS with no per-row wrapper**, for the reason attempt 1 measured: both
  must be direct grid children, and a wrapper would need subgrid.
- **The mechanism swap was gated at ZERO rendered diff**, which is the only way to claim the transform is
  equivalent rather than merely similar. 57,831 computed-style cells and 1,279 rects across five surfaces
  (forest dark, light and 375px, return, busqueda, plus bandit as a no-rail control): **0 cell diffs, 0 rect
  diffs**. The only DOM difference is the `dl` losing its `data-astro-cid` scope class, which is not a
  computed style.
- **The design followed separately (`00aeaa0`), so it could be measured against a verified-equivalent base.**
  Chips move from right-aligned to left-aligned (`justify-self` end to stretch), chip LEFT edges share one x
  and right edges go ragged, which is the correct reading order for scanning ports. A 2px rule on
  `dt::after` replaces the authored separator. The `dt`'s context is pinned to `--mono-chrome-size` /
  `--mono-chrome-leading`, which does double duty: the rule's `1.6em` height is then declared in the
  context it governs (remedy 2 of the context law), and the `dt`'s 31.50px inherited strut, which had been
  sizing every grid row and growing each callout 0.6875px per row, drops to 19.60px so rows are sized by
  the `dd`'s prose line box again. Measured exactly 0.90px per row recovered: busqueda -1.80, forest -5.40,
  return -6.30. No compensating declaration anywhere; the growth was removed at its cause.
- **One ink, two consumers.** The rule reads the callout's own code ink. Investigated before writing: dark
  inline code read `var(--acc)` and light read `color-mix(in oklab, var(--cl-ink) 80%, #000)`, an
  EXPRESSION rather than a token, so a second consumer would have restated the derivation and the two would
  have drifted. That is the `#a86f04` mistake this codebase has already paid for. `--cl-code-ink` names the
  role, is declared per theme on `.cl` so it resolves against the same element's per-type `--acc` /
  `--cl-ink`, and both consumers read it. Inline code in every callout type keeps its exact computed colour
  in both themes, zero diff, and the rule's colour equals it by construction.
- **Verified:** `npm run build` green at 46 pages at every gate. Chip paint asserted byte-identical across
  sixteen properties on every chip in both themes. Description first-glyph x spread stays 0.00 and the
  375px wrapped-continuation error stays 0.00, both inherited invariants. No motion, no `!important`, no
  new dependencies (`unist-util-visit` is already transitive via `@astrojs/mdx`), pinned versions unchanged.
- **Status:** Adopted; committed to `dev` as `5e0e9b9` (transform, zero rendered diff), `00aeaa0` (design)
  and the docs commit below, pushed, not merged. **Attempt 2 (`feat(recon): make findings a semantic dl and
  delete the rail literals`, 2026-07-27) is NOT reverted, only partly superseded.** Withdrawn: the two
  components it added, `Findings.astro` and `Finding.astro`, and the import line plus JSX tree they required
  in every writeup that carried a rail. Kept and still live: its CSS, the `--mono-chrome-leading` token, the
  `dd` face and leading rules, and the Assessment `:has(.findings)` migration. Attempt 3 replaced the
  MECHANISM and inherited all of it, which is why the structure it established survives its own removal.

### 2026-07-27 · The context law: a font-relative length that governs another context is wrong
- **Decision:** CORE_SPEC section 8 gains a law. A font-relative length resolves against the element it is
  DECLARED on; if its purpose is to size, align, or space content in a DIFFERENT font-size context, it is
  wrong even when it correctly tracks the local font size. Remedies are ordered: delete the number and let
  a layout primitive compute the relationship, or declare it in the governed element's own context, or use
  rem/px with a comment naming the coupling.
- **Why the existing unit rule could not have caught this:** the `layers.css` header rule asked whether an
  `em` tracked its local font size and reserved `em` for where that was the declared intent. All three
  failures ANSWER YES to that question. The rail's `4.9em` did track the chip's size; that was the problem,
  because it was sizing the li's column. The law supersedes the unit rule rather than restating it: one
  governs whether a unit is honest about itself, the other whether it is honest about what it controls.
- **Three instances, one defect, found in a single audit:**
  1. **Recon rail.** `5.6em` on `.cl-recon li` (18px) against `4.9em + 0.7em` on `.port-label` (14px). One
     intended identity (4.9 + 0.7 = 5.6) that never resolved as one: 100.8px against 78.4px, a 22.4px
     standing error. Remedy 1. Resolved, see the entry above.
  2. **Heading gap.** `--prose-heading-gap` declared on the element FOLLOWING the heading, so one numeral
     meant 18px / 10.8px / 9.6px by follower type and lost outright to any larger margin. Remedy 2.
     Resolved, see the entry below.
  3. **Principle cap.** `46ch` on `aside.principle` (18px mono) capping `p.principle-text` (22.4px).
     Effective measure 36.97 characters, never 46 in any era. STILL OPEN, see ROADMAP.
- **Three more rules fell out of the same work:** prefer computed relationships to declared ones (a declared
  relationship is a standing promise to re-derive it, and this project failed that promise across two font
  changes with no build ever going red); content carries data, never presentation; a pinned size implies a
  pinned leading. Plus a scope correction: CSS-only governs the theme pass over Starlight, where not forking
  a Starlight component is absolute, and does NOT govern our own content components.
- **Status:** Adopted; committed as `8533224` to `dev`, then strengthened by the docs commit for the rail
  work above (a component imported into content is itself presentation in content). Docs only.

### 2026-07-27 · A heading owns the space on both sides of itself
- **Decision:** `--prose-heading-gap` is retired for `--heading-space-above` (1.5em) and
  `--heading-space-below` (0.5em), both declared on `.sl-heading-wrapper`. The above value reproduces
  Starlight's existing 1.5em exactly, so that half is a deliberate zero-diff.
- **Why the wrapper is the only valid home:** Starlight gives `.sl-heading-wrapper` the heading's OWN
  font-size (measured 35px on level-h2, 29px on level-h3), so `em` there resolves in the heading's context
  and both values scale per level with no per-level rule. Declared on the heading itself the margin would
  collapse through the wrapper; declared on the follower, which is what the retired token did, it resolves
  in the follower's context.
- **What the old token actually did:** it governed the gap in only 5 of 13 cases on a reference page. A
  paragraph took 18px (the paragraph gap rule outranked it at (0,2,1) against (0,2,0)), a blockquote took
  the token's 10.8px, and a FlagCapture took 9.6px from the `components` layer. One dial, three outcomes,
  and it lost the most common case entirely.
- **Result, measured on five pages in both themes:** h2+blockquote 10.80 to 17.50, h2+paragraph 18.00 to
  17.50, h3+paragraph 18.00 to 14.50, h3+FlagCapture 9.59 to 14.50. Wrapper margin-top unchanged at
  52.50 / 43.50.
- **Invariant recorded in the token comment:** 3:1 ratio, and the space BELOW must stay under
  `--prose-paragraph-gap` at every level so a heading binds to its text more tightly than paragraphs bind
  to each other. At 0.5em that holds while a heading is under 36px. A markdown h1 would sit exactly at the
  boundary; none exists, since the page title renders outside `.sl-markdown-content`.
- **A source-order dependency, deliberately chosen over specificity armor.** Zeroing the follower's top
  margin needs two selectors: `+ *` at (0,2,0) for blockquotes and lists, and `+ p` at (0,2,1) to tie the
  paragraph gap rule and win on SOURCE ORDER within the `prose` layer. Moving either rule above the
  paragraph gap rule silently restores an 18px gap under every heading. Commented in place.
- **One follower is out of reach by construction:** `.flagcap` declares its margin in the `components`
  layer, which no `prose` rule can beat at any specificity, so it keeps 9.60px. Harmless today, since the
  collapse takes the heading's larger value. Fixing it means moving the component's margin.
- **Status:** Adopted; committed as `f1dedd2` to `dev`. Two theme-pass modules.

### 2026-07-26 · OverTheWire amber splits into an identity accent and an AA text ink
- **Decision:** the single `--pw-amber` becomes a PAIR: `--otw-amber` (the identity, for non-text uses:
  borders, focus rings, bars, and display-size type. `#ffc23d` dark / `#a86f04` light, both unchanged) and
  `--otw-amber-ink` (the AA text ink for body-size text: `#ffc23d` dark, byte-identical, / `#7c5000` light,
  new). Every consumer was rewired: text to the ink, borders and washes to the accent. This is the only
  intentional pixel change in the whole refactor workstream.
- **Why a pair rather than a darker single value:** one value could not serve both jobs on paper. Measured
  by canvas readback on the real elements, `#a86f04` failed AA as body text on every surface it landed on
  (3.21:1 on the PasswordReveal row, 3.64:1 on the toggle card, 3.50:1 on paper) while being exactly right
  as a border and ring, where the bar is 3:1 and it passes. Darkening the single token would have dragged
  the borders and rings darker for no reason; splitting fixes the text and leaves the identity alone.
- **The solve (badge-pass method, hold the hue, drop the lightness):** `oklch(0.470 0.101 73.35)` =
  `#7c5000`, hue held at 72.87 against the identity's 73.35, and 82% of the chroma retained. That last
  figure matches the recorded finding that amber's sRGB gamut collapses as it darkens and it keeps only
  about four fifths of its chroma at AA. **Two corrections during the solve, both worth recording:**
  1. The first candidate (`#8a5300`) drifted the hue by 6.4 degrees under gamut clamping. The method
     forbids a hue shift, so chroma was backed off until the hue held within a degree. A gamut-clamp drift
     is still a hue shift; it just is not an intentional one.
  2. The first hue-holding candidate cleared AA at rest and measured **4.38:1 while HOVERED**, because
     `.pw-action:hover` paints its own amber wash underneath its own label. **The hover composite, not the
     resting one, is the surface to solve against.** Re-solved there: 4.78:1 hovered, 5.28:1 at rest.
- **Display type deliberately keeps the identity amber.** `.pi-name` (57.6px/800) and `.pi-num`
  (44.8px/700) are large text at the 3:1 bar and pass at 3.50:1. Only `.pi-eyebrow` (12.8px/400) is body
  text. That split is exactly what the accent/ink pair encodes, and it is why the platform index did not
  need its shared `--pf-accent` retinted. **CORRECTED 2026-07-31:** 3.50 was the bare-paper figure. On
  the hero's real composite `.pi-name` read **3.05**, a 0.05 margin, and **2.93 on the per-pixel floor,
  which is a failure**. `.pi-num` genuinely was 3.50, because the wash did not reach it. The split
  itself stands and the accent still is not retinted; only the number was wrong.
- **A 14th tail rule, and why it was the honest option.** `.pi-eyebrow`'s colour is declared by
  `PlatformIndex.astro`'s own scoped style, so the theme pass cannot reach it from a layer. Verified in the
  browser rather than assumed: a layered rule at (0,4,0) did not move it, an unlayered rule did, because an
  Astro scoped style is unlayered and beats every layered rule at any weight. Retinting `--pf-accent`
  instead would have dragged three display-type consumers and about fifteen non-text uses. So the fix is
  one unlayered rule in `overrides.css`, scoped to `.pf-overthewire .pi-eyebrow`, under the tail contract
  that already names "our own Astro-scoped component styles" (the tail already held two rules beating these
  same two components). Tail 13 to 14.
- **Also routed, zero-diff:** the sidebar OverTheWire group focus ring now reads `--otw-amber` instead of a
  literal. The HackTheBox, VulnHub and PicoCTF ring literals stay forked: there is no root token for the
  red or the purple, and HackTheBox's hex merely COINCIDES with `--sl-color-accent`. Routing it there would
  encode a coincidence as a coupling, which is the mistake the seven-way `#a86f04` fork already taught.
- **Verified:** dark output byte-identical (zero changed cells). Light changed exactly 17 cells of 7,536,
  one value transition (`#a86f04` to `#7c5000`), collapsing to THREE elements: the PasswordReveal button,
  the block-mode summary (matched by two manifest entries and proven the same node), and the OverTheWire
  eyebrow. Every other cell on those elements is an unpainted `currentColor` follower (`border-*-color` at
  width 0, `outline-color`). Final table, all clearing their bar: hovered button 4.78, resting button 5.28,
  block summary 5.98, eyebrow 5.76, rings 3.21 and 3.50 against the 3:1 non-text bar.
  **CORRECTED 2026-07-31: the eyebrow figure is wrong.** 5.76 is the ratio against bare paper; the
  element sits on the hero wash and measured **4.79** there. It passed, but by 0.29 rather than 1.26.
  The other figures in this list are against their own composited surfaces and stand.
- **Found and NOT fixed (different token family, out of scope):** the HackTheBox and VulnHub platform-index
  eyebrows measure 4.11:1 and 4.16:1 on paper as 12.8px body text, both under 4.5:1. Same defect, different
  hue, each needs its own solve and its own ink token. Recorded in CORE_SPEC and ROADMAP.
  **CORRECTED 2026-07-31:** bare-paper figures again. The composite read 3.36 and 3.05, and PicoCTF,
  dismissed here as passing, read 3.59. It was four platforms.
- **Status:** Adopted; committed as `f5eb43a` to `dev`, pushed, not merged.

### 2026-07-26 · The theme pass moves to declared cascade layers and splits into per-layer modules
- **Decision:** `custom.css` (2,417 lines, 130,423 bytes, 56 top-level constructs) is retired. The theme
  pass is now a set of cascade-layer modules under `src/styles/`, one module per layer, with
  `layers.css` declaring `@layer starlight, tokens, base, prose, chrome, components, pages, utilities;` and
  `overrides.css` holding the unlayered tail. Precedence is decided by LAYER ORDER, not by file order and
  not by selector weight. This is an engineering and infrastructure change with no intended visual effect.
- **The problem it solves (why this was worth doing at all):** the old posture was "custom.css is unlayered,
  so it beats Starlight". That works until our own rules start fighting EACH OTHER, and they did. The file
  had accumulated specificity armor (stacked `html[data-theme]` prefixes, element qualifiers, `:root`
  chains) whose only job was to out-rank another rule in the same file, and the armor was undocumented, so
  every new rule had to guess how much weight it needed. Layers replace that guessing with a declared
  order: a `components` rule beats a `prose` rule because it is in a later layer, full stop, and the armor
  could be deleted rather than migrated.
- **Phase order, and why the purge came early:** Phase 1 declared the order and wrapped `tokens` and `base`.
  Phase 2 migrated `prose`, then `chrome` / `components` / `pages` and retired the armor. **Phase 4a (the
  dead-rule purge) was PULLED FORWARD to sit before the reordering**, which is the sequencing lesson worth
  keeping: a rule that matches live elements but always loses is dead IN EFFECT, and reordering the cascade
  can silently revive it. Migrating such a rule converts a harmless no-op into a live regression, so the
  dead rules were deleted first (including a `.hero h1` duplicate that `h1#_top` outranked in both themes).
  Phase 3 split the file into modules. Phase 4b did governance and documentation.
- **The split mechanics, so a future reader can trust it:** every top-level construct travelled with its
  leading comment run and any same-line trailing comment, byte for byte. Verified by a round trip:
  re-reading the written modules, stripping the added headers, and re-interleaving the recovered pieces by
  original source offset reproduced `custom.css` exactly (130,423 bytes in, 130,423 out). Distribution:
  tokens 7 constructs, base 1, prose 14, chrome 9, components 8, pages 3, utilities 1, overrides 13, which
  is all 56. Every module repeats the order statement on its first line so any bundler chunk order still
  establishes the same order.
- **The layer law that fell out of it:** no `!important` inside a layer. `!important` REVERSES layer order,
  so an important declaration in a late layer is weaker than one in an early layer, which is a trap rather
  than a tool. Important declarations therefore live only in the unlayered tail. The tail contract: a rule
  earns a place in `overrides.css` on exactly one of two grounds, it must beat unlayered CSS (a vendor
  stylesheet, an inline style, or one of our own Astro-scoped component styles, all of which sit above
  every layer) or it carries `!important`, and each one carries a comment naming what it beats.
- **The two instruments, previously conflated (this cost real debugging time):** `.not-content` governs
  REACH and layer order governs PRECEDENCE. The guard is written `:not(:where(.not-content *))` and, like
  Starlight's own, it excludes DESCENDANTS only, so a component root that carries the class is still
  matched and is resolved by precedence. And a rule with no guard at all (the bare `:not(pre) > code`
  inline-code chip) reaches into every component subtree regardless. What actually protects a component is
  that its scoped style is unlayered. `AttackPath.astro` carried a comment crediting the guard; corrected.
- **The verification protocol, which is the reusable part.** A 62-entry, 24-property computed-style harness
  over 8 pages in both themes, 7,536 comparable cells, diffed in-page so only CHANGED cells ever reach the
  transcript. Every phase gated at zero changed cells except the amber pass's intended 17. Three traps were
  found and are now encoded in the instrument:
  1. **The pane freezes transition timelines** (`visibilityState: "hidden"`), so a mid-flight transition
     reports its START value forever. This produced a false 4-cell diff whose two halves moved in OPPOSITE
     directions on two pages, which is the tell that a diff is a race and not a regression. Zeroing
     `transition-duration` does NOT cancel an already-running frozen transition; only the `transition`
     shorthand does, and it cannot be in force during the capture or `transition-property` computes as
     `none`. v4 does both, in that order.
  2. **devicePixelRatio drifts** between 1 and 1.25 as the pane settles. A pair captured at mixed dpr is
     not comparable. The rule is to rebuild a same-dpr pair, never to reinterpret the diff.
  3. **A layered rule cannot override an Astro scoped style**, at any specificity. Measured, not argued.
- **Verified at every gate:** `npm run build` green at 46 pages; zero `package.json` or lockfile diff
  throughout; the order statement is the first `@layer` occurrence in document CSS order on a built page;
  the tail sits at brace depth 0 in the shipped CSS. Two Starlight-authored stylesheets do open with a
  `starlight.components` block and no order statement of their own; proved pre-existing by rebuilding the
  committed tree and confirming both files are content-hash identical before and after.
- **Deliberately NOT done, in this or any future phase of this workstream:** selector flattening and unit
  conversions. The remaining multi-part selectors either express real precedence within their layer or are
  load-bearing against unlayered CSS. The unit rule (rem or px for component geometry, em only where
  scaling with the local font size is the declared intent, with a comment naming the coupling) is WRITTEN
  in the `layers.css` header and deliberately NOT applied: converting a unit changes rendered geometry, so
  it belongs to the retune with its own measurements, not to a behavior-preserving refactor.
- **Status:** Adopted; committed to `dev` across `e6f1602`, `8215858`, `fb70ce9`, `c4b40d3`, `64ad6df`,
  `ff396d3`, `19c2e49`, `200e9da`, all pushed, none merged to `main`. No new dependencies, pinned versions
  unchanged, no component edits beyond one comment correction in `AttackPath.astro`.

### 2026-07-25 · PasswordReveal gets a BLOCK mode; the one-off `.spoiler-toggle` class is retired
- **Supersedes:** 2026-07-11 · PasswordReveal migration complete
- **Supersedes:** 2026-07-05 · Spoiler-toggle open border derives from summary color via --spoiler-color (fixes a masked light-mode bug)
- **Decision:** `PasswordReveal` grows a second mode so one component covers both shapes a wargame secret
  comes in, and the `.spoiler-toggle` class it existed to work around is deleted from `custom.css`.
  **INLINE** (a `password` prop, no slot) is the original one-line password: blurs in place, copy control,
  unchanged. **BLOCK** (slot content, no `password` prop) collapses a multi-line secret as a `<details>`.
  Migrated `overthewire/bandit/16-17.mdx`, the RSA private key that was the last spoiler-toggle on the site.
- **Why two modes rather than two components:** the rule is that the interaction follows the secret's SHAPE,
  not its meaning. Inline secrets blur, block secrets collapse, because a secret running to many lines cannot
  be blurred as one inline run: a blur over a 5-line PEM block is unreadable as a control and reads as broken
  rendering. The IDENTITY is the same in both cases though (this is a wargame waypoint the reader pastes into
  SSH, not a trophy), and that is exactly why it is one component and not two: the amber, the "no gold, no
  decode animation" distinction from FlagCapture, and the reader's mental model are shared, only the geometry
  differs.
- **Mode is derived from the slot, never guessed:** `Astro.slots.has('default')` decides, and passing BOTH a
  `password` prop and slot content, or NEITHER, throws at build time. An ambiguous call should be a build
  failure, not a silent branch choice, for the same reason the `badges` opt-out rejects non-booleans: a
  quiet wrong guess ships a broken page on a green build.
- **Block mode ships with NO copy button on purpose.** The keys it holds are truncated for publication
  (GitHub push protection blocks real PEM keys, and the truncation is the recorded convention), so a copy
  control would hand the reader a broken key. Better no affordance than a misleading one. Revisitable if a
  full, copyable block secret ever ships.
- **Why this is a consolidation and not a rename:** block mode carries `.toggle`, so it inherits the standard
  toggle card, the disclosure marker and ToggleAll's bulk expand exactly as the spoiler class did, and its
  summary face/weight now come from the shared toggle-title rule instead of a bespoke mono 700. The Geist
  type pass is what surfaced this: after it, `.spoiler-toggle` was the last toggle on the site still
  carrying its own face and weight, for no reason other than that it predated any system.
- **The amber now has exactly ONE source, which is the real prize:** `--pw-amber` (accent: label, button,
  open border. `#ffc23d` dark / `#a86f04` light) and `--pw-amber-rgb` (the `#f59e0b` wash base, consumed as
  `rgba(var(--pw-amber-rgb), alpha)`). Both modes read them, so they cannot drift apart, and the inline row's
  scattered literal hexes and `rgba()`s collapse into them. Previously the same amber lived independently in
  the spoiler block and the `.pwreveal` block, which is precisely how a two-place identity drifts.
- **Custom properties are safe here, and this is worth stating because the file says otherwise:** the 2026-07-05
  entry recorded that every colour in this block must be a literal, after a token-based pass rendered as a
  neutral/near-black box. That failure was `color-mix()` indirection, NOT custom properties. `--pw-amber`
  holds a literal hex and `--pw-amber-rgb` a literal channel triplet, so nothing has to resolve a colour
  function. Both are also declared on the bare `:root` fallback (this file's convention), so an absent
  `data-theme` can never leave the var undefined and invalidate every `rgba()` reading it, which is the one
  way a token could have reproduced the old failure.
- **Inherited specificity requirement, still load-bearing:** `.pwreveal-block`'s two border rules keep the
  `html[data-theme]` prefix the retired class needed. Two generic rules elsewhere set `border-color` on any
  `.sl-markdown-content details` / `details[open]` (the per-theme card border, and light mode's "no green
  edge on paper" open-state override), both unconditional on element type, so a plain `.pwreveal-block`
  selector is silently outranked and the amber border never renders. The prefix is attribute-presence only,
  not tied to a value, so it still applies in both themes. The shared rules stay untouched.
- **The injector needed no change (checked, not assumed):** `remark-inject-passwordreveal.mjs` matches
  `mdxJsxFlowElement` by NAME, so a block-mode tag with children is detected exactly like a self-closing
  inline one. Two stale `spoiler-toggle` mentions in comments were cleaned up in passing (`Toggle.astro`'s
  `class` prop and the taxonomy guard's "ignored tokens" note); the class name now appears nowhere in `src/`.
- **Verified:** `npm run build` green (46 pages); `16-17.mdx` renders one `.pwreveal-block` collapse and no
  page carries `spoiler-toggle`.
- **Status:** Adopted (working tree, committed to `dev`, not pushed). Component + one content file + the
  `custom.css` block; no config, no new dependencies, pinned versions unchanged.

### 2026-07-25 · Writeup prose moves to Geist; chrome is pinned OFF the prose scale
- **Decision:** running prose in writeup bodies is set in **Geist** (self-hosted subset WOFF2, roman
  400/600/700 plus a true drawn italic 400). Everything else on a content page stays JetBrains Mono. The
  face was chosen with a standalone typography playground that rendered the real Busqueda writeup in ~10
  candidate body faces against the site's real tokens (2026-07-20); that tool is deliberately kept LOCAL
  and untracked, like the busquedav2 testbed, because it loads faces from the Google Fonts CDN and source
  carries no Google Fonts origin.
- **Why:** mono was set for everything, so running prose read as terminal output. The site's terminal voice
  is the point in code blocks, badges, callout labels and the Principle coda, and it costs nothing to keep
  it there; long-form prose is the one place it was working against the reading. Headings (Syne) and the
  whole mono chrome layer are untouched, so the change is additive to the visual language rather than a
  rebrand.
- **The mechanism that makes it safe (the load-bearing choice):** `--sl-font` and `--sl-font-mono` are
  deliberately NOT changed. Geist is applied by ONE scoped rule over
  `.sl-markdown-content :is(p, li, blockquote, td, strong, em)`, so every surface the rule does not name
  (sidebar, TOC, breadcrumbs, pager, code frames, badges, headings) is unchanged BY CONSTRUCTION, not by a
  growing exclusion list. Swapping the Starlight font vars would have inverted that: every piece of chrome
  would have needed its own carve-out.
- **Two exclusions, both chrome wearing prose markup:** `.cl-header` (a `Callout`'s label row is authored as
  a `<p>`) keeps its uppercase mono while callout BODY prose goes Geist, and `figcaption` is left untargeted
  because it is Expressive Code's code-frame title bar, not an image caption (real image captions are `em`
  inside a paragraph, so they are already covered).
- **Chrome does not track the prose body, which is the actual point of the pass.** Mono chrome (inline code,
  `.port-label`) and component titles (toggle summaries, the `FlagCapture` button base, the `Principle`
  maxim) are pinned to FIXED rem sizes, so they hold their scale when `--prose-size` moves and the 18px vs
  18.5px question stays a one-line change. Left on `em` they inflated with the larger body: inline code and
  the port tag grew out of the code-block scale they are supposed to match, and `FlagCapture`'s flag value
  (`1.02em`) and lock icon (`1.25em`), both em-relative to that button, grew with it. Inline code also has
  to re-declare `font-family`, since it otherwise inherits Geist from its paragraph.
- **Two specificity bugs the pass had to fix (do not "simplify" either selector):**
  1. **`p.principle-text`, not `.principle-text`.** The prose face rule is (0,2,1) and the plain class is
     (0,2,0), so Geist and the prose paragraph margin were being forced onto the mono italic maxim. The
     element qualifier ties the specificity and wins on source order (its block is later in the file).
  2. **The paragraph gap is excluded from inside blockquotes.** `blockquote p { margin: 0 }` is only
     (0,1,2), so the new gap rule (0,2,1) outranked it and leaked about 2x the gap into every quote. That,
     not the padding, was the real cause of the blockquote reading too tall. The exclusion is written
     `:not(:where(blockquote *))` so it carries ZERO specificity and normal prose is untouched.
- **Toggle titles became one system in passing:** `--toggle-title-face` / `--toggle-title-weight` on
  `details.toggle:not(.toggle-flag) > summary` (Geist 600). This supersedes the spoiler toggle's bespoke mono
  700, which is what exposed that one-off class as the last toggle carrying its own face and weight for no
  reason; retiring the class itself is a separate change. The gold flag toggle keeps its own identity.
- **Metric-matched fallbacks by the same method as the existing faces:** `Geist Fallback` is computed with
  the capsize xWidthAvg method (Geist upm 1000, ascent 1005, descent 295, line-gap 0; roman xWidthAvg 467,
  italic 460) against Arial, and the ITALIC carries its own overrides against Arial Italic so italic prose
  does not shift on swap either. New filenames, so the immutable one-year `/fonts/*` cache is not a concern
  (the rename-on-change rule only bites when replacing a face).
- **Verified:** `npm run build` green (46 pages); all four Geist faces ship to `dist/fonts/`.
- **Status:** Adopted (working tree, committed to `dev`, not pushed). **The prose dials are deliberately
  left as tokens pending the owner's judgement on the deployed preview:** `--prose-size` (18.5px, or
  `1.125rem` for 18px), `--prose-leading`, `--prose-strong-weight`, and the two `--toggle-title-*` tokens.
  Tuning any of them is a token edit with no other code change, because the component sizes are decoupled
  from the prose size. Tracked in ROADMAP.

### 2026-07-20 · AttackPath production-readiness audit: 8 findings fixed (2 were real WCAG AA failures)
- **Decision:** a full audit pass over the finished component, hunting for defects rather than confirming the
  known ones were gone. Eight issues found and fixed; everything else measured clean. No redesign, no new
  dependencies, component-scoped only.
- **The two that mattered most were genuine WCAG 1.4.3 AA failures on live text:**
  1. **The `future` state's `opacity: 0.4` was failing AA on real content.** Measured effective ratios (group
     opacity composited over the panel): name **3.83:1 dark / 2.43:1 light**, kind **1.88 / 1.79**, and the
     future GOAL worse at **2.69 / 1.76**, against the 4.5:1 this text needs. Crucially these are NOT inactive
     controls, a future node is clickable to jump ahead, so WCAG's inactive-component exemption does not
     apply. **Group opacity was the wrong instrument:** an opacity sweep showed the kind label needs ~0.88 to
     reach AA, which erases the state entirely. Fixed by carrying the "quiet" in COLOUR and scale instead:
     the future name drops to the muted grey (5.78 light / 5.93 dark) while done/active names stay
     full-contrast white (10.8 to 16.8), so the three-tier hierarchy survives with the ratio intact.
  2. **The active node's kind label read 3.94:1 on paper.** Ambient accent sitting on its own 12% accent
     tint, the exact pairing the 2026-07-19 rework already solved for the "Next step" button and never
     applied here. Same fix, same token: `--sl-color-accent-high`, light only, 7.09:1.
- **A real focus-management bug:** `nextBtn.disabled = pos >= last` removed the button from the tab order at
  the very moment the user pressed it, so a keyboard user advancing with Enter had **focus dumped to `<body>`**
  on the final press (verified) and the next Tab restarted at the top of the document. Now `aria-disabled`
  with a guarded click handler, so the control stays focusable and the position is preserved; the hover rule
  was rekeyed from `:disabled` to `:not([aria-disabled='true'])` to match.
- **Progress state was invisible to assistive tech.** The check glyph is `aria-hidden` and `aria-current`
  marks only ONE node, so a screen reader heard an undifferentiated list of names. Each node and dot now
  carries the state word in its accessible name ("Web nginx, completed"), with the visible label still inside
  it so WCAG 2.5.3 Label in Name holds.
- **Touch:** the track had `overscroll-behavior-x: auto`, so flicking past either end chained to the page and
  could fire the browser's back-navigation gesture, throwing a reader off the writeup. Now `contain`.
- **Three smaller ones:** an over-long `kind` ran underneath the absolutely-positioned check glyph (now
  `max-width` reserves that gutter, so it wraps instead); the `is-enter` dossier class lingered between
  advances and would have spuriously animated if a reader enabled motion mid-session, contradicting its own
  code comment (now self-clears on `animationend`); and `--t` serialised 17 significant digits into every
  node's style attribute (now rounded to 4, far below one device pixel of the 52px it interpolates).
- **A regression the audit caught in its own fix (worth recording):** adding `html[data-theme='light']` to the
  active-kind selector raised its specificity above the later `.is-goal[data-state='active']` gold rule, which
  silently turned the GOAL's kind label green. Caught by asserting the computed colour equals the gold token
  rather than by re-reading the ratio, which still "passed" at 7.59. `:not(.is-goal)` restores it. Lesson:
  when a contrast fix changes a colour, assert the IDENTITY, not just the ratio.
- **Measured clean, no action (recorded so it is not re-audited):** geometry holds from a 2-node to a 10-node
  chain with **riseSpread 0** and nothing clipped; the parallel connector-label rule holds at both angle
  extremes (-15.12deg to -6.17deg) and up to a **6-line** label; node and dossier text never overflow at
  pathological content lengths; four instances on one page stay independent and arrow keys stay scoped to the
  instance holding focus; `box-sizing: border-box` so the `is-start` border shifts nothing; performance is
  **6.1ms per advance** on the longest chain with no page-scroll side effect; `centre()` clamps correctly at
  both ends; zero ungated animation declarations.
- **Verified after the fixes, both themes:** every node state and all chrome text returns **belowAA: []**
  (light and dark), the goal keeps its gold identity in every state, focus is retained at the end of the
  chain, reduced motion still advances as a static state machine with no runner, no bloom and no stale class,
  and every earlier invariant still holds (edge gaps 6.7/6.2, endpoints clear of the mask, rise uniform,
  focus rings intact, no page overflow). `npm run build` green (46 pages).
- **Status:** Adopted (working tree). Component-scoped CSS + script only; no content, config, token, or
  dependency changes.

### 2026-07-20 · AttackPath edge mask overlays a GUTTER, not the endpoint nodes (one token drives band + inset)
- **Decision:** the horizontal edge fade is kept as the no-scrollbar "more path off-screen" affordance, but it
  no longer falls on the start and goal nodes. A single token `--ap-fade-w` now drives BOTH the mask's band
  width AND the spine's inline padding, so the gutter is exactly as wide as the band and the endpoints come
  to rest precisely where the mask ends. The band is also narrowed (52 -> 36px desktop, 34 -> 24px at the
  existing 50rem breakpoint) and its falloff eased. Not a removal and not a redesign: same masks, same
  surface derivation, same z-order, same purpose.
- **The measured defect (the fade was eating the two most important anchors):** at scroll start the start
  node sat with **48.6px of its 138px width under the 52px left band**, and its NAME TEXT began 34.9px inside
  the band, where the old `linear-gradient(90deg, surface 14%, transparent)` still had **~78% alpha**. On the
  light warm-paper surface that pulled the start node's name from **13.1:1 down to 1.54:1**, far below AA and
  effectively unreadable. At scroll end the goal node had 41.1px under the right band; its text is
  left-aligned so it escaped, but the node's right frame, padding and check glyph were washed.
- **Why the gutter is the right lever (and why the other candidates were not enough alone):** narrowing the
  band or easing the curve only REDUCE how badly the mask lands on an endpoint, they never remove it, and the
  amount is a judgement call that changes with node width and chain length. Tying the gutter to the band is
  structural: at either scroll extreme the mask lands on empty gutter instead of content, so endpoint
  legibility stops depending on tuning. Narrowing and easing were still applied, because they make the mask
  gentler everywhere ELSE (mid-scroll, where it does its actual job) and keep the gutter modest.
- **The property that falls out of it, and is the real prize:** a mask over empty gutter is surface-on-surface,
  i.e. INVISIBLE. So the fade now appears exactly when real path is running under it and vanishes when it is
  not, which is the correct semantics for the affordance, achieved with zero JS and no scroll listeners.
  Verified: at rest-left the LEFT band has nothing under it while the RIGHT band carries the peeking next
  node; at rest-right the reverse; mid-scroll both are live.
- **The falloff is a SMOOTHSTEP, replacing a plateau-plus-linear ramp.** The old gradient held FULL opacity
  across its first 14% and then smeared linearly to transparent, which is what put text under ~78% wash. The
  new stops approximate `1 - (3t^2 - 2t^3)` (84% at 25%, 50% at 50%, 16% at 75%), so the band is only truly
  opaque at its outermost edge, recovers most legibility by mid-band, and has no hard edge at either end.
- **Known and deliberately not fudged:** the ACTIVE node's `scale(1.045)` lift makes its box bleed ~3px past
  its layout position, so the start node grazes the band's outermost 3px at rest. Measured alpha there is
  **0.019 (1.9%)**, perceptually nil, and the node's TEXT is at alpha 0. Padding the gutter by a few extra px
  to swallow the lift would be exactly the arbitrary offset this component avoids, so the graze is recorded
  rather than patched.
- **Verified across the full matrix (both themes; 375 / 600 / 768 / 1280; Forest 6-hop and Return 5-hop;
  scrolled to start, mid, and end):** endpoint text alpha is **0 at every rest position in every combination**,
  start node under-mask 48.6px -> 3px, goal node 41.1px -> 0px; light-theme endpoint contrast restored to
  13.1:1 (start) and 5.23:1 (goal gold, AA) with zero fade wash; the mask still covers 24-71px of real path
  at every scroll position, so the affordance never went away; the peek of the next node under the right fade
  is intact; no page-level horizontal overflow at any width. Chain-length independent by construction (the
  rest positions are set by the gutter, not by how long the chain is). `npm run build` green (46 pages).
- **Status:** Adopted (working tree; NOT committed). Component-scoped CSS only, no new tokens beyond the one
  alias, no JS, no dependency or version changes. Band width is the one number left to taste: `--ap-fade-w`
  is the single knob if the owner wants the fade stronger or weaker.

### 2026-07-20 · AttackPath production-polish pass (connector-label rhythm, honest weight ramp, dot touch targets) + Return instance
- **Decision:** a refinement-only pass over the existing `AttackPath` component (concept, structure, and
  interaction unchanged): fix the three things that fell short of signature quality, all diagnosed by
  measurement in a real browser first, and add the component to `return.mdx` under `## Summary` (its second
  instance, alongside Forest). No redesign, no new tokens, no new dependencies, component-scoped styles only.
- **1. Connector labels now ride PARALLEL to their segment (the real root cause of the uneven rhythm).**
  The verb label was a ~110px horizontal box centred on the connector, over a line that ASCENDS across that
  same width. Measured on Forest: the label's bottom cleared the line by **+17.4px on the low-left, 7.7px at
  centre, and -1.8px (crossing the line) on the high-right**. So the gap depended on the slope, on the
  label's width (a short verb sat near centre and read detached; a wide one reached the crossing point and
  read attached), AND on line count (the old `translate(-50%,-160%)` lifted a two-line label ~8px further off
  than a one-line one, because -160% is a percentage of the label's own height). The systemic fix is the one
  rule that removes all three dependencies at once: anchor the label's BOTTOM edge a constant gap above the
  connector's mid-line (`translateY(-100%)` lands the bottom edge on the anchor regardless of line count),
  then rotate it to the chord's angle (`rotate(var(--ap-edge-angle))`, computed once in the frontmatter as
  `-atan2(rise, CONN_W-5)` since every connector shares `rise`). Because the S-curve passes almost exactly
  through its own chord at centre (measured curve-vs-chord deviation < 0.2px), a straight tilted label hugs
  the curve. Verified live: every label on both chains now sits at a uniform **~6.5px gap (6.7 left / 6.2
  right)** end to end, one- and two-line alike. The tilt is 6-15deg across the clamped rise band, always
  legible. This is layout, not motion, so it is deliberately NOT gated under reduced motion.
- **2. The escalation weight ramp was a fiction; it now uses only loaded faces.** `calc(500 + --t*200)`
  requested 540/580/620/660 across the chain, but JetBrains Mono is subset to **400/500/700 only**, so the
  CSS font-matching algorithm snapped every value >500 straight to Bold 700 (measured by canvas ink density:
  540/580/620/660/700 all rendered **2545 ink, identical to 700**; only 500 differed at 2160). The "smooth
  ramp" was really a step from node 0 (Medium) to node 1+ (all Bold), and it requested four unloaded weights,
  against the site's "only loaded weights" rule. The continuous font-SIZE ramp (12.16 to 14.4px, verified) is
  the real, honest escalation cue; the weight now adds ONE derived step, Medium before the chain's midpoint
  and Bold from it on (`--ap-nw = t >= 0.5 ? 700 : 500`, computed per node, robust at any chain length: a
  2-node chain reads 500/700, a 12-node chain splits 6/6). The 2026-07-19 entries' "weight 500 to 700"
  was measuring the COMPUTED calc value, not the rendered face; this corrects that.
- **3. Dot touch targets grew from 7px to a 24px-tall tile (WCAG 2.2 SC 2.5.8), the site's own convention.**
  The step dots were 7px, far under the 24px pointer minimum the About HUD established. Following that
  layout-neutral pattern, a transparent `::after` overflow grows only the invisible tap area while the visible
  dot and its focus ring stay the 7px border box (verified: the ring still wraps the 7px dot, not the hit
  area). The `::after` is 24px tall and one-dot-plus-gap wide so adjacent targets TILE the row edge to edge
  (symmetric ~18x24 per interior dot, no overlap, no dead zone) rather than a fixed 24px box where later
  siblings would steal a neighbour's overlap; the row gap was nudged 0.42rem to 0.7rem for the room. The dots
  are a redundant control (every step is also reachable by its full-size node, the Next button, and the arrow
  keys), so the cluster stays compact by design.
- **Return instance (a deliberate different-shaped test, not just reuse):** a 5-node chain
  (`Printer Panel -> svc-printer -> Server Operators -> vss (LocalSystem) -> SYSTEM`) exercises what Forest's
  6-node chain did not: a shorter chain (escalation recomputed, rise 24, angle -12.2deg), a non-account START
  node (the unauthenticated web panel), a long node name (`vss (LocalSystem)`), and a genuine two-line verb
  label (`leaks via LDAP pass-back`) that validates the height-decoupling on real content (its multi-line gap
  measured the same uniform 6.5px). The BloodHound graph stays above it as evidence, matching Forest.
- **Verified end to end (both themes, phone 375 / tablet 768 / desktop, touch + keyboard, reduced-motion on
  and off):** uniform parallel label gap on every connector of both chains; weight renders only 500/700 in a
  clean midpoint step; dots 24px tall with a tight focus ring; full guided walk drives states / connectors /
  meter 0-100% / dossier then settles, "Compromised" disabled end state, revisit resets, and the one-time
  gold bloom does not replay; arrow keys advance/retreat; every ring flows through `--focus-ring` (node lime,
  goal gold `#7a5a12` light); reduced motion advances as a static state machine (runner never travels, no
  bloom) with zero ungated animation declarations (re-verified programmatically); light surfaces read as the
  warm paper `#f2ede0` with the depth shadow, all measured text pairings AA (title 15.2, meter/edge/dossier
  6.0, Next 8.2, goal gold 5.2); no page-level horizontal overflow at any width, path scrolls internally with
  the fade + peeking-next-node affordance intact on touch. `npm run build` green (46 pages), no console
  errors. Both dist instances render; BloodHound evidence preserved in both.
- **Status:** Adopted (working tree; NOT committed). Component-scoped styles + one content file (return.mdx);
  no custom.css, config, token, or dependency changes; pinned versions unchanged.

### 2026-07-20 · WriteupMeta is injected from frontmatter, platform is derived from the directory
- **Decision:** writeups no longer hand-place `<WriteupMeta />`. A new remark plugin
  `plugins/remark-inject-writeupmeta.mjs` injects the badge row (and its import) at build time, reading
  `os` / `environment` / `difficulty` from frontmatter. **`platform` is NEVER a frontmatter field:** it is
  derived from the writeup's platform directory, the same way the sidebar and `PlatformIndex` already
  treat the directory as authoritative. All 37 writeups were migrated in the same pass (props moved to
  frontmatter, component and import deleted).
- **Why derive platform instead of authoring it (the load-bearing choice):** an earlier design had
  `platform` in frontmatter with an elaborate guard: a missing-platform build error plus near-miss key
  detection for `platfrom` / `Platform`. Deriving it deletes that entire failure class instead of
  guarding it, so the guard, the near-miss detector and the null-vs-undefined handling were never built.
  A writeup's platform is a fact about where the file lives, not a value an author restates and can
  mistype.
- **Proven lossless before migrating:** an audit compared every hand-placed `platform` prop against its
  directory across all 37 writeups and found **0 disagreements**, so derivation reproduces exactly what
  was authored. The audit also confirmed 0 writeups lacking the tag, 0 frontmatter-vs-prop `os`
  conflicts, and 5 hubs carrying no writeup metadata.
- **Mechanism, established by a read-only investigation first (do not re-derive):** frontmatter reaches a
  remark plugin as parsed structured data at `file.data.astro.frontmatter`, but ONLY if the transformer is
  declared `(tree, file)`; a `(tree)`-only transformer, like the PasswordReveal injector, never sees it.
  `@astrojs/mdx` parses and strips frontmatter BEFORE the processor runs (`vite-plugin-mdx.js`), so there
  is no `yaml` node in the mdast and plugin ORDER does not affect availability. Injection needs an
  `mdxJsxFlowElement` with string-valued `mdxJsxAttribute`s plus a matching `mdxjsEsm` import built via
  acorn. Zero new dependencies (`unist-util-visit` and `acorn` are already transitive via `@astrojs/mdx`).
- **The silent-failure mode this had to defeat:** frontmatter is ALWAYS an object (an empty file yields
  `{}`) and an absent field reads as `undefined` without throwing, so a naive trigger would skip quietly
  and a writeup would ship with no badge row on a green build. Two structural answers: platform cannot go
  missing because it is derived, and the plugin is gated entirely on the writeup path (non-`index` `.mdx`
  under the four platform directories), so a stray metadata field anywhere else can never inject.
- **`badges: false` opt-out, with the YAML coercion trap closed:** only the unquoted boolean `false` opts
  out. `badges: no`, `badges: off` and `badges: "false"` all parse as TRUTHY STRINGS under js-yaml, so an
  author who meant to opt out would silently get badges. Any present-but-non-boolean value therefore FAILS
  the build with an explicit message. Verified live: `badges: no` fails, `badges: false` skips injection.
- **Validation consolidated at the same time (three ways became two, both real):** `content.config.ts`
  tightens the metadata fields to strict enums MIRRORING the component unions exactly (including the space
  in `Active Directory`): `os` moves from a loose string to `Linux | Windows`, `environment` and
  `difficulty` are added, `badges` is typed boolean. `os` was safe to tighten because its only consumers,
  `WriteupCard` / `PlatformIndex`, already matched nothing outside those two values. In exchange, ONLY the
  `WriteupMeta` entry was retired from the taxonomy guard's component-enum map, since no writeup
  hand-places the component for that stage to see. **Everything else in the guard is untouched and still
  live:** the `meta-badge` / `platform-` / `difficulty-` / `os-` class families (still emitted by
  `WriteupCard`, still hand-authorable), `port-label`, `task-title`, and the `Callout` and `FlagCapture`
  enum checks. The class-string families are NOT the same thing as the component prop enums; only the
  latter died.
- **Verified live:** `npm run build` green (46 pages) with the strict enums accepting all 37 writeups.
  Exactly 37 badge rows in `dist`, one per writeup, no duplicates and no page missing one. Forest renders
  platform `pf-htb` derived from its directory plus os/environment/difficulty from frontmatter; Bandit
  renders `pf-otw` + os + environment with NO difficulty chip and no error. A non-writeup file carrying a
  stray `platform` field is not injected. Negative tests all fail loudly: `difficulty: Medum` is rejected
  by Zod naming the field and options, a bad `Callout type` and a bad `difficulty-` class token are still
  caught by the guard.
- **Status:** Adopted. Plugin + wiring + 37-file migration + schema + guard cleanup. Zero new
  dependencies, pinned versions unchanged, `WriteupMeta.astro` itself untouched.

### 2026-07-19 · AttackPath: a guided, data-driven infographic for linear privilege-escalation chains
- **Decision:** new additive component `src/components/AttackPath.astro` renders a LINEAR privilege-escalation
  chain as an ascending horizontal path that escalates toward the goal, with a guided "Next step"
  progression, structural directional connectors, and a one-time gold flourish on reaching root. It is a
  storytelling infographic, not a UI control, and is intended as a signature element reused across
  multi-hop writeups. First instance: Forest, under `## Summary`. Linear only, no branching.
- **Data contract:** `title` plus an ordered `nodes: { kind, name, edge?, detail? }[]`. Everything (escalation,
  states, connectors, meter, dots, flourish) derives from index and position, so no chain is hardcoded. A
  runtime guard throws on fewer than 2 nodes or a node missing `kind`/`name`, matching how WriteupMeta guards
  its props and for the same reason: `astro build` does not type-check `.astro` props and this repo has no
  `astro check`, so the interface is editor-only.
- **Styles are SCOPED to the component, not in custom.css.** That is the majority convention here (NotFound,
  WriteupCard, PlatformIndex, SecretTerminal) and it is safe specifically BECAUSE the root carries
  `not-content`: every `.sl-markdown-content` prose rule is guarded with `:not(:where(.not-content *))`, so
  nothing in this subtree ever needs to out-rank a global rule, which is the thing Astro's zero-specificity
  `:where()` scoping cannot do. WriteupMeta's custom.css placement is the exception, not the pattern.
- **Token corrections found by checking the source (the brief assumed otherwise):**
  1. **`--pf-accent` is NOT global.** It is defined only on the `.pf-*` classes, so a reusable component
     cannot read it directly. The accent is `var(--pf-accent, var(--sl-color-text-accent))`, the same
     fallback idiom `PlatformIndex` uses: it inherits a platform hue if ever dropped inside a `.pf-*`
     context, and is the site lime everywhere else.
  2. **The display font variable is `--tp-display`, not `--display`.** Syne is also only loaded at 600/700/800,
     so display type never asks for a lighter weight; the escalating weight rides JetBrains Mono 500 to 700.
  3. **The two golds are not interchangeable.** `--flag-gold` is decorative (2.00:1 on paper) and paints
     borders, glows, the runner and the bloom; every gold TEXT run uses the AA-grade `--flag-gold-val`.
     Verified live: the goal label computes `#7a5a12` on light and `#ffc23d` on dark.
- **Geometry finding (a real bug, caught by measuring):** the connectors aim at node CENTRES, and the active
  node's `transform: translateY(-5px)` moved it off the rise ladder, so the incoming arrowhead landed 5px
  low (measured rise 13.4px against 18.4px on every other hop). Scale preserves an element's centre and
  translate does not, so the lift is now carried by `scale(1.045)` plus the elevation shadow. After the fix
  all five hops measure a uniform 18.4px rise and every arrowhead lands with `dy = 0`.
- **Second geometry finding:** a `future` node scales to 0.955, pulling its left edge inward by
  `(0.045/2 * width)`, 3 to 4px on this chain, so the dashed segment fell visibly short of the node it
  pointed at. Fixed by overshooting the tip past the connector box and pairing it with a negative inline
  margin. Arrowheads now land 1px inside a `done` node and 5.1px inside the scaled-up `active` one.
- **Vertical layout model (worth reusing):** the spine is `display:flex; align-items:center` and the ascent
  is pure `position:relative; bottom: rise * index`. Because every item is centred on one axis, a node that
  wraps to three lines does not disturb the ladder, and a connector aligned to the LEFT node's `bottom`
  automatically ends exactly `rise` above it. Node HEIGHT is therefore free, which matters because the data
  is arbitrary. The climb is normalised (a fixed total divided by the hop count), so a 12-hop chain occupies
  the same vertical envelope as a 3-hop one; the spine's top padding reads that TOTAL, not the per-hop rise,
  because sizing off the rise under-pads and clips the top node on any chain longer than five hops.
- **Testing property to know (cost real time here):** the in-app Browser pane runs the page with
  `document.visibilityState === "hidden"`, so the browser FREEZES animation timelines. A transition reports
  `playState: "running"` with `currentTime` pinned at 0 forever, and `getComputedStyle` returns the START
  value indefinitely. A `stroke-dashoffset` that had correctly cascaded to 0 read as 260px, which looks
  exactly like a broken cascade. The reliable technique is to inject
  `*{transition:none!important;animation:none!important}`, force a reflow, and read the resting value, which
  tests the cascade and doubles as the reduced-motion rendering. Screenshot capture also times out in this
  state. Related to, but distinct from, the headless false negatives already recorded for ToggleAll.
- **Diagnostic trap, also worth knowing:** walking `document.styleSheets` and recursing on any rule that has
  a `cssRules` property silently skips every leaf rule, because a modern `CSSStyleRule` exposes an empty
  `cssRules` for CSS nesting. That reported "0 matching rules" for CSS that was present and correct. Test
  `instanceof CSSMediaRule` instead of truthiness of `cssRules`.
- **A11y:** nodes, dots and the advance control are real `<button>`s; focus colour flows through
  `--focus-ring` (accent on nodes/dots/next, `--flag-gold-val` on the goal) with no hardcoded ring; the meter
  states "Step N of M" as real text rather than a `role="progressbar"`; the dossier is an `aria-live="polite"`
  region; `done` carries a check glyph so state is never colour-only; arrow keys are bound on the component
  root so they act only while focus is inside it and never hijack page scrolling.
- **Reduced motion:** every one of the 11 transition/animation declarations sits inside
  `@media (prefers-reduced-motion: no-preference)` (verified programmatically: zero ungated). The JS reads
  `matchMedia` at interaction time, not once at load, so a mid-session change is honoured; under reduce there
  is no runner, no flourish and no smooth scroll, and advancing is a plain static state machine. Verified by
  forcing the branch: state still advanced to step 6 with the runner hidden and no bloom.
- **Verified live, both themes, desktop and 375px:** uniform 18.4px rise; monotonic escalation (layout widths
  132 to 184, font 12.16 to 14.4px, weight 500 to 700); the full walk drives states, meter 0 to 100%, dossier
  and "Compromised" + disabled end state; the final connector draws gold while the rest are accent; the bloom
  fires once on first arrival and does NOT replay on revisit; arrow keys, node clicks and dots all revisit;
  no visible scrollbar with 1511px of path scrolling inside 318px on mobile and no page-level horizontal
  scroll. `npm run build` green (46 pages), no console errors, no new dependencies.
- **Status:** Adopted (working tree; not committed).
- **Partly superseded by:** 2026-07-19 · AttackPath reworked onto the site's native fabric (surfaces, prize
  identity, computed escalation), specifically the surfaces, container background, and goal treatment
  described in the original build, which were reworked off invented values onto the site's own fabric. The
  interaction, geometry and structure recorded here stand, so this entry stays live and is not archived.

### 2026-07-19 · AttackPath reworked onto the site's native fabric (surfaces, prize identity, computed escalation)
- **Supersedes in part:** 2026-07-19 · AttackPath: a guided, data-driven infographic for linear
  privilege-escalation chains, specifically its surfaces, container background and goal treatment, which
  were built on invented values. Its interaction, geometry and structure stand, so it stays live and is not
  archived.
- **Decision:** the AttackPath surfaces are rebuilt entirely from the site's existing design language so it
  reads as a rich REGION of the writeup, distinct only by behaviour, not a foreign widget in a separate
  skin. The approved interaction (guided Next-step, ascending path, escalating nodes, structural
  connectors, runner, one-time gold flourish) and the geometry fix (scale, not translate, for the active
  lift) are unchanged; only the visual fabric changed.
- **What was foreign and what replaced it (each mapped to a real site convention):**
  1. Container background was `--sl-color-black` (dark) and `color-mix(--sl-color-bg 60%, #fff)` (light, a
     glaring near-white). Now `--ap-surface`: the Toggle / FlagCapture panel fabric, a 2% white lift over
     the page on dark and the warm paper panel `#f2ede0` on light, plus the site's own
     `0 4px 14px -12px rgba(60,50,30,0.4)` depth shadow on light. `#f2ede0` and that shadow are the site's
     established panel literals (Toggle and FlagCapture both use them verbatim; there is no token), so
     matching them is reusing the convention, not inventing.
  2. The goal node had a `radial-gradient` gold backdrop. Now a FLAT gold tint derived exactly like
     FlagCapture's frame: `background: color-mix(--flag-gold 6%, --ap-surface)`,
     `border: color-mix(--flag-gold 38%, --ap-line)`, gold TEXT via `--flag-gold-val`. No gradient anywhere
     in the component now.
  3. Node done/active fills and the meter were reworked to `color-mix` derivations off the accent into the
     panel surface (the callout / FlagCapture-hover idiom), giving a tint crescendo active 12% > done 7% >
     future none, with non-colour cues (scale, glow, the check glyph) carrying state alongside colour.
  4. The edge fade-masks faded to `--sl-color-black`. Now they dissolve into `--ap-surface` (the alias
     flips per theme), so "there is more path" reads as content running under the panel edge, not fading
     to black. Made the dark surface a SOLID color (the opaque equivalent of the Toggle's
     `rgba(255,255,255,0.02)` lift) precisely so a fade can dissolve into it cleanly.
- **Accent sourcing, confirmed against the code (not assumed):** the site does NOT platform-scope the
  accent inside a writeup body; `--pf-accent` exists only on `.pf-*` (cards / landings / sidebar), and a
  writeup body's accent is the global `--sl-color-text-accent` (lime). So `var(--pf-accent,
  var(--sl-color-text-accent))` is the honest native mechanism: lime in a normal writeup, and it upgrades
  to a platform hue only if the component is ever dropped inside a `.pf-*` context. Recorded so nobody
  "fixes" it into a hardcoded platform colour.
- **Contrast solved to AA using the site's own legible variants, not one-off hexes (all measured by canvas
  readback, both themes):** dark clears everything comfortably (node name 19.5, active kind 13.2, goal gold
  11.3, Next button 16.1). Light: title 15.2, meter 6.0, done name 10.9, done kind 5.5, goal gold 5.25,
  dossier code 4.9, all AA. The one shortfall was the primary "Next step" label: accent ink on paper is
  only ~4.3:1 as small bold text (the site's `#4d7c0f` runs ~4.1 to 4.3 on paper, recorded in the
  2026-07-13 focus-ring note), so the label was moved to the site's own text-legible accent variant
  `--sl-color-accent-high` (`#2f4d09` light) on light ONLY, lifting it to 8.2:1. That is right beyond
  contrast: the primary CTA should read a step above the ambient accent, and accent-high is exactly the
  site's higher-emphasis accent token. The button also follows the site's accent-button pattern
  (PasswordReveal): TRANSPARENT rest fill, colour + border on the panel, filling only on hover, which is
  itself what keeps the label off an accent-on-accent tint.
- **Escalation is computed from the node count and verified at 4 / 6 / 8 hops (a temporary in-repo test
  harness page, since deleted):** node width (132 to 184px) and type scale/weight (500 to 700) interpolate
  across `--t = index / lastIndex`, so the crescendo is proportional to the chain, not a fixed per-node
  step. The ascent aims for a fixed total climb evenly divided across the hops, then CLAMPS the per-hop
  rise to [12, 30]px, and the spine headroom reads the ACTUAL total (rise * hops). Without the clamp a
  2-node chain climbed the whole total in one hop and pushed the connector curve off the SVG box, and a
  long chain inched up invisibly; with it, a 4-hop chain rises 30/hop and an 8-hop 13.7/hop, both
  monotonic, both with arrowheads landing at dy 0, neither clipped. It stays fully data-driven; no chain is
  hardcoded.
- **Measurement traps recorded (both cost time):** (1) canvas 2D `fillStyle` cannot parse a raw
  `color-mix(... hsl() ...)` custom-property string, so contrast probes must pass a RESOLVED colour
  (read back `getComputedStyle().color` off a throwaway element, which returns `rgb()`/`oklab()` the canvas
  handles), or they silently report garbage (a vivid-lime button read as 2.03:1). (2) JS-toggling
  `data-theme` mid-session while `localStorage['starlight-theme']` holds the other value leaves computed
  styles stale (a dark button reported the light `#2f4d09`); theme contrast must be read after a clean
  reload with the matching localStorage value, which is how it actually ships. Add these to the existing
  hidden-document animation-freeze and CSSStyleRule-nesting traps from the first build.
- **Verified end to end (both themes, desktop + 375px, reduced-motion on and off):** surfaces render as the
  native panel (`#f2ede0` light, subtle lift dark), goal has no gradient, fades dissolve into the surface;
  the guided walk drives states / connectors / meter / dossier then settles calm; arrowheads land at dy 0;
  the one-time bloom fires once and never on revisit; reduced-motion advances as a static state machine
  with no runner or bloom (zero ungated animation declarations); mobile scrolls internally with no page
  overflow and no scrollbar; every checked text pairing is AA. Forest still carries it under Summary with
  the BloodHound graph intact as evidence. `npm run build` green (46 pages), no console errors.
- **Status:** Adopted (working tree; not committed). Component-scoped styles only; no custom.css, config,
  or dependency changes.

### 2026-07-19 · `.machine-meta` deleted; the REST of the badge family is not dead (corrects the entry below)
- **Decision:** the `.machine-meta` rule is removed from `custom.css` and its `machine-` family from
  `plugins/remark-validate-content-taxonomy.mjs`. Nothing else in the badge taxonomy is touched.
- **Correction, and the load-bearing finding:** the entry below (and the ROADMAP item it spawned) claimed the
  whole `.meta-badge` / `.platform-*` / `.difficulty-*` / `.os-*` family had gone dead with the Bandit
  migration. That is FALSE, and true only of HAND-AUTHORED MDX. `WriteupCard.astro` still emits `meta-badge`,
  `difficulty-*`, `os-*` and (behind `showPlatform`) `platform-*`, and `PlatformIndex` renders those cards on
  every `{platform}/index.mdx`, so deleting that CSS would have stripped the badges off every writeup card on
  all four platform landing pages, including the HackTheBox one that prompted the check.
- **What caught it:** checking `dist`, the shipped artifact, instead of `src/content/docs` alone. A page's own
  MDX authoring no more the whole story than a component's output. Exact class-token counts in `dist`:
  `meta-badge` 6, `difficulty-easy` 2, `difficulty-medium` 1, `os-linux` 1, `os-windows` 2, `machine-meta` 0.
  Only the last is genuinely unreferenced.
- **Property to know (measurement trap):** a naive `\bos-linux\b` grep over `dist` reports 36, because the
  `-` is a non-word character so the pattern also matches INSIDE WriteupMeta's own `wm-os-linux`. The class
  token has to be anchored on a quote or whitespace or the old and new badge systems are indistinguishable.
  The 36 vs 1 gap is what exposed it.
- **`platform-*` is kept although it renders 0 times today:** it is the `showPlatform` path, reserved for the
  planned global `/writeups` index (CORE_SPEC §6). Unused-but-wired is not dead.
- **The guard's remaining families are kept too:** the guard only ever sees hand-authored MDX, so they match
  nothing today, but they cost nothing and still catch a typo in any badge a future writeup hand-authors.
  Only `machine-`, whose sole token is now unstyled everywhere, is removed. This narrows, and partly reverses,
  the retirement note left in the 2026-07-12 guard entry, which assumed all five families would go together.
- **Two stale docs corrected in passing:** `src/content.config.ts` said OS "lives in each writeup's body
  `.machine-meta` badge row, NOT frontmatter, so these stay undefined". Both halves were wrong: the row is
  gone, and three writeups (busqueda, return, forest) DO set `os:` in frontmatter, which is exactly the 1
  `os-linux` plus 2 `os-windows` badges rendering. `CLAUDE.md` still instructed authors to hand-write a
  `<div class="machine-meta">` row and now documents the WriteupMeta usage instead, including that
  `difficulty` is optional.
- **Verified:** `npm run build` green (46 pages); zero `machine-meta` in `src` and in `dist`; the landing-page
  cards still render their difficulty and OS badges with styling intact in both themes.
- **Status:** Adopted.

### 2026-07-19 · WriteupMeta difficulty becomes optional; Bandit's 34 pages migrate off `.machine-meta` (retiring it site-wide)
- **Decision:** `difficulty` is now the ONE optional prop on `WriteupMeta` (`difficulty?: Difficulty`), and
  when it is absent the Difficulty chip does not render at all. All 34 OverTheWire Bandit pages (33 level
  pages plus `bandit-finale.mdx`) drop their hand-authored `.machine-meta` badge row for
  `<WriteupMeta platform="OverTheWire" os="Linux" environment="Progressive" />`.
- **Why optional, rather than picking a value:** the task was specced as a badge-row swap only, but the old
  Bandit row carries exactly two axes (platform + OS) while `WriteupMeta` required four. `Difficulty` is
  `Easy | Medium | Hard | Insane` with no honest "none" member, and a progressive wargame has no difficulty
  rating, so ANY available value would have been invented metadata on 34 published pages. It is also an
  EVALUATIVE axis that announces "Difficulty N of 4" to screen readers, so a blanket value would be a spoken
  falsehood, and Bandit genuinely ramps (0 to 1 is trivial, 32 to 33 is not), so one value is wrong at both
  ends. Optionality is the same recognition that already put `Progressive` in the Environment union: a
  wargame is a different SHAPE, not a machine with a missing field. Owner chose this over grading all 34
  levels by hand and over leaving Bandit on `.machine-meta`.
- **Required-ness was measured, not inferred:** a throwaway probe page passing only platform/os/environment
  failed the build with `WriteupMeta: unknown difficulty "undefined". Expected one of: Easy, Medium, Hard,
  Insane.` **Property to know:** the remark taxonomy guard validates only attributes that are PRESENT, so a
  missing `difficulty` passes it silently and detonates later at render. The component's runtime guard is
  the only gate on absence, and it reports at render time, not with a source position.
- **The typo guard is preserved:** `difficulty` joins the validation loop only when supplied, so an absent
  value is a deliberate omission while a present one is still checked and `difficulty="Hardd"` still fails
  the build. It is never given a fallback: substituting a rating is the precise thing the omission exists to
  prevent.
- **No CSS change was needed (checked, not assumed):** `.wm-diff` is a self-contained `inline-flex` with no
  sibling selector, `:has()`, or `margin-inline: auto` dependency, and `.writeup-meta`'s `gap: 1rem` has no
  effect with a single remaining child. Verified live: the row has exactly one child, `.wm-nav` sits flush
  to the row's left edge, and the 0.55rem / 2.1rem vertical rhythm is unchanged.
- **Mixed line endings in the content tree (property to know):** 33 Bandit files are CRLF and 2 (`0-1.mdx`,
  `10-11.mdx`) are LF, so an LF-anchored match silently matched only those 2 on the first pass. The
  migration normalises per file and restores each file's OWN ending on write, so the diff is the content
  change alone with zero line-ending churn (confirmed still 33 CRLF / 2 LF afterwards). Any future bulk
  content edit on this tree must do the same.
- **`.machine-meta` is now retired site-wide:** with Bandit migrated, the class no longer appears anywhere in
  `src/content/docs`, completing the page-by-page retirement planned on 2026-07-11. This FIRES the trigger
  recorded in the 2026-07-12 taxonomy-guard entry and parked in ROADMAP: the guard's `meta-` / `platform-` /
  `difficulty-` / `os-` / `machine-` allow-lists and the `.machine-meta` / `.meta-badge` / `.platform-*` /
  `.difficulty-*` / `.os-*` CSS are now dead. Deliberately NOT removed here (out of this task's scope, and a
  separate blast radius); flagged as follow-up work. **CORRECTED same day (see the entry above): only
  `.machine-meta` was dead.** `WriteupCard` still emits the other four families on the platform landing
  pages, so they were kept; only the `machine-` family and its CSS rule were removed. Note this also moots `.platform-overthewire` in the
  ROADMAP light-AA amber bug, since that selector now styles nothing.
- **Verified live (both themes) and in `dist`:** Bandit renders exactly three chips reading "OverTheWire
  Linux Progressive", with no Difficulty chip, no pips, and no `sr-only` remnant. Dark `#ffc23d` / `#ffa95d`
  / `#3fd9a8`, light `#794e00` / `#6b3900` / `#006345`, all byte-identical to the AA-solved palette. This is
  the first time the 2026-07-17 Linux-vs-OverTheWire amber separation renders on the real Bandit row it was
  designed for, and the two ambers read distinct in both themes. Regression checked on busqueda: still
  "Easy" at `data-level="1"`, leading pip grown to 6px, "Difficulty 1 of 4" text equivalent intact. In
  `dist`: 0 of 34 Bandit pages carry `machine-meta` or `wm-diff`, 34 carry the Progressive chip, busqueda
  keeps its Difficulty chip. `npm run build` green (46 pages), no console errors, no horizontal overflow.
- **Status:** Adopted (working tree; NOT committed). Component + content only: no CSS, no config, no new
  deps, pinned versions unchanged.

### 2026-07-17 · Linux OS badge separated from OverTheWire (H60 re-hue + L0.40 deepen)
- **Decision:** `wm-os-linux` gets its own hue in both themes, distinct from `pf-otw`. Dark `#f0b429` ->
  `#ffa95d`, light `#794e00` -> `#6b3900`. `pf-otw` and every other amber in the file are untouched.
  Committed as `3de625a` (not pushed).
- **Why they collided:** the light palette pass (entry below) drove BOTH the OTW platform chip and the
  Linux OS chip to the same `#794e00`, because both are amber and light's AA floor had pinned both to the
  same lightness. On a Bandit row (`OverTheWire | Linux | Progressive`) the platform and OS chips then read
  as one colour on paper; on dark they differed only by lightness.
- **Why H60:** it is Tux's OWN family. His beak and feet in `linux.svg` are `#FFA63F` (H65.6) and `#E68C3F`
  (H57.9); the old dark `#f0b429` was H82.5, a generic yellow-gold that never matched the penguin it labels.
  One hue at two lightnesses, not a different identity per theme.
- **Why deepen light to L0.40 (the load-bearing correction):** re-hue alone bought only dEOK 0.022 from OTW
  on light, which did NOT read at real chip size. The cause is axis count: dark separates on TWO axes (hue
  AND lightness, OTW L0.85 vs Linux L0.80, plus ~60% more chroma) and reads clearly at dEOK 0.073; light had
  matched lightness, leaving hue alone to work at low chroma. AA is a FLOOR not a target, so Linux can go
  darker freely and darker only raises contrast (4.85 -> 6.13). Dropping light to OKLCH L0.40 restores the
  second axis: dEOK 0.065, which reads. Held at L0.40 without chasing past dark's 0.073 (exceeding it would
  be its own inconsistency).
- **Finding (counter to the amber-cannot-be-ink note in the palette entry):** the amber slot CAN carry two
  identities on paper, but only when it separates on lightness as well as hue. A single-axis (hue-only)
  separation at low chroma does not read.
- **Tux is unmoved:** the Linux mark is a polychrome `<img>` (native fills), not tinted by `--wm-c`, so the
  token change moves the chip's label/border/fill/glow but not the penguin. Confirmed live.
- **Verified live (canvas readback, both themes):** Linux light 6.10, dark 8.30; OTW unchanged 4.80 / 9.56;
  separation light 0.065, dark 0.073; both chips read distinct at real chip size. `npm run build` green (46
  pages). custom.css only, no new deps.
- **Status:** Adopted; committed as `3de625a` to `dev` (not pushed). **CORRECTED 2026-07-17 (push):** rebased to `d7b1550` and pushed when the busquedav2 testbed commit was dropped; shipped to main via PR #16 (see 2026-07-17 · busquedav2 testbed dropped before push; badge commits rebased + pushed; merged to main (PR #16), now in DECISIONS-ARCHIVE).

### 2026-07-17 · Badge light-mode label palette solved to WCAG AA in OKLCH
- **Decision:** the nine WriteupMeta light `--wm-c` values are re-solved so each 12px/600 chip label clears
  WCAG AA (4.5:1) on its own composited fill. Eight changed; Active Directory already passed (4.85) and is
  untouched. Every DARK value is byte-identical (this is a light-only pass). Committed as `4325533` (not
  pushed); the Linux value is then re-hued off the shared amber by the entry above.
- **Why:** the light values were eyeballed and eight failed AA (2.97 to 4.85:1, measured live). Every chip
  derives label, icon, border, fill and glow from ONE `--wm-c`, so the label cannot be darkened in isolation,
  but the fill is only 15% identity over 85% paper, so darkening `--wm-c` barely moves the fill (2 to 7 RGB
  points per channel) while lifting the label clear. There is NO separate `-ink` token and none was added:
  unlike `--flag-gold` (which paints decoration and text at once, needing two values), all six things
  `--wm-c` drives want to move together.
- **Method:** solve in OKLCH holding HUE, dropping LIGHTNESS only, targeting ~4.8 for antialiasing margin.
  Hold CHROMA where sRGB allows, clamp to the gamut boundary only where the hue cannot carry it at the
  required lightness. A value reaching AA by desaturating to gray would defeat the badge, so hue is never
  shifted; the chroma kept is recorded per line in `custom.css`. This is the §6 "chroma not contrast" lesson
  run in reverse: fix contrast with L, never by desaturating the hue.
- **Amber is the structural worst case (recorded finding):** amber's sRGB gamut collapses as it darkens (a
  saturated dark amber does not exist, it browns), so OTW/Linux keep only ~79% chroma at AA, versus 88 to
  100% for the reds/greens/blues/violets. Physics, not a solver limit. The ~21% loss is the price of AA (4.5)
  itself; the ~4.8 margin costs only ~3 more chroma points.
- **Light `--wm-glow` deleted, not synced:** the light box-shadows read `--wm-c` directly, so a light
  `--wm-glow` never rendered. The DARK `pf-htb --wm-glow` (`#9fef00`) stays because the dark glow DOES read
  it (it holds HTB's true brand green while the label carries palette lime), a distinction that only reads on
  dark. Keeping a dead line in sync would teach the next reader it is load-bearing, so it is removed.
- **Measurement discipline:** contrast was measured by CANVAS READBACK (the browser's own oklab -> sRGB and
  alpha compositing), not by string-parsing `getComputedStyle`. This browser returns `color-mix(in oklab,
  ...)` as an `oklab(...)` string, so a naive number-regex reads the oklab coordinates as RGB and reports
  fills ~0.5 too dark. The canvas method is authoritative and matched the offline OKLCH solver to 0.01 on all
  nine values (two-method agreement, the same discipline as the icon pass).
- **Deliberately NOT touched:** the seven-way `#a86f04` collision across the file (OTW, Linux,
  `.platform-overthewire`, `.pf-overthewire`, the sidebar focus ring, the spoiler toggle, PasswordReveal)
  stays FORKED. Those are semantically unrelated ambers that coincided on a hex, never a shared token;
  consolidating would have dragged the spoiler toggle and PasswordReveal along. The five NON-badge ambers are
  unaudited for light AA (see ROADMAP).
- **Verified live (canvas, both themes):** every light label 4.80 to 4.90, every dark 5.66 to 12.01; backdrop
  `#ece9e0`, no card; every dark value byte-identical (confirmed by diff). `npm run build` green (46 pages).
- **Status:** Adopted; committed as `4325533` to `dev` (not pushed). **CORRECTED 2026-07-17 (push):** rebased to `1fcf53e` and pushed when the busquedav2 testbed commit was dropped; shipped to main via PR #16 (see 2026-07-17 · busquedav2 testbed dropped before push; badge commits rebased + pushed; merged to main (PR #16), now in DECISIONS-ARCHIVE). custom.css only.

### 2026-07-17 · Badge glyphs normalized to a 14px grid; HackTheBox to currentColor; polychrome/monochrome sourcing axis
- **Supersedes in part:** 2026-07-11 · Badge icon sourcing: split by consumption mechanism, specifically its
  "logo vs glyph" sourcing axis and its public-copy rationale. That entry's consumption-mechanism split
  stands, so it stays live and is not archived.
- **Decision:** the WriteupMeta glyph set is normalized so every icon's larger ink dimension renders at ~14px
  in the 15px `.wm-ico` box, and HackTheBox moves from a native-colour `<img>` to an inline `currentColor`
  glyph. Geometry and colour plumbing only, never artwork (Standalone and Active Directory are slated for a
  later redraw onto this grid). Committed as `bdb06c4` (not pushed).
- **The spread was internal padding, not CSS:** nine glyphs shared one 15px box but rendered across a 2.40x
  spread (HackTheBox ~6px tall to Windows 15px). Cause was per-file padding inside each `viewBox`, measured by
  rasterizing each glyph alone at high resolution and taking its ALPHA bounding box (cross-checked in librsvg
  via `sharp` and in Blink, agreeing to 0.001x; a disc icon measuring 78.1% against pi/4 = 78.54% validated
  the rig). Only the two outliers changed; the other seven already clustered within 1.14x. New spread ~1.14x
  (excluding Standalone, on the redraw list).
- **HackTheBox is the one monochrome platform mark:** a single path with a single fill, so it is inlined and
  tints from `--wm-c` in both themes. On dark it lands within a hair of its brand `#9fef00`; on paper it
  becomes the deep lime ink instead of a 1.20:1 ghost, and it inherits the light-ink tier for free. Its
  `viewBox` was squared (was `0 0 1024 791.27` with no width/height, so `object-fit: contain` letterboxed it,
  forfeiting 23% of the box). Its `<style>` block, `.st0` class and `id="Layer_1"` were dropped: an inlined
  SVG's `<style>` and ids are DOCUMENT-scoped, and those Illustrator defaults would collide with the next
  Illustrator export inlined the same way.
- **Sourcing axis redrawn, polychrome vs monochrome (supersedes "logo vs glyph"):** POLYCHROME marks
  (VulnHub, PicoCTF, OverTheWire, Linux) stay native-colour `<img>` from hashed `?url` imports (currentColor
  would flatten their 3 to 16 fills). MONOCHROME marks (HackTheBox, Windows, Active Directory, Progressive,
  Standalone) inline via `?raw` + `set:html` and tint from `--wm-c`. HackTheBox was only in the native-colour
  group because it was a logo, never because native colour was right for it.
- **Linux disc:** `linux.svg` carried a full-bleed white circle-as-path behind Tux that defined its bounding
  box (28x28 vs Tux's 16x20). Deleted FIRST (so measurement sizes Tux, not the disc), then the `viewBox`
  retightened around Tux; he stays full colour with his belly/eyes/beak intact.
- **`public/icons` correction (the docs were wrong):** the `public/icons` platform copies do NOT serve the
  sidebar (its logo CSS is commented out; the sidebar uses colored dots). Their real consumers are
  `PlatformIndex.astro` and `about.astro`, which reference `/icons/*.svg` by literal path.
  `public/icons/htb.svg` therefore now deliberately DIVERGES from `src/assets/icons/htb.svg`: the src copy is
  a monochrome chip glyph, the public copy is the untouched brand mark on marketing surfaces. The former
  byte-identity was coincidental. `public/` was not touched by this pass. This supersedes the "forced
  public/icons copy for the CSS sidebar backgrounds" claim in the earlier "Badge icon sourcing" section below.
- **Accessibility (folded in):** `progressive.svg` carried `<title>1050</title>` (a real SVG accessible name,
  announced) and `active-directory.svg` a `<metadata>` RDF block (not an a11y defect, but it polluted the
  chip's textContent). Both are handled: `<title>` stripped; every inline glyph now carries
  `aria-hidden="true"` (so each chip's accessible name is exactly its label); the AD `<metadata>` is KEPT
  (creator credit, Amido Limited / Richard Slater, verified CC0-1.0 upstream, so provenance not obligation)
  because it does not enter the accessibility tree and a shipped credit satisfies CC0/CC-BY alike. An
  `icons.ts` build-time `inline()` normalizer strips comments, inter-element whitespace and the XML prolog
  from inlined glyphs (an `<?xml?>` prolog becomes a bogus comment node in an HTML document). **Property to
  know:** the normalizer strips comments, so a comment is no longer a safe home for load-bearing text, which
  is exactly why the credit lives in `<metadata>`.
- **Verified live (both themes):** all nine glyphs within ~1.14x; HackTheBox icon and label compute identical
  in both themes; no disc behind Tux and his light regions survive; no `.st0` leaked globally; every chip's
  textContent is exactly its label. `npm run build` green (46 pages). No new deps.
- **Status:** Adopted; committed as `bdb06c4` to `dev` (not pushed). **CORRECTED 2026-07-17 (push):** rebased to `304c97e` and pushed when the busquedav2 testbed commit was dropped; shipped to main via PR #16 (see 2026-07-17 · busquedav2 testbed dropped before push; badge commits rebased + pushed; merged to main (PR #16), now in DECISIONS-ARCHIVE).

### 2026-07-17 · Code-block focus ring wraps the whole EC frame, not just the `<pre>`
- **Decision:** two add-only rules in `custom.css` (right after the sharp-frame radius block): the ring is
  suppressed on `.expressive-code .frame > pre:focus-visible` and drawn instead on
  `.expressive-code .frame:has(> pre:focus-visible)` at the shared geometry (`2px solid var(--focus-ring)`,
  `outline-offset: 2px`). Only WHICH element is ringed changes; the color and geometry are the shared
  system's. The shared `:where(...)` rule is untouched (its zero specificity is exactly what let a
  `pre:focus-visible` selector override it cleanly).
- **Why (measured, not assumed):** EC core ships a "Scrollable block tabindex" JS module that sets
  `tabindex="0"` + `role="region"` on a `<pre>` whose content overflows, which is what makes a wide
  unwrapped block keyboard-scrollable. That tabindex is what the shared `:where(..., [tabindex])` rule
  matches, so the ring landed on the PRE. But the pre is only the LOWER half of the frame:
  `figcaption.header` (the language tab) is a SIBLING above it, not a parent. So the ring excluded the tab,
  and worse, its top edge landed exactly 2px inside the header's box (precisely the shared outline-offset)
  where it was painted over: the header is `position: relative; z-index: 1` against a static `pre`, so it
  paints later. Confirmed live: `elementFromPoint` at the ring's top edge returned `FIGCAPTION.header`, the
  overlap measured exactly 2px, and `.title` carries an opaque `rgb(22,22,30)` background, so under the tab
  the edge vanished completely. `figure.frame` was the right target because its border box already spans
  header plus pre exactly (same top as the header, same bottom as the pre, verified).
- **`:has()` not `:focus-within`:** `:focus-within` also fires on pointer clicks. `:has(> pre:focus-visible)`
  is the precise form and keeps the keyboard-only contract.
- **Premise correction, not a supersession:** the claim was wrong when written, so 2026-07-13 · Site-wide
  focus-ring token (--focus-ring) on content pages: one color, identity where it exists, lime default carries
  a CORRECTED note rather than a partial-supersession marker. It recorded "Code blocks
  have no `tabindex`, so they are untouched." That is FALSE. It is true of the static HTML and true if the
  DOM is inspected too early, which is how it was missed: EC's module runs on a 250ms-debounced
  ResizeObserver plus `requestIdleCallback`, so the attribute appears after load and re-evaluates on resize.
  Measured on busqueda: 3 focusable pres one moment, 0 the next, and 16 of 16 once settled with the toggles
  open. Any future audit of this must WAIT for the observer to settle before counting.
- **Known behavior, deliberately not "fixed":** clicking a wide code block shows the ring. Chromium matches
  `:focus-visible` on a keyboard-scrollable region even for pointer focus (arrow keys scroll it, so
  indicating focus is correct). Proven pre-existing by reconstructing the old rules against the same
  pointer-focus state: the pre rang on click before this change too. This change relocates a ring, it does
  not add one.
- **Verified (real browser, real Tab, both themes):** `:focus-visible` true on the pre, `outline-style: none`
  on the pre, and the ring on the figure (`#b6ff3c` dark / `#4d7c0f` light). The ring now sits ABOVE the tab
  (clearance 1.6px at dpr 1.25, was 2px INSIDE it) and `RING_WRAPS_WHOLE_FRAME` is true, with symmetric
  deltas on all four sides. No ancestor clips it and the frame radius is 0, so the ring stays square like
  the frame. Both rules survive minification in `dist`. `npm run build` green (45 pages).
- **Status:** Adopted. CSS-only, additive, `custom.css` only. No new deps, pinned versions unchanged.

### 2026-07-17 · Toggle focus ring aligns to its tab (re-pairs Starlight's orphaned summary margin)
- **Decision:** the base `.sl-markdown-content details > summary` rule changes `padding: 0.3rem 0` to
  `padding-block: 0.3rem` plus a re-declared `margin-inline` / `padding-inline` pair, inset by the card's own
  padding difference (`calc(0.75rem - 0.4rem)` = 5.6px), plus `border-radius: 4px`. Applies to EVERY content
  toggle. The ring COLOR is unchanged (still the inherited lime default; the amber identity question stays
  deferred), and the shared `:where(...)` rule is untouched.
- **Why:** Starlight's `markdown.css` ships a MATCHED pair on every content summary,
  `margin-inline-start: -0.5rem` + `padding-inline-start: 0.5rem`, commented upstream as "Expand the outline
  so that the marker cannot distort it": the padding grows the border box leftward so the outline encloses
  the negatively-margined `::before` marker, and the margin cancels the layout shift. Our unlayered
  `padding: 0.3rem 0` beat that layer and zeroed the padding half while declaring NO margin, so the `-0.5rem`
  survived ORPHANED (`starlight.content` outranks `starlight.reset`'s `* { margin: 0 }`, and a rule that
  never mentions margin cannot compete). Net: every summary's border box, and its label with it, sat 8px LEFT
  of the card's content box while the right edge stayed flush. Measured deltas to the card's border box:
  left 3, right 11, against top/bottom 5.4.
- **Why this inset (and the constraint it creates):** 5.6px makes the summary's border box sit the same
  distance inside the card horizontally as it already does vertically, so all four ring deltas are EQUAL
  (5.4px at dpr 1 = 1px card border + 6.4px card block padding - 2px outline-offset) with NO
  `outline-offset` override anywhere. The equality is the invariant; the absolute number moves on
  fractional-dpr displays because the 1px border and 2px ring both snap to device pixels (5.2px at dpr 1.25).
  **This inset is derived from the card's padding, so changing `.sl-markdown-content details`'s padding means
  changing it too.**
- **Second latent bug fixed (owner-approved, visible):** the orphan dragged the summary's CONTENT, not just
  its border box, so every toggle label sat 8px left of where Starlight intends. Restoring the pair moves each
  label 8px right, onto the card's content box, where it now aligns with the `.toggle-body` text below it
  (measured 28.8 vs 28.8; it previously sat 5.6px left of it). Treated as a fix, not a regression.
- **Scope correction (the reason this took two commits):** the first pass (`0fc1864`) was scoped to
  `.spoiler-toggle` and fixed 1 of 27 toggles, because the brief fenced the base rule on the premise that the
  defect was spoiler-specific. It never was: the orphan is CREATED by the base rule, so all 27 were broken.
  The owner spotted a still-misaligned plain toggle on busqueda; `34417ee` moved the pair to the base rule and
  deleted the now-redundant `.spoiler-toggle` geometry rule (a net simplification: one rule for every toggle
  instead of one for an exception). **Lesson recorded: when a cause is traced to a SHARED rule, the blast
  radius is every consumer of that rule, and the report must say so even if the brief scopes the fix
  narrower.**
- **Premise correction, not a supersession:** the conclusion was wrong when written, so 2026-07-13 · Focus
  ring extended to TOC entries + prose links; spoiler-toggle already correct; light flag gold strengthened
  carries a CORRECTED note rather than a partial-supersession marker. It concluded the spoiler-toggle
  "ALREADY rings the lime default ... which is exactly the requested end state. NO change was needed or made."
  That was true of the ring's COLOR only. Its GEOMETRY was wrong the whole time (8px off-center), which a
  color-only check could not see.
- **Verified (real browser, both themes, closed and open):** all 27 toggles across the 5 pages that use them
  are now symmetric (was 1 of 27; 0 of 13 on busqueda). Every toggle reports identical deltas. A real mouse
  click leaves `:focus-visible` false with `outline-style: none`. The ring stays on the tab when open and
  clears the revealed body by 14px. The `[open]` padding-bottom tightening still wins on specificity
  (4.8px to 2.4px) and leaves the ring top identical, so it reintroduces no vertical shift. The spoiler
  toggle's amber border logic is untouched. `npm run build` green (45 pages).
- **Status:** Adopted; committed as `0fc1864` then `34417ee`. CSS-only, `custom.css` only.

### 2026-07-17 · ToggleAll keeps its cyan ring, routed through `--focus-ring` (resolves the ROADMAP item)
- **Decision:** `ToggleAll.astro`'s scoped style drops its hardcoded
  `outline: 2px solid color-mix(in oklab, var(--pf-accent-2) 60%, transparent)` and sets
  `--focus-ring: var(--pf-accent-2)` instead, letting the shared rule paint it at the standard 2px / 2px
  offset. Its cyan hover/focus color, border and background wash are KEPT (that is its hover design).
- **Why cyan was kept rather than dropped to lime:** the ROADMAP item posed this as a question ("decide first
  whether the cyan ring was deliberate"). It is: `--pf-accent-2` cyan IS this control's identity, the same
  color its hover state, border and wash already read, so under the system's own rule (identity elements ring
  in what they already express) it qualifies exactly like `WriteupCard` or the reveals. The 2026-07-13 note
  calling ToggleAll a "non-identity control that should ring lime" is superseded. `--pf-accent-2` is already
  theme-aware (`:root` maps it to `--tp-cyan`, the light block to `--tp-cyan-ink`), so one declaration covers
  both themes with no light variant. A custom property set directly on the element wins over `:root`
  inheritance regardless of Astro's `:where()` scoping.
- **Net:** no ring color is hardcoded anywhere on content pages; every content-page ring now flows through
  `--focus-ring`. The marketing pages remain outside the token by decision (still a ROADMAP item).
- **Status:** Adopted; committed as `c0171f3`. Resolves the "[ENG] Fold ToggleAll's hardcoded cyan focus ring
  into --focus-ring" ROADMAP item, which is removed from ROADMAP.

### 2026-07-17 · Gate landing-page stat count-up under prefers-reduced-motion
- **Decision:** In `src/pages/index.astro`, `countUp` short-circuits when `prefers-reduced-motion: reduce`
  is set, rendering each stat's final value (4, 50+, and the infinity stat) with no numeric animation.
  Non-reduced-motion behavior is unchanged.
- **Why:** "prefers-reduced-motion respected" is a standing project rule, and the count-up previously
  animated regardless, so this closes an existing gap. Safe because the resting HTML already holds the
  final values (see the flash-fix entry below).
- **Status:** Adopted, verified in-browser (was recorded as uncommitted). **This decision and the resting-HTML
  entry below shipped TOGETHER, in one commit:** `fix: homepage stats render real values without JS and
  respect reduced motion` (2026-07-17), which carries both the reduced-motion gate and the resting values.
  They are recorded as two entries because they are two decisions, not because they were two changes.

### 2026-07-17 · Landing stats: resting HTML holds final values, no flash
- **Decision:** The three stat elements render their final values (4, 50+, and the infinity stat) as
  resting HTML, and `countUp` writes the '0' start value synchronously (not in the first
  `requestAnimationFrame`) so the final value is never painted while `.reveal` is at opacity 0.
- **Why:** No-JS visitors, social/OG crawlers, and non-executing search engines now see the real numbers
  instead of 0, and there is no one-frame flash of the final value before the count-up begins.
- **Status:** Adopted, verified in-browser (was recorded as uncommitted). Shipped in the SAME single commit as
  the reduced-motion gate above, `fix: homepage stats render real values without JS and respect reduced
  motion` (2026-07-17), not as a separate change.

### 2026-07-13 · Homepage hero subline is NOT screen-reader fragmented (investigated, no change made)
- **Finding:** the reported fragmentation of the homepage hero subline does not exist. The subline is plain
  semantic markup, `<p class="sub reveal">` containing one `<b>Recon to root</b>` between two text nodes.
  Verified in the browser: NO per-word or per-character spans (`hasSpans: 0`, the decode/scramble animation
  is on the `<h1>`, not the subline), NO `<br>`, no decorative wrappers, and no pre-existing
  `aria-label` / `aria-hidden`. `<b>` carries no ARIA role (implicit generic) and is inline, so it creates
  no boundary: the paragraph's announced text is already the full, coherent sentence ("A living lab notebook
  of machine walkthroughs and capture-the-flag solutions. Recon to root, documented in full, including the
  dead ends that taught me the most."). NO CHANGE MADE.
- **Where the "ref_8/ref_9 fragments" came from:** the accessibility-tree DUMP, not the page. The tree
  serializer lists a child element's text as its own node, so the parent prints with a gap where the `<b>`
  was: `"...solutions. , documented in full, "` (ref_8) plus `"Recon to root"` (ref_9). That is a rendering
  artifact of the tool, not what a screen reader announces.
- **Why the prescribed fix was NOT applied (it would have caused the defect it was meant to cure):**
  `aria-label` on a `<p>` is invalid, role=paragraph is in ARIA's name-prohibited list, so screen readers
  ignore it. And `aria-hidden="true"` on the inner `<b>` would REMOVE "Recon to root" from the accessible
  text, making the subline actually announce as `"...solutions. , documented in full, ..."`, which is
  precisely the broken ref_8 string. The artifact and the proposed-fix outcome are the same string.
- **Note (unrelated, unchanged):** the `.reveal` scroll-reveal animates `opacity`, which does not remove
  content from the accessibility tree (unlike `display:none` / `visibility:hidden`), so the subline is
  exposed throughout. Untouched.
- **Status:** Investigated, closed with no code change. Recorded so it is not re-litigated.

### 2026-07-13 · Focus ring extended to TOC entries + prose links; spoiler-toggle already correct; light flag gold strengthened
- **Decision:** `--focus-ring` now also carries the TOC's heading-ladder identity and the prose-link cyan.
  Set per element only: no new outline rules, no new colors, every ring still drawn by the shared
  zero-specificity `:where(...):focus-visible` rule.
  - **TOC entries** ring in the hue of the heading they point to, on BOTH the desktop
    `.right-sidebar-panel` and the `mobile-starlight-toc` dropdown: flags `--flag-gold`, h3 `--tp-cyan` /
    `--tp-cyan-ink`, h2 (and h4+) the lime default, which already equals the green h2 takes when current
    (`--sl-color-text-accent`). Keyed off the heading the entry POINTS TO (slug for flags, the nesting
    chain on desktop, inline `--depth: 1` on mobile) and deliberately WITHOUT the `aria-current` condition
    the color rules use, so the ring is right whether or not the entry is the active section. Flags are
    excluded from the h3 rule exactly as in the color rules, so they never ring cyan.
  - **In-prose links** ring cyan: `--focus-ring` added to the existing
    `.sl-markdown-content a:not(:where(.not-content *))` rule and its light variant, reusing the same
    `--tp-cyan` / `--tp-cyan-ink` pair the link color already uses. The `.not-content` guard means
    component links keep their own token (verified: WriteupCard still rings `--pf-accent`, not cyan).
- **Premise corrections (checked against source before editing):**
  - **The spoiler-toggle has no green focus ring, and no focus rule at all.** Its block defines only
    `--spoiler-color` (amber), the border, and the summary color; there is no hardcoded ring to remove. It
    ALREADY rings the lime default through the shared rule (measured `#b6ff3c` dark / `#4d7c0f` light, with
    the amber staying text/border only), which is exactly the requested end state. The "green" is most
    likely the light lime `#4d7c0f`, which reads as an olive green. NO change was needed or made.
    **CORRECTED 2026-07-17:** true of the ring's COLOR only. Its GEOMETRY was wrong at the time of this
    entry and stayed wrong: an orphaned Starlight `margin-inline-start` threw the ring 8px off-center, on
    this toggle and on all 26 others. A color-only check could not see it. See the 2026-07-17
    toggle-alignment entry.
  - **`ToggleAll.astro` hardcodes a cyan ring** (`outline: 2px solid color-mix(in oklab,
    var(--pf-accent-2) 60%, transparent)`), a component-level rule the token pass below missed (it grepped
    `src/styles/*.css`, not components). It is the one element still bypassing `--focus-ring`, and it
    contradicts that pass's own "ToggleAll stays lime" note. Left as-is (outside this pass); see ROADMAP.
- **Legibility, measured not assumed** (ring vs its own effective background): dark is strong across the
  board (flag gold 12.39:1, h3 cyan 14.27:1, h2 lime 16.49:1, prose cyan 14.27:1). Light: cyan 5.22:1 and
  lime 4.11:1 are fine, but the decorative `--flag-gold` (`#C6A243`) rings at only **2.00:1** on the paper
  TOC, under the 3:1 a non-text indicator wants. Per the convention (keep the identity, never fall back to
  lime), the flag ring reads the AA-grade **`--flag-gold-val`** instead: on dark that token IS `#ffc23d`,
  so dark is byte-identical (12.39:1, unchanged), while on paper it is the deeper antique `#7a5a12` and
  measures **5.24:1**, in line with the cyan. That fixes the contrast RATIO rather than thickening a faint
  line, so every ring stays a uniform 2px and no width override exists anywhere. Both flag slugs use the
  one value-gold, matching the TOC color rules, which likewise do not tier user vs root. (An interim
  light-only `outline-width: 3px` was tried first and removed in favour of this: width raises
  perceivability but not the ratio.)
- **Verified (real browser, keyboard, both themes, desktop 1280 + mobile 375):** desktop and mobile TOC each
  ring flag gold / h3 cyan / h2 lime, every measured entry with `aria-current` ABSENT (proving the ring does
  not depend on active state); prose links ring cyan; the spoiler-toggle rings lime (not amber, not green);
  WriteupCard still rings `--pf-accent`; on a fresh load, pointer/plain focus gives `:focus-visible` false
  and `outline: none`, so nothing rings on mouse click. `npm run build` green (45 pages).
- **Status:** Adopted; committed to `dev` (not pushed). CSS-only, additive, `custom.css` only.

### 2026-07-13 · Site-wide focus-ring token (--focus-ring) on content pages: one color, identity where it exists, lime default
- **Decision:** A single `--focus-ring` custom property now drives every keyboard focus-ring COLOR on
  Starlight CONTENT pages (`custom.css`). Default is the theme-aware site accent
  `var(--sl-color-text-accent)` (lime `#b6ff3c` dark / `#4d7c0f` light). A zero-specificity shared base
  rule draws the rectangular ring: `:where(a, button, [role="button"], input, select, textarea, summary,
  [tabindex]):focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px }`. Identity
  elements set `--focus-ring` to their own accent so the ring echoes what they already express: platform
  cards (`--pf-accent`), the four platform sidebar groups (positional nth-child, theme-aware), the
  flag/password reveals (gold/amber), and the badge chips (`--wm-c`, an inert hook for the WriteupMeta
  rollout). Everything else inherits lime. `:focus-visible` only (keyboard), never on mouse click.
  Additive, no component fork, no Starlight fork, no new deps.
- **Premise corrections (the task assumed a different codebase; checked against source before building):**
  - FlagCapture/PasswordReveal were said to ring via `box-shadow`; they actually ring via `outline`
    (box-shadow is none) and are `border-radius: 6px`, so the outline already follows their corners in
    current engines. Kept them as OUTLINE (no conversion, owner's choice), routed the color through the
    token; corners stay rounded and the rings are preserved exactly (pw amber `#ffc23d`/`#a86f04`; flagcap
    gold `color-mix(--fc-id 65%/60%)`).
  - The task's "~8 generic non-identity outline rings to collapse" do not exist in `custom.css`: it had
    exactly 3 focus rings, all identity (the two reveals). The only generic rings live inline on the two
    marketing pages, which `custom.css` does not load.
  - Starlight 0.39.2 ships NO `:focus-visible` outline of its own (only a few `:focus` color changes plus a
    1px search-clear outline), so the shared rule is the branded ring for all content-page controls, not an
    override war. `custom.css` is unlayered, so even the zero-specificity `:where` base beats Starlight's
    layered styles.
  - The "homepage platform cards" named in the task are on a standalone marketing page
    (`.card.htb {--accent}`), which `custom.css` cannot reach; the content-page analog is `WriteupCard`
    (`<a class="wc-card pf-*">`, carries `--pf-accent`), which is what this pass rings. Sidebar links do not
    carry `--pf-accent` (platform color is a positional nth-child dot), so the hook is added by the same
    nth-child pattern, not "already there."
- **Scope (owner decision):** content pages only this pass; folding the two marketing pages into the same
  token (de-hardcoding their inline lime/accent rings from the prior focus-states work) is a deliberate
  SECOND step (see ROADMAP), not forced now.
- **Verified (real browser, keyboard + pointer, both themes):** the shared rule renders lime on content
  chrome (skip link, prose links, TOC entries, header link, search button, theme select). Sidebar groups
  render their identity: VulnHub red `#ff5c5c`/`#d12f2f`, PicoCTF purple `#d96bff`/`#8b3dc4`, OTW amber
  `#ffc23d`/`#a86f04`, HTB + About lime; writeup links inside a group inherit it. WriteupCard rings
  `--pf-accent` (lime for HTB), radius 16px. FlagCapture gold (65% mix) and PasswordReveal amber render
  rounded (radius 6px, outline follows). On a fresh load, plain/pointer focus gives `:focus-visible` false
  + `outline: none` (no ring on mouse click). Code blocks have no `tabindex`, so they are untouched. Every
  identity ring is legible against its background in both themes (bright on the near-black rail, darkened
  values on paper); none needed strengthening. `npm run build` green (45 pages).
- **CORRECTED 2026-07-17 ("code blocks have no `tabindex`"):** FALSE. EC core's "Scrollable block tabindex"
  JS module adds `tabindex="0"` + `role="region"` to any `<pre>` that overflows, so wide code blocks DO
  match the shared rule and were ringed all along. It went unnoticed because the module runs on a
  250ms-debounced ResizeObserver, so the attribute is absent from the static HTML and from any DOM check
  made too early. Wait for the observer to settle before counting. See the 2026-07-17 code-frame entry.
- **Status:** Adopted; committed to `dev` (not pushed). CSS-only, additive, `custom.css` only.

### 2026-07-13 · Marketing-page keyboard focus rings (:focus-visible), matching the component-ring pattern
- **Decision:** Both standalone marketing pages now define a `:focus-visible` ring on every interactive
  control, CSS-only inside each page's `<style is:global>` (`src/pages/index.astro` and
  `src/pages/about.astro`; Starlight content pages and the existing component focus rings were NOT
  touched). The ring reuses the design-system pattern from the component rings in `custom.css`
  (PasswordReveal, FlagCapture): `outline: 2px solid <accent>; outline-offset: 2px;`, keyed with
  `:focus-visible` (not `:focus`) so it shows for keyboard nav and not on mouse click.
- **Token, not a hardcode:** the accent is `var(--lime)`, the pages' own theme-aware token, which is
  byte-identical to what content pages resolve for the ring. `custom.css` sets `--sl-color-accent:
  #b6ff3c` and `--sl-color-text-accent` is green `#b6ff3c` dark / `#4d7c0f` light; the marketing `--lime`
  is `#b6ff3c` dark / `#4d7c0f` light, so no light override is needed. The task's example token
  `var(--sl-color-text-accent)` does NOT exist on the marketing pages (they live outside Starlight and
  define only `--ink/--lime/--cyan/--magenta/...`), so using it verbatim would have produced an
  invalid/undefined outline color; `var(--lime)` is the correct equivalent.
- **Platform cards key the ring to their own identity accent:** the four homepage `.card` and the four
  About `.practice` links use `outline-color: var(--accent)` (HTB lime, VulnHub red, PicoCTF purple, OTW
  amber), echoing their hover border and mirroring how the component rings use each component's identity
  color (FlagCapture `--fc-id`). Every other control (buttons, HUD links, theme toggle) uses the uniform
  lime ring. (Owner chose this over a single uniform lime everywhere.)
- **Premise checked before building:** confirmed the marketing pages defined no focus styles at all (no
  `:focus`/`:focus-visible`/`outline`, and no `outline:none` suppression, so they fell back to the generic
  browser default ring), and that the only `:focus-visible` rules in `custom.css` are the three component
  rings (all `.sl-markdown-content`-scoped, 2px solid + 2px offset): not one global rule, but a consistent
  geometry to match.
- **Verified (real browser, both themes, real keyboard + pointer input):** every interactive control is
  covered by a focus selector (8 homepage: 4 `.btn` + 4 `.card`; 10 About: hud-home + 2 nav links + toggle
  + 4 `.practice` + 2 `.btn`; 0 uncovered; the 6 About skill cards are non-interactive `<div>`s, correctly
  excluded). Real hardware Tab presses give `matches(':focus-visible')` true with the ring rendered:
  homepage btn lime `#b6ff3c` and VulnHub card red `#ff5c5c`; About dark nav link `#b6ff3c`; About light
  hud-home and toggle `#4d7c0f`. A non-keyboard (programmatic/pointer) focus gives `:focus-visible` false
  and `outline: none`, so no ring appears on mouse click. `npm run build` green (45 pages). No new deps,
  pinned versions unchanged, no motion added.
- **Status:** Adopted (working tree; not committed). CSS-only, additive, marketing pages only.

### 2026-07-13 · Marketing About-page touch targets meet WCAG 2.2 minimum (24px) via layout-neutral hit-area growth
- **Decision:** The four interactive controls in the About page HUD now carry a >= 24x24px pointer
  target. CSS-only, inside the `<style is:global>` block of `src/pages/about.astro` (the theme layer and
  Starlight content pages were NOT touched, no shared component changed). The two nav links (`.hud-nav a`)
  and the home link (`.hud-home`) get `padding-block: 3px; margin-block: -3px;`; the theme toggle
  (`.theme-toggle`) gets `align-items/justify-content: center; min-width: 24px; min-height: 24px;
  margin: -4px;` while the icon stays 16px.
- **Why the paired negative margin:** block padding (or a min-size floor) grows the clickable box, and the
  equal negative margin keeps the flex item's margin box at its natural size, so the compact HUD height and
  every label/icon position stay pixel-identical. Only the invisible hit area grows: no glyph is enlarged
  and nothing below the bar shifts.
- **Scope confirmed by live measurement, not assumed:** at a real 375px viewport the only failing controls
  were the theme toggle (16x16) and the three HUD links (~18.4px tall). Every other control on both
  marketing pages already passes (homepage `.btn` >= 50px, platform `.card` 240px, About `.practice`
  120px, footer buttons ~50px); the homepage carries no nav links or toggle, so it needed no change. The
  About skill cards are non-interactive `<div>`s (cursor-tilt decoration only, no href/handler), so they
  are out of scope.
- **Verified (real browser, both themes):** all four controls report >= 24px (hud-home 83x24.4, Writeups
  66.4x24.4, About 41.5x24.4, toggle 24x24) in dark and light; HUD height unchanged at 51.2px; the visible
  toggle glyph is still 16x16; no horizontal overflow (documentElement scrollWidth == 375); no hit-box
  overlap (18.4px clearance between the toggle and the About link); each control is the topmost element at
  its own center; the toggle flips theme light/dark and persists to `localStorage['starlight-theme']`; the
  Writeups link navigates to /hackthebox/. `npm run build` green (45 pages). No new dependencies, pinned
  versions unchanged, no motion added.
- **Status:** Adopted (working tree; not committed). CSS-only, additive, `about.astro` only.

### 2026-07-12 · Code-block min-content width leak contained at `.main-pane` (min-width: 0), verified in-browser
- **Decision:** Two additive rules in `custom.css` (placed right after the three-column layout block):
  `.sl-markdown-content :is(.expressive-code, pre) { min-width: 0 }` and `.main-pane { min-width: 0 }`.
  A `<pre>` with a long unwrapped line has a large min-content width; a flex child defaults to
  `min-width: auto` (= min-content), which outranks `overflow-x: auto`, so that width can leak up through
  the flex ancestors and push Starlight's content track past `--sl-content-width` (the column widens, the
  TOC shifts, body text reflows, ToggleAll jumps). Most visible when a spoiler `<details>` reveals the
  `<pre>`, but the cause is general to any code block. The `overflow-x: auto` scrollbar stays, the code
  does NOT wrap (`white-space: pre` untouched), and `--sl-content-width` stays 50rem: the block scrolls
  inside a fixed column instead of widening it.
- **Leak vector confirmed by browser layout inspection, not assumed** (Busqueda `docker-inspect` block,
  the wide-line spoilers under "What can user svc run as root?"): momentarily removing the content cap to
  expose the latent leak, the long line's min-content propagated to `.main-pane` (Starlight's flex child
  in the three-column row, default `min-width: auto`), shifting the right TOC ~205px (left 1189.6 to
  1394.9). `min-width: 0` on the block chain (`.expressive-code` / `pre` / `figure` / `.toggle-body` /
  `details`) did NOT contain it: those are block boxes whose `min-width: auto` already resolves to 0.
  `min-width: 0` on `.main-pane` DID (TOC snapped back to 1189.6, column held at 800px = 50rem).
  `.main-frame` (the other flex item on the chain) was tested and did not additionally leak, so it is
  deliberately left out (minimal set). The code block itself is still pinned so its `overflow-x: auto`
  stays authoritative.
- **Why Chromium masks it (and why the fix is still needed):** Chromium clamps a box's min-content
  contribution by its own `max-width`, and `.sl-container` carries `max-width: --sl-content-width` (50rem),
  so with the cap on, the current in-app (Chromium) browser shows NO leak at any width, open or closed.
  Engines that do not clamp min-content by an inner `max-width` still leak; the `min-width: 0` fix is the
  standard, engine-neutral containment. The cap-removal proxy is exactly how the latent leak was exposed
  and measured in a real browser.
- **Verified (real browser, measurable criterion, both themes):** with the fix live, opening the
  `docker-inspect` spoiler leaves the column at 800px and the TOC at 1189.6 (columnDelta 0, tocDelta 0);
  the pre shows a horizontal scrollbar (clientWidth 771 vs scrollWidth 1046) and does not wrap; a thin
  code block is unchanged (delta 0, no scrollbar); the cap-removal proxy now yields tocShift 0 in BOTH
  dark and light (was +205px pre-fix); a long-line EC block appended directly into prose (general case,
  not in a `<details>`) scrolls internally with tocShift 0; no page-level horizontal scroll; safety check
  confirmed the rules change nothing with the cap intact. `npm run build` green (45 pages). No new deps,
  pinned versions unchanged, no Starlight fork, no motion.
- **Status:** Adopted (working tree; not committed). CSS-only, additive.

### 2026-07-12 · Build-time content-taxonomy guard (remark plugin) as the ruled-out astro check alternative
- **Decision:** New additive build-time plugin `plugins/remark-validate-content-taxonomy.mjs`, wired FIRST in
  `astro.config.mjs` `markdown.remarkPlugins` (before the PasswordReveal injector; it only reads, never
  mutates, so order is not otherwise significant). It FAILS the build when a writeup uses an unknown
  hand-authored badge/metadata class token or an unknown component metadata value, so a content typo (for
  example `platform-hacktheboxx`, or `<FlagCapture type="usr">`) becomes a loud error with a source position
  and a "did you mean" suggestion instead of a silently unstyled render that ships green.
- **Why:** `astro check` (plus `@astrojs/check` + `typescript`) was deliberately ruled out (pinned-deps
  posture). This is the alternative, and it targets the string/value surface authored by hand in MDX, which
  is the part that actually grows during the manual writeup pass. Zero new dependencies: it uses only
  `unist-util-visit` (already transitive via `@astrojs/mdx`, same as the PasswordReveal plugin) plus a
  hand-rolled Levenshtein for the suggestions. Nothing was added to `package.json` or the lockfile.
- **What it validates (the allow-lists in the plugin are the single source of truth):** owned class-token
  families by prefix (`meta-` to meta-badge; `platform-` / `difficulty-` / `os-` to the badge modifiers;
  `port-` to port-label; `task-` to task-title; `machine-` to machine-meta); a structural rule that a
  `meta-badge` element carries exactly one platform/difficulty/os modifier; and component metadata enums on
  `Callout` (type recon/loot/intel/defense/vuln), `WriteupMeta` (the four typed unions), and `FlagCapture`
  (type user/root).
- **Boundary (why it cannot false-positive on component output):** it runs at the remark/mdast stage on the
  `.mdx` SOURCE, so it only ever sees HAND-AUTHORED markup. Component-generated classes (Callout's `cl-*`,
  WriteupMeta's `wm-*` / `pf-*`) are produced later during `.astro` rendering and are never visible here;
  marketing `.astro` pages are not markdown, so their `platform-card` / `platform-grid` never reach it; and
  dynamic `class={expr}` plus any token outside the owned families are ignored.
- **Callout set verified complete (neither narrowed nor widened):** re-read `custom.css`, which defines
  exactly five callout TYPE classes (`cl-recon`, `cl-loot`, `cl-intel`, `cl-defense`, `cl-vuln`; the other
  `cl-*` are structural chrome), and `Callout.astro`'s `CalloutType` union matches those five.
- **Verified:** `npm run build` green (45 pages) on current content, so there are no pre-existing taxonomy
  typos (the guard cleared every writeup, including the four existing `<FlagCapture type="user"|"root">`
  usages). Demonstrated a failing build on a scratch `platform-hacktheboxx` and on `<FlagCapture type="usr">`
  (clear error naming the token, file, `line:column`, and the suggestion), then removed the scratch and
  rebuilt green.
- **Retirement note:** the `meta-badge` / `platform-` / `difficulty-` / `os-` / `machine-` class families are
  expected to be RETIRED when WriteupMeta fully rolls out and the `.machine-meta` badge row is dropped; narrow
  the allow-lists then and keep the component-enum checks. Frontmatter os/tags validation was considered and
  deferred (no writeup sets those in frontmatter today, and the remark stage does not see frontmatter cleanly).
- **Status:** Adopted; committed to `dev` (not pushed). No new deps, pinned versions unchanged.

### 2026-07-11 · Constellation hero canvas pauses off-screen (IntersectionObserver, perf-only)
- **Decision:** The constellation canvas `draw()` loop on the two marketing heroes now stops its per-frame
  work while the canvas is scrolled out of the viewport and resumes on re-entry. Implemented in
  `src/pages/index.astro` and `src/pages/about.astro` only (the two files that carry the effect;
  `PlatformIndex.astro` has no constellation canvas, confirmed, so it was not touched). The loop tracks its
  own `rafId`, a `running` guard prevents double-scheduling or an orphaned frame, and an
  `IntersectionObserver` on the canvas calls `start()` / `stop()` (`cancelAnimationFrame`) on
  enter/leave. A `pagehide` handler stops the loop and disconnects the observer for a clean lifecycle.
- **Why:** the loop previously called `requestAnimationFrame(draw)` unconditionally and ran forever, so the
  hero kept consuming CPU/GPU/battery even when off-screen. The observer itself is cheap and always-on; only
  the draw work is gated.
- **No visual change while visible, and the reduced-motion gate is unchanged:** the `draw()` body is
  untouched, `init(); start()` schedules the identical first frame, and the observer's initial callback is a
  no-op via the `running` guard, so an on-screen hero renders exactly as before. The whole observer lives
  inside the existing `if(!reduce)` block, so `prefers-reduced-motion` users still get no animation and no
  observer. Stepping is per-frame (no time deltas), so resume continues from the current node positions with
  no jump and no catch-up burst.
- **Verified:** `npm run build` green (45 pages; this is the type-check gate for the `.astro` `<script>`
  blocks, and it passed clean). Both compiled bundles carry the lifecycle logic (home page inline script and
  the `about` script bundle each show one `cancelAnimationFrame`, the added `IntersectionObserver`, and the
  `pagehide` teardown). The off-screen pause is a scroll behavior that headless checks report false negatives
  on (documented project learning), so it was NOT verified headlessly: the owner should confirm on the
  deployed preview by scrolling the hero out of view (loop stops) and back (resumes smoothly, no visual jump).
- **Status:** Adopted (working tree; not committed). No new dependencies, pinned versions unchanged.

### 2026-07-11 · Content pipeline is manual editorial polish, not a script (retires notion_cleaner.py)
- **Supersedes:** 2026-05-31 · Notion → notion_cleaner.py → MDX pipeline
- **Decision:** The writeup content pipeline is deliberate manual editorial polish against a Notion
  template. The previously referenced Python cleaning script (notion_cleaner.py) is retired and is not
  the mechanism. It never provided the finishing quality intended for published writeups.
- **Why:** The gap between a raw Notion export and the intended finished writeup is an editorial-judgment
  problem, not a mechanical text-transformation problem. A script can normalize syntax but cannot make
  the editorial calls that define the site's writeup quality. Long-term correctness and voice consistency
  outweigh the short-term convenience of automation.
- **Revivability:** This is a deferral, not a permanent abandonment. If manual polish proves not to scale
  as the writeup count grows, a scripted pre-clean pass may be reconsidered as a first step feeding manual
  polish, never as a replacement for it. Docs no longer cite the script as active.

### 2026-07-11 · Metadata system: committing to WriteupMeta, remark-plugin injection chosen (build deferred), chips non-clickable until filter routes ship
- **Decision:** WriteupMeta replaces the hand-authored .machine-meta badge row as the writeup metadata
  system. .machine-meta remains live for now and is retired page by page as the mass writeup import/polish
  pass proceeds, so the two systems never both act as a live source of truth on the same page.
- **Rollout mechanism:** Metadata will be auto-injected via a remark plugin. This is a deliberate
  short-term loss for a long-term gain: building auto-inject plumbing is upfront cost with no immediate
  payoff, but at writeup scale it removes per-page metadata boilerplate. The plugin is the chosen
  mechanism; its implementation is deferred and is NOT built as part of this decision. It is separate
  framework-pipeline work to be scoped on its own.
- **Interactive layer deferred separately:** Injecting the metadata (the plugin) and rendering it as
  clickable filter chips are separate layers. The chips are rendered non-interactive for now because their
  target filter routes (/platform, /os, /environment) do not yet exist; shipping clickable chips to dead
  routes would be worse than static ones. The clickable layer, and the filter routes it depends on, get a
  real review AFTER the mass writeup import. Those routes share machinery with the deferred /principles
  index and are intended to be built together.
- **Net:** Build the injection pipe (later), leave the interactive tap off until after the import.
  Extending metadata behavior before that review should not be treated as settled just because the
  mechanism is chosen.

### 2026-07-11 · picoCTF icon rebuilt as a true vector (815 B, replaces 65 KB raster-in-SVG)
- **Supersedes in part:** 2026-07-11 · Badge icon sourcing: split by consumption mechanism, specifically its
  PicoCTF interim-asset paragraph. The rest of that entry stays in force and it is not archived.
- **Decision:** both copies of the picoCTF badge (`public/icons/picoctf.svg` and
  `src/assets/icons/picoctf.svg`) are replaced by a hand-constructed 815-byte true-vector SVG:
  4 elements (disc `<circle>`, shadow `<path>`, letterform `<path>`, dot `<circle>`), flat colors
  `#c4a0cb` / `#c50a2c` / `#fff`, no embedded bitmap, no clipPath, no filters. This resolves the
  ROADMAP item "replace the improvised PicoCTF badge asset" and supersedes the interim asset noted
  on 2026-07-08 (the 65 KB SVGO-optimized Inkscape trace, which was a base64 PNG plus 829
  one-pixel trace-artifact paths).
- **How it was rebuilt (method, reusable for other icons):** the embedded PNG was extracted as the
  measurement source of truth; every edge was measured to sub-pixel precision from the raster
  (50% coverage crossings), then intended geometry was inferred and refit: the bowl is a wide oval
  (rx 101.5, ry 93.6) drawn as quadrant cubics (flanks flatter than an ellipse, so handle lengths
  were least-squares fitted per quadrant, max error about 1 px); the long shadow's edges are exactly
  45 degrees (upper edge tangent to the bowl, lower edge through the stem tip), closed by an arc of
  the badge circle instead of a clipPath; shadow edges that sit under the white letterform ride
  2 to 3 px inside it so no anti-aliasing seams can appear. Verified by rendering with Inkscape CLI
  and pixel-diffing against the original raster: 15 structural pixels differ image-wide (all
  single-pixel edge placement, out of 262,144), invisible at any size including the 18 px sidebar dot.
- **Deployment checks done:** CSP already allows `img-src data:` (the new file is under Vite's 4 KB
  `assetsInlineLimit`, so the `src/assets` copy may inline as a data URI once WriteupMeta ships);
  `/icons/*` carries no immutable cache rule (only `/_astro/*` and `/fonts/*` do), so the in-place
  replacement cannot serve stale to returning visitors. The 2026-07-08 note that `assetsInlineLimit`
  hashing matters for a 65 KB pico asset is moot now.
- **Status:** Adopted; on `dev`, uncommitted.

### 2026-07-11 · Mobile TOC: current top-level (h2) entry green (completes desktop parity)
- **Decision:** One add-only, mobile-scoped rule in `custom.css` (directly after the existing mobile
  gold-flag and cyan-h3 blocks): the current top-level (h2) entry in the mobile TOC dropdown turns green
  via `--sl-color-text-accent`, matching the desktop right column. This completes mobile/desktop TOC
  active-color parity (green h2, cyan h3, gold flags).
- **Why:** on desktop the current h2 is green only because Starlight's DEFAULT `a[aria-current="true"]`
  color (`--sl-color-text-accent`) shows through, and the custom rules override only deeper levels. The
  mobile TOC uses a different default active style (white + checkmark), so the green had to be added
  explicitly. The theme-aware token (green `#b6ff3c` dark / `#4d7c0f` light) means no light override.
- **Selector / depth model:** `mobile-starlight-toc a[aria-current="true"][style*="--depth: 0"]:not([href="#user-flag"]):not([href="#root-flag"])`.
  Verified in the real mobile DOM (Starlight 0.39.2): h2 entries carry `style="--depth: 0;"`, h3 entries
  `--depth: 1;`. NOTE the flags (`#user-flag` / `#root-flag`) render at `--depth: 1`, NOT h2-level, so the
  `--depth: 0` selector never matches them; the `:not()` flag exclusions are a harmless safeguard kept for
  parity with the sibling cyan-h3 rule. Scoped strictly to `mobile-starlight-toc`, so the desktop
  `<starlight-toc>` is structurally unreachable (confirmed: a desktop anchor does not match the rule).
- **Verified** on a real 375px mobile viewport, both themes, by computed color: current h2 green
  (`#b6ff3c` dark / `#4d7c0f` light), current h3 cyan (`#41efff` / `#08697a`), current flag gold
  (`#ffc23d` / `#C6A243`), inactive entries muted default; desktop TOC unchanged (its current h2 stays
  green via the Starlight default, and the new rule does not match it). No console errors. `npm run build`
  green (45 pages). No new deps, no motion.
- **Status:** Adopted; committed to `dev`, then merged to `main` (production) via PR the same day
  (2026-07-11).

### 2026-07-11 · Badge icon sourcing: split by consumption mechanism

**Partly superseded by:** 2026-07-17 · Badge glyphs normalized to a 14px grid; HackTheBox to currentColor;
polychrome/monochrome sourcing axis. Two premises here are now wrong: (1) the axis is polychrome vs monochrome, NOT logo vs glyph, so HackTheBox
(a single-fill logo) is now an inlined `currentColor` glyph, leaving three native-colour platform `<img>`
logos (VulnHub, PicoCTF, OverTheWire) plus Linux; (2) the `public/icons` copies do NOT serve "the sidebar
CSS backgrounds" (the sidebar uses colored dots; its logo CSS is commented out), they serve
`PlatformIndex.astro` and `about.astro` by literal `/icons/` path, and `public/icons/htb.svg` now
deliberately diverges from the inlined `src/assets/icons/htb.svg`. The consumption-mechanism split itself
still stands; only the axis label and the public-copy rationale are corrected.

Writeup badge marks are sourced by what each icon needs, not stored uniformly. The four
platform logos render as native-color <img> from hashed ?url imports and, because the sidebar
CSS backgrounds reference them by stable /icons/ path, also keep a public/icons copy: this
duplication is forced by the CSS lock and is intentional. Linux is treated as a logo (native
color <img>) because it is multicolor and cannot be a clean single-color glyph. The three
single-fill category marks (Windows, Active Directory, Progressive) are recolored to
currentColor, inlined, and tint to their chip accent in both themes; Standalone uses a
purpose-drawn currentColor glyph. Category marks live only in src/assets/icons/ because
inlining requires importing them, and public/ is not in the import graph.

assetsInlineLimit is left at the Vite default: PicoCTF (65 KB) is emitted as a hashed cached
asset while the sub-4 KB logos inline as data URIs, which is the desired size-based split.
Forcing all assets to hashed files was rejected as a global change to solve a non-problem.
The PicoCTF asset is an improvised raster-in-SVG (65 KB after SVGO); it is an accepted interim
asset. A clean lightweight PicoCTF source is a Design follow-up.

**Partly superseded by:** 2026-07-11 · picoCTF icon rebuilt as a true vector (815 B, replaces 65 KB
raster-in-SVG), specifically the PicoCTF interim-asset paragraph directly above. The PicoCTF badge is no
longer a 65 KB raster-in-SVG interim asset. It was rebuilt as an 815-byte true-vector SVG and is
design-final, closing that Design follow-up. That entry also notes the new sub-4 KB file now inlines as a
data URI rather than hashing.

### 2026-07-10 · Mobile TOC parity: gold flag entries + cyan current-h3 (CSS-only, additive)
- **Decision:** Extend the two desktop "On this page" treatments to the mobile TOC dropdown
  (`<mobile-starlight-toc>`): flag entries (`#user-flag` / `#root-flag`) render muted gold at rest and
  full `--flag-gold` on hover/current, and the current h3 entry turns cyan (`--tp-cyan` dark /
  `--tp-cyan-ink` light). CSS-only, add-only, in `custom.css` right after the desktop TOC block. No
  component override, and NO existing `.right-sidebar-panel` rule touched (the diff is purely additive),
  so desktop renders identically. All new rules are scoped to `mobile-starlight-toc`, which cannot reach
  the desktop column (a different `starlight-toc` element).
- **Why the mobile cyan rule differs from desktop:** desktop reads heading level from the TOC nesting
  chain (`nav > ul > li > ul > li > a`). Mobile uses the same recursive `TableOfContentsList` but wraps it
  under `nav > details > .dropdown`, so that exact chain does not line up. Instead the mobile rule matches
  Starlight's per-entry inline `--depth`. The gold rules are href-based (depth-independent) so they are a
  near-verbatim re-scope.
- **Verified in the REAL mobile DOM (Starlight 0.39.2), correcting an assumption:** the mobile TOC is
  NOT flat, it is nested (`ul > li > ul`) like desktop, BUT Starlight also emits an inline
  `style="--depth: N;"` on every `<a>` (via `define:vars` in `TableOfContentsList.astro`). Confirmed
  h2 = `--depth: 0`, h3 = `--depth: 1` (with a space after the colon, so `[style*="--depth: 1"]` matches),
  and that `#user-flag` / `#root-flag` are themselves h3 (depth 1), hence the `:not()` exclusions so flags
  keep gold and never go cyan. If Starlight changes the emitted format or the h3 depth number, update both
  cyan selectors.
- **Behavior preserved:** rules set text `color` only. Starlight's mobile active checkmark (`::after`,
  `background-color: --sl-color-text-accent`) and the white h2 active color are untouched; h2/other
  non-flag entries keep Starlight's default active style. Unlayered so the flag/h3 colors beat Starlight's
  layered mobile active color.
- **Verification:** both themes, real mobile viewport (375px), computed styles + screenshots. Dark: flags
  muted→full gold, current h3 `#41efff`, current h2 stays white, checkmark intact. Light: current h3
  `#08697a`, flags `#C6A243`/muted, checkmark bg = light accent. Desktop right column unchanged (flag
  `oklab(0.785…)` muted gold, h3-current `--tp-cyan`, both identical to before). `npm run build` passes
  (45 pages). Committed as `3045505` and shipped to production via PR #9 (2026-07-11).

### 2026-07-10 · WriteupMeta revised: intentional per-axis color, restrained glow, growing pips
- **Supersedes:** 2026-07-10 · WriteupMeta badge system (`src/components/badges/`) added
- **Supersedes:** 2026-07-10 · `WriteupMeta` badge system: two tiers, shape-coded, navigational chips + a hue-free Difficulty
- **What changed from the first build, now archived as 2026-07-10 · WriteupMeta badge system (`src/components/badges/`) added:** the badge row was redesigned from platform-only *washes*
  + a bordered divider to INTENTIONAL per-axis color with a restrained glow. Structure, guardrails, and
  a11y are unchanged (`.not-content`, `data-astro-prefetch="false"`, runtime union guard, `sr-only`
  "Difficulty N of 4"); only color, glow, difficulty rendering, and spacing changed.
- **Single-token color model:** every chip derives color/tint/border/glow from one custom property
  `--wm-c` (plus optional `--wm-glow`), set per value. New per-value classes on the chips: `pf-*`
  (platform, already existed), `wm-os-*`, `wm-env-*`. This replaces the old `--wm-htb/--wm-vh/...`
  globals, so the v1 "token scoping / bare-`:root` fallback" note no longer applies (dark values live on
  unprefixed selectors, light overrides under `:root[data-theme="light"]`).
- **Palette drift RESOLVED (closes the ROADMAP reconciliation item):** platform chips now use the
  canonical `--pf-accent` hexes verbatim (HTB `#b6ff3c`/`#4d7c0f`, VulnHub `#ff5c5c`/`#d12f2f`, PicoCTF
  `#d96bff`/`#8b3dc4`, OTW `#ffc23d`/`#a86f04`); they match the sidebar/site tokens, no drift. HTB alone
  carries a `--wm-glow` (`#9fef00` dark / `#4d7c0f` light) so its halo is true brand green.
- **OS + Environment are intentional identity colors** (dark / light): Linux `#f0b429`/`#a86f04` (Tux
  amber), Windows `#4ca3ff`/`#0a63c9`; Environment Standalone `#8fa3b8`/`#5a6b7d` (solitary slate),
  Active Directory `#7c9cff`/`#3b4fa8` (enterprise indigo, kept distinct from the Windows-blue chip it
  sits beside).
- **Progressive env color added by owner decision:** the shipped spec only colored 2 of the 3 `Environment`
  union values, and the new base `.wm-chip` *requires* `--wm-c`, so a `Progressive` chip (the natural
  value for the OTW Bandit content) rendered as a broken transparent pill with a hard ink outline and no
  glow. Flagged it; owner chose a teal-green "wargame ladder" hue: `#3fd9a8` dark / `#0f8a63` light
  (pulled toward teal to stay distinct from HTB lime; OTW's platform amber means it never sits beside the
  HTB chip anyway).
- **Restrained glow ("G1"):** dark = a soft halo `box-shadow: 0 0 10px -2px` at ~32% of the hue (45% on
  hover); light = a clean hue-shadow `0 3px 10px -5px` (glow becomes haze on paper). Spread is deliberately
  restrained; do not increase it.
- **Difficulty chip:** now a calm PEER of the nav chips (same 0.75rem / 600 size+weight, was slightly
  larger before), still neutral and hue-free. The visible "Difficulty" key label was REMOVED (the word in
  the chip is the only visible label; `sr-only` "Difficulty N of 4" stays). Magnitude is carried by pips
  that both FILL and GROW with level (the leading filled pip enlarges 6→8px as level rises), so higher
  difficulty outweighs lower beyond count alone, still achromatic.
- **Layout:** the bottom border/divider is GONE; the block is a single flex row, tight under the title
  (`margin-top: 0.55rem`) with open space before the body (`margin-bottom: 2.1rem`).
- **Status:** built clean (45 pages), verified both themes + the previously-broken Progressive chip now
  renders correctly (teal fill/border/glow) in dark and light. Committed as `7fa5d82` + docs `02e8bab` and
  shipped to production via PR #9 (2026-07-11); still not wired to any writeup (auto-injection vs manual
  placement remains an open ROADMAP call).

### 2026-07-07 · Font `<link rel=preload>` hints removed site-wide (Firefox "preloaded but not used")
- **Decision:** The two font preload hints (`jetbrains-mono-400.woff2`, `syne-800.woff2`) are removed from
  all three sources that emitted them: the Starlight `head` config in `astro.config.mjs` (docs pages) and
  the `<head>` of both standalone marketing pages (`src/pages/index.astro`, `src/pages/about.astro`). Each
  site now carries a short rationale comment so the preloads are not re-added.
- **Why:** Firefox logs "preloaded but not used within a few seconds" for these preloads on every page.
  This is NOT an unused-weight problem: both faces genuinely paint above the fold (JetBrains Mono 400 is
  body text, Syne 800 is the `h1#_top` page title). Firefox simply does not credit a same-origin
  `crossorigin` font preload that is served from its own preload cache, and warns anyway. The preload only
  shortened first-load FOUT, with no CLS or LCP effect here because of the metric-matched fallbacks, so it
  was not worth the warning.
- **Fonts load unchanged:** still self-hosted via `@font-face` in `src/styles/fonts.css` (imported by the
  two marketing pages and via Starlight `customCss`) with metric-matched size-adjust fallbacks and
  `font-display: swap`, so first paint stays shift-free with no preload. `@font-face`, the fallback
  declarations, and `public/fonts/` were not touched.
- **Supersedes in part:** 2026-07-04 · Self-hosted fonts (subset WOFF2 + metric-matched fallbacks), Google
  Fonts removed, specifically its "Preloads" bullet. Everything else in that entry stays IN FORCE and it is
  NOT archived: the `@font-face` contract, the subsetting rationale, and the metric-matched fallbacks. Also
  retires the 2026-07-05 crossorigin correction (which had switched these preloads from `crossorigin="true"`
  to bare `crossorigin`). With the preloads gone, the crossorigin value is moot.
- **Verified:** `npm run build` green; zero `<link rel="preload" ... fonts/>` anywhere in `dist/`; the
  reading-progress head script is byte-for-byte unchanged; theme-orthogonal (identical hints in dark and
  light), so both themes are unaffected.
- **Status:** Adopted; committed as `6920802` (+ docs `c14fc32`) and shipped to production via PR #9 (2026-07-11).

### 2026-07-06 · CSP flipped from Report-Only to enforced (Permissions-Policy pruned; site loads only self scripts)
- **Decision:** `public/_headers` now serves `Content-Security-Policy` (enforced), replacing
  `Content-Security-Policy-Report-Only`. Only the header NAME changed: the policy value is byte-identical to
  the Report-Only version verified clean across Chromium 148, Firefox 152, WebKit 26.5, and real Safari
  hardware (iPhone, iPad, BrowserStack Safari 18.4, Safari 16.5). Shipped on dev (commit `132a1da`),
  merged to production via PR #9 (2026-07-11).
- **Now active (were inert under Report-Only):** `frame-ancestors 'none'` (clickjacking defense alongside
  the enforced `X-Frame-Options: DENY`) and `upgrade-insecure-requests` (upgrades same-origin subresources
  to HTTPS). The three Report-Only console notices (frame-ancestors ignored, upgrade-insecure-requests
  ignored, and Safari's no-report-to notice) resolve on enforcement.
- **All scripts are self (what made enforcement honest):** Cloudflare Web Analytics was disabled AND removed
  (deleted at the dashboard, not just toggled), so the `static.cloudflareinsights.com` beacon is gone and
  the site loads zero external scripts. `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'` has no
  third-party origin (`'unsafe-inline'` covers the 18 inline scripts; `'wasm-unsafe-eval'` covers Pagefind's
  worker WASM, proven necessary and sufficient on all three engines). See the analytics entry below.
- **Permissions-Policy pruned (same _headers change):** removed six tokens current Chromium/Edge no longer
  recognize and log as "Unrecognized feature": ambient-light-sensor, battery, document-domain,
  execution-while-not-rendered, execution-while-out-of-viewport, speaker-selection. All still-recognized
  deny entries kept. `web-share` deliberately KEPT despite a Chromium "unrecognized" warning, because Safari
  recognizes it as a real deny (removing it would weaken the policy there).
- **Unchanged constraints:** no reporting endpoint (report-to / report-uri) by design; no Trusted Types
  (SecretTerminal `innerHTML`); HSTS stays at the Cloudflare zone (not duplicated in `_headers`).
- **Verified under real enforcement:** on the live Cloudflare preview (`dev.idanlab.pages.dev`) and local
  wrangler, Pagefind search returns results (WASM under the enforced token), `/secret` works, fonts /
  Expressive Code / image-zoom / ToggleAll work, both themes render, and the console is clean of the former
  Report-Only notices, the six Permissions-Policy errors, and any beacon. Chromium + Firefox clean; WebKit
  main-thread clean (its Playwright worker sandbox on Windows is a test-harness limit, not CSP); real Safari
  confirmed on device.
- **Status:** Adopted; enforced on dev, then merged to production via PR #9 (2026-07-11), so the CSP is now enforced in production.

### 2026-07-06 · Cloudflare Web Analytics disabled; CSP stays script-src 'self' (no third-party beacon)

Decision: Cloudflare Web Analytics (RUM) auto-injection is disabled at the Cloudflare
dashboard, so the static.cloudflareinsights.com beacon is no longer injected into any
page. The site's Content-Security-Policy therefore keeps script-src 'self' with no
third-party script origin.

Why: The beacon is served from Cloudflare's CDN in every installation mode (automatic,
EU-excluded, or manual snippet), so keeping analytics would have required allowlisting
static.cloudflareinsights.com in script-src regardless of method. Manual installation was
evaluated and rejected: it still loads the beacon from the same external origin, so it
does not avoid the allowlist, and it adds a maintained third-party tag to the build for no
CSP benefit. The site's audience skews privacy and security focused, where a large share
of visitors block third-party analytics at the browser level, so the collected data would
have been both incomplete and skewed. Disabling keeps the CSP genuinely self-contained
(no third-party script origin), which is the more coherent posture for this site, and
removes the only external script, unblocking CSP enforcement with no allowlist compromise.

Boundary: this is a Cloudflare dashboard setting, not a repo change. If web analytics is
ever wanted later, it would require adding static.cloudflareinsights.com to script-src.

### 2026-07-05 · Application-layer security headers via public/_headers; CSP Report-Only as a staging step toward enforcement
- **Decision:** Application-layer security headers ship via `public/_headers` on Cloudflare Pages, additive
  to the zone-level hardening. Safe headers (X-Content-Type-Options, Referrer-Policy, X-Frame-Options,
  Permissions-Policy) and immutable caching for `/_astro/*` and `/fonts/*` are ENFORCED immediately.
  Content-Security-Policy ships as `Content-Security-Policy-Report-Only`. Report-Only is a STAGING STEP,
  NOT the finish line: it blocks nothing and only surfaces would-be violations, so we validate the intended
  policy in real browsers first. The finish line is renaming the header to `Content-Security-Policy`.
- **Post-self-host CSP state:** the font self-hosting migration is complete, so the CSP has NO Google Fonts
  origins; `font-src 'self'` (fonts served same-origin from `/fonts/*.woff2`). `style-src` retains
  `'unsafe-inline'` because Starlight and Expressive Code inject inline styles; that is effectively
  permanent short of forking Starlight. `img-src 'self' data:` (the `data:` is required: 30-plus
  `url(data:image...)` CSS backgrounds from Starlight/Expressive Code icons). No external origins in any
  directive (verified zero in source and dist).
- **script-src reality (supersedes the brief's "one inline script" premise):** the production build emits
  **18 distinct inline scripts**, not one. Besides our static reading-progress bar, Starlight injects its
  own inline scripts (theme provider, mobile-menu toggle, sidebar/TOC persistence, `updatePickers`,
  Expressive Code), and the marketing pages (`/`, `/about`) plus a few writeups (busqueda/return
  decode-scramble, the platform-index reveal, the `404` reduced-motion guard) carry their own inline FX.
  A hash in `script-src` makes browsers ignore `'unsafe-inline'`, so a single progress-script hash would
  block the other 17. Chosen (owner decision): keep `script-src 'self' 'unsafe-inline'` for now. The
  stable progress-bar hash is `sha256-zbeMm3179IyQub695L7lMzB1ygPiSe0lSSrMfkEOwpc=`; the full 18-hash set
  is reproducible from `dist` (enumerate inline `<script>` bodies, SHA-256 each) but roughly a third are
  volatile authored FX that change with the pages, so hardcoding them into a global header is brittle.
- **script-src also needs `'wasm-unsafe-eval'` (required, verified):** Starlight's search (Pagefind)
  instantiates a WebAssembly module inside a Web Worker (`dist/pagefind/pagefind-worker.js` +
  `wasm.*.pagefind`). Under CSP, WASM compilation needs `'wasm-unsafe-eval'` (or the broader
  `'unsafe-eval'`); without it browsers block it as `blockedURI "wasm-eval"` and search breaks. Confirmed
  empirically on Chromium 148: under only `'self' 'unsafe-inline'`, a direct `WebAssembly.instantiate`
  fires a `script-src` violation (`blockedURI: wasm-eval`, disposition `report` = would block once
  enforced); Firefox 102+ and Safari 16+ gate WASM more strictly still. `'wasm-unsafe-eval'` is the narrow
  WASM-only token (does NOT permit JS `eval` / `new Function`), so it is a minimal, targeted relaxation.
  **Testing lesson (why an earlier pass missed this):** Pagefind's WASM runs in a Worker, and
  worker-context CSP violations do NOT surface on the main-thread `securitypolicyviolation` listener or
  the page console. A search smoke test looked clean while WASM was actually being flagged; the direct
  WASM probe is what exposed it. Always probe WASM directly, not just via a search click.
- **How the worker actually gets the token (precise):** the worker does NOT inherit the document's CSP. The
  same-origin worker script `/pagefind/pagefind-worker.js` is served by the Cloudflare `/*` rule, so it
  receives the SAME CSP header (token included) on its OWN response; the worker's execution context carries
  `'wasm-unsafe-eval'` on that response's merits. Verified by curl: `/pagefind/pagefind-worker.js` (and the
  `wasm.en.pagefind` binary) both return the header, and the worker-WASM run is clean. The worker is a
  same-origin file, not a `blob:` worker, so it is allowed by the policy (a blob worker would have needed
  `blob:` added to `script-src`).
- **Why still Report-Only for a round:** confirms in real browsers (both themes) that the intended policy
  fires zero violations before enforcement makes any mismatch fatal. Once confirmed, enforcement is a
  single directive-name flip (`Content-Security-Policy-Report-Only` to `Content-Security-Policy`).
- **Cross-browser verification (2026-07-05, done):** zero violations under the shipped policy on **Chromium
  148, Firefox 152, and WebKit 26.5** (Safari's engine, driven via Playwright on the Windows host). Each
  engine was checked three ways: a synthetic harness running WASM on the main thread AND in a same-origin
  Web Worker; the REAL Pagefind module imported and searched (returns results, worker WASM runs); and every
  real page plus a real search-UI run, both themes. Necessity was also proven per engine: with
  `'wasm-unsafe-eval'` removed, `WebAssembly.instantiate` / `new WebAssembly.Module` throw `CompileError`
  (Chromium reports a `wasm-eval` violation; FF/WebKit throw under enforcement). Real Safari on Apple
  hardware is the one remaining nice-to-have (WebKit engine is a strong proxy but not identical); run it via
  a cloud lab (BrowserStack/LambdaTest) or any Apple device against a deployed Pages preview, which already
  serves these headers. See ROADMAP.
- **Report-only semantics caught during testing:** `frame-ancestors` and `upgrade-insecure-requests` are
  inert while the policy is `-Report-Only` (WebKit logs a benign console notice saying so; per spec both are
  enforcement-only). They activate on the flip. No protection gap in the interim: the ENFORCED
  `X-Frame-Options: DENY` covers clickjacking and zone HSTS covers transport. They stay in the policy so the
  flip needs no directive edits.
- **Why HSTS is not in _headers:** HSTS is set at the Cloudflare zone level; duplicating it risks a
  conflicting max-age. The zone owns HSTS; `_headers` carries app headers only.
- **Hard constraint recorded:** the CSP MUST NOT use Trusted Types (`require-trusted-types-for` /
  `trusted-types`). The SecretTerminal (`src/components/SecretTerminal.astro`, embedded in `secret.mdx`)
  renders via `innerHTML` (visitor input escaped, only trusted authored markup injected raw); Trusted
  Types blocks `innerHTML` sinks and would break it. Standard CSP is fully compatible.
- **Enforce-phase checklist:** Chromium 148, Firefox 152, and WebKit 26.5 are confirmed clean (incl. real
  search / worker WASM, both themes). Remaining before the flip: optionally a real-Safari-hardware pass
  (cloud lab or Apple device against a deployed preview), then rename Report-Only to enforced. To also drop
  `script-src 'unsafe-inline'`, either enumerate all 18 inline-script hashes (brittle: recompute on any
  FX/Starlight change) or adopt a nonce strategy (needs an edge transform, not present on static Pages).
  Keep `style-src 'unsafe-inline'` and `script-src 'wasm-unsafe-eval'`. Never add Trusted Types.
- **Cache-Control caveat (`/fonts/*`):** the immutable rule means a full year with no revalidation, and the
  font filenames are NOT content-hashed (unlike `/_astro/*`). So if a font is ever re-subset, replaced, or
  a weight added, you MUST change the filename (or add a `?v=` bust); otherwise returning visitors keep the
  stale file for up to a year. Record any such font change here and in CORE_SPEC.
- **Verified:** `public/_headers` emitted byte-identical to `dist/_headers`; no `Strict-Transport-Security`
  line; no Trusted Types directive; no Google/external origins; CSP is Report-Only; `font-src 'self'`;
  `script-src` has `'wasm-unsafe-eval'` (WASM probe fires zero violations with it, both a direct probe and
  a real Pagefind search); both `/_astro/*` and `/fonts/*` immutable rules active; `npm run build` green
  (45 pages); no new deps, versions unchanged. Supersedes the earlier "enforce CSP gated on font
  self-hosting" ROADMAP item.
- **Status:** Adopted + shipped (single static `public/_headers` plus doc edits).

### 2026-07-05 · Remark plugin auto-injects the PasswordReveal import (no per-file import needed)
- **Decision:** New additive build-time plugin `plugins/remark-inject-passwordreveal.mjs`, wired into
  `astro.config.mjs` via `markdown.remarkPlugins` (a new array; only `rehypePlugins` existed before). It
  walks each MDX file's mdast tree and, ONLY when the file contains a `<PasswordReveal .../>` JSX element
  AND does not already import `PasswordReveal` itself, prepends an `import PasswordReveal from
  '@components/PasswordReveal.astro'` ESM node to the tree. Writeup authors (and eventually
  `notion_cleaner.py`) now write `<PasswordReveal password="..." />` inline with zero import boilerplate;
  this is what makes rolling PasswordReveal out across 34+ Bandit pages (ROADMAP) tractable instead of a
  34-file manual-import chore.
- **Why a remark plugin, not a components map:** Starlight renders docs-page MDX internally, so the
  `<Content components={...}>` override point Astro exposes for user-land MDX rendering is not reachable
  for Starlight docs. A build-time AST transform on the same legacy `unified()` pipeline the existing rehype
  plugin (`rehype-content-image-loading.mjs`) already runs on is the mechanism that is actually reachable,
  and is purely additive (new `remarkPlugins` key alongside the untouched `rehypePlugins` key).
- **Mechanism (verified, not assumed):** MDX represents a component tag as an `mdxJsxFlowElement` /
  `mdxJsxTextElement` mdast node (`name === 'PasswordReveal'`), and an ESM import as an `mdxjsEsm` node whose
  `data.estree` is a full ESTree `Program` (confirmed by reading `mdast-util-mdxjs-esm`'s source directly:
  `node.data = {estree}` is set from the parsed token, and `@mdx-js/mdx`'s hast/estree stage splices that
  `Program`'s body into the compiled module, not `node.value`). Detection uses `unist-util-visit`; the
  injected import's `data.estree` is produced by parsing the exact import string with `acorn.parse(source,
  {ecmaVersion: 'latest', sourceType: 'module'})`, guaranteeing an ESTree shape byte-identical to what the
  real compiler would produce for a hand-written import, rather than a hand-rolled AST literal that could be
  subtly wrong. Both `unist-util-visit` (5.1.0) and `acorn` (8.16.0) are already present in `node_modules` as
  transitive dependencies of `@astrojs/mdx` (which Starlight injects automatically; it is not itself listed
  in this project's `package.json`), so nothing was added to `package.json`.
- **Import specifier:** `@components/PasswordReveal.astro` (the existing Vite alias), used as-is. Verified
  by an actual `npm run build` (not inferred): the caveat that Vite aliases can fail to resolve in
  build-time-injected imports (the same caveat that applies to MDX image paths, which use a different,
  astro:assets-specific resolution path) does NOT apply here, because MDX compilation never inspects or
  rewrites plain `import` specifier strings itself; it only emits them into the compiled JS module verbatim,
  and Vite/Rollup then resolves that module's imports exactly as it would for any hand-authored file. No
  fallback (relative-path) specifier was needed.
- **Conditional injection, verified empirically, not just by reading the code:** temporarily instrumented
  the plugin to log every file it decided to inject into, then ran `npm run build` (45 pages). Exactly one
  file logged, `overthewire/bandit/0-1.mdx`, with `alreadyImported: false`. Then temporarily restored a
  manual `import PasswordReveal from '@components/PasswordReveal.astro'` line in that same file and rebuilt:
  the plugin logged `alreadyImported: true` and skipped injection, and the build stayed green (a duplicate
  injection would have produced a JS duplicate-binding `SyntaxError` at build time). The instrumentation was
  then removed. This is the live proof that the guard against double-import (an author who writes both the
  tag and a manual import) is not just a hoped-for property, it is exercised and does not break the build.
- **Live testbed:** `overthewire/bandit/0-1.mdx`'s manual `import PasswordReveal from
  '@components/PasswordReveal.astro'` line (added when PasswordReveal first shipped, same date) was removed;
  the file now has only `<PasswordReveal password="..." />` with no import, relying entirely on the plugin.
  `import Toggle from '@components/Toggle.astro'` (for the still-present `spoiler-toggle`) is untouched.
- **Verified:** `npm run build` green, 45 pages, no unresolved-import warnings. In-browser on the built
  page: `.pwreveal` renders inline immediately after the `spoiler-toggle` `<Toggle>` (source order), not
  appended at the end of the page (distinct from the Footer/`<Principle>` auto-append mechanism); reveal
  click swaps the button to Copy in place with the real password value; dark computes
  `background-color: rgba(245, 158, 11, 0.08)` and light (via the shared `starlight-theme` key)
  `rgba(245, 158, 11, 0.14)`, both exact matches for the values recorded in the PasswordReveal entry above,
  confirming the component's rendering and theming are unaffected by how its import arrives. `busqueda.mdx`
  (a page that does not use PasswordReveal) was spot-checked in-browser: no injected import side effects,
  content images, `starlight-image-zoom`'s "Zoom image" buttons, and `ToggleAll`'s "Expand all" control all
  still render, zero console errors. The existing rehype plugin, `expressiveCode` config, and
  `PasswordReveal.astro` itself were not modified.
- **Status:** Adopted + shipped. Unblocks the ROADMAP rollout of PasswordReveal to the remaining 33 Bandit
  pages: those pages now only need the `<PasswordReveal password="..." />` tag, no import line, and
  `notion_cleaner.py` (still uncommitted) only needs to emit the tag, not an import, when it adopts this
  convention.

### 2026-07-05 · PasswordReveal: a dedicated amber component for wargame passwords (not a FlagCapture reuse)
- **Decision:** New additive component `src/components/PasswordReveal.astro` (prop `password: string`)
  renders the OverTheWire Bandit "reveal the password" affordance as its own thing, deliberately distinct
  from `FlagCapture`: a wargame password is a WAYPOINT the reader pastes into SSH, not a trophy to
  capture. No gold/loot styling, no signature decode/scramble animation (reserved for real flags in
  FlagCapture). This reverses the direction implied by the 2026-06-27 FlagCapture entry and its matching
  ROADMAP item ("Apply FlagCapture to the Bandit Reveal Password toggles"); that swap is superseded by
  this dedicated component.
- **Layout/behavior:** a `PASSWORD` label, the value spoiler-blurred (`filter: blur(5px)`, purely visual;
  the real value is always in the DOM for screen readers and copy) as plain text with no border,
  background, or hover affordance of its own, then ONE control on the right, the ONLY interactive
  element in the row. It starts as an eye icon + "Reveal"; on click the value unblurs and the SAME
  control swaps in place to a copy icon + "Copy" (one swapping slot, no layout shift, focus stays put).
  A second click copies to the clipboard (with a `document.execCommand('copy')` fallback for non-secure
  contexts) and shows "Copied" for ~1.4s before reverting. No native `title` tooltip (tried once, dropped:
  looked bad); `aria-label` alone carries the accessible name ("Reveal password" -> "Copy to clipboard").
  A real `<button>` (keyboard + focus); reveal/copy are announced via a visually hidden
  `aria-live="polite"` region (`.pw-live.sr-only`, a new project-first visually-hidden utility in
  custom.css): no visible "Password revealed"/"Password copied" text ever appears.
- **Visual identity:** only the BUTTON reads as interactive; the label and value are also non-selectable
  (`user-select: none` on the container, inherited down), so copying is the only way to take the value,
  matching FlagCapture's captured-value pattern. The row is a passive AMBER CARD (not the neutral
  hairline frame of an earlier pass): literal `rgba(245, 158, 11, ...)` washes/borders on the container
  (dark 0.08 fill / 0.4 border, light 0.14 fill / 0.55 border, stronger and more golden), matching the
  site's canonical OverTheWire system (the same values `.spoiler-toggle` uses). The button text/icon uses
  the OTW accent directly, `#ffc23d` dark / `#a86f04` light (literal hex, not a token), with an
  `rgba(245, 158, 11, ...)` border/hover wash. Values are literal (no `color-mix()`/custom-property
  indirection) specifically so nothing can fail to resolve. Deliberately NOT `--flag-gold` (`#ffc23d`
  dark / `#C6A243` light happens to share the dark hex with OTW's accent, but the container/wash colors
  and the light accent differ, so the two never read as the same gold-flag treatment).
- **Two bugs caught over this component's revisions (engineering notes):** (1) an intermediate pass moved
  the amber off the container onto custom-property tokens (`--pw-amber-bg` etc. via `color-mix()`) and
  ended up rendering as a neutral/near-black box in practice; reverted in favor of the literal `rgba()`
  values above, which cannot fail to resolve. (2) a separate intermediate pass added
  `.pw-value:hover { filter: inherit; }`, meant as "hovering changes nothing." `inherit` instead pulls the
  PARENT's (`.pwreveal`) computed `filter`, which is always `none` (the container never sets `filter`), so
  hovering the STILL-LOCKED value silently removed the blur and exposed the password, defeating the
  spoiler; confirmed live (`.pw-value:hover` gave `filter: none` while `data-revealed` was still unset).
  Fixed by dropping the hover rule entirely: with no `:hover` rule touching `filter` anywhere, the
  existing blur/reveal rules govern it unconditionally in both states, which is what "hover changes
  nothing" actually requires.
- **Motion:** the only animation is the blur-to-clear `filter` transition, gated behind
  `@media (prefers-reduced-motion: no-preference)` in CSS alone: no JS matchMedia branch needed (unlike
  FlagCapture's decode, which is a real script-driven animation). Under reduced motion the value still
  reveals, just instantly.
- **Scope:** component + the `.pwreveal` block in `custom.css` only (placed after the `.spoiler-toggle`
  rules, before "LIGHT SURFACE DEPTH"), including the `.sr-only` utility. Not wired into `FlagCapture.astro`
  (separate file, by design). Now applied to `overthewire/bandit/0-1.mdx` (owner-wired, alongside the
  existing `<Toggle class="spoiler-toggle">` reveal, not replacing it yet); rolling it out to the
  remaining 33 Bandit pages (and removing the redundant spoiler-toggle once confirmed) is tracked in
  ROADMAP, same as the truncated-PEM rule (DECISIONS 2026-06-26) which is unaffected.
- **Verified:** both themes live in dev on `overthewire/bandit/0-1`. Container background/border compute
  to the exact literal values in both themes (dark `rgba(245, 158, 11, 0.08)` fill / `rgba(245, 158, 11,
  0.4)` border; light `rgba(245, 158, 11, 0.14)` fill / `rgba(245, 158, 11, 0.55)` border); button color
  computes to `rgb(255, 194, 61)` dark / `rgb(168, 111, 4)` light, exact matches for `#ffc23d` / `#a86f04`;
  container, label, and value all compute `user-select: none` (button alone is excluded and remains the
  only selectable/interactive element); container and value both compute `cursor: default`, button alone
  `cursor: pointer`; hovering the still-locked value leaves `filter: blur(5px)` and `data-revealed` unset
  (no reveal-on-hover); `.pw-live` computes to a 1x1px clipped box (screen-reader-only); the button never
  carries a `title` attribute (confirmed with the owner this stays removed, superseding the "tooltip"
  wording briefly reintroduced in an intermediate spec); reveal flips `filter` from `blur(5px)` to `none`
  with the bounding box byte-identical before/after at a real desktop width (no layout shift; a narrow
  ~279px viewport in one test pass did show a height delta, traced to the password text wrapping fewer/
  more lines as the button's label goes Reveal -> Copy, not a regression, not reproducible at normal
  reading widths). `npm run build` green (45 pages).
- **Status:** Adopted + shipped (component + custom.css). Application to the Bandit writeups is future
  work (ROADMAP), same as the still-uncommitted `notion_cleaner.py`.

### 2026-07-04 · Self-hosted fonts (subset WOFF2 + metric-matched fallbacks), Google Fonts removed
- **Decision:** Syne and JetBrains Mono are self-hosted as subset WOFF2 under public/fonts/ (served at
  /fonts/), replacing the remote Google Fonts request. Removes an external origin (privacy/optics on a
  security site), the extra DNS/TLS, and the render-blocking external stylesheet; the cross-site cache
  benefit is dead since browsers partition the HTTP cache by top-level site.
- **Faces:** JetBrains Mono 400/500/700 roman + 400/500 italic (broad subset: Latin, punctuation,
  currency, arrows, math, box drawing, block elements, geometric shapes, misc technical and symbols,
  since it renders terminal output); Syne 600/700/800 (narrow: Latin + general punctuation). 8 files,
  ~300 KB. Subset locally with fonttools pyftsubset + brotli in a throwaway venv (NOT a project
  dependency; not in package.json or the build).
- **@font-face home:** src/styles/fonts.css (not custom.css, so Design keeps custom.css authorship),
  loaded via Starlight customCss and imported by the two marketing pages. Font stacks are the real
  family, then the metric-matched fallback, then the generic.
- **Shift-free swap:** two fallback @font-face families with size-adjust + ascent/descent/line-gap
  overrides computed from the real font metrics (JetBrains Mono vs Courier New = 99.98/102.02/30/0;
  Syne vs Arial = 123.39/74.97/22.29/0). Each lists Windows and macOS locals first, then DejaVu and
  Liberation so the shift-free swap also applies on Linux, then the generic.
- **Preloads:** only jetbrains-mono-400 and syne-800 (the dominant above-the-fold body/code and display
  faces), crossorigin. font-display: swap on every real face.
  **Partly superseded by:** 2026-07-07 · Font `<link rel=preload>` hints removed site-wide (Firefox
  "preloaded but not used"), specifically this Preloads bullet: both hints were removed site-wide. The
  `@font-face` contract, the subsetting rationale, the metric-matched fallbacks and `font-display: swap`
  all stay in force, so this entry is not archived.
- **Verified:** zero fonts.googleapis/gstatic references (source + dist), both themes render identically,
  the Principle coda now uses a REAL JetBrains Mono italic, no tofu on terminal glyphs, build green
  (45 pages). Supersedes the "loaded from Google Fonts" note in CORE_SPEC and the self-host ROADMAP item.
- **Follow-up:** /fonts/*.woff2 should get Cache-Control: public, max-age=31536000, immutable via the
  pending public/_headers (out of scope, not touched).
- **Status:** Adopted + shipped.

### 2026-07-04 · Principle coda auto-appends from frontmatter; JetBrains Mono italic loaded
- **Completes** the follow-ups from the Principle-component entry below (auto-append, footer silence, true
  italic face).
- **Schema:** `content.config.ts` docs schema gains optional `principle: z.string()`, alongside os/tags.
- **Auto-append:** a second additive Starlight override, `src/components/overrides/Footer.astro` (Footer is
  the only default component rendering the Prev/Next `<Pagination />` after the content). On writeups that
  declare a non-empty `principle` it renders ONLY the shipped `<Principle>` coda, so the coda is the last
  thing on the page and no pagination/footer renders beneath it (the silence). Coupled to the coda: no
  principle means the default footer renders normally. Non-writeup pages are untouched. Writeup detection
  uses `entry.filePath` (under a platform dir, not an index page), robust across HTB tiers, VulnHub/Pico
  flat, and the OTW bandit hub. The coda is wrapped in a `.sl-markdown-content` element so the design's
  scoped `.sl-markdown-content .principle` CSS applies from the footer seam without touching custom.css.
  - **Partly superseded by:** 2026-09-03 · The Principle coda keeps the pager, and `principle:` is
    HackTheBox-only with a build guard. The Footer seam and the pagination silence are retired: the
    coda now renders inside the content via a MarkdownContent override and the default footer
    follows it.
- **Italic:** the Google Fonts head link adds the JetBrains Mono `ital` axis (0/1, weights 400 and 500), so
  the italic maxim uses the true italic face, not a synthetic slant (JetBrains Mono is monospace, so the
  face is confirmed via document.fonts, not glyph width).
- **Verified** both themes, all page types (writeup with/without principle, landing, bandit hub); build
  green (45 pages). Additive overrides, no forks; PageSidebar override untouched.
- **Status:** Adopted + shipped.

### 2026-07-04 · Decisive-line focus highlighting for Expressive Code {n} markers
- **Supersedes:** 2026-06-20 · busquedav2: drop EC line highlights; remove marked-line CSS
- **Decision:** a fence line marked `{n}` reads as focus: a lime gutter accent bar plus a restrained
  background tint that sits UNDER the semantic command-token colors and never competes with them. custom.css
  only, after the EC scrollbar rules. Tint kept low (dark `--sl-color-accent` 10%, light `--tp-deco-lime`
  12%); the lime lives only in the gutter (2px border-inline-start).
- **Selector / EC coordination:** targets `.ec-line.mark` (the class EC 0.42 applies; the element also
  carries `highlight`). custom.css is unlayered, so it cleanly overrides EC's default blue marked-line
  background (`rgba(154,182,255,.6)` light / `rgba(23,74,144,.6)` dark) with no `styleOverrides` needed and
  no doubling. Token colors (sudo magenta, recon, network cyan) stay untouched.
- **Verified** both themes on a marked line with sudo/nmap/curl: lime gutter + tint, tokens unchanged. No
  motion. Supersedes the "EC {n} highlights unused" note in CORE_SPEC.
- **Status:** Adopted + shipped.

### 2026-07-04 · Principle: a closing epigraph component for writeups (centered italic mono maxim)
- **Decision:** New additive component `src/components/Principle.astro` (prop `text: string`) renders the
  one-line lesson a writeup decrypts to as a literary epigraph, not a callout: `<aside class="principle">`
  with a dinkus (three-dot scene break), a small uppercase mono `PRINCIPLE` label, and the maxim in
  centered italic JetBrains Mono. Styled in custom.css after the lead-blockquote rules. No border,
  background, box-shadow, icon, accent color, or motion; identity is the mono label plus placement. Meant
  to be the LAST content element, after the Defense callout. Both themes via `--sl-color-text` /
  `--sl-color-gray-3` / `--sl-color-gray-4` (no lime, deliberately).
- **Placed on** busqueda as the working demo (`text="Parameterize, do not sanitize."`, which is busqueda's
  own Reflection lesson #1), imported via the `@components` alias. The task's relative `../../../components`
  path was the wrong depth for a difficulty-tier writeup (would resolve to a non-existent
  `src/content/components/`); the alias is the repo convention and what the other imports use.
- **Known caveat (engineering):** the maxim renders as a SYNTHETIC slant, not JetBrains Mono's true
  italic, because the Google Fonts link in `astro.config.mjs` loads `JetBrains+Mono:wght@400;500;700` with
  no `ital` axis (verified: zero italic faces loaded; normal vs italic glyph widths identical). Fix is a
  one-line font-URL change (add the `ital` axis), deferred as an engineering item, config left untouched.
- **Follow-ups (ROADMAP):** auto-append via the pipeline (so authors do not hand-place it), suppress
  Starlight pagination/footer beneath it on writeups (nothing should render after the coda), load the
  true italic face.
- **Verified** on busqueda both themes: aside with no border / background / shadow, centered italic mono
  maxim in `--sl-color-text`, quiet gray dinkus + label, sitting ~58px below the Defense callout. Type-safe
  (`Props.text: string`); `npm run build` green (45 pages).
- **Status:** Adopted + shipped (component + custom.css; demo on busqueda).

### 2026-07-04 · Port label is a cyan recon tag; recon findings become an aligned table with an Assessment eyebrow
- **Problem:** `.port-label` was only a red color override, which clashed with the cyan recon callout it
  lives in and, like the old inline-code chip, spent an alert color on a neutral identifier (a port is an
  address, not a danger). Separately, a recon callout's port list read as a loose bullet list with no
  structure.
- **Decision (A, port tag):** `.port-label` becomes a calm cyan mono TAG (1px border + soft tint + bold
  700) that harmonizes with the recon accent and out-ranks a passing inline-code reference by WEIGHT, not
  by adding another cyan shade. Theme-aware: bright `#41efff` text on the near-black dark tint, deeper teal
  `#05495b` on the warm light paper; fills/borders are `color-mix` of `#41efff` / `#096577` (the recon
  accent + its light ink). `!important` on `color` is kept to retain the prior override strength.
- **Decision (B, findings layout):** inside `.cl-recon`, a markdown port list becomes a scannable findings
  table: `list-style:none`, each `li` uses a hanging indent (padding-left 5.6em / text-indent -5.6em) so
  wrapped notes align under the description, and the row-leading tag gets `min-width:4.9em` so ports align
  down a left rail (port tags used inline in prose stay snug). The concluding paragraph is the ASSESSMENT:
  a `:has(ul)`-gated hairline (`--acc` @ 24%) plus an uppercase mono `Assessment` eyebrow (bright `--acc`
  on dark, deep `--cl-ink` on light). `:has(ul)` means a prose-only recon callout shows no eyebrow.
- **Gotcha fixed:** `text-indent` is an inherited property, so the li's `-5.6em` hanging indent leaked into
  the `.port-label` inline-block and shoved its own port text off-screen (rendered at x ~= -48, invisible).
  Fixed with `text-indent:0` on the tag rule; the row hanging indent and the tag's position on the line are
  unaffected (both governed by the li, not the tag). This one line is the only deviation from the pasted spec.
- **Scope:** `.cl-recon` only; other callout types and normal lists untouched. The eyebrow label is the
  single word in `content`, changeable in one place. No new tokens, no new deps, no motion.
- **Verified** on busqueda (both themes): ports read as cyan tags (no red anywhere), port weight 700 vs the
  harmonized inline-code 400, tags align in a column, notes wrap under the description, the assessment sits
  under a hairline with the eyebrow (deep teal light / bright cyan dark), and an injected prose-only recon
  callout shows no eyebrow (`::before` content `none`, border 0).
- **Status:** Adopted + shipped (custom.css only).

### 2026-06-30 · Content images and writeup structure: flat files + parallel src/assets (supersedes colocated index.mdx)

Replaces an earlier undocumented convention: writeup images were colocated next to
each writeup and each writeup was named index.mdx. That convention predates this log
and has no entry of its own, so there is nothing to archive.

Supersedes in part: 2026-06-01 · Difficulty dirs are Capitalized; sidebar config
matches casing exactly, specifically its Capitalized-directory decision. That entry's
case-sensitivity rule still holds on the lowercase form, so it stays live and is not
archived.

Decision: Writeups are flat .mdx files under src/content/docs (one file per
writeup, no per-writeup folder). Their images live in a parallel tree under
src/assets mirroring the content path (src/assets/<platform>/<difficulty>/<machine>/).
Images are referenced from the writeup with a relative Markdown path
(../../../../assets/... , four ../ from a difficulty-tier writeup) so Astro's
built-in astro:assets pipeline optimizes and hashes them. Plain Markdown image
syntax is used, not <Image />, to avoid per-image import boilerplate across many
hand-authored writeups and to keep starlight-image-zoom coverage of content
images intact.

Why the reversal: Colocating images forced each writeup into its own folder, and
Starlight sidebar autogenerate renders every folder as a collapsible group, so a
single-page writeup folder became a phantom group wrapping one page. Keeping
colocation required either accepting phantom groups or hand-listing every writeup
in astro.config.mjs; both were rejected. Flat files let autogenerate produce clean
single entries with zero manual config and no phantom groups, matching the Bandit
pattern. Images under src/assets keep full astro:assets optimization, so no
performance is lost. The costs given up (physical colocation, clean image paths)
have low practical value for a single-repo site and did not justify the recurring
sidebar cost.

Boundaries: Icons remain in public/icons. Marketing images remain in public/images.
The rehype lazy-loading plugin and notion_cleaner.py are unchanged. No user-facing
URLs change; writeups keep their routes (/hackthebox/<difficulty>/<machine>/) and
images are served as hashed astro:assets under /_astro. Sitemap and Search Console
are unaffected.

Convention going forward: a new writeup is added as a single flat .mdx file in the
appropriate difficulty folder, with images placed under the parallel src/assets
path and referenced via the relative ../ path. Autogenerate surfaces it
automatically; no astro.config.mjs edit is needed per writeup.

### 2026-06-29 · Inline code inside a colored callout harmonizes with the callout accent
- **Problem:** the standalone red inline-code chip (see the entry below) clashed inside a colored
  callout: two reds in a `vuln` callout (worst in dark, where the callout tint is more saturated), and
  red code also fought the cyan / violet / green / amber callouts.
- **Decision:** inline code inside `.cl` (Callout.astro) drops the standalone red chip and adopts the
  callout's OWN accent, generically, by reading the callout's existing `--acc` / `--cl-ink` tokens, so
  every type (recon / loot / intel / defense / vuln) adapts with no per-type rule: text = the accent,
  fill = a soft SAME-accent tint (quiet emphasis, not a hard chip), the hairline is dropped
  (transparent), and the rounded corners + mono carry over from the standalone rule.
- **Per theme:** DARK text = bright `--acc`, fill = `color-mix(in oklab, var(--acc) 16%, transparent)`.
  LIGHT text = `color-mix(in oklab, var(--cl-ink) 80%, #000)` (the callout ink deepened ~20%, because the
  vuln / loot / defense inks sit only ~4:1 on the callout tint and body-size code needs AA 4.5:1), fill =
  `color-mix(in oklab, var(--acc) 13%, transparent)`.
- **Scope:** `.cl :not(pre) > code` only, so standalone inline code and every code block (in `<pre>`) are
  untouched.
- **Verified** on busqueda (all five callout types, both themes): code takes each callout's accent; AA on
  the chip is dark 6.7 to 14.4:1, light 5.6 to 7.8:1; the standalone chip is unchanged. `npm run build`
  green (44 pages).
- **Status:** Adopted + shipped.

### 2026-06-29 · Inline code is its own object: a rounded red hairline chip (theme-tuned)
- **Decision:** Inline code (`:not(pre) > code`) is now one defined object shared by both themes: a soft
  red-tinted fill + a warm-red 1px hairline + SOFT ROUNDED corners (border-radius 5px, padding
  0.12em 0.4em, font-size 0.875em, red mono text). It is readability-first (a passing reference,
  subordinate to the sentence) and deliberately the OPPOSITE of the sharp-cornered code-block
  destinations (DECISIONS, same date). ONE structure, colors tuned per theme; no surface special-casing,
  so it reads on the page, the raised toggle panel, and inside a `<summary>` title on its own (the old
  summary-code color special cases were removed).
- **Colors:** DARK text `#ff9b9b`, fill `rgba(255,120,120,0.07)`, border `rgba(255,120,120,0.26)`. LIGHT
  text `#b03326`, fill `#f3e4d6`, border `rgba(150,74,38,0.32)`. Red text stays AA on its own fill (dark
  9.2:1, light 5.0:1, both verified on the live build in a real writeup).
- **Supersedes in part:** 2026-06-29 · Light/code/toggle polish: sharp code frames, light inline-code chip,
  softer copy toast, tighter toggle gap, specifically its light-only cream chip (`#f7f0dc`). This unifies both
  themes and drops the toggle-title special case. The rest of that entry stays in force and it is not
  archived.
- **Status:** Adopted + shipped (custom.css only; `npm run build` green, 44 pages).
- **Amended 2026-06-30 (surface only), no separate entry:** the chip is now NEUTRAL and the red identity lives only in
  the text. Structure (5px radius, 1px border, 0.12em 0.4em padding, 0.875em, red mono text) and the
  no-special-casing behavior are unchanged; only the fill + border moved off red so neutral tokens
  (filenames, ports) never broadcast false urgency. New values: DARK fill `rgba(255,255,255,0.055)` +
  border `rgba(255,255,255,0.11)` (white-alpha, adapts across the page / toggle panel / `<summary>`);
  LIGHT fill `#ece2d6` + border `var(--tp-divider)` (the shared structural hairline). Red text is
  unchanged (`#ff9b9b` / `#b03326`); AA on its own fill is dark 9.0:1, light 4.9:1 (verified live, both
  themes). The callout-harmonize rule (2026-06-29) is untouched. `npm run build` green (45 pages).

### 2026-06-29 · Light/code/toggle polish: sharp code frames, light inline-code chip, softer copy toast, tighter toggle gap
- **Sharp code blocks (both themes):** the EC frame radius is zeroed via EC's own `--ec-brdRad: 0` plus
  an explicit `.expressive-code .frame { border-radius: 0 }`. EC also leaves a 1px residual on the title
  tab (top) and code body (bottom) from `calc(--ec-brdRad + border-width)`, so `.frame .header/.title/pre`
  are zeroed too. Code blocks now read as crisp rectangles on paper as they already did on dark. The EC
  copy button keeps its own radius (3.2px); no toggle / button / badge / divider radius is touched.
- **Light inline-code chip.** **Partly superseded by:** 2026-06-29 · Inline code is its own object: a rounded
  red hairline chip (theme-tuned), which replaced this light-only cream chip with one unified two-theme
  object the same day. Kept for history, and the rest of this entry stays in force. The light
  `:not(pre) > code` fill (`#f3ebda`, near-invisible on the `#f2ede0` toggle
  panel and borderless) became a defined cream chip `#f7f0dc` + a warm 1px border `rgba(95,74,38,0.32)`.
  The fill had to stay light to keep the red text (`#c92a2a`) at AA (4.8:1), so it was a touch lighter
  than both surfaces and the border carried the edge on the close-toned panel. Dark was left unchanged
  in this pass (its default chip was already distinct), which 2026-06-29 · Inline code is its own object: a rounded red hairline chip (theme-tuned) then unified.
- **Softer light copy toast:** EC's success feedback (`.expressive-code .copy .feedback`, fed by
  `--ec-frm-tooltipSuccessBg` / `-Fg`) was a saturated teal `#438076` + white, too bold on paper.
  Light-only override to a pale sage `#d6e4c0` + deep-olive `#2f4d09` text (7.2:1). Dark keeps EC's default.
- **Tighter toggle gap:** the gap under an open toggle title was summary padding-bottom 0.3rem +
  `.toggle-body` padding-top 0.5rem (~12.8px). Now `.toggle-body` padding-top is 0.25rem and the summary
  bottom padding is 0.15rem WHEN OPEN only (the closed pill keeps its balanced 0.3rem/0.3rem), so the gap
  is ~6.4px. Content toggles only (scoped to `.sl-markdown-content`); sidebar group summaries untouched.
- **Scope:** custom.css only, no Starlight rebuild, pinned versions, no em dashes. Verified on
  `npm run dev` in both themes; `npm run build` green (44 pages).
- **Status:** Adopted + shipped.

### 2026-06-29 · TOC active entry recolors to its heading level (cyan h3, gray h4+)
- **Decision:** In the right "On this page" column, the entry the reader is currently on
  (`aria-current="true"`) now takes the hue of the heading it points to, mirroring the in-page
  hierarchy: h1/h2 keep Starlight's green `--sl-color-text-accent` (unchanged), **h3 turns cyan**
  (`--tp-cyan` dark `#41efff` / `--tp-cyan-ink` light `#08697a`, the same tokens as the `###` heading),
  and h4/h5/h6 go muted gray (`--sl-color-gray-2`, the h4 heading color). Flags keep gold (the
  2026-06-20 rule, plus the cyan rule excludes `#user-flag` / `#root-flag` by href). Only the current
  entry recolors; inactive entries keep the muted default.
- **Why:** the heading ladder already uses a lime/cyan/gray duotone in the body (DECISIONS 2026-06-20
  era); carrying that hue into the active TOC entry makes the column echo the content hierarchy and
  strengthens the sense of place while scrolling. Owner request.
- **How:** unlayered CSS in `custom.css` (beats Starlight's layered `a[aria-current]` green). Heading
  level is read from Starlight's TOC NESTING depth (it nests h3 under h2, h4 under h3, by
  `maxHeadingLevel`): h3 = one level (`nav > ul > li > ul > li > a`), h4+ = two or more. Parity with the
  heading rules is by reusing the SAME tokens (`--tp-cyan` / `--sl-color-gray-2`), so a heading color
  change carries over (noted in the CSS + CORE_SPEC to update both). Desktop column only; the mobile TOC
  keeps Starlight's white + checkmark active style. h4/h5/h6 are not in the TOC until
  `tableOfContents.maxHeadingLevel` is raised, so those rules are future-proofing.
- **Verified:** live build at 1440w, both themes. h2 green, h3 cyan (matches `--tp-cyan` exactly), flags
  gold (excluded), synthetic h4/h5 = gray-2; `npm run build` green (44 pages).
- **Status:** Adopted + shipped.

### 2026-06-28 · ToggleAll hides below two toggles (single-toggle pages too)
- **Decision:** The Expand/Collapse-all control now self-hides unless a page has **two or more** content
  toggles. The reveal threshold in `ToggleAll.astro` moved from `>= 1` to `>= 2` (`toggles.length < 2` stays
  hidden), acting on the same `.sl-markdown-content details.toggle:not(.toggle-flag)` set. A bulk
  expand/collapse adds nothing over a single lone toggle, so single-toggle pages (every current
  single-toggle Bandit level) now behave like the zero-toggle pages and drop the control. It is count-driven,
  so it clears automatically with no per-writeup edits.
- **Supersedes in part:** 2026-06-20 · ToggleAll control: sidebar placement, scroll anchoring, native-anchor
  fix, specifically its "self-hides when a page has no toggles" threshold. The rest of that entry stays in
  force and it is not archived.
- **Rationale:** the control is a bulk affordance; with one toggle it is redundant with the toggle itself and
  just adds chrome to the TOC column.
- **Verified:** live build at 1440w. Single-toggle `bandit/0-1` (control gone), multi-toggle `bandit/16-17`
  (control present), zero-toggle `bandit/` index (still gone); `npm run build` green (44 pages).
- **Status:** Adopted + shipped.

### 2026-06-27 · FlagCapture "Decrypt to Capture" replaces the flag reveal toggle
- **Decision:** The User/Root flag value renders in a new **`FlagCapture.astro`** control under the
  existing gold flag heading, replacing the old `<Toggle flag>` + `:::tip[Answer]` (which duplicated the
  flag name already owned by the heading + TOC). It is LOCKED by default (static gold cyphertext the exact
  length of the real value), and a click DECRYPTS it into the real flag using the site's signature
  decode/scramble effect, then reads CAPTURED with a copy button.
- **Component API:** `<FlagCapture type="user" | "root" flag="..." />`. `type` drives ONLY the gold tier
  (user vs richer root); there is NO per-type glyph (the heading already owns the flag icon + gold name).
  The control carries one neutral state icon: a LOCK (LOCKED) that swaps to a CHECK (CAPTURED). `flag` is
  the real value (always in the DOM for screen readers + copy; visually scrambled until capture). The whole
  frame is one real `<button>` (keyboard + focus); an `aria-live="polite"` region announces "User/Root flag
  captured". The frame matches the writeup Toggle (full content width, 6px radius) but sits a bit taller
  (more vertical padding) for presence, with a slightly larger value/icon. An icon-only copy button sits
  INSIDE it (vertically centered at the right, like the code-block copy): on copy it swaps to a check and
  shows a golden "Copied!" pill (the CAPTURED label fades out under it), reverting after ~1.5s. (Revised 2026-06-27: dropped the duplicate flag/crown identity glyph, the `path` prop + its
  caption, and the chip sizing; see fixes below.)
- **Decode reuse:** the scramble is the SAME effect as the hero/headline decode in `src/pages/index.astro`
  and `about.astro` (charset `!<>-_\/[]{}=+*^?#01`, 45ms interval), ported into the component script at
  `dur=15` (~720ms) so the flag decrypt matches the brand signature. Not reinvented.
- **Gold values (tokens in custom.css):** identity gold `--flag-gold` `#ffc23d` dark / `#C6A243` light
  (decorative: border, glyph, label). Root tier `--flag-gold-root` `#ffcf63` dark / `#B8862B` light. The
  flag VALUE text uses AA-grade golds `--flag-gold-val` `#ffc23d` dark / `#7a5a12` light and
  `--flag-gold-val-root` `#ffcf63` dark / `#6b4e0e` light, because the bright loot gold is NOT text-AA on
  paper. Verified contrast on the captured row: dark user 11.66:1 / root 12.81:1; light user 4.99:1 / root
  5.93:1 (all >= AA; root deeper so it reads as the bigger prize).
- **Theme + motion:** the capture moment is a warm gold GLOW pulse in BOTH themes (revised 2026-06-27 from
  the original dark-glow / light-underline split, so light feels as rich as dark): a one-shot glow on a
  `::after` overlay + a value text-glow, tuned per theme (light halo stronger, `--fc-glow` 72% vs dark
  55%, to read on paper). The captured row also gets the V3 light surface depth. Locked state is static
  (no idle animation; reading stays calm). `prefers-reduced-motion` (read at click time) skips the
  scramble and the glow entirely and reveals the value instantly in the CAPTURED state; copy still works.
  No flashing.
- **Icon alignment (2026-06-27):** the lock/check and copy/check are each ONE `<svg>` whose `<path>` is
  swapped in JS, not two display-toggled siblings. A flex item that follows a `display:none` sibling
  drifts ~8px off the value/label center (a flexbox quirk); a single icon stays a lone flex child and
  centers cleanly.
- **Pipeline:** `notion_cleaner.py` (still NOT committed) should emit the gold heading + `<FlagCapture>`
  (with the import) for both user and root flags, handling user-only / root-only writeups. Contract
  recorded in CORE_SPEC §7.
- **Status:** Adopted + shipped. Built and verified live (both themes, reduced-motion, copy) on the
  `busquedav2.mdx` testbed; owner then migrated `busqueda.mdx`'s User/Root flags to `<FlagCapture>` and
  deleted `busquedav2.mdx`. Shipped in PR #5 (`dev` -> `main`), `npm run build` green (44 pages).
  The Bandit "Reveal Password" toggles are a candidate for the same swap (see ROADMAP).
- **Supersedes in part:** 2026-06-20 · Flag loot gold: one signal for User/Root Flag (heading, toggle, TOC),
  specifically its `.toggle-flag` reveal. The gold heading and the gold TOC entry from that entry are
  unchanged, so it stays in force and is not archived.

### 2026-06-26 · Truncate embedded private keys in writeups (GitHub push protection)
- **Decision:** Writeups whose level reward is an SSH/RSA private key (OverTheWire Bandit
  16->17, and any future key-based level) must NOT commit the full PEM. In the single "Reveal
  private key" spoiler toggle, keep the `-----BEGIN/END RSA PRIVATE KEY-----` markers plus only
  the first and last base64 lines, with the middle replaced by an ellipsis note
  (`... (key truncated; the SSL service returns the full PEM on the box) ...`); mask the key
  everywhere else on the page.
- **Why:** GitHub push protection (GH013, "GitHub SSH Private Key") rejects any push that adds a
  committable private key, even though the Bandit keys are public (they ship with the public
  wargame). Truncating keeps `dev`/`main` pushable and the secret scanner quiet while the page
  still shows the key's shape; the real key is always retrievable on the box. Chosen over
  redact-to-placeholder (loses the shape) and over GitHub's allow-secret URL (never bypass push
  protection for a real key).
- **Remediation:** if a push is already blocked and the offending commit is unpushed,
  `git reset --soft HEAD~1`, truncate, re-commit, push. No shared-history rewrite, no `--allow` bypass.
- **Status:** Adopted (hard rule). Applied to `bandit/16-17.mdx` (commit ba3c2d5).

### 2026-06-20 · Flag loot gold: one signal for User/Root Flag (heading, toggle, TOC)
- **Decision:** Unify the User Flag / Root Flag concept into a single theme-aware gold via a `--flag-gold`
  token (`#ffc23d` dark / `#835e00` light, AA in both). It colors the body heading (replacing the brown
  `.task-title`, with a flag-SVG mask icon as `::before`), the reveal toggle (`.toggle-flag`, refactored
  to the token), and the right TOC entry (muted gold at rest for scannability, full gold on hover/current;
  other TOC entries keep the green `--sl-color-text-accent`). custom.css only; no glow or motion.
  **Partly superseded by:** 2026-06-27 · FlagCapture "Decrypt to Capture" replaces the flag reveal toggle,
  specifically the `.toggle-flag` reveal named here. The gold heading and the gold TOC entry are unchanged,
  so this entry stays in force and is not archived.
- **Why:** the concept previously read as three different colors (brown heading, gold toggle, green TOC);
  one gold makes it scan as the writeup's prize.
- **Dependency / interim:** flag headings have no dedicated class (they reuse `.task-title`, shared with
  real Task headings), so they are targeted by the deterministic slug ids `#user-flag` / `#root-flag`. A
  `.flag-title` (and a flag-toggle hook) from the pipeline is the clean fix (see ROADMAP).
- **Status:** Adopted. Optional Root-vs-User hierarchy (part 4) deferred: the toggle icon is content-lane
  (flag SVG hardcoded in the MDX label), so a CSS-only Root crown/richer-gold would desync from its toggle.

### 2026-06-20 · Icon-based tagged callouts (Callout.astro)
- **Decision:** A presentational `Callout.astro` renders `<aside class="cl cl-{type}">` with a header
  (icon + UPPERCASE label) and a slot. Five types: recon (cyan, magnifier), loot (amber, padlock), intel
  (violet, information), vuln (red, warning), defense (green, inline shield SVG since Starlight has none).
  Icons via Starlight's `<Icon>`; colors/border/tint in `custom.css` (`.cl*`), theme-aware (vivid border +
  faint tint, light-mode ink swap for icon/label). Replaced an earlier bracket-tag version.
- **Why:** semantic, scannable writeup callouts (recon/loot/intel/vuln/defense) without forking Starlight
  admonitions. Applied to `busquedav2.mdx` (the design testbed).
- **Status:** Adopted.

### 2026-06-20 · Homepage pipeline: Reflection phase reads muted violet
- **Decision:** The 4th "How I work" pipeline phase title (`.phase:nth-child(4) .pt`, Reflection) is
  `#b294d4` (soft muted violet, PicoCTF-purple family) instead of `var(--text)` white. `index.astro` only.
- **Why:** white blended into the body text; a muted violet completes the cyan/magenta/lime trio while
  reading as the calm final phase. Restrained, dark-only page.
- **Status:** Adopted.

### 2026-06-20 · Marketing pages declare /favicon.svg
- **Decision:** `index.astro` and `about.astro` add `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`.
- **Why:** they had no favicon link, so browsers auto-requested `/favicon.ico` (a dev `[router]` warning);
  there is no `favicon.ico` in the repo (only `favicon.svg`). Declaring the SVG stops the fallback request
  and gives the marketing pages a favicon. (Starlight content pages already reference it.)
- **Status:** Adopted.

### 2026-06-20 · ToggleAll control: sidebar placement, scroll anchoring, native-anchor fix
- **Decision:** A dependency-free "Expand all / Collapse all" control (vanilla TS, `ToggleAll.astro`) is
  injected at the BOTTOM of the right "On this page" column via an additive Starlight `PageSidebar`
  override that renders `<Default />` then `<ToggleAll />` (official API, no fork; wired in
  `astro.config.mjs` `components`). It targets `.sl-markdown-content details.toggle:not(.toggle-flag)`
  (Toggle gained a stable `.toggle` class), so it never touches sidebar/nav/code or spoiler flags.
  Self-hides when a page has no toggles (**partly superseded by:** 2026-06-28 · ToggleAll hides below two
  toggles (single-toggle pages too), which raised the threshold to fewer than two toggles; the rest of this
  entry stays in force);
  desktop-only (`sl-hidden lg:sl-block`; the right sidebar is
  `position:fixed`, so it follows scroll). Per-page model (a cross-page global was rejected).
- **Look:** the original bordered pill (neutral gray text + border, cyan accent on hover/focus). An
  earlier de-emphasized treatment (small/dim/light) was tried and REVERTED. Separated from the TOC by a
  2.5rem gap plus a subtle `--sl-color-hairline` divider (a hard divider had read as a list separator).
- **Scroll anchoring (no teleport):** before mutating, record the current heading's
  `getBoundingClientRect().top`; set `.open`; re-measure; `window.scrollBy(0, delta)` synchronously (same
  task). To kill a few-pixel reversible shift, native scroll anchoring is suppressed (`overflow-anchor:none`
  on `document.documentElement`) for just the operation and restored next frame (rAF), so the manual
  correction is the sole corrector. A `behavior:'instant'` attempt was tried and REVERTED (wrong cause).
- **Status:** Adopted. Anchoring verified (drift 0) in headless; the few-pixel shift is not reproducible
  in headless Chromium (known false negative), so visual confirmation of that shift fix is pending on the
  owner's real browsers (Chrome/Edge/Opera GX). See ROADMAP open issues.

### 2026-06-15 · Command-highlight palette rebuilt on a principled OKLCH basis (+ bold weight)
- **Decision:** Redesign the `.ec-cmd-*` palette in OKLCH, measured against the rendered code bg
  (tokyo-night `#1a1b26` / one-light `#fafafa`), separating the three channels: (1) LIGHTNESS uniform
  per theme (dark `L 0.745`, light `L 0.43`) so all categories share one brightness and each clears
  **WCAG 7:1 (AAA)**, measured; (2) HUE = category, kept off the theme's string/keyword/function hues
  (privilege magenta, recon gold `h95`, network cyan `h200`, inspect warm-sand `h60`); (3) CHROMA =
  loud vs quiet, so recon/network are vivid and inspect is LOW chroma at the SAME L/contrast. Final
  values: recon `oklch(0.745 0.153 95)`/`oklch(0.43 0.088 95)`, network `oklch(0.745 0.126 200)`/
  `oklch(0.43 0.073 200)`, inspect `oklch(0.745 0.045 60)`/`oklch(0.5 0.045 60)`. Also added a second
  channel: every recognized command is `font-weight:700` (incl. sudo, weight only). Inspect set: ls, cd,
  cat, echo, whoami, id, find, grep, pwd, ping; recon also includes whatweb.
- **Why:** The old inspect color was near-invisible because it had been quieted by dropping CONTRAST;
  the fix is to drop CHROMA instead and hold lightness/contrast uniform with the vivid set. Working in
  OKLCH makes loudness (chroma) and legibility (contrast) independent, so "quiet" no longer means
  "dim." Bold gives a weight channel so the command word pops without relying on color alone. Verified
  in-browser in both themes: computed colors match the shipped `oklch()` values, browser-measured
  contrast matches the design math (recon 7.56/7.72, net 7.96/7.45, inspect 7.45 dark / 5.8 light), and
  command-position detection leaves command OUTPUT untagged. Light inspect is the one deliberate
  exception to uniform-L: lightened to `oklch(0.5 0.045 60)` (~5.8:1, still AA) at owner request because
  the darker uniform brown read too heavy on paper; the quiet-via-chroma intent is unchanged.
- **Constraint honored / tradeoff:** sudo's COLOR is the immovable anchor and is NOT recolored, so it
  sits at ~5.5:1 (dark) / ~5.4:1 (light), just under the 7:1 the redesigned categories meet. "All four
  at sudo's lightness AND all ≥7:1" is physically impossible without recoloring sudo, so the 7:1 floor
  applies to the three redesigned categories and sudo keeps its hue/color (gaining only bold). Light
  vivid chroma is gamut-limited at `L 0.43` (warm/teal hues cannot be both dark and saturated on white),
  so light reads more muted than dark; this is the honest cost of the 7:1 floor on a paper bg.
- **Supersedes in part:** 2026-06-14 · Code-block command highlighting by semantic category, specifically its
  color values. Its mechanism and category structure still stand, so it stays in force and is not archived.
- **Status:** Adopted. Colors live in `custom.css` only (`oklch()` +
  `!important`); command-list additions (`cd`, `echo`, `ping` to inspect; `whatweb` to recon) are in
  `ec-priv-command.mjs`.

### 2026-06-14 · Code-block command highlighting by semantic category
- **Decision:** Extend the EC command-tagging plugin (`ec-priv-command.mjs`) from sudo-only to four
  categories colored by signal value: privilege (magenta; sudo/su/doas), recon (gold/orange; nmap,
  gobuster, ffuf, feroxbuster, nikto, enum4linux, smbclient), network (cyan; nc/ncat/netcat,
  penelope, socat, curl, wget, ssh, chisel), inspect (quiet lavender; ls, cat, whoami, id, find,
  grep, pwd). Match in command position (first word after a prompt / sudo / `|` `&&` `;`); sudo keeps
  its exact content-match path and color. Command lists are one-line-extendable.
- **Why:** One color per category (not per command) communicates intent and avoids monochrome code.
  Command-position avoids tagging the same short word where it appears in command OUTPUT. Recon is
  gold not lime because lime is too close to the theme command-green; recon hue is theme-tuned
  (gold on ink, burnt-orange on paper) to clear the theme amber. All four are WCAG AA on the code bg
  and mutually distinct in both themes.
- **Partly superseded by:** 2026-06-15 · Command-highlight palette rebuilt on a principled OKLCH basis
  (+ bold weight), specifically the color values recorded here. The mechanism and category structure still
  stand, so this entry stays in force and is not archived.
- **Status:** Adopted and committed/pushed. Residual
  risk: an output line whose first word is exactly a listed command can be mis-tagged (rare).

### 2026-06-14 · Platform-index duotone: platform color + universal cyan secondary
- **Decision:** On the platform index, the platform color leads and a universal cyan secondary
  (`--pf-accent-2`: `#41efff` dark, `#08697a` light) is the duotone partner. Cyan on the stat label,
  card eyebrow, and "Read writeup" affordance; difficulty colors on the stat breakdown; cyan ring on
  the active filter pill; platform color stays on the name, count-up number, and card accent bar.
- **Why:** Single-color platforms read monochrome (worst on HackTheBox: green on green). Cyan is not
  any of the four platform hues, so it complements all. Keeps the platform color clearly the lead.
- **Status:** Adopted and committed/pushed to `dev`.

### 2026-06-14 · Sidebar: taller rows + 17rem width
- **Decision:** Increase sidebar link/summary block padding + line-height (fuller rail, bigger touch
  targets) and trim `--sl-sidebar-width` to `17rem` (from 18.75rem). Padding, not `<li>` margins, so
  the active pill, nesting guide line, and platform dots stay aligned.
- **Why:** Sparse sections looked half-empty and the default rail felt too wide. Owner picked 17rem
  after trying 16 / 16.5 (16 felt too narrow).
- **Status:** Adopted (committed).

### 2026-06-14 · Light-mode art-direction: paper-native "risograph"
- **Decision:** Give light its own identity (dark untouched, all rules `[data-theme='light']`):
  near-black editorial ink, a faint warm technical dot-grid behind content (replacing the bottom
  glow), a vivid decorative accent palette for non-text use, and crisp flat badges with deepened
  AA-safe inks. A risograph title-misregistration (offset colored ghost on the page title) was tried
  and REJECTED (looked bad).
- **Why:** Light should be premium on paper terms, not a dimmed copy of dark's neon. The title
  effect did not read well, so it was reverted (its only leftover, an unused `--tp-deco-magenta`
  token, was removed 2026-06-14).
- **Status:** Adopted (committed). Title effect: rejected.

### 2026-06-14 · Hidden easter-egg trail (themed 404 + /secret terminal)
- **Decision:** A four-step trail, all inside Starlight: a themed 404 (`404.mdx`, splash template +
  hero, Starlight slug-404 override) with a breadcrumb to `/robots.txt`; the robots.txt comment
  points to `/secret`; `/secret` (hidden from nav, `pagefind:false`, noindex) hosts a from-scratch,
  zero-dependency vanilla-TS terminal (`SecretTerminal.astro`) with help/whoami/ls/cat/sudo/random
  (+ surprise/roll)/flag/clear; `flag` reveals `flag{curiosity_is_my_exploit}` + a recruiter note.
- **Why:** Personality feature; built in Starlight so it inherits theme/fonts/toggle. Terminal is
  zero-dependency per spec. `random` builds its writeup list at build time from `getCollection`.
- **Status:** Adopted (committed). Konami + styled console greeting included on `/secret`.

### 2026-06-14 · robots.txt managed in-repo (public/robots.txt)
- **Decision:** Owner chose to keep `robots.txt` in the repo at `public/robots.txt` (overriding the
  earlier "Cloudflare-managed, out of repo" stance). It currently contains only the easter-egg
  breadcrumb comment + a `Sitemap:` line.
- **Why:** Owner's call; simpler to version the breadcrumb with the site.
- **Status:** Adopted, with a caveat: on deploy this file is served as `/robots.txt` and may
  override the Cloudflare-managed bot disallows / Content-Signals. Must add the full managed content
  before relying on it (see ROADMAP open issues).

### 2026-06-14 · Platform index pages: PlatformIndex + WriteupCard components
- **Decision:** Replace each platform's static `.platform-intro` header with reusable Starlight-
  embedded components: `PlatformIndex` (data: filters `getCollection('docs')` to the platform,
  derives difficulty from the entry id path, renders an animated hero + difficulty filter rail +
  grid) and `WriteupCard` (presentational, `showPlatform` prop off here, on for a future global
  `/writeups` index). Each `{platform}/index.mdx` is now minimal frontmatter + `<PlatformIndex/>`.
  `content.config.ts` gains optional `os`/`tags` (forward-compatible; omitted gracefully today).
- **Why:** Make the landings showcase writeups with the homepage WOW, reusing one card for path 3
  (global index) without forking Starlight. Starlight lowercases doc URLs, so card hrefs use
  `entry.id.toLowerCase()`.
- **Status:** Adopted (committed).

### 2026-06-14 · Git hygiene: no Claude attribution; trailer scrubbed from history
- **Decision:** Never add "Co-Authored-By: Claude" or "Generated with Claude Code" to commits or PR
  bodies. Removed the trailer from two existing commits via history rewrite (force-pushed `dev` +
  `main`; only messages changed, trees identical). Commits are authored as `Idan-Babayan`.
- **Why:** Owner's hard rule (the attribution is unwanted noise on his own repo); extends the no-em-
  dash-style "AI tell" stance. Done while the repo is solo so a force-push is safe.
- **Status:** Adopted (hard rule).

### 2026-06-06 · Rebrand domain: idanstudio.click -> idanlab.dev
- Decision: Canonical domain is now https://idanlab.dev. Project name, repo, local folder,
  and all site copy move from "idanstudio" to "idanlab". idanstudio.click is kept as a 301
  redirect during transition, then retired.
- Why: "idanstudio" never fit the identity (Idan.Lab). .click reads cheap for a security
  portfolio (no SEO penalty, weak trust); .dev signals technical/security and forces HTTPS.
  idanlab.com, idanlabs.com, idan.com, and idan.dev were all taken; idanlab.dev keeps the
  Lab brand on a developer TLD. Done now while SEO equity is near zero (cheapest time).
- Status: Adopted.

### 2026-06-01 · Canonical platform palette: lime / red / purple / amber
- **Decision:** Resolve the two competing platform color schemes in favor of the homepage /
  sidebar-dot / about-accent palette: HackTheBox lime, VulnHub red, PicoCTF purple,
  OverTheWire amber. Rewrote the writeup `.platform-*` badges in `custom.css` to match
  (light: `#4d7c0f` / `#d12f2f` / `#8b3dc4` / `#a86f04`; dark: `#b6ff3c` / `#ff5c5c` /
  `#d96bff` / `#ffc23d`). Retired the old blue / cyan / violet / orange badge set.
- **Why:** One palette everywhere; the badges were the lone holdout. The homepage palette is
  the brand, so the badges move to it rather than the reverse.
- **Side effect handled:** HTB lime now collides with `difficulty-easy` green. Every
  `.platform-*` badge gets a leading glowing `::before` dot (echoing the sidebar dot, colored
  via `currentColor`) so a platform badge never reads as a difficulty pill. `difficulty-*`,
  `os-*`, and `tag-*` rules are unchanged; Easy stays emerald.
- **Status:** Adopted.

### 2026-06-01 · Difficulty dirs are Capitalized; sidebar config matches casing exactly
- **Decision:** Standardize on Capitalized difficulty directories (`hackthebox/Easy`, etc.) and
  make every sidebar `autogenerate.directory` use that exact casing. Fixed `astro.config.mjs`
  from `hackthebox/easy` → `hackthebox/Easy`.
- **Why:** Starlight matches `autogenerate.directory` against collection entry ids
  case-sensitively. The lowercase config silently dropped `Easy/busqueda.mdx` from the sidebar
  (page still built and was URL-reachable, just unlisted). Windows masked it by resolving the
  path case-insensitively; a Linux/Cloudflare build would fail harder. Chose to match the
  existing on-disk Capitalized folders rather than rename them.
- **Status:** Adopted. (Pipeline note: `notion_cleaner.py -d easy` must output into `Easy/`.)
- **Partly superseded by:** 2026-06-30 · Content images and writeup structure: flat files + parallel
  src/assets, specifically the Capitalized-directory decision recorded here. Difficulty directories are now
  LOWERCASE (`hackthebox/easy`), and
  `astro.config.mjs` was restored to `hackthebox/easy`, as part of that flat-files + parallel `src/assets`
  migration. The case-only folder rename was registered in git with `git mv`; with
  `core.ignorecase=true` git otherwise misses it and would ship a split `Easy/` + `easy/` tree that drops
  a writeup from the sidebar on the case-sensitive Linux build. The case-sensitivity lesson still holds,
  now on the lowercase form: on-disk difficulty dirs and every `autogenerate.directory` must match exactly.

### 2026-05-31 · Sidebar markers: CSS colored dots, not emojis
- **Decision:** Replace sidebar emoji labels with CSS-injected colored circles targeting
  Starlight's `.top-level` / `.group-label` (About cyan, HTB lime, VulnHub red, Pico purple,
  OTW amber). Real platform-logo SVGs kept as a commented alternative.
- **Why:** Emojis looked amateur and render inconsistently per OS. Dots match the site's
  existing dot motif and are uniform. True SVG logos need a Sidebar component override (deferred).
- **Status:** Adopted.

### 2026-05-31 · Stay on current package versions (no upgrade)
- **Decision:** Remain on Astro 6.3.3 / Starlight 0.39.2 (both current). Upgrade only later,
  from a stable checkpoint, via `npx @astrojs/upgrade`.
  - **Partly superseded by:** 2026-08-29 · Astro 6 to 7 and Starlight 0.39 to 0.41, upgraded in phases
    against a byte-reproducible build. The "remain on 6.3.3 / 0.39.2" half is stale: the upgrade happened.
    The rest of this bullet, upgrade only from a stable checkpoint and never hand-bump, is still the
    policy and is what that migration followed.
- **Why:** Site works; mid-polish is the wrong time to absorb major-version breaking changes.
- **Status:** Adopted.

### 2026-05-31 · Writeup theme pass is CSS-only
- **Decision:** Bring Starlight writeups in line with the marketing pages purely by overriding
  Starlight design tokens + targeted CSS in `custom.css`. No component forks.
- **Why:** Preserves search, nav, TOC, expressive-code, a11y, and the theme toggle for free.
  Reading content stays calm (no tilt/scroll-reveal on body).
- **Status:** Adopted.

### 2026-05-31 · Body font is JetBrains Mono (not a proportional sans)
- **Decision:** Use JetBrains Mono for body/UI across both surfaces; Syne for display headings.
- **Why:** Maximum cohesion with the marketing pages and the "lab notebook / terminal" identity;
  the audience is technical and comfortable reading mono. Tuned line-height/size for readability.
- **Status:** Adopted. (Swappable to a sans via one CSS variable if reading ever feels heavy.)

### 2026-05-31 · Dark-only landing; toggle on content; shared theme key
- **Decision:** Homepage is dark-only (identical on every device). About + writeups support
  light/dark via Starlight's `localStorage['starlight-theme']`; About defaults to dark.
- **Why:** The hero is art-directed for dark; a light landing dilutes it. Content must stay
  readable in both. Sharing Starlight's key makes the toggle persist across custom + doc pages.
- **Status:** Adopted.

### 2026-05-31 · Two surfaces: standalone marketing pages + Starlight docs
- **Decision:** Home + About are standalone `.astro` pages in `src/pages/`; everything else is
  Starlight in `src/content/docs/`. `index.mdx`/`about.mdx` must not exist (route collision).
- **Why:** Starlight's splash can't deliver the immersive hero; Starlight's machinery is perfect
  for the writeups. Best of both, no fighting the framework.
- **Status:** Adopted.

### (earlier) · No em dashes in site copy
- **Decision:** Never use em dashes in any website text.
- **Why:** Owner reads them as an AI tell; they undercut a hand-crafted feel.
- **Status:** Adopted (hard rule).

### (earlier) · Vite alias for @components
- **Decision:** Map `@components` → `./src/components` in `astro.config.mjs` vite config.
- **Why:** tsconfig path aliases don't resolve for Vite/MDX imports; the Vite alias does.
- **Status:** Adopted.
