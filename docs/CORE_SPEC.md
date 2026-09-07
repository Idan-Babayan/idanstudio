# Idan.Lab — Core Spec (Source of Truth)

> **Status:** living document. This is the canonical reference for the Idan.Lab project.
> Update it whenever a durable fact changes. If something here conflicts with a chat,
> THIS FILE WINS. Volatile work lives in `ROADMAP.md`; rationale lives in `DECISIONS.md`.
> Last updated: 2026-09-07 (taxonomy palettes: the platform landings re-based onto the WriteupMeta chip model; difficulty on its own arc).

---

## 1. Identity

- **Project:** Idan.Lab — a personal cybersecurity lab notebook + portfolio.
- **Owner:** Idan Babayan (26), cybersecurity student. GitHub: `Idan-Babayan`.
- **Goal:** land a first security role (pentesting / red teaming) by showcasing
  CTF writeups and methodology with exceptional, memorable design.
- **Audience:** recruiters, hiring managers, and fellow security learners.
- **Positioning:** "Curiosity is my exploit." Confident, learning-focused, never
  self-deprecating. The writeups document *thinking* (recon → foothold → escalation →
  reflection), including dead ends, not just commands.

## 2. Live Infrastructure

- **Domain:** `idanlab.dev` (nameservers delegated to Cloudflare). Old domain
  `idanstudio.click` is kept as a 301 redirect during transition, then retired.
- **Hosting:** Cloudflare Pages. Build command `npm run build`, output dir `dist`,
  framework preset Astro.
- **Repo:** `github.com/Idan-Babayan/IdanLab` (public, mixed case). Push to `main` → Cloudflare
  Pages auto-deploys. Also serves at `idanlab.pages.dev`. `astro.config.mjs` sets
  `site: 'https://idanlab.dev'` (drives the sitemap + canonical URLs). Branches: only `main`
  and `dev`; work lands on `dev`, then reaches `main` by a command-line merge.
- **RELEASE STATE: no release hold. `dev` ships to `main`, and each cluster ships independently as it
  lands** rather than accumulating for one release. **`main` is reached ONLY by `git merge --no-ff dev` run
  locally followed by a plain push, never a pull request and never the GitHub web UI, and force pushes,
  rebases, amends, resets and history rewrites are forbidden.** Never `--squash`, which would collapse the
  atomic commit history. A pull request mints a permanent `refs/pull/N/head` and the web UI authors under a
  second identity, which is why both are excluded: DECISIONS 2026-08-06 · Merges to `main` run from the
  command line, not through a pull request. Reasoning for the 2026-07-26 hold and its lift: DECISIONS
  2026-07-27 · The release hold is lifted and `dev` ships to production.
- **robots.txt:** managed in-repo at `public/robots.txt` (served at `/robots.txt`). The in-repo file
  holds the easter-egg breadcrumb comment + a `Sitemap:` line. On deploy, Cloudflare composes its own
  managed block (the Content-Signals header plus the managed bot disallow list: Amazonbot,
  Applebot-Extended, Bytespider, CCBot, ClaudeBot, CloudflareBrowserRenderingCrawler, Google-Extended,
  GPTBot, meta-externalagent) with this in-repo content, so the deployed `/robots.txt` carries both
  intact. There is no override: the two compose as intended (verified on the production site).
- **Security headers:** application-layer headers are served via `public/_headers` (Cloudflare Pages),
  additive to zone-level hardening (HSTS, Full Strict TLS, DNSSEC live at the Cloudflare zone; HSTS is
  NOT duplicated in `_headers` to avoid a conflicting max-age). Enforced now: `X-Content-Type-Options:
  nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, a deny-most
  `Permissions-Policy`, and immutable `Cache-Control` for `/_astro/*` and the self-hosted `/fonts/*`.
  Content-Security-Policy is ENFORCED IN PRODUCTION (live since PR #9 merged 2026-07-11; flipped from `Content-Security-Policy-Report-Only` after full
  cross-browser plus real-Safari verification): `font-src 'self'` (fonts self-hosted, no external origins),
  `style-src 'self' 'unsafe-inline'` (Starlight / Expressive Code inline styles, effectively permanent),
  `img-src 'self' data:` (icon data URIs; it also covers the same-origin social card at `/og.jpg`, so
  the Open Graph work needed NO policy change, and an externally hosted og:image would need its origin
  added here), `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`,
  plus `frame-ancestors 'none'` and `upgrade-insecure-requests`, which were inert under Report-Only and are
  now ACTIVE (frame-ancestors backs up the enforced `X-Frame-Options: DENY`; upgrade-insecure-requests
  upgrades same-origin subresources to HTTPS). `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'`:
  `'unsafe-inline'` because the build emits 18 distinct inline scripts (Starlight's own plus our
  marketing/writeup FX) and a hash would disable `'unsafe-inline'` and block the rest; `'wasm-unsafe-eval'`
  because Starlight search (Pagefind) instantiates WebAssembly in a Web Worker, which CSP blocks without it
  (see DECISIONS). No third-party script origin, so `script-src 'self'` is honest: the site loads only
  same-origin scripts (see the Web Analytics bullet below). No reporting endpoint (report-to / report-uri)
  by design. The CSP must NOT use Trusted Types (the SecretTerminal renders via `innerHTML`). The
  `Permissions-Policy` was pruned of six tokens current browsers no longer recognize (ambient-light-sensor,
  battery, document-domain, execution-while-not-rendered, execution-while-out-of-viewport,
  speaker-selection). Cache caveat: `/fonts/*` is immutable for a year and filenames are not
  content-hashed, so replacing a font requires a new filename.
- Cloudflare Web Analytics (RUM) is disabled and removed (deleted at the dashboard, not just
  toggled off); no static.cloudflareinsights.com beacon is injected. Consequently the
  Content-Security-Policy keeps script-src 'self' with no third-party script origin, and the
  site loads no external scripts (all scripts are same-origin). Re-enabling analytics in any
  mode would require allowlisting static.cloudflareinsights.com in script-src.
- **Local dev:** `npm run dev` → `localhost:4321`.

### Social and SEO metadata

- **Every page carries Open Graph and Twitter Card tags,** so a link shared to LinkedIn, WhatsApp or
  Slack renders a card. Reasoning, including the debugging that shaped it: DECISIONS 2026-08-25 · Open
  Graph and Twitter Cards on both surfaces, from a static card and an additive Head override.
- **Two emitters, one per surface.** Starlight already emits `og:title`, `og:type`, `og:url`,
  `og:locale`, `og:description`, `og:site_name` and `twitter:card` per doc page. Everything it omits
  comes from `src/components/overrides/Head.astro` (`author`, `og:image`, `og:image:secure_url`,
  `og:image:type`, `og:image:width`, `og:image:height`, `og:image:alt`, `twitter:title`,
  `twitter:description`, `twitter:image`), which reads title and description from the page's own
  frontmatter and falls back to the site title and description. The marketing pages sit outside
  Starlight and own their `<head>`, so they carry the FULL set inline with their own values plus a
  `<link rel="canonical">`. `og:type` is `website` on the landing page and `profile` on about, which
  also carries `profile:first_name` and `profile:last_name`. Nothing is declared twice on either
  surface: verified in `dist/`, all 46 pages carry exactly one `og:image` and one `author`.
- **The static `head` array in `astro.config.mjs` is the WRONG seam for per-page tags.** It cannot vary
  per page, so a `twitter:title` declared there would pin one constant string over every writeup and
  contradict the per-page `og:title` Starlight already gets right. Per-page social tags belong in the
  Head override; the `head` array stays for the genuinely constant (the reading-progress script).
- **`og:image` is an ABSOLUTE URL on every surface** (`new URL('/og.jpg', Astro.site)` in the override,
  written out in full on the marketing pages), because crawlers do not resolve relative paths.
- **The card is a static asset, not generated at build time.** One site-wide identity card, checked in
  at `public/og.jpg`. Neither `og.jpg` nor `og.png` sits under the immutable `/_astro/*` or `/fonts/*`
  cache rules, only under `/*`, so replacing the card needs no cache-busting rename (contrast the font
  caveat in the security-headers bullet above).
- **No HTML comments in any `<head>`, on either surface.** A comment holding a tag-like string can be
  matched by a scraper that regex-scans the head instead of parsing it. Notes about head markup go in
  the component or page frontmatter, which emits nothing.
- **Head text is BOUND as an expression, never written as a literal.** Literal HTML in an `.astro`
  template passes through verbatim, so a raw `&` in a title stays a bare ampersand: legal HTML5, but it
  stops a strict scraper mid-head. The landing page's title, description and URLs are frontmatter
  constants bound as `{TITLE}` and the like, so Astro escapes them on output.

### Repository visibility and licensing

- **Visibility:** the repository is public and stays public. Closing it, and splitting it into a private
  infrastructure repo plus a public content repo, were both considered and rejected.
- **Dual licensed, split by path:** code (Astro config, components, plugins, styles, scripts) is MIT.
  Content and design (writeups, prose, the "Decrypted" visual language) are CC BY-NC-SA 4.0. The split
  names the paths each license covers explicitly, stated in the license files themselves plus a README
  section.
- **The license files and the README section do not exist yet.** Writing them is a separate open task
  (see ROADMAP). This bullet records the posture, not the state of the tree.
- **Retired machines only:** a writeup is published only for a retired machine. Writeups for active
  machines violate platform terms.
- **Published flag and password values are deliberate content, not secrets.** On a retired machine whose
  full solution path is already published, the value carries no information the writeup did not already
  provide.

## 3. Tech Stack (pinned)

Current as of the Astro 7 upgrade, 2026-08-29. Reasoning: DECISIONS 2026-08-29 · Astro 6 to 7 and
Starlight 0.39 to 0.41, upgraded in phases against a byte-reproducible build.

**Declared in `package.json`.** The RANGE FORM is a decision, not a formatting choice; see below.

| Package | Range | Resolves to | Role |
| --- | --- | --- | --- |
| `astro` | `^7.2.9` | 7.2.9 | framework |
| `@astrojs/starlight` | `^0.41.10` | 0.41.10 | docs theme |
| `starlight-image-zoom` | `^0.15.0` | 0.15.0 | lightbox on content images |
| `sharp` | `^0.35.4` | 0.35.4 | image pipeline behind `astro:assets` |
| `@astrojs/markdown-remark` | **`7.2.4` exact** | 7.2.4 | supplies `unified()` for `markdown.processor` |
| `unist-util-visit` | `^5.1.0` | 5.1.0 | used directly by the custom remark plugins |
| `acorn` | `^8.16.0` | 8.18.0 | used directly by the injector plugins |

**Transitive, not declared, but load-bearing:** `@astrojs/mdx` 7.0.8, `astro-expressive-code` 0.44.1
and `@expressive-code/core` 0.44.1 (themes `tokyo-night` dark / `one-light` light; the custom EC
plugin `src/lib/ec-priv-command.mjs` tags command words by category, see §6), `pagefind` 1.5.2,
`vite` 8.2.2.

### Range form: one physical copy, shared with the consumer

`@astrojs/markdown-remark` is pinned EXACTLY while `unist-util-visit` and `acorn` use carets. That
looks inconsistent and is not: it is the same rule applied to two different consumer declarations.

The invariant is that our code and the code that actually runs the pipeline must resolve to the SAME
physical copy. The custom remark and rehype plugins bind to `unist-util-visit` and `acorn` directly,
and `astro.config.mjs` imports `unified` from `@astrojs/markdown-remark`. If the root declaration
lands on a different copy than the consumer's, the plugin binds one instance while the engine uses
another, and the failure is SILENT: the build stays green and the output quietly loses the effect.

- Consumer declares a RANGE (`@mdx-js/mdx` requires `acorn ^8.0.0`): use a CARET. Both land on the
  hoisted copy; an exact pin would force a second copy the moment the consumer's range moved past
  it. Measured: a clean lockfile regeneration moved `acorn` to 8.18.0 and it still resolved to one
  copy shared by all three consumers.
- Consumer declares an EXACT pin (`astro` requires `@astrojs/markdown-remark 7.2.4`): use an EXACT
  pin. A caret would float above astro's copy and build the processor config from a different
  package instance than the pipeline consumes.

`@expressive-code/core` is deliberately NOT a direct dependency for the same reason: the custom EC
plugin binds to whatever copy Expressive Code loads, and two copies would make the command colouring
vanish with no error.

### Toolchain (changed wholesale by Astro 7)

| Piece | Now | Was |
| --- | --- | --- |
| `.astro` compiler | `@astrojs/compiler-rs` 0.4.0 (Rust, native) | `@astrojs/compiler` (Go, WASM) |
| Bundler | `rolldown` 1.2.6 | `rollup` |
| JS transform | Oxc (native code inside Rolldown's bindings) | esbuild |
| CSS minifier | `lightningcss` 1.33.0 | esbuild |
| Build tool | `vite` 8.2.2 | vite 7 |

`esbuild` 0.28.2 is still present, pulled by Vite for dependency pre-bundling only. It is no longer
the minifier or the transformer.

Consequences worth knowing before reading a diff: the Rust compiler generates different scoped-class
hashes and preserves attribute value casing, and Rolldown inlines small CSS and JS chunks instead of
emitting separate files. Lightning CSS resolves static `color-mix()` at build time, which makes CSS
bytes depend on the build machine, see DECISIONS 2026-08-29 · Lightning CSS evaluates `color-mix()`
at build time, so CSS bytes vary by build machine.

### Node

- `.nvmrc` at the repository root holds `22`, and `package.json` declares
  `engines.node: ">=22.12.0"`. Astro 7 requires 22.12 or newer.
- **The Cloudflare Pages builder resolves this to 22.22.0**, confirmed at the dashboard. That value
  is DASHBOARD-ONLY: it cannot be read from the repository, and it is not in the GitHub check-run,
  whose `output.text` is empty and whose only build log is a dashboard link. Recording it here is
  the only durable copy. The repo-side pin exists so the version stops being a dashboard setting
  that can change without a commit.

### Ships via Starlight, not declared here

- **`@astrojs/sitemap`** is not in `package.json` and not in `astro.config.mjs`, yet it runs on every
  build and emits `sitemap-index.xml` and `sitemap-0.xml` (45 URLs). `public/robots.txt` advertises
  the URL and Google Search Console consumes it. It arrives as a Starlight dependency. **It must
  still never be added manually**: declaring it would create a second copy and a second
  configuration surface for something that already works.
- **`@astrojs/markdown-satteri`** is in the tree as a hard dependency of astro 7.2.9 and Starlight
  0.41.10. **Sätteri is NOT adopted and cannot be**: `starlight-image-zoom` 0.15.0 requires a
  `unified()` markdown processor and throws outright if a Sätteri processor is selected. Seeing the
  package in `node_modules` is not a constraint violation. `starlight-image-zoom` is therefore the
  single dependency gating both Sätteri adoption and the eventual Astro 8 move, since the deprecated
  top-level markdown keys it used until 0.14.2 are removed in Astro 8; it migrated onto the processor
  in 0.15.0, which is what cleared the deprecation warning.

### Upgrade path

- **Node.js** + npm. Build is fully static (SSG).
- Upgrade only from a stable checkpoint, in phases, one variable at a time, verified against a
  byte-reproducible build. `npx @astrojs/upgrade` is the starting point but is NOT sufficient alone:
  it needs an interactive TTY for its breaking-changes prompt, it does not touch non-Astro packages,
  and it wrote a caret where an exact pin was required. Check its output; never hand-bump blind.

## 4. Repository Map

```
C:\dev\idanlab\                       # chosen to avoid Hebrew chars in the Windows user profile path
├─ astro.config.mjs                   # Starlight config: site, sidebar, customCss[layers.css, fonts.css, then the eight theme modules tokens/base/prose/chrome/components/pages/utilities/overrides, in that order], EC themes + pluginPrivCommand, reading-progress head script (no font preloads, see DECISIONS 2026-07-07), image-zoom, vite alias, components overrides (PageSidebar + MarkdownContent + Head), markdown remarkPlugins (content-taxonomy validation guard + PasswordReveal import injection) + rehypePlugins (content image loading)
├─ src/
│  ├─ content.config.ts               # docs collection (docsLoader + docsSchema) + the writeup metadata schema (§7)
│  ├─ pages/
│  │  ├─ index.astro                  # HOMEPAGE: standalone immersive page (NOT Starlight). Dark-only.
│  │  └─ about.astro                  # ABOUT: standalone immersive page. Has dark/light toggle.
│  ├─ content/docs/                   # STARLIGHT docs (writeups + platform landings + 404 + secret)
│  │  ├─ hackthebox/{easy,medium,hard}/{slug}.mdx   # flat writeups, lowercase difficulty dirs; sidebar autogenerate matches this casing (Linux is case-sensitive)
│  │  ├─ vulnhub|picoctf|overthewire/.../{slug}.mdx
│  │  ├─ {platform}/index.mdx         # platform landing: minimal frontmatter + tableOfContents:false + <PlatformIndex/> (replaced the old .platform-intro markup)
│  │  ├─ 404.mdx                      # themed 404 (template: splash + hero), renders <NotFound/>; Starlight slug-404 override
│  │  └─ secret.mdx                   # hidden /secret (splash, pagefind:false, noindex), renders <SecretTerminal/>
│  ├─ assets/{platform}/{difficulty}/{slug}/{slug}-N.ext   # writeup screenshots; astro:assets optimizes + hashes them, referenced by relative ../ from writeups (NOT public/)
│  ├─ components/
│  │  ├─ Toggle.astro                 # <details class="toggle"> wrapper; flag prop adds .toggle-flag; renders MDX (incl. code) in slot
│  │  ├─ FlagCapture.astro            # "Decrypt to Capture" gold flag control (props: type user|root, flag); replaces the heading-plus-duplicate flag Toggle
│  │  ├─ PasswordReveal.astro         # amber wargame secret waypoint, TWO modes derived from the slot: INLINE (prop: password) blur-to-reveal then copy-in-place, BLOCK (slot content + prop: label) collapses a multi-line secret as a <details class="toggle pwreveal-block">, no copy button. Both wear one amber (--otw-amber accent / --otw-amber-ink AA text ink / --pw-amber-rgb wash base). Deliberately distinct from FlagCapture (no gold, no decode animation); replaced the retired .spoiler-toggle class; no per-file import needed, see plugins/remark-inject-passwordreveal.mjs
│  │  ├─ ToggleAll.astro              # Expand/Collapse-all control (vanilla TS, scroll-anchored); injected via PageSidebar override
│  │  ├─ AttackPath.astro             # guided infographic for a LINEAR priv-esc chain (ascending escalating path, SVG connectors, Next-step progression, one-time gold flourish); data-driven from a nodes[] prop, scoped styles, not-content. See DECISIONS 2026-07-19
│  │  ├─ Callout.astro                # icon-based tagged callout (recon/loot/intel/vuln/defense); .cl styles in components.css
│  │  ├─ Principle.astro              # closing epigraph (aside.principle, prop: text): centered italic mono maxim + dinkus + PRINCIPLE label; no card/border/bg; .principle styles in components.css; HackTheBox writeups only, appended from frontmatter by overrides/MarkdownContent.astro
│  │  ├─ WriteupCard.astro            # presentational writeup card (props only, reusable for a future /writeups index): one meta line (group glyph + word, then the facts that vary), title, description, affordance
│  │  ├─ PlatformIndex.astro          # data + hero + a multi-select filter rail on the platform's own axis (difficulty or category, counts in the pills; axis from src/lib/taxonomy.mjs, an unknown middle directory fails the build) + WriteupCard grid; ported homepage effects
│  │  ├─ NotFound.astro               # 404 breadcrumb body (nudges to /robots.txt)
│  │  ├─ SecretTerminal.astro         # from-scratch, zero-dependency vanilla-TS fake terminal
│  │  ├─ badges/                      # WriteupMeta.astro (the injected chip row), DifficultyPips.astro (the ONE ordinal pips glyph, shared with WriteupCard), icons.ts (icon registry + the category swatch)
│  │  └─ overrides/
│  │     ├─ PageSidebar.astro         # additive Starlight override: renders <Default/> then <ToggleAll/> at the bottom of the right TOC
│  │     ├─ MarkdownContent.astro     # additive Starlight override: renders <Default/> with the <Principle> coda appended inside the content wrapper on HackTheBox writeups that set principle:; the default Footer and its pager follow unchanged
│  │     └─ Head.astro                # additive Starlight override: renders <Default/> then appends only the social tags Starlight omits (author, og:image + secure_url/type/width/height/alt, twitter:title/description/image), per-page values read from frontmatter (see §2 "Social and SEO metadata")
│  ├─ lib/
│  │  ├─ ec-priv-command.mjs          # EC plugin: tags command words by category (priv/recon/net/inspect)
│  │  └─ taxonomy.mjs                 # what a writeup's MIDDLE directory means per platform (difficulty tiers, the six picoCTF categories, PLATFORM_AXIS); dependency-free because Node (plugins/) and Vite (src/) both import it
│  └─ styles/                         # the theme pass, split into cascade-layer modules (see §5 "The layer contract")
│     ├─ layers.css                   # the order statement `@layer starlight, tokens, base, prose, chrome, components, pages, utilities;` plus the cascade contract and the unit rule. First customCss entry
│     ├─ fonts.css                    # self-hosted @font-face (subset WOFF2: Syne, JetBrains Mono, Geist) + metric-matched fallbacks for each; loaded via customCss and imported by the marketing pages. The one module with no layer statement
│     ├─ tokens.css                   # @layer tokens: every custom property (surfaces, accents, flag gold, OverTheWire amber pair, the prose/chrome type scale). Also owns the prose/chrome type token block (see §6)
│     ├─ base.css                     # @layer base: the zero-specificity defaults under everything, today the shared focus ring alone
│     ├─ prose.css                    # @layer prose: the reading surface inside .sl-markdown-content (type, rhythm, links, quotes, the raw <details> default)
│     ├─ chrome.css                   # @layer chrome: header, sidebar, TOC, code frames, scrollbars, the three-column layout, light-mode depth
│     ├─ components.css               # @layer components: badges, toggles, callouts, FlagCapture, PasswordReveal, Principle, WriteupMeta
│     ├─ pages.css                    # @layer pages: whole-page treatments (splash hero, platform index, the reveal state rules, and the landing's sideways-scroll clip: html:has(.pi-index) + body:has(.pi-index), both needed, see §6)
│     ├─ utilities.css                # @layer utilities: single-purpose helpers that must sit above the named layers, today .sr-only
│     └─ overrides.css                # THE ONLY UNLAYERED SURFACE. The 13-rule tail, each rule carrying an evidence comment naming what it beats (see §8 "The layer law")
├─ plugins/
│  ├─ rehype-content-image-loading.mjs # rehype: sets loading/decoding on content <img> (first eager, rest lazy); wired via astro.config markdown.rehypePlugins
│  ├─ remark-inject-passwordreveal.mjs # remark: injects the PasswordReveal import (§7 "Build-time plugins")
│  ├─ remark-inject-writeupmeta.mjs   # remark: injects the WriteupMeta badge row (§7 "Build-time plugins")
│  ├─ remark-transform-recon-rail.mjs  # remark: builds the recon findings rail (§7 "Build-time plugins")
│  └─ remark-validate-content-taxonomy.mjs # remark: taxonomy build guard (§7 "Build-time plugins")
└─ public/
   ├─ robots.txt                      # in-repo; breadcrumb comment + Sitemap line (see §2)
   ├─ favicon.svg                     # site favicon
   ├─ og.jpg                          # THE social card: 1200x630, RGB, no alpha, ~80 KB. Every og:image / twitter:image on the site points here (see §2)
   ├─ og.png                          # the same card as an alpha-flattened PNG, ~98 KB. Kept in the tree; NO tag references it since og:image moved to the JPEG
   ├─ fonts/*.woff2                   # self-hosted subset fonts (Syne 600/700/800; JetBrains Mono 400/500/700 + 400/500 italic; Geist 400/600/700 + 400 italic); served at /fonts/
   ├─ icons/{htb,vulnhub,picoctf,overthewire}.svg
   └─ ethical-hacking.png             # about portrait (TODO: replace with transparent SVG). Writeup screenshots now live in src/assets (see §7); marketing images, if any, go under public/images
```

- **Vite alias:** `@components` → `./src/components` (required for MDX imports; tsconfig
  paths do NOT work for Vite/MDX — the Vite alias is mandatory).
- **Routing rule:** `src/pages/index.astro` owns `/`, so `src/content/docs/index.mdx`
  MUST NOT exist (route collision). Same pattern for `/about`.

## 5. Architecture Model — "One bespoke page, everything else Starlight"

Two surfaces, deliberately different:

| Surface | Tech | Behavior | Why |
|---|---|---|---|
| **Marketing pages** (home, about) | Standalone `.astro` in `src/pages/` | Immersive, full creative control, own `<head>` | Starlight's splash can't do the hero/constellation |
| **Content pages** (all writeups + platform landings) | Starlight in `src/content/docs/` | Themed via CSS only; keeps sidebar, search, TOC, EC, a11y, toggle | Never rebuild Starlight's machinery |

- **The "theme pass"** = the CSS-only module set in `src/styles/` that overrides Starlight's design
  tokens so docs match the marketing pages. It does NOT touch Starlight functionality.

### The layer contract

The theme pass is organised into declared cascade layers, one module per layer, wired in
`astro.config.mjs` in this order: `layers.css`, `fonts.css`, then `tokens`, `base`, `prose`, `chrome`,
`components`, `pages`, `utilities`, `overrides`.

- **`layers.css` declares the order:** `@layer starlight, tokens, base, prose, chrome, components,
  pages, utilities;`. `starlight` is named FIRST so Starlight's own `starlight.*` sublayers sit below
  every layer of ours, which is what replaced the old "we are unlayered, so we win" posture.
- **Every module repeats that statement on its first line** (all except `fonts.css`), so any bundler
  chunk order still establishes the same order. Repeats after the first occurrence are no-ops.
- **Layer order decides precedence, not file order and not selector weight.** Selector weight only
  orders ties WITHIN a layer. A rule does not need to out-specify a rule in an earlier layer, which is
  why the specificity armor the theme pass used to carry (stacked `html[data-theme]` prefixes and the
  like) was retired rather than migrated.
- **`overrides.css` is the only unlayered surface.** See §8 "The layer law" for what may live there.
- **Theme behavior:** homepage is **dark-only** (identical on every device). About + all
  writeups support **light/dark**, synced via Starlight's `localStorage['starlight-theme']`
  key + `data-theme` on `<html>`. About **defaults to dark** (light is opt-in).
- **Content-embedded components:** platform landings, the 404, and `/secret` are Starlight docs
  that embed scoped Astro components via MDX (`PlatformIndex`, `NotFound`, `SecretTerminal`). They
  carry Starlight's `not-content` class so prose styling skips them; most of our prose rules in
  `prose.css` are guarded with `:not(:where(.not-content *))`. Astro scopes component styles with
  `:where()` (zero specificity), so component CSS never out-ranks a global rule on selector weight.
  What actually protects a component subtree is that an Astro scoped style is UNLAYERED, and unlayered
  author CSS beats every layered rule regardless of weight. See §8 "The two instruments".
- **Hiding a page from nav:** the sidebar is hand-curated in `astro.config.mjs`, so a new doc is
  hidden by simply not listing it (e.g. `/secret`); add `pagefind:false` + a noindex `head` meta
  to keep it out of search.

## 6. Design System — "Decrypted"

### Tokens (canonical)
- **Surfaces (dark):** `--ink #07090a`, `--ink-2 #0d1113`. **(light):** paper `#ece9e0`, `#f7f5ee`.
- **Text (dark):** `--text #e9f1ee`, `--muted #79857f`. **(light):** `#12181a`, `#586460`.
- **Accents (dark):** lime `#b6ff3c`, cyan `#41efff`, magenta `#ff4d9d`.
- **Accents (light, darkened for contrast):** lime `#4d7c0f`, cyan `#0b7e92`, magenta `#c41d6f`.
- **Fonts:** display = **Syne** (600/700/800); code/chrome/UI = **JetBrains Mono** (400/500/700, plus italic
  400/500 for the Principle coda maxim); **writeup prose = Geist** (400/600/700 plus a true drawn italic 400).
  Self-hosted as subset WOFF2 in public/fonts/ (see src/styles/fonts.css), with metric-matched
  size-adjust fallbacks so the font swap is shift-free; no Google Fonts origin. See DECISIONS 2026-07-04
  (self-hosting) and 2026-07-25 (the Geist prose face and the prose/chrome split below).
- **Starlight var overrides:** `--sl-color-accent` = lime, `--sl-color-bg` = ink,
  `--sl-font` = JetBrains Mono. Headings forced to Syne via CSS.

### Prose vs chrome typography split (writeup bodies)

Writeup PROSE is Geist; everything else on a content page stays JetBrains Mono. The rule that makes this
safe: **`--sl-font` / `--sl-font-mono` are deliberately NOT changed.** Geist is applied by a scoped rule,
so every surface not named in it (sidebar, TOC, breadcrumbs, pager, code frames, badges, headings in Syne)
is unchanged by construction rather than by exclusion. The tokens live in `tokens.css` and the rules in
`prose.css`. See DECISIONS
2026-07-25.

- **What Geist takes:** `.sl-markdown-content :is(p, li, blockquote, td, strong, em)`. `em` renders Geist's
  real drawn italic (italic angle -12, distinct letterforms), not a synthetic slant.
- **Two deliberate exclusions, both chrome wearing prose markup.** `.cl-header` (the `Callout` label row is
  authored as a `<p>`) keeps its uppercase mono; callout BODY prose stays Geist. `figcaption` is left
  untargeted because it is Expressive Code's code-frame title bar, not an image caption (image captions are
  `em` inside a paragraph, so they are covered).
- **Chrome does not track the prose body.** Mono chrome (inline code, `.port-label`) and component titles
  (toggle summaries, the `FlagCapture` button base, the `Principle` maxim) are pinned to FIXED rem sizes, so
  they hold when `--prose-size` moves; only true prose tracks it. Inline code also re-declares
  `font-family`, since it otherwise inherits Geist from its paragraph. `FlagCapture` needs a fixed base
  because its flag value (`1.02em`) and lock icon (`1.25em`) are em-relative to that button.
- **Everything is a token, in one block at the top of the theme pass:** `--body-face`, `--prose-size`
  (18px, locked with the measure by the CPL derivation), `--prose-leading` (1.7), `--prose-measure`
  (aliased to `--sl-content-width`, 46rem), `--prose-strong-weight`, `--mono-chrome-size` and its pinned
  partner `--mono-chrome-leading`, `--component-title-size`, `--principle-maxim-size`,
  `--toggle-title-face` / `--toggle-title-weight`, the heading pair `--heading-space-above` /
  `--heading-space-below`, and `--prose-paragraph-gap` / `--blockquote-pad-y` (+ `-pad-x`).
  **Spacing is `em` only where it must stay proportional to the text it separates, which is not
  everywhere:** the heading pair is `em` and is ONLY valid declared on `.sl-heading-wrapper`, because that
  is where `em` resolves against the heading's own size (see the context law in section 8);
  `--blockquote-pad-x` is deliberately `rem`, since it aligns to `.cl`'s inline padding rather than
  tracking prose. `--prose-heading-gap` is retired: it was an `em` on the FOLLOWING element and is the
  worked example in the context law. Headings keep Starlight's own scale (no override), so the prose size
  does not drag them.
- **Two specificity rules that must not be "simplified":** the Principle maxim is targeted as
  `p.principle-text` (the plain class at (0,2,0) loses to the prose face rule at (0,2,1)), and the prose
  paragraph gap carries `:not(:where(blockquote *))` because `blockquote p { margin: 0 }` is only (0,1,2)
  and was being outranked, leaking ~2x the gap into every blockquote.
- **Toggle titles are one system:** `--toggle-title-face` / `--toggle-title-weight` (Geist 600) on
  `details.toggle:not(.toggle-flag) > summary`, so no toggle variant carries a bespoke face/weight; the gold
  flag toggle keeps its own identity.

### Focus ring system (keyboard accessibility)

The site's keyboard focus indicator. One token drives every ring COLOR; one shared rule draws every ring.
The token lives in `tokens.css` and the shared rule is the first of the two rules in `base.css` (the other is the viewport clip, see the §4 tree). This is an accessibility
feature first: it is how a keyboard
user knows where they are, so it is never removed, only aimed. See DECISIONS 2026-07-13 (the token system)
and 2026-07-17 (the geometry fixes).

**The token.** `--focus-ring` defaults on `:root` to the theme-aware site accent
`var(--sl-color-text-accent)` (lime `#b6ff3c` dark / `#4d7c0f` light). Nothing else needs to know a color.

**The shared rule.** One zero-specificity base rule paints the rectangular ring for every control:

```css
:where(a, button, [role="button"], input, select, textarea, summary, [tabindex]):focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
```

- `:focus-visible`, never `:focus`, so the ring is keyboard-only and does not fire on a mouse click.
- **`:where()` holds it at specificity 0 on purpose:** any element with a real geometric need can out-rank
  it without `!important` and without editing the shared rule. That escape hatch is load-bearing (see the
  code-frame exception below). Never add specificity to this rule.
- The rule sits in the `base` layer, which the order statement places above every `starlight.*` sublayer,
  so it beats Starlight's own styles without needing selector weight. Starlight 0.39.2 ships no
  `:focus-visible` outline of its own, so this IS the ring for every content-page control.
- Uniform 2px width everywhere. Contrast problems are fixed by changing the COLOR to an AA-grade token,
  never by thickening the line (see the light flag gold below).

**Identity, where it exists.** An element that already expresses a color sets `--focus-ring` to it, so the
ring echoes what the element is rather than inventing an identity. Everything else inherits lime.

| Element | `--focus-ring` |
| --- | --- |
| `WriteupCard` (`.wc-card`) | `--tx` (its GROUP's hue, the same as its bar, hover border, glare, pips and rail pill; 2026-09-07; `--pf-accent` is the fallback for a slug with no `.tx-*` rule) |
| The 4 platform sidebar groups | positional `nth-child`, theme-aware (HTB lime, VulnHub red, PicoCTF purple, OTW amber) |
| `FlagCapture` / `PasswordReveal` | gold `color-mix(--fc-id)` / amber `var(--otw-amber)` (`#ffc23d` dark, `#a86f04` light). A ring is non-text, so it reads the accent, not the ink |
| `ToggleAll` | `--pf-accent-2` cyan (its own hover identity; set in the component's scoped style) |
| TOC entries | the hue of the heading they point to: flags `--flag-gold-val`, h3 cyan, h2/h4+ lime |
| In-prose links | `--tp-cyan` / `--tp-cyan-ink` |
| `WriteupMeta` chips | `--wm-c` (live: the chips render on every writeup) |
| Filter rail pills (`.pi-pill`) | `--pill` (its own hue: the group hue, or the neutral on ALL; 2026-09-07) |
| Landing pagination (`.pagination-links a` on a page carrying `.pi-index`) | `--pf-accent` (the platform, lifted onto the footer container by `:has()` in `pages.css`; writeup pages keep the site default; 2026-09-07) |
| Anything else inside `.pi-index` (the wargame card) | `--accent` (the platform, set on the landing root; 2026-09-07) |

**Light flag gold is the one contrast carve-out.** The decorative `--flag-gold` (`#C6A243`) rings at only
2.00:1 on paper, under the 3:1 a non-text indicator needs, so the flag ring reads the AA-grade
`--flag-gold-val` instead (dark is byte-identical `#ffc23d` at 12.39:1; light becomes the deeper antique
`#7a5a12` at 5.24:1). Identity kept, ratio fixed, width untouched.

**Geometry: the ring is drawn on the focused element, with two deliberate exceptions.**

1. **Content toggles** (`details > summary`). Starlight's `markdown.css` pairs
   `margin-inline-start: -0.5rem` with `padding-inline-start: 0.5rem` so the outline encloses the
   negatively-margined `::before` marker without moving it. Our unlayered summary padding once cancelled
   only the padding half, orphaning the margin and throwing every ring 8px off-center. The base summary
   rule now re-declares the pair, inset by the card's own padding difference
   (`0.75rem` inline minus `0.4rem` block = 5.6px), so the summary's box sits the same distance inside the
   card horizontally as vertically and all four ring deltas are equal. **If you ever change the toggle
   card's padding, this inset must change with it.**
2. **Expressive Code blocks.** EC core's "Scrollable block tabindex" JS module adds `tabindex="0"` plus
   `role="region"` to any `<pre>` that overflows (debounced ResizeObserver, so it appears after load and
   re-evaluates on resize). That tabindex is what the shared rule matches. But the `<pre>` is only the
   lower half of the frame (`figcaption.header`, the language tab, is a sibling above it), and the header
   is `position: relative; z-index: 1` over a static `pre`, so a ring on the pre both excluded the tab and
   had its top edge painted over. The ring is therefore moved to `figure.frame` via
   `:has(> pre:focus-visible)`, which spans header plus pre exactly. **Use `:has()`, never `:focus-within`**
   (that fires on pointer clicks too).

**Known behavior, not a bug:** clicking a wide code block DOES show the ring. Chromium matches
`:focus-visible` on a keyboard-scrollable region even for pointer focus, because arrow keys scroll it.
That predates the token system and is correct a11y.

**The one deliberate suppression:** `SecretTerminal`'s `.term-input` sets `outline: none`. That is
intentional and should stay: it is a fake terminal's command line, where the conventional focus indicator
is the caret (`caret-color: var(--t-lime)`), not a box around the input. It is the only interactive
element in that terminal and it is auto-focused. Nowhere else on the site is a focus indicator removed.

**Scope:** the `src/styles/` modules theme Starlight CONTENT pages only. The two standalone marketing pages carry
their own equivalent inline rings (`var(--lime)` + per-card `var(--accent)`); folding them into the same
token is an open ROADMAP item, not a bug.

### Signature effects
- Interactive **constellation canvas** (nodes drift, react to cursor) in heroes. Its `draw()` loop pauses
  off-screen via an `IntersectionObserver` (perf-only; no visual change while visible, reduced-motion gate
  intact). See DECISIONS 2026-07-11.
- **Decode/scramble** text animation on one headline keyword.
- **Count-up** stats, **3D-tilt cards** with cursor-tracking glare, **magnetic buttons**.
- **Scroll-reveal** (IntersectionObserver), film **grain** overlay, atmospheric **glows**.
- **Reading-progress bar** (lime→cyan) on Starlight pages (injected via config `head`).
- All effects are **`prefers-reduced-motion` aware**. Reading content stays calm
  (NO tilt/scroll-reveal on writeup body text).

### Component inventory (current)
- Standalone: HUD/nav bar, hero, stats, platform/skill/practice cards, pipeline, contact, footer.
- Starlight: themed headings (Syne + lime `#` marker), lead blockquote, code frames,
  Toggle, `:::tip` admonition, metadata badges, sidebar dots.
- Content-embedded (in `src/components/`): `PlatformIndex` (animated hero + a multi-select filter rail on the platform's own axis, difficulty or
  category, with the counts in the pills + writeup-card grid; reuses the homepage effects), `WriteupCard`
  (presentational: one meta line, title, description, affordance; `showPlatform` prop for a future mixed
  grid), `badges/DifficultyPips` (the one ordinal pips glyph, shared by the card and the writeup row), `Callout` (icon-based tagged callout, used in writeup bodies),
  `NotFound` (404 body), `SecretTerminal` (vanilla-TS terminal), `AttackPath` (guided infographic for a
  LINEAR privilege-escalation chain: an ascending horizontal path whose nodes escalate toward the goal,
  structural SVG connectors that arrow into the next node with the privilege verb on the segment, a
  "Next step" progression with past/present/future states, and a one-time gold flourish at root. Built
  entirely from the site's own fabric so it reads as a native region, not a widget: the container is the
  Toggle / FlagCapture panel surface (`#f2ede0` light, a subtle lift dark) and the gold goal is derived
  exactly like FlagCapture's frame (decorative `--flag-gold`, AA text `--flag-gold-val`); accent is
  `var(--pf-accent, --sl-color-text-accent)` since the site does not platform-scope the accent in a writeup
  body. Ascent and escalation are COMPUTED from the node count (verified at 4/6/8 hops), so it is data-driven
  from `nodes: { kind, name, edge?, detail? }[]` with no chain hardcoded; runtime-guarded, scoped styles +
  `not-content`, AA in both themes, no branching. **Escalation rides the continuous font-SIZE ramp plus a
  single derived weight step** (Medium before the chain midpoint, Bold from it on): JetBrains Mono is subset
  to 400/500/700 only, so the earlier continuous weight calc silently snapped every intermediate value to
  700; the honest ramp uses only loaded faces. **Each connector's verb label rides PARALLEL to its segment**
  at a constant ~6.5px gap (tilted to the chord angle, computed from `rise`), which is the one rule that keeps
  every label the same distance from its line regardless of slope, label width, or line count. **Step dots
  carry a layout-neutral 24px-tall tap target** (`::after` overflow, the About-HUD convention) while the
  visible dot and focus ring stay 7px. **The edge fade-mask overlays a GUTTER, never the endpoint nodes:**
  one token `--ap-fade-w` (36px, 24px under the 50rem breakpoint) drives both the mask band AND the spine's
  inline padding, so the start and goal nodes come to rest exactly where the band ends (measured alpha 0),
  and the falloff is a smoothstep rather than an opaque plateau. This also makes the affordance self-truthing:
  a mask over empty gutter is surface-on-surface, so a fade only appears once real path runs under it. That
  token is the single knob for fade strength. **The past/present/future hierarchy is carried by COLOUR and
  scale, never by group `opacity`:** a future node is a clickable control, so fading its text with opacity put
  it under AA (measured 2.43:1 light), and opacity cannot be tuned out of that (the kind label needs ~0.88 to
  pass, which erases the state). Future names read the muted grey while done/active stay full-contrast.
  **The advance control uses `aria-disabled`, never the `disabled` property**, because `disabled` removed it
  from the tab order at the moment of the final keypress and dumped focus to `<body>`; the click path is
  guarded instead, and the hover rule is keyed off `:not([aria-disabled='true'])`. Node and dot accessible
  names carry the progress state word, since the check glyph is `aria-hidden` and `aria-current` marks only
  one node. Every node state and all chrome text measures AA in BOTH themes. Live on TWO writeups under
  `## Summary`: Forest (6 hops) and Return (5 hops); both keep their BloodHound graph above as evidence. See
  DECISIONS 2026-07-19 (original build + native-fabric rework) and 2026-07-20 (production-polish pass +
  Return instance; edge-mask gutter; production-readiness audit)), `badges/WriteupMeta` (navigational
  Platform / Category (PicoCTF, directory-derived) / OS / Environment chip row + a trailing neutral Difficulty
  chip whose filled pips take the level hue, under a writeup title;
  each nav chip is coloured via a single `--wm-c` per value, with a restrained glow (halo on dark,
  hue-shadow on light); Difficulty magnitude is filled+growing pips; chips render as non-interactive
  `<span>` today (the commented `<a>` + `data-astro-prefetch="false"` restore verbatim once the filter
  routes ship), `.not-content`; icons live in `badges/icons.ts` on a 14px grid; runtime-validates its
  union props. Colour model, icon sourcing, geometry and the light-mode AA palette are documented
  in the "Badge system (WriteupMeta)" blocks in §6 and §7. **THREE props are OPTIONAL, `os`, `difficulty` and `category`** (the last is PicoCTF-only, forwarded by the injector from the directory)
  (`os?: OS`, `difficulty?: Difficulty`), for the same reason: some content has no honest value on that
  axis, and neither union carries a "not applicable" member, so the chip is omitted rather than invented.
  Omit `difficulty` and no Difficulty chip renders, which is how a progressive wargame with no rating
  (OverTheWire Bandit) is expressed. Omit `os` and no OS chip renders, which is how a web challenge with
  no target operating system in evidence (PicoCTF `head-dump`) is expressed; that page ships a two-chip
  row, Platform and Environment. A value that IS supplied is still validated on either axis, so
  `difficulty="Hardd"` or `os="Linnux"` still fails the build, and neither is ever given a fallback.
  `platform` and `environment` remain required. **`os` became optional 2026-09-03,** during the first
  PicoCTF import: it had been required, so the "omit it where it does not apply" rule this spec already
  described was not actually true until then, and the build is what caught it. WriteupMeta is now the metadata row on EVERY writeup and has fully replaced
  the hand-authored `.machine-meta` badge row, which no longer appears anywhere in `src/content/docs`.
  **It is INJECTED, never hand-placed (2026-07-20):** `plugins/remark-inject-writeupmeta.mjs` builds the
  element from frontmatter, so no writeup imports or writes the component. `platform` is supplied by the
  injector from the directory and is not a frontmatter field; `os` / `environment` / `difficulty` come
  from frontmatter and are validated as strict enums by `content.config.ts`. The component's own runtime
  guard still throws on an unknown axis, so a bad value fails at the schema, and again at render.
  See DECISIONS 2026-07-20 (injection + validation consolidation), 2026-07-19 (optional difficulty + the
  34-page Bandit migration), 2026-07-17 (the three badge entries plus the testbed-drop entry) and 2026-07-10.
- Chrome (Starlight override): `ToggleAll` (Expand/Collapse-all control) auto-injected into the right
  "On this page" sidebar by `overrides/PageSidebar.astro` (renders `<Default/>` then the control).

### Starlight Component Overrides
- **There are THREE, in `src/components/overrides/`:** `PageSidebar.astro` (renders the default "On
  this page" TOC then appends `ToggleAll`), `MarkdownContent.astro` (renders the default content
  wrapper with the `Principle` coda appended inside it on HackTheBox writeups that set `principle:`;
  the default Footer and its Prev/Next pager follow unchanged), and `Head.astro` (appends only the
  Open Graph and Twitter Card tags Starlight omits, see §2 "Social and SEO metadata").
  `MarkdownContent` replaced a `Footer` override on 2026-09-03 (that seam suppressed the pager beneath
  the coda, see DECISIONS 2026-09-03) and is the newest of the three.
- **Every override imports from the documented `@astrojs/starlight/components/*` entrypoints and
  none reaches into Starlight internals.** That is the constraint that keeps an override additive
  rather than a fork: a deep import into an internal path would bind to a private module that
  Starlight can move in a patch release, with no deprecation and no build error.
  **ONE documented exception:** `MarkdownContent.astro` imports its `Default` from
  `starlight-image-zoom/overrides/MarkdownContent.astro`. That is a plugin's PUBLISHED `overrides/`
  path, not a Starlight internal, and the rule below is why it has to be.
- **A user override SILENCES a plugin's override of the same component, and nothing warns.** A Starlight
  plugin claims a component in its `config:setup` hook, and a well-behaved one yields to the site:
  `starlight-image-zoom` runs `if (!config.components?.MarkdownContent)` before assigning its own. So
  naming ANY `MarkdownContent` override in `astro.config.mjs` makes the plugin skip its override, with a
  green build, no error and no message. Its `<ImageZoom />` element, which carries BOTH the zoom script
  and the zoom stylesheet, then never renders, and image zoom dies on every writeup at once. Chaining
  through the plugin's own override restores it and is exactly equivalent otherwise, because that file is
  only `<ImageZoom /><StarlightMarkdownContent><slot /></StarlightMarkdownContent>`.
  - **The tell is TWO symptoms, and neither names the cause.** Zoom stops working, AND the italic caption
    under every content image gets a clickable first character: with the plugin stylesheet gone,
    `.starlight-image-zoom-control` falls back to `position: static` and lays out inline in the following
    text run, landing on the caption's opening characters. Chasing either symptom alone misses it.
  - **Standing check: adding an entry to `components:` requires checking every Starlight plugin for a
    claim on that same component,** and chaining through the plugin's override when one exists. The check
    is PER COMPONENT, not per plugin: `PageSidebar` and `Head` are unclaimed, which is why the two earlier
    overrides were safe and the third was not. No build guard is possible or planned, because a plugin's
    claims live inside its own hook and nothing exposes the overrides it WOULD have taken.
  - See DECISIONS 2026-09-03 · A component override in `astro.config.mjs` silently disables a Starlight
    plugin's override of the same component.
- Starlight Component Overrides: Additive Starlight component overrides are an approved architectural pattern alongside the `src/styles/` theme modules and custom components.
- Override Strategy: Overrides should wrap and render `<Default />` (or the upstream component) and layer behavior, styling, or markup on top rather than copying or replacing upstream implementations.
- No Forking by Default Forking, duplicating, or fully replacing Starlight components is discouraged and should only be considered when the desired result cannot be achieved through an additive override.
- User Approval Required: Introducing a new Starlight component override is a structural architectural change and should be proposed and approved by the user before implementation.

### Platform palette (canonical, unified 2026-06-01)
One palette everywhere: HTB **lime**, VulnHub **red**, PicoCTF **purple**, OTW **amber** (used by
homepage cards, sidebar dots, about-page accents, and writeup badges). The old badge set (blue /
cyan / violet / orange) is retired, and so is the legacy `.meta-badge` family it lived in (2026-09-07):
the landing cards render through the WriteupMeta chip model and the taxonomy palettes (below), which
contain no green, so the Easy-versus-lime collision that a leading glow dot on the `.platform-*` badges
once patched no longer exists and the dot is gone with the badge. (See DECISIONS 2026-06-01 and DECISIONS 2026-09-07 · Two taxonomy palettes: the landing pages re-base onto the WriteupMeta chip model.)

### Platform ink family (`--pf-ink`, 2026-07-31)

Each platform carries an ACCENT and an INK, the same split the OverTheWire amber established. The
accent is the identity and is never retinted: it feeds display type that legitimately clears the 3:1
large-text bar, plus roughly eighteen non-text uses. The ink is the text variant, read only by
body-size type that must clear 4.5:1. Both live in `pages.css` beside each other.

- **Dark declares the ink once**, `--pf-ink: var(--pf-accent)` over the four `.pf-*` classes. Dark has
  no failure anywhere (floor 5.68:1), so ink is accent there, and four repeated hexes would be a fork.
- **Light values, solved in OKLCH holding hue and dropping lightness:** HackTheBox `#3b6400`, VulnHub
  `#b60115`, PicoCTF `#7f30b7`, and OverTheWire `var(--otw-amber-ink)` (`#7c5000`, unchanged, and a
  reference rather than a repeat because that family is a declared shared identity).
- **The band is 5.75 to 5.76:1**, set by where OverTheWire's existing ink already sat once the hero
  wash moved, so the other three came up to meet amber and amber did not move. OKLCH lightness spread
  0.035, and all four land lighter than the `--wm-c` chip already shipping in the same hue.
- **Consumers:** `.pi-eyebrow`, inside `PlatformIndex.astro`'s scoped style via a local `--accent-ink`
  alias, and `WriteupCard`'s `.wc-platform` word on the future mixed grid. The ALL filter pill stopped
  reading the ink on 2026-09-07: it is a neutral control now (Starlight's gray-2), not a platform-coloured
  one. The eyebrow's `::before` rule keeps the ACCENT, because it is a graphic and not text.
- **The wash moved with it.** On light the hero glow pools the platform's own accent over the surface
  its own text reads on, so the pool was relocated from 20% to 86% x (cyan 80% to 95%), behind the
  platform mark rather than the type. That recovered 0.75 to 1.11 of contrast at FULL wash strength.
  Dimming the wash instead was measured and rejected: no alpha fixes HackTheBox or VulnHub, whose bare
  paper ceilings are 4.11 and 4.16, under the bar even with the wash entirely off.

### Badge system (WriteupMeta): colour model + light-mode AA palette
The `WriteupMeta` chip row (Platform / Category on PicoCTF / OS / Environment nav chips + a neutral
Difficulty chip whose FILLED pips take the level hue, see "Taxonomy palettes" below) is
driven by ONE custom property per chip value, `--wm-c`. That single token drives the chip's label,
its monochrome icon (via `currentColor`), border (38%), fill (`color-mix(--wm-c 15%, transparent)`,
i.e. 15% identity over 85% surface), glow, and focus ring. There is deliberately NO separate text/ink
token (unlike `--flag-gold` / `--flag-gold-val`): everything `--wm-c` paints wants to move together.
- **Per-value hues:** platform = the canonical `--pf-accent` (HTB lime, VulnHub red, PicoCTF purple, OTW
  amber); OS/Env = identity colours (Windows blue, AD indigo, Standalone slate, Progressive teal, Linux
  a Tux amber). Dark values live on unprefixed selectors, light under `:root[data-theme='light']`.
- **Light labels are solved to WCAG AA, not eyeballed.** Each 12px/600 label must clear 4.5:1 on its own
  composited fill (over paper `#ece9e0`, no card); the light values are solved in OKLCH by holding hue,
  dropping lightness to ~4.8:1 (antialiasing margin), and holding chroma where sRGB allows / clamping to
  the gamut boundary where it does not. Hue is NEVER shifted to reach AA and chroma is never dropped as a
  shortcut (the §6 "chroma not contrast" lesson in reverse). Dark already passed everywhere and is
  untouched. **Amber is the structural worst case:** its sRGB gamut collapses as it darkens, so amber
  keeps only ~79% of its chroma at AA vs 88 to 100% for other hues; that loss is the price of AA itself,
  not a solver limit. See DECISIONS 2026-07-17.
- **`--wm-glow`** is set only where it earns its keep: the DARK `pf-htb --wm-glow` (`#9fef00`) holds HTB's
  true brand green while the label carries palette lime. No light `--wm-glow` exists (the light glows read
  `--wm-c` directly, so one would never render).
- **Linux vs OverTheWire (two ambers, adjacent on a Bandit row):** the Linux OS chip is re-hued to OKLCH
  H60 in BOTH themes (Tux's own beak/feet family, `#FFA63F` H65.6 / `#E68C3F` H57.9) so it never shares
  OTW's gold. Because light separates on fewer axes than dark, the Linux light value is also DEEPENED to
  L0.40: dark already separated on hue AND lightness, but light had matched lightness, so hue alone at low
  chroma did not read. Deepening restores the second axis (separation dEOK 0.065 light / 0.073 dark). The
  finding: an amber slot CAN hold two identities on paper, but only separating on lightness as well as hue.
- **The `#a86f04` fork, now six-way (was seven):** OTW, Linux, `.platform-overthewire`, `.pf-overthewire`,
  the sidebar focus ring, the spoiler toggle and PasswordReveal independently used the same light amber. They
  are semantically unrelated ambers that coincided on a hex, NOT a shared token, so they stay forked (the
  2026-07-17 pass moved the two badge ambers off it). Two of those users have since MERGED, legitimately:
  the spoiler toggle became PasswordReveal's block mode and both now read one shared token (2026-07-25),
  which is a real shared identity rather than a coincidence, so it is one entry.
  **Resolved for the OverTheWire family 2026-07-26:** that shared token became the
  `--otw-amber` / `--otw-amber-ink` pair, and the sidebar focus ring was routed onto the accent, so the
  PasswordReveal row, its block mode, the platform-index eyebrow and the rail ring are now ONE identity
  with a text variant. **CORRECTED 2026-07-31:** those figures were measured against bare paper for a
  surface that carries the hero wash, so they were never true of the elements they named. On the real
  composite the eyebrow read 4.79:1, not 5.76, and `.pi-name` read 3.05:1, not 3.50. `.pf-overthewire`'s
  display-size type (`.pi-name`, `.pi-num`) still keeps the accent deliberately at the 3:1 large-text
  bar, and after the wash move reads 3.41 and 3.50. `.platform-overthewire` remains moot (it styles
  nothing since `.machine-meta` retired), and the Linux badge amber stays forked, correctly: it is a
  different identity that merely shares a hex.
  **RESOLVED 2026-07-31 (Cluster F), and it was four platforms rather than two:** measured against the
  true composite, every platform-index eyebrow failed on paper, HackTheBox 3.36, VulnHub 3.05, PicoCTF
  3.59 and OverTheWire 4.79 (the last passing only after the wash moved). PicoCTF had been recorded
  three times as passing at 4.86. All four now read a per-platform `--pf-ink` at 5.75 to 5.76. See the
  "Platform ink family" block below and DECISIONS 2026-07-31.

### Taxonomy palettes: a four-step difficulty arc and a six-hue category ring (2026-09-07)

The colour a writeup's CLASSIFICATION wears on the platform landings and the writeup row. What a
writeup's middle directory means is declared once, per platform, in `src/lib/taxonomy.mjs`
(`PLATFORM_AXIS`: HackTheBox and VulnHub group by DIFFICULTY tier `easy | medium | hard | insane`,
PicoCTF by the six official CATEGORIES in sidebar order; OverTheWire renders in wargames mode and has
no axis). `PlatformIndex` groups by that axis and THROWS on an unknown middle directory, on a writeup
with no middle directory, and on a writeups-mode platform with no axis: there is no `misc` fallback
anywhere. The injector derives PicoCTF's `category` from the directory exactly as it derives platform
(never a frontmatter field) and cross-checks HackTheBox and VulnHub `difficulty` against the tier
directory, so the card (directory) and the writeup row (frontmatter) can never disagree. Reasoning:
DECISIONS 2026-09-07 · Two taxonomy palettes: the landing pages re-base onto the WriteupMeta chip model
(the first cut had both vocabularies read one ring; the owner's review the same day gave difficulty
its own arc).

- **Two palettes in `tokens.css`** (`@layer tokens`, dark on `:root`, light under
  `:root[data-theme='light']`). The DIFFICULTY ARC, `--tier-easy` `#86cdff` / `#045077` (sky),
  `--tier-medium` `#bf9bfc` / `#683f9f` (violet), `--tier-hard` `#f070be` / `#96216f` (magenta),
  `--tier-insane` `#ff8d65` / `#973100` (orange): four hues on one short arc of the wheel (240, 300,
  345, 40) with temperature and saturation rising with the rating, the sunset-gradient reading that
  carries a progression without a single-hue ramp and without the traffic light's green, yellow or red
  seats (the yellow seat is taken on this site in both themes: gold on dark, the gold value ink and the
  Linux chip on light). The CATEGORY RING, `--tx-blue` `#6ec4ff` / `#045077`, `--tx-teal` `#54d5ab` /
  `#02553f`, `--tx-orange` `#e57f4f` / `#8c3d12`, `--tx-rose` `#fa96c3` / `#88375f`, `--tx-coral`
  `#fe8b83` / `#832323`, `--tx-violet` `#adb3ff` / `#4c4d99`, read by PicoCTF's categories only.
  Ring dark values sit at OKLCH L 0.79 (orange 0.70 and coral 0.76, a lightness axis against the Linux
  chip and against each other), arc dark values at L 0.82 down to 0.72 with chroma 0.10 up to 0.18,
  both at about half a platform accent's chroma; light values are solved by the badge-pass method (hold
  hue, drop lightness, clamp chroma, never shift hue) so a 12px/600 label clears 5.1:1 on a 12% same-hue
  fill over paper, which keeps the per-pixel floor under the light dot grid above 4.5, and the arc's
  Easy keeps the ring's blue seat, the one already solved against the cyan ink. Measured on the built
  pages by canvas readback (model B, the composite): light pill labels 5.1 to 6.3 on their own fill over
  paper, dark 6.5 to 9.6 at rest and 5.4 to 7.4 pressed (the 22% fill; light keeps 12%, so its pressed
  figures are its resting ones); pips and swatches 6.8 to 11.0 on the card; the own-hue pressed ring
  carries its label's ratio against the pressed fill (dark 5.4 to 7.4 on the 22% fill, light 5.1 to 7.8)
  and reads 7.4 to 11.6 dark and 6.1 to 9.7 light against the page (the dark floor is the arc's magenta,
  the Hard tier, measured on a Hard fixture). Pressed states were measured with the pill transition
  disabled: in a hidden browser pane transitions do not advance, so a readback taken mid-transition
  reports the resting values.
- **Neither palette contains a reserved hue:** no lime (HackTheBox, the site accent), no cyan (the
  secondary), no purple (PicoCTF; the arc's violet is h300, 0.109 dark and 0.086 light from the PicoCTF
  sidebar dot, the only purple a HackTheBox page shows), no red (VulnHub; the arc's orange is 0.097
  dark and 0.119 light from its dot), and no gold or amber at all, because gold is the flag-loot signal
  and amber the OverTheWire identity. Every hue sits at least dEOK 0.065 (the Linux/OverTheWire floor)
  from every chip and accent it can meet on a page; the arc's tightest seats are Insane against the
  Linux chip (0.069 dark, 0.090 light), Easy against Standalone (0.071 light) and Medium against the
  Active Directory chip (0.077 light, 0.092 dark), and its adjacent steps sit 0.133 to 0.158 apart on
  dark and 0.123 to 0.147 on light. Four kinships are recorded and deliberately unfixed because the pairs
  never share a page: ring teal against the Progressive chip (0.016 dark; Progressive renders on
  OverTheWire rows only), ring violet against the Active Directory chip (0.033; AD renders on HackTheBox
  rows only, ring violet on PicoCTF), ring orange against the light OverTheWire ink (0.057; ring orange
  is Reverse Engineering, which has no writeup), and the arc's orange against the ring's (0.061; Insane
  on machine pages, Reverse Engineering on PicoCTF).
- **Two vocabularies, ten classes in `components.css`** (`.tx-easy` `--tier-easy`, `.tx-medium`
  `--tier-medium`, `.tx-hard` `--tier-hard`, `.tx-insane` `--tier-insane`; `.tx-general-skills` teal,
  `.tx-cryptography` violet, `.tx-web-exploitation` blue, `.tx-forensics` coral, `.tx-reverse-engineering`
  orange, `.tx-binary-exploitation` rose), each setting `--tx`; consumers read `var(--tx)` and never a
  token, so a hue moves in one place and a slug's hue in one other. Difficulty is ORDINAL (the arc reads
  cold to hot; the pips carry the order for anyone who cannot read hue), categories are NOMINAL. The two
  palettes never share a page and share no hex except Easy's light seat; the GLYPH still separates the
  axes wherever a mixed grid would put them together: round pips for a rating, a square 9px swatch for a
  category (square so it can never read as a sidebar platform dot).
- **Where hue is spent (the rule).** The filter rail pills and the cards are the tinted surfaces. A pill: label, border
  (45%, a decorative boundary at about 2.1:1 on paper, the fill and the label identify the control) and
  a 12% fill in `--tx`; pressed adds weight 700 and a 2px ring plus a soft glow in the pill's own hue (owner decision
  2026-09-07; the cyan secondary no longer appears on the rail), and dark also lifts
  the fill to 22% while light keeps 12%. A card WEARS its group's hue (owner decision 2026-09-07, after
  a measured study of both rules on both platforms): the card root carries `.tx-<slug>`, so its accent
  bar, hover border, cursor glare and keyboard ring read the group hue along with its pips or swatch,
  every word stays text-coloured, and the platform accent retreats to the hero, the name, the stat, the
  glow and the footer pagination's focus ring; the grid reads as the axis laid out as a map and matches
  the rail, and OverTheWire's wargame card, which has no group, keeps the platform. Under the glare peak
  the description lifts from a 62% to a 68% text mix (4.87 or better in both themes for every hue; the
  lime rule had measured 4.49 dark and 4.32 light there). On the writeup row a category chip is a normal `--wm-c` chip in `--tx`; the
  Difficulty chip stays a neutral box whose FILLED pips take `--tx` (owner decision 2026-09-07, partly
  superseding the achromatic pips of 2026-07-10). ALL is neutral (Starlight's gray-2, dark 9.34 and
  light 7.88 on its own fill) and carries no count: the hero owns the total.
- **One glyph, one enumeration.** `badges/DifficultyPips.astro` is the only pips markup; the card and
  the writeup row both render it and `components.css` paints it (`.dpips`): filled pips read `--pips-c`
  (fallback the neutral text mix), unfilled pips are a 1px ring in the same colour so the "N of 4"
  denominator is visible on paper (the old `--sl-color-gray-5` disc read about 1.3:1 there); the growth
  per level is unchanged. The hero breakdown line is gone: the rail pills carry the counts, so a page
  enumerates its groups exactly once. A category-axis platform's hero carries a second stat, the number
  of present categories, so the two heroes differ in structure rather than in a coat of paint.
- **The card meta line and the facts rule.** `WriteupCard` renders ONE meta line above the title: the
  group (glyph + Title Case word), then the facts that VARY within the platform (`showEnv = new
  Set(environments).size > 1`, computed once in `PlatformIndex`; OS renders wherever present). Two facts
  STACK under the group line (every HackTheBox card: the rating line, then `Linux · Standalone`) and one
  sits inline (PicoCTF: `Web Exploitation · Linux`; Standalone is constant across all 21 cards and hidden),
  so the titles on a platform stay aligned (two facts plus pips measured 282 to 297px against 255px of
  card at the three-column width). The card's `aria-label` is built from the same model (`Read the
  Busqueda writeup: Easy, Linux, Standalone`), because an aria-label replaces the anchor's content in
  the accessible name. `data-difficulty` / `data-category` come from the directory group, never from
  frontmatter.
- **Card copy.** In writeups mode `PlatformIndex` strips a leading `<PlatformName> <up to 80 non-colon
  characters>: ` from the card blurb and capitalises the first character of what follows, so a PicoCTF card does not repeat its
  own title; the frontmatter description (the SEO and Open Graph string) is untouched, HackTheBox never
  matches, and the OverTheWire wargame card reads its description verbatim.
- **Capitalisation law, three tiers.** A `//`-prefixed UPPERCASE tracked mono line is a KICKER that
  opens a section (hero eyebrow, wargame card eyebrow); UPPERCASE tracked mono without the prefix is a
  SLOT LABEL (`WRITEUPS`, `CATEGORIES`); Title Case JetBrains Mono 0.75rem 600 is a VALUE or a CONTROL
  (rail pills, card meta, every chip); sentence case is prose and affordances. Lowercase chrome does
  not exist (the breakdown was its only instance, and it printed the raw directory slug).
- **The rail is accessible by construction, and MULTI-SELECT (owner decision 2026-09-07):** the group
  pills are independent `<button aria-pressed>` toggles synced with `.is-active`; any number may be
  pressed and a card shows when it matches ANY pressed value (Easy plus Medium lists both tiers), pressing
  a pressed pill releases it, and ALL is the no-filter state rather than a value, pressed exactly when no
  group pill is and clearing them all when pressed. The rail carries `data-filter-key` (the axis), each
  group pill `data-filter` and `data-label` plus a visually hidden `, N writeups`, and a `.sr-only`
  `aria-live="polite"` status announces `Showing N of M writeups: <pressed labels>` (or `Showing all M
  writeups`) after every change, `--focus-ring: var(--pill)` rings each pill in its OWN hue (the group's
  on a group pill, the neutral on ALL), the hover lift is gated under `prefers-reduced-motion`, the stat numbers
  rest at their final value in the HTML and count up only when motion is allowed (the homepage rule),
  and below 480px the visible counts leave the pills so the six-category PicoCTF rail stays two rows.

**No sideways scroll on a landing (2026-09-07).** The hero glow (`.pi-glow`, inset `-12%` left and `-10%`
right of the hero) is MEANT to spill past its box, and it is the only element on the site that overflows
the viewport: 71px at 1280, 45px at 640. It is clipped by a PAIR of rules in `pages.css`,
`html:has(.pi-index)` and `body:has(.pi-index)`, both `overflow-x: clip`. **Both are required and either
one alone does nothing**, because overflow propagates to the viewport from the root, and from body only
while the root is `visible`, and the box whose value propagates keeps a used value of `visible` and so
clips nothing itself. `clip` and not `hidden`: `hidden` coerces the paired `overflow-y` to `auto` and
makes the box a scroll container, which on body would put every sticky descendant in a scrollport that
never scrolls. Scoped with `:has()`, so no writeup page is in either selector. A script can scroll a
clipped box either way, so this is tested with a real wheel gesture and never with `scrollTo`. See
DECISIONS 2026-09-07 · Two taxonomy palettes: the landing pages re-base onto the WriteupMeta chip model.

### Light-mode identity (paper-native "risograph")
Light is art-directed on its own terms (dark is unchanged). All rules scoped to
`[data-theme='light']`, spread across the modules by concern (surfaces in `tokens.css`, chrome in
`chrome.css`, badges and callouts in `components.css`):
- **Editorial ink:** body text near-black `#1a1815` on warm paper (crisp, premium).
- **Texture not glow:** a faint warm technical dot-grid behind content (`body::before`), replacing
  the old bottom atmosphere wash. Static, low contrast, prefers-reduced-motion safe.
- **Decorative accent palette (NON-text):** vivid `--pf-accent-2`-style trio for dots, fills,
  the `#` marker, the h2 rule, the sidebar active bar, panel accents. The darkened text inks stay
  for body text. Reading-progress bar light gradient: `#4d7c0f` to `#0b7e92`.
- **Crisp badges:** solid (no-glow) platform dots and bolder flat fills; per-badge text inks
  deepened so every pill clears WCAG AA on its own fill (a bright hue cannot clear AA on a light
  same-hue fill, so inspect-style inks go deep).
- A risograph title-misregistration (offset ghost) effect was tried and REJECTED (see DECISIONS).

### Sidebar (chrome)
Taller rows via larger block padding + line-height on `nav.sidebar a, nav.sidebar summary`
(fuller rail, better touch targets; no `<li>` margins, so the active pill / nesting guide / dots
stay aligned). Width trimmed via `--sl-sidebar-width: 17rem` (from Starlight's 18.75rem).

### Platform-index duotone
On the platform index each platform reads as its color (lead) plus a universal cyan secondary
(`--pf-accent-2`: `#41efff` dark, `#08697a` light): hero glow is a platform+cyan duotone, the stat
label + "Read writeup" affordance are cyan, the count-up number stays
the platform color, the card's accent bar wears the card's group hue (2026-09-07), and the pressed filter pill rings in its OWN hue (owner decision 2026-09-07, replacing the cyan ring
the duotone put there; cyan keeps the stat label and the affordance only). The difficulty-coloured hero
breakdown and the cyan card eyebrow are gone (2026-09-07): enumeration lives in the rail pills, which
are tinted by the difficulty arc or the category ring as the cards' bars, borders, glares and rings are (2026-09-07), and the card's meta line is text-coloured with its glyph in hue
(see "Taxonomy palettes" above).

### Code-block command highlighting (by category, OKLCH palette)
`ec-priv-command.mjs` tags command words by semantic category, colored in `overrides.css` (theme-aware,
`!important`). The palette is designed in OKLCH and measured against the rendered code bg
(tokyo-night `#1a1b26` dark, one-light `#fafafa` light), separating the three perceptual channels:
- **Lightness = contrast (uniform):** one target L per theme (dark `L 0.745`, light `L 0.43`) so all
  categories read at one brightness. Measured: dark recon 7.56 / net 7.96 / inspect 7.45 (all AAA);
  light recon 7.72 / net 7.45 (AAA). **Exception:** light inspect is deliberately lightened to `L 0.50`
  (~5.8:1, still AA) per owner preference, because the darker uniform brown read too heavy on paper.
- **Hue = category** (kept clear of the theme's string/keyword/function token hues): privilege magenta,
  recon gold `h95`, network cyan `h200`, inspect warm-sand `h60` (~145 deg off the theme's cool neutral
  text, so the near-neutral inspect still reads as a distinct tint).
- **Chroma = loud vs quiet** (NOT lightness): recon + network vivid (high C); inspect LOW C at the same
  L/contrast, so it is calm without going dim. This fixed the previously near-invisible inspect color
  (it had been quieted by dropping CONTRAST instead of chroma).
- Values: privilege `.ec-cmd-priv` `#ff4d9d`/`#c41d6f` (sudo, su, doas). recon `.ec-cmd-recon`
  `oklch(0.745 0.153 95)`/`oklch(0.43 0.088 95)` (nmap, gobuster, ffuf, feroxbuster, nikto, whatweb,
  enum4linux, smbclient). network `.ec-cmd-net` `oklch(0.745 0.126 200)`/`oklch(0.43 0.073 200)`
  (nc, ncat, netcat, penelope, socat, curl, wget, ssh, chisel). inspect `.ec-cmd-inspect`
  `oklch(0.745 0.045 60)`/`oklch(0.5 0.045 60)` (ls, cd, cat, echo, whoami, id, find, grep, pwd, ping).
- **Weight channel:** every recognized command is `font-weight:700`, so a command pops by weight while
  color only signals category. **sudo's COLOR is the fixed anchor (unchanged); it gains bold only** and
  sits at ~5.5:1 dark / ~5.4:1 light (just under the 7:1 the redesigned set meets, by design, because
  it must not be recolored).
- Mechanism: command-position detection (first word after prompt / `sudo` / `|` `&&` `;`); sudo stays
  content-matched. Command lists are one-line-extendable. Residual risk: an output line whose first
  word is exactly a listed command (rare) can be mis-tagged.
- EC `{n}` line highlights get a decisive-line focus treatment (`chrome.css`, after the scrollbar rules):
  `.ec-line.mark` gets a lime gutter bar + a low tint (dark accent 10%, light `--tp-deco-lime` 12%) that
  sits under the command-token colors. The `chrome` layer outranks every `starlight.*` sublayer, so it
  overrides EC's default blue marked
  line cleanly (no `styleOverrides`). See DECISIONS 2026-07-04.

### Tagged callouts (icon-based, `Callout.astro` + `.cl*` in `components.css`)
Five semantic writeup callouts, each a 3px accent left border + faint tint + a header (icon + UPPERCASE
label), theme-aware (vivid border, light-mode ink swap on icon/label): recon (cyan, magnifier), loot
(amber, padlock), intel (violet, information), vuln (red, warning), defense (green, an inline shield SVG
since Starlight has no shield). Icons via Starlight's `<Icon>`. Authored as `<Callout type="...">` in MDX.

### Flag loot gold (User Flag / Root Flag)
One gold signal across the flag's states via the `--flag-gold` token (`#ffc23d` dark / `#C6A243` light):
the body heading (gold, with a flag-SVG mask icon; replaces the brown `.task-title`) and the TOC entry
(muted gold at rest, full gold on hover/current; non-flag TOC entries follow the active-color ladder
below). The TOC treatment applies on both the desktop right column and the mobile dropdown (mobile added
DECISIONS 2026-07-10). Flag headings have no dedicated class yet, so the CSS targets the slug ids
`#user-flag` / `#root-flag` (interim; a `.flag-title` from the pipeline is the clean hook). The same two
slug ids are what the active-color ladder excludes, so flags keep gold instead of going cyan. See
DECISIONS 2026-06-20.

### Password waypoint amber (PasswordReveal)

**Two modes, one component, one amber (2026-07-25).** A wargame secret comes in two shapes and the
interaction follows the shape:

| Mode | Trigger | Behavior |
| --- | --- | --- |
| **INLINE** | `password` prop, no slot | one-line password: blurs in place, copy control (the original) |
| **BLOCK** | slot content, no `password` prop | multi-line secret (an RSA private key): collapses as a `<details>` |

Inline secrets blur, block secrets collapse: a secret running to many lines cannot be blurred as one inline
run. **Mode is derived from the slot, never guessed** (`Astro.slots.has('default')`); passing both or
neither throws at build time rather than silently picking a branch. Block mode takes a `label` prop for its
summary and carries `.toggle`, so it inherits the standard toggle card, the disclosure marker, ToggleAll's
bulk expand, and the shared toggle-title face/weight. **Block mode has NO copy button on purpose:** the keys
it holds are truncated for publication (see the private-key truncation rule), so a copy control would hand
over a broken key. This replaced the one-off `.spoiler-toggle` class, which existed only because the inline
component could not hold a block secret; that class is retired and appears nowhere in `src/`.

**The amber has one source, split into an accent and an ink (2026-07-26):** `--otw-amber` (the identity;
non-text only: borders, focus rings, bars, and display-size type. `#ffc23d` dark / `#a86f04` light),
`--otw-amber-ink` (the AA text ink for body-size text: `#ffc23d` dark, unchanged, / `#7c5000` light) and
`--pw-amber-rgb` (the `#f59e0b` wash base, consumed as `rgba(var(--pw-amber-rgb), alpha)` for tints and
hairlines). The pair supersedes the single `--pw-amber`, which could not serve both jobs on paper: it
failed AA as body text on every surface it landed on (3.21:1 on the PasswordReveal row, 3.64:1 on the
toggle card, 3.50:1 on bare paper, and 3.05:1 on the platform-index hero, which carries the wash and
which the 2026-07-26 pass did not composite) while being exactly right as a border and ring. Both modes
read them, so they cannot drift apart. Since 2026-07-31 `--pf-ink` for OverTheWire READS
`--otw-amber-ink` rather than repeating its hex, so the platform ink and the wargame waypoint amber stay
one identity by construction. Declared on the bare `:root` fallback as well, per this file's convention, so an absent `data-theme`
can never leave the var undefined and invalidate every `rgba()` reading it. Custom properties are safe here:
the failure that once made this block literal-only was `color-mix()` indirection, not the properties
themselves. `.pwreveal-block`'s two border rules keep the `html[data-theme]` prefix inherited from the
retired class, and still need it (see the specificity note in the CSS).

The inline mode, unchanged, in detail:

`PasswordReveal.astro` is the wargame-password counterpart to FlagCapture,
deliberately built as its own component (not a FlagCapture variant) because a wargame password
(OverTheWire Bandit, etc.) is a waypoint the reader pastes into SSH, not a trophy: no gold/loot tokens,
no signature decode/scramble animation. Layout: a `PASSWORD` label, the value blurred via CSS `filter`
as plain text with no border/background/hover affordance of its own, then ONE control on the right, the
ONLY interactive element in the row: it starts as an eye + "Reveal" and swaps in place to a copy icon +
"Copy" on click (single slot, so there is no layout shift). A second click copies and briefly shows
"Copied" before reverting. No native `title` tooltip (tried, then dropped for looking bad); the
accessible name lives entirely in `aria-label`. Real `<button>`; reveal/copy are announced via a VISUALLY
HIDDEN `aria-live` region (`.pw-live.sr-only`, screen-reader-only, no visible "Password
revealed"/"Password copied" text). Only the button reads as interactive: the container (`.pwreveal`), the
label, and the value are all `user-select: none` (copying is the only way to take the value, matching
FlagCapture's captured-value pattern), and the container/value both get `cursor: default` with no `:hover`
change to filter/cursor/color. The row itself IS a passive amber card (not a neutral hairline frame):
`--pw-amber-rgb` washes/borders (dark 0.08 fill / 0.4 border, light 0.14 fill / 0.55
border, stronger and more golden), matching the site's canonical OverTheWire system, the same values the
retired spoiler class used. The button text/icon is the OTW ink `--otw-amber-ink` (`#ffc23d` dark /
`#7c5000` light), with a `--pw-amber-rgb` border/hover wash; its focus ring reads the accent `--otw-amber`.
The ink was solved against the button's HOVER surface, not its resting one, because hover paints its own
amber wash under the label and is therefore the worst case (4.78:1 hovered, 5.28:1 at rest). Every value behind those two tokens is a literal hex/rgba
(no `color-mix()` custom-property indirection, after an intermediate token-based pass rendered as a
neutral/near-black box in practice), deliberately NOT `--flag-gold`. The only motion is the blur-to-clear
filter transition, gated behind `prefers-reduced-motion: no-preference`; the value's `:hover` rule
deliberately does NOT declare `filter` at all (an earlier `filter: inherit` attempt resolved to the
parent's "none" and silently un-blurred the still-locked password on hover, see DECISIONS). Styled in
`components.css` immediately after the `.pwreveal-block` rules; the shared `.sr-only` utility it relies on
lives in `utilities.css`.
Inline mode is live on 32 of the 34 Bandit level pages (rollout completed 2026-07-11); of the two
exceptions, `16-17.mdx` is now BLOCK mode (its RSA private key) and one level has no password to reveal.
See DECISIONS 2026-07-05 (inline) and 2026-07-25 (block mode + the shared amber).

### TOC active-entry color ladder
The right "On this page" entry the reader is currently on (`aria-current="true"`) takes the hue of the
heading it points to, so the column mirrors the in-page hierarchy: h1/h2 keep Starlight's green
`--sl-color-text-accent`, h3 turns cyan (`--tp-cyan` / `--tp-cyan-ink`, the same tokens as the `###`
heading), and h4/h5/h6 go muted gray (`--sl-color-gray-2`, the h4 heading color). Flags stay gold (above).
Only the current entry recolors; inactive entries keep the muted default. On the desktop right column
heading level is read from Starlight's TOC nesting depth (h3 nested under h2, etc.). The mobile TOC
dropdown (`<mobile-starlight-toc>`) now gets the SAME gold-flag + cyan-current-h3 treatment
(DECISIONS 2026-07-10), and the current top-level h2 entry now turns green (`--sl-color-text-accent`,
matching desktop) as of 2026-07-11; it is nested too but under a different wrapper
(`nav > details > .dropdown`), so the depth rules match Starlight's per-entry inline `--depth`
(`[style*="--depth: 1"]` = h3 cyan, `[style*="--depth: 0"]` = h2 green; flags render at `--depth: 1` and
are excluded so they stay gold, verified in the real DOM). Mobile now mirrors the full desktop
active-color set (current h2 green, current h3 cyan, flags gold); non-current entries keep Starlight's
white + checkmark default. Unlayered CSS so it beats Starlight's layered green/white; parity with the
heading rules is by shared tokens. See DECISIONS 2026-06-29, 2026-07-10, 2026-07-11.

The flag VALUE is now the **FlagCapture** "Decrypt to Capture" control under the heading (DECISIONS
2026-06-27), which supersedes the old `.toggle-flag` reveal. The heading + gold TOC entry are unchanged;
FlagCapture renders below them and never repeats the flag name OR its glyph (it carries one neutral
lock-to-check icon, never a flag/crown). It adds tiers on top of `--flag-gold`: `--flag-gold-root`
(richer gold for ROOT, the only user-vs-root signal, color not glyph) and AA-grade value golds
`--flag-gold-val` / `--flag-gold-val-root` for the flag TEXT (the bright loot gold is decorative and not
text-AA on paper, so the value uses a deeper gold: light user 4.99:1, root 5.93:1; dark both >11:1). The
frame matches the writeup Toggle width + 6px radius but sits a bit taller for presence; an icon-only copy
button sits inside it (right, vertically centered) and shows a golden "Copied!" pill on copy. Capture
moment is a warm gold glow pulse in BOTH themes (tuned per theme,
light halo stronger for paper; no underline). Locked state is static (no idle animation); reduced-motion
skips the scramble + glow entirely.

### Expand/Collapse-all control (`ToggleAll.astro`)
A dependency-free control auto-injected at the bottom of the right TOC via `overrides/PageSidebar.astro`
(additive override, renders `<Default/>`; wired in `astro.config.mjs` `components`). Bordered pill (gray +
cyan hover), set apart by a gap + a `--sl-color-hairline` divider, desktop-only, self-hides unless a page
has two or more toggles (a bulk expand/collapse is pointless with 0 or 1; the `>= 2` threshold clears every
single-toggle page automatically). Acts on `.sl-markdown-content details.toggle:not(.toggle-flag)` (skips flags, code, nav).
Preserves reading position: anchors on the current heading and corrects scroll synchronously, with native
`overflow-anchor` suppressed for the operation (see DECISIONS; ROADMAP has the unverified few-pixel shift).

## 7. Content Pipeline (Notion → site)

1. Author the writeup in **Notion**, export as Markdown.
2. **Polish it by hand into convention-compliant MDX.** The content pipeline is deliberate manual
   editorial polish of each writeup against a Notion template, not a text-transformation script. The
   gap between a raw Notion export and the intended finished writeup is an editorial-judgment problem
   that no text-transformation script resolves: a script can normalize syntax, but it cannot make the
   editorial calls that define the site's writeup quality. Apply the MDX conventions below by hand.
   - Place the file at `src/content/docs/{platform}/{middle}/{slug}.mdx`. The `{middle}` dir is
     lowercase: the sidebar `autogenerate.directory` is case-sensitive (e.g. `hackthebox/easy`) and must
     match the on-disk lowercase dir; a case-only rename needs `git mv` on Windows
     (`core.ignorecase=true`). **What the middle tier MEANS is per platform**, and this is load bearing:
     HackTheBox and VulnHub group by DIFFICULTY (`easy`/`medium`/`hard`/`insane`), OverTheWire by WARGAME
     (`bandit`), PicoCTF by CATEGORY (`binary-exploitation`, and the other five below). `src/lib/taxonomy.mjs`
     declares that axis per platform (2026-09-07); `PlatformIndex` groups by it and the injector validates
     it, so an unknown middle directory, a HackTheBox or VulnHub `difficulty` that disagrees with its tier
     directory, or a `difficulty` on PicoCTF or OverTheWire fails the build. There is no `misc` tier and no
     fallback.
   - Copy + rename screenshots into `src/assets/{platform}/{difficulty}/{slug}/`, then reference them
     from the writeup by a relative Markdown path (`../../../../assets/...`) so astro:assets optimizes
     + hashes them.
3. Commit + push → Cloudflare deploys.

### Build-time plugins (wired in `astro.config.mjs` `markdown.processor: unified({...})`)

Four remark plugins run over the MDX source. All are zero-dependency (`unist-util-visit`, plus `acorn`
for the injectors), and all see hand-authored markup only, never component output. Order matters in one
place: the recon-rail transform is wired LAST.

They are passed to `unified()` from `@astrojs/markdown-remark`, NOT to the top-level
`markdown.remarkPlugins` / `markdown.rehypePlugins` keys, which Astro 6.4 deprecated and Astro 8
removes. `gfm`, `smartypants` and `remarkRehype` are deliberately not passed: `unified()` resolves an
unset option back to the shared top-level value and all three already sit at their defaults.

- **`remark-inject-writeupmeta.mjs`** injects the `<WriteupMeta />` row and its import. Gated on the
  writeup path, so nothing outside one can be injected. It also owns every rule that needs the path AND
  the frontmatter, because it is the one pass that sees both, which Zod cannot: the `principle` scope
  guard (a `principle` outside a HackTheBox writeup, or an empty one, fails the build) and, since
  2026-09-07, the per-platform AXIS rules from `src/lib/taxonomy.mjs`: on PicoCTF the middle directory
  must be one of the six categories and is forwarded as `category` (a frontmatter `category:` key
  fails), on HackTheBox and VulnHub `difficulty` is required and must equal the tier directory, and a
  `difficulty` on PicoCTF or OverTheWire fails. Behavior detail in the MDX conventions below.
- **`remark-inject-passwordreveal.mjs`** injects the `PasswordReveal` import, only into files that use
  the tag and do not already import it.
- **`remark-transform-recon-rail.mjs`** converts the recon findings list into the rail. It emits `dt`
  and `dd` as SIBLINGS with no per-row wrapper, because both must be direct grid children (a wrapper
  would need subgrid, which blockifies inline `<code>` onto its own track).
- **`remark-validate-content-taxonomy.mjs`** FAILS the build on an unknown hand-authored class token in
  the two live families (`port-label`, `task-title`), on ANY hand-authored token in a retired badge family
  (`machine-`, `meta-`, `platform-`, `difficulty-`, `os-`: retired 2026-09-07 when the landing card moved
  to the taxonomy vocabulary and the legacy CSS was deleted, so a retired token would otherwise render
  as an unstyled span with a green build), or on an unknown component metadata value (`Callout` type,
  `FlagCapture` type `user|root`), with a "did you mean" suggestion where a family is live. **Its
  allow-lists are the single source of truth**, and it is the deliberate alternative to `astro check`. It
  does not validate frontmatter: strict Zod enums in `content.config.ts` do that, and the path-dependent
  rules live in the injector. See DECISIONS 2026-07-12 and 2026-07-20.

**The guard structurally cannot see an underscore-prefixed file.** Astro silently excludes
`_name.mdx` from a content collection, so such a file never enters the pipeline and no remark plugin
runs over it. This is not a guard bug and cannot be fixed in the guard. It matters when TESTING the
guard: a probe file named with a leading underscore builds green while the guard never sees it,
which reads as a passing test of a dead guard. It produced exactly that false negative during the
Astro 7 upgrade verification. Any probe of the guard must use a filename that does not start with an
underscore.

### MDX conventions (applied by hand)
- Writeups are stored as flat .mdx files under src/content/docs
  (<platform>/<difficulty>/<machine>.mdx), one file per writeup with no per-writeup
  folder. Writeup images live in a parallel non-routable tree under src/assets
  (src/assets/<platform>/<difficulty>/<machine>/) and are referenced from the mdx
  with a relative Markdown path (../../../../assets/...) so they are optimized and
  hashed by astro:assets. Plain Markdown image syntax is used, not <Image />. Flat
  files allow Starlight sidebar autogenerate to render clean single entries with no
  phantom groups and no per-writeup config; new writeups require no astro.config.mjs
  change. Icons remain in public/icons; marketing images remain in public/images.
  Absolute /public image paths are not used for writeup content images.
- Frontmatter `title`/`description` + `import Toggle from '@components/Toggle.astro'`.
- **Metadata is FRONTMATTER ONLY.** Declare `environment`, plus `os` (where the challenge genuinely has a
  target operating system) and `difficulty` (where the content has a rating: REQUIRED on HackTheBox and
  VulnHub, where it must equal the tier directory the file sits in, and FORBIDDEN on PicoCTF and
  OverTheWire, all build-guarded since 2026-09-07), and write nothing in the body: the badge row and its
  import are injected by `plugins/remark-inject-writeupmeta.mjs`. Never author a `<WriteupMeta />` tag or
  import it. `platform` is NOT a frontmatter field, it is derived from the writeup's directory, and so is a
  PicoCTF writeup's `category` (a `category:` key fails the build). Set `badges: false` (unquoted boolean,
  never `no` or `off`) to opt a writeup-path page out entirely; the axis rules still run. The description
  is still repeated as a `>` blockquote lead.
  - **Writeup path** is a non-`index` `.mdx` file under one of the four platform directories
    (`hackthebox`, `vulnhub`, `picoctf`, `overthewire`). Hub and landing pages are authored as `index.*`
    files and are therefore exempt. A file outside a writeup path is never injected, even when it carries
    metadata frontmatter. The injector gates on this path test, which is why `platform` is derived from the
    directory rather than declared.
- **Principle coda:** `principle: "..."` on HackTheBox writeups only, optional. Renders inside the content
  as the last element, with the default Prev/Next pager beneath it. Anywhere else, or empty, the build
  fails (`plugins/remark-inject-writeupmeta.mjs`). See DECISIONS 2026-09-03.
- Long/indented code → wrapped in `<Toggle>`; all code blocks get `frame="code"` + a
  language `title` so bash and python look identical.
- Notion `<aside>` → `:::tip[Answer]`. Task headings → brown `.task-title`.
- **Flags, MACHINES ONLY (HackTheBox and VulnHub):** emit the gold heading
  `### <span class="task-title">User Flag</span>` (or `Root Flag`) immediately followed by
  `<FlagCapture type="user" flag="..." />` (or `type="root"`), and add
  `import FlagCapture from '@components/FlagCapture.astro'`. This replaces the old heading + duplicate
  `<Toggle flag>` + `:::tip[Answer]`. Handle user-only and root-only writeups (emit only the flag that
  exists). See DECISIONS 2026-06-27.
  **`FlagCapture` is RESERVED for those two platforms (2026-09-03, owner instruction).** A simple
  challenge (OverTheWire Bandit, PicoCTF) uses `PasswordReveal` instead, per the bullet below. The split
  is not password vs flag, it is CHALLENGE vs MACHINE: a Bandit level and a PicoCTF challenge are a few
  commands and a string, while a box is a trophy that earns the gold decode ceremony. Do not reach for
  `FlagCapture` on a new platform without deciding which side of that line it sits on.
- **Challenge secrets (`PasswordReveal`), on OverTheWire and PicoCTF:** emit it at the point in the
  walkthrough where the secret is obtained (not frontmatter, not appended at the end), with NO heading
  above it, directly under the code block whose output is masked (`<password>` on Bandit, `<flag>` on
  PicoCTF). The `term` prop names the secret: it defaults to `"Password"`, so every Bandit page is
  unchanged, and PicoCTF passes `<PasswordReveal term="Flag" password="picoCTF{...}" />` to render the
  label FLAG and announce "Flag revealed" / "Flag copied". `term` changes the NOUN only: the amber
  identity, the blur and the absence of the decode scramble all stay, because they now mark
  challenge-vs-machine rather than password-vs-flag (see the flags bullet above).
  Pick the mode by the secret's SHAPE, never by preference:
  - one-line password → `<PasswordReveal password="..." />` (inline: blurs in place, copyable).
  - multi-line secret, e.g. an RSA private key → `<PasswordReveal label="Reveal private key">` wrapping a
    fenced block, then `</PasswordReveal>` (block: collapses). Truncate the key first (see the
    private-key rule); block mode has no copy button precisely because the value is truncated.
  Passing both a `password` prop and slot content, or neither, fails the build on purpose. Never reach for a
  bare `<Toggle>` with a bespoke class for this, which is what the retired `.spoiler-toggle` was.
  No import line needed in either mode: a remark plugin (`plugins/remark-inject-passwordreveal.mjs`, wired
  via astro.config `markdown.remarkPlugins`) detects the tag in the MDX AST at build time and conditionally
  injects `import PasswordReveal from '@components/PasswordReveal.astro'`, only in files that actually use
  the component and only if they have not already imported it. It matches `mdxJsxFlowElement` by name, so a
  block-mode tag WITH children is detected exactly like a self-closing inline one. Supersedes the manual
  per-file import used when PasswordReveal first shipped on `overthewire/bandit/0-1.mdx`.
  See DECISIONS 2026-07-05 and 2026-07-25.
- `**Port 80**` → a cyan mono `.port-label` tag (was red; harmonizes with the recon callout, out-ranks
  inline code by weight, see DECISIONS 2026-07-04). **Inside `<Callout type="recon">` a plain markdown
  list is converted at build time into the findings rail** by `plugins/remark-transform-recon-rail.mjs`,
  which emits the chip for each row, so `.port-label` is hand-written only for a port mentioned inline in
  prose. The concluding paragraph keeps the `Assessment` hairline + eyebrow, keyed off `:has(.findings)`.
  The rail is a two-column grid whose chip track is `max-content` PLUS a gutter: `.findings` declares
  `--findings-gutter` (0.8rem) and `--findings-rule-width` (2px), `column-gap` reads the gutter and the
  `dt` takes `padding-right: calc(gutter + rule width)`, so the column rule sits IN a gutter with the same
  space on both sides at every token length, and still no literal about port widths exists anywhere.
  See DECISIONS 2026-07-27. Inline code (`:not(pre) > code`) → a rounded NEUTRAL chip with red
  text (identity in the glyphs, no red in the fill or border), its own object (readability-first,
  theme-tuned, deliberately distinct from the sharp code blocks);
  inside a colored callout it instead harmonizes with that callout's accent (reads `--acc` / `--cl-ink`,
  generic per type); see DECISIONS 2026-06-29.
- Bold inside code fences is impossible (markdown); to emphasize a code line, manually
  use expressive-code line highlighting, e.g. ` ```bash {3} `.

### PicoCTF writeup template (adapted from Bandit, 2026-09-03)

**A PicoCTF challenge is structurally a Bandit level, not a machine:** a few commands and a string. So it
inherits the Bandit skeleton rather than the HackTheBox long form, and the governing rule is RESTRAINT.
The failure mode here is over-explanation, not under-explanation: a page whose "Why it works" is longer
than the challenge is worse than one without it. Reference file:
`src/content/docs/picoctf/binary-exploitation/pie-time.mdx`.

- **Route:** `picoctf/<category>/<challenge-slug>.mdx`. The middle tier is the official picoCTF CATEGORY,
  and there are exactly SIX: `general-skills`, `cryptography`, `web-exploitation`, `forensics`,
  `reverse-engineering`, `binary-exploitation`. Assets mirror at
  `src/assets/picoctf/<category>/<slug>/`, four `../` from the writeup. The writeup row's category chip and the landing card's category are
  derived from this directory (injector and `PlatformIndex`); nothing is declared in frontmatter.
- **Sidebar:** each category is a NAMED collapsed group in `astro.config.mjs`, never an autogenerate over
  the whole platform. Two reasons, both observed: an autogenerated group is labelled with the raw
  lowercase directory name (`binary-exploitation`, not `Binary Exploitation`), and the platform's own
  `index.mdx` is then picked up as a second nested entry with the same name as its parent group. There is
  no index page per category; the toggle IS the tier. Groups stay COMMENTED until their directory holds a
  writeup, because a missing `autogenerate.directory` fails the build (same reason as HTB Hard).
  Within a category, autogenerate's alphabetical order stands and no page carries a `sidebar.order`:
  these challenges are standalone, not sequential.
- **Frontmatter:** `title`, `description`, `environment: Standalone`, and `os` ONLY where the challenge
  genuinely involves one. **NO `difficulty`,** deliberately (and build-guarded since 2026-09-07: the injector fails on one): picoCTF scores in points, which run from 1
  (DISKO 1) to 200 (EVEN RSA), are set per edition, and span 2019 to 2025, so a 50-point 2021 challenge
  and a 50-point 2025 one are not comparable and no honest mapping onto Easy through Insane exists. The
  chip simply does not render, exactly as on Bandit. **NO `principle`:** it is HackTheBox-only and the
  build fails on one here (`plugins/remark-inject-writeupmeta.mjs`).
- **Skeleton**, in this order and with nothing else:
  1. `> Goal: ...` blockquote, one or two sentences. Name what the artefacts ARE (a function, a file, a
     service), since the reader has not seen the challenge.
  2. `## Approach`, opening with PROSE, never with a subheading. Fences and prose alternate.
  3. `<PasswordReveal term="Flag" password="picoCTF{...}" />`, with NO heading above it, directly under
     the fence whose flag output is masked as `<flag>`. **Where the recorded route produced no maskable
     fence, it follows the prose (or an image caption) instead.** That is not a rare exception: six of
     the twenty-one PicoCTF pages sit this way, plus two Bandit pages. `ph4nt0m-1ntrud3r`'s solve IS the
     flag arriving in seven readable slices, so any fence showing the intermediate values would print the
     answer in full and defeat the masking; `red` decoded in CyberChef, `get-ahead` read the flag from a
     Burp response header, `scan-surprise` uploaded to a browser decoder, `cookie-monster-secret-recipe`
     read the value out of a browser extension and decoded it there, and `insp3ct0r` assembles it
     from three fences none of which can be masked alone. Masking wins over the layout convention.
     A third shape exists and is fine: `stonks` sits under the `unscramble.py` SOURCE fence, because the
     script it shows is what produces the flag and no run of it was recorded.
     **Do not invent a terminal transcript to have something to mask**, and do not reconstruct payloads
     that were never recorded. Read that prohibition first: this bullet used to name only `ph4nt0m`, and
     a page whose solve happened in a browser then reads as a violation, which invites exactly the
     fabricated `zbarimg` capture the rule forbids.
  4. `## Why it works`, one or two paragraphs. One idea, not a lecture. The measured corpus norm is five
     to seven sentences and roughly 100 to 190 words (nineteen pages, 2026-09-04; `pie-time` 5/102,
     `ph4nt0m` 4/126, `stonks` 8/183). The earlier "two to four sentences" was never true of any page but
     one and condemned the reference page, so it was fired at spuriously in review; the number is
     descriptive, and one idea carried well is still the actual test.
- **How it degrades and stretches.** A two-command challenge is two fences and three sentences; that is
  the whole page and it is finished. A long one adds FENCES, not sections, and puts any log dump behind a
  `<Toggle>` so the visible fence stays short. **Subheadings:** zero is normal. One `###` inside
  `## Approach` is fine where the challenge genuinely pivots (local measurement, then the live instance),
  but only AFTER prose has followed the `##`, never immediately under it, which makes the `##` read as
  decoration. Three further tests, all from the 2026-09-04 audit that added the second and third `###`
  in the corpus (`stonks`, `ph4nt0m-1ntrud3r`) and rejected the other thirteen pages:
  - **LENGTH AND FLATNESS ARE NOT THE CRITERION, and reaching for them is the standard error.** `pie-time`
    has one of the FLATTEST Approach sections in the set and is the reference page. Measured longest
    unbroken prose runs: ph4nt0m 248, ssti1 173, hashcrack 172, stonks 170, get-ahead 148, so no
    threshold separates the pages that earned one from the pages that did not. A genuine pivot does.
  - **The backward-reference test, which is mechanical and decides most cases.** A `###` must not land
    directly above a sentence that reaches back across it. Every rejected candidate failed exactly here
    (`Two is the only even prime` answering the paragraph before it on even-rsa; `Send them to Repeater`
    on get-ahead), and both accepted pages needed a one-clause prose fix to pass it (`Converted back to
    bytes it is` became `the leak is`; `Sorted that way` became `Sorted by time`). If the seam cannot be
    made to pass without rewriting real content, the page does not want a heading.
  - **Depth: a `###` is a CODA, not a chapter break.** `pie-time`'s sits about 85% into its Approach and
    `stonks`' about two thirds in. One placed 15% in turns the `##` into a one-paragraph preamble, which
    is the same defect as placing it immediately under the `##` and is why `ssti1` was rejected despite
    carrying the most prose of any page.
  - **Sentence case, deliberately.** All three PicoCTF `###` are sentence case; all seventeen in the
    HackTheBox corpus are Title Case. Do not "normalise" the PicoCTF ones for consistency.
  A `###` also earns a nested `--depth: 1` row in both the desktop and mobile table of contents (cyan,
  per `chrome.css`), so it is a navigational object and not only a visual break. An image or a changed
  fence title is neither, and neither substitutes for one.
  **Callouts are available and the default is none.** A PicoCTF page carrying three of them
  is over-explained; Bandit carries zero.
- **Line highlighting is a SELECTION, and a selection needs a field.** A tint answers exactly one
  question, *which line?*, so it earns its place only where that question is live, and it must land on the
  line the surrounding prose actually uses. Three tests, all required (derived 2026-09-04 from a census of
  all 41 highlighted fences in the repo, after the owner rejected four newly authored ones):
  1. **More than one candidate exists.** A fence whose rows are all the same kind of thing (three setup
     commands, a two-line excerpt, a session whose whole progression is the content) has no minority to
     select and takes NONE. This is why all 37 Bandit fences and `scan-surprise` carry no highlighting,
     and that is correct rather than an omission.
  2. **The fence's own structure has not already answered it.** A shell prompt (`└─>`, `$`, `(gdb)`) is
     itself a selector, so where a fence holds ONE command that command is already picked out and tinting
     it says nothing the fence did not. The program chatter around it is noise the reader is skipping, not
     a field of candidates. A command becomes markable only once the prompt has stopped selecting, which
     is to say when several are typed and only some do the work (`forest` marks 1 of 7, and `pie-time`'s
     `gdb` fence 2 of 3 for the ceremony reason below). Re-check these two examples before citing them:
     the three that stood here until 2026-09-05 (`even-rsa`, `disko-1`, `busqueda`) were all wrong within
     a day, two because the tints they named were removed by this very rule and one because it was
     misread as a command when it marks `nmap` output.
  3. **The mark lands on what the prose consumes.** In a fence carrying commands AND output that is
     almost always the OUTPUT: the value, the grant, the line the next paragraph works on. `busqueda` and
     `n0s4n1ty-1` both mark `(ALL) NOPASSWD: ALL` rather than the `sudo -l` that produced it; `red` marks
     two `exiftool` fields rather than `exiftool`; `verify` marks the matched digest rather than the
     `sha256sum` that found it. Marking the command instead is the standard way this test fails, and it
     is invisible while writing because the command is what you were thinking about. Never a
     banner, never a heading line inside program output, never a masked `<flag>` (the `PasswordReveal`
     beneath it already does that job), never a log dump, never a whole session.

  **Marking 100% of a category selects nothing**, and is the same defect as marking a lone command.
  The reference page is the model on both counts: `pie-time` leaves its solitary
  `nc rescued-float.picoctf.net 55551` bare and marks the leaked address and the address typed back.

  Four qualifiers, all added 2026-09-04 by owner ruling on specific fences:
  - **CEREMONY IS NOT A CANDIDATE.** A command every session of its kind opens with does no work and
    does not count toward the field. `pie-time`'s `gdb` fence marks 2 of its 3 commands and leaves `r`
    bare, because `r` is how every `gdb` session starts. Excluding it is what makes the other two a
    selection rather than the whole set.
  - **BURIAL IS THE TEST, NOT LENGTH.** Mark only where the target sits inside material the eye skims.
    `n0s4n1ty-1`'s `(ALL) NOPASSWD: ALL` is the last row under four lines of `sudo` boilerplate, so it
    is buried and earns `{7}`. `stonks`' decode fence is two prompts, two commands and one result: the
    result is the only row that is neither, it is last, and the reader takes the whole fence in at once.
    Nothing is buried, so nothing is marked, even though a payoff line exists.
  - **A DUMP TAKES NOTHING.** Material offered for completeness rather than as a step (`pie-time`'s full
    disassembly, `stonks`' 817 hex digits, both behind a `<Toggle>`) carries no highlighting at all: it
    is there for whoever wants it, and directing attention inside it contradicts the reason it was
    collapsed. This is about dumps, NOT about `<Toggle>`: 22 of the 36 HackTheBox fences inside a toggle
    ARE highlighted, because those collapse a recon STEP whose payoff is the point of opening it.
  - **DO NOT TINT WHAT THE GRAMMAR RENDERS INERT.** A tint on a line Expressive Code has coloured as a
    comment says "look here" and "this is switched off" in the same glyphs. `rust-fixme-3` briefly
    marked the two commented-out braces that are the whole bug, and dropped it: they are the first and
    last rows of the fence, and the sentence directly above names them, so position and prose were
    already pointing and only the tint was fighting the syntax colours.

  Highlighting is per fence, so re-count the line numbers after any edit: a stale `{3,7}` silently marks
  the wrong rows and still builds.
- **A fence is titled by WHERE IT STARTS.** A fence opening on the local machine (the `Idan@Kali` prompt)
  is `Bash`, even when an `ssh` typed inside it continues on a remote host; a fence opening on a remote
  prompt is `SSH`. Bandit titles each fence with the level prompt (`bandit12@bandit`) because the level
  number is real information in a 34-step progression, and that does NOT transfer here: PicoCTF
  challenges are standalone, so a prompt-shaped title would carry nothing. Where the commands were not
  typed into a shell at all the title names the surface that took them: `Web shell` on `n0s4n1ty-1`,
  where each line went into a browser text box and reached the host through PHP's `system`. A file
  authored rather than executed is titled with its FILENAME (`RSA_decrypt.py`, `shell.php`), which also
  answers the question a bare `php` or `python` title leaves open, namely what to save it as.
- **NEVER write that a flag tail is "minted per instance" without evidence for THAT challenge.** The
  phrase sat on five pages and was wrong or unsupported on every one (audit 2026-09-06, five corrected:
  `webdecode`, `verify`, `ph4nt0m-1ntrud3r`, `insp3ct0r`, `even-rsa`). There is no platform default,
  because picoCTF does something different per challenge. Each entry below states what was MEASURED, not
  a mechanism inferred from it, and says how thin the sample is:
  - `webdecode`: one relaunch returned the flag byte-identical, tail included. Two observations.
  - `even-rsa`: two connections returned the same flag while `N` and the ciphertext differed both times,
    because `gen_key` runs at connection time. Two observations. Other solvers do publish other tails.
  - `super-ssh`: one relaunch rotated the port and returned the same host key and the same flag. Two.
  - `insp3ct0r`: a picoGym launch returned `302945a7` against the recorded `832b0699`, from a different
    host, so on this one the tail does track the deployment.
  - `verify`: five unrelated solvers landed on one tail and three of those print an identical
    `checksum.txt`, so the directory is prebuilt and reissued rather than generated.
  - `scan-surprise`: the tail follows the artefact index in `c_atlas/N`; four indices were decoded from
    the QR pixels and gave four tails.
  - `get-ahead`: port to tail is one to one across ten public records spanning 2021 to 2024.
  Write only what is observed, and prefer "belongs to the deployment" or "varies from copy to copy" over
  any claim about HOW the value is generated. **A tail seen twice is evidence of a fixed flag, never
  proof**, because prebuilt variant pools exist (`disko-1` documents three images differing only in the
  tail). Equally, do not append a consequence the evidence does not carry: "so a reader gets a different
  tail" is TRUE on `insp3ct0r` and FALSE on `webdecode`, so it is checked per challenge, never assumed.
- **Images:** the site-wide rule applies, alt text for screen readers PLUS a separate italic caption on
  the following line. Prefer one image that carries the technique over several that narrate it.

### Badge / tag system (canonical colors in `components.css`)
- Platform: the canonical `--pf-accent` per platform on the writeup row (`WriteupMeta`, `--wm-c`); the
  landing card carries its platform as the accent bar, hover border and focus ring, never as a badge (the
  `showPlatform` word on a future mixed grid reads `--pf-ink`).
- Difficulty: a neutral chip (word + pips) on the writeup row and pips + word on the card, both from
  `badges/DifficultyPips.astro`; the FILLED pips take the level hue from the difficulty arc (Easy sky,
  Medium violet, Hard magenta, Insane orange: cold to hot along one arc of the wheel). The filter rail pills are the one tinted difficulty surface.
- Category (PicoCTF): a `--wm-c` chip with the square swatch on the writeup row, swatch + word on the
  card, a tinted pill on the rail, all from the ring (General Skills teal, Cryptography violet, Web
  Exploitation blue, Forensics coral, Reverse Engineering orange, Binary Exploitation rose). See §6
  "Taxonomy palettes".
- OS / Environment: identity colours on the writeup row (`--wm-c`); neutral text facts on the card.
- Topic tags: parked (ROADMAP). No `.tag-*` rules exist in `src/styles/` and none should be resurrected;
  a future tag chip reuses the ring model.
- **The legacy `.meta-badge` / `.platform-*` / `.difficulty-*` / `.os-*` family is RETIRED 2026-09-07.**
  It survived the 2026-07-19 retirement of `.machine-meta` only because `WriteupCard` still emitted it on
  the landing pages (the 2026-07-19 correction). That emitter moved to the taxonomy vocabulary, `dist`
  was measured at zero anchored tokens first (anchor on a quote or whitespace: `\bos-linux\b` also
  matches `wm-os-linux`), the whole block was deleted from `components.css`, and the taxonomy guard now
  hard-fails any hand-authored token in those families. The 2026-06-01 glow dot went with it: the ring
  neither palette contains green, so a platform badge can no longer read as Easy. See DECISIONS 2026-09-07 · Two taxonomy palettes: the landing pages re-base onto the WriteupMeta chip model.
- **Frontmatter metadata (updated 2026-07-20):** `content.config.ts` extends `docsSchema` with strict
  optional enums for `os` (`Linux | Windows`), `environment` and `difficulty`, plus an optional `badges`
  boolean, `tags`, and `principle` (HackTheBox-only, guarded at the remark stage; see §7). Since the
  injection migration every writeup sets `environment`, and every writeup with a target operating system
  sets `os`, so `WriteupCard`'s OS fact has a value wherever one exists and is omitted where one does not
  (the card renders the enum value as text and maps it to no class; `head-dump` is the first
  writeup to omit `os`, see the WriteupMeta entry in §6). `tags` stays deliberately
  unused until writeup volume makes a tag filter earn its place (see ROADMAP).

### Badge system (WriteupMeta): icon sourcing, geometry, a11y

Icon sourcing splits by **POLYCHROME vs MONOCHROME**, not logo vs glyph (corrected 2026-07-17; see
DECISIONS). `src/components/badges/icons.ts` is the single source of truth mapping each enum value to one
icon.
- **Polychrome marks** (VulnHub, PicoCTF, OverTheWire, Linux): native-color `<img>` via hashed `?url`
  import. They carry 3 to 16 fills (Linux is Tux plus gradients), so `currentColor` would flatten them.
- **Monochrome marks** (HackTheBox, Windows, Active Directory, Progressive, Standalone): inlined via `?raw`
  + `set:html` and tinted from `--wm-c` (`currentColor`) in both themes. Sourced only from
  `src/assets/icons/` (inlining requires importing, and `public/` is not in the import graph); Standalone is
  authored inline in `icons.ts` (no file), and so is the PicoCTF category chip's swatch (`categoryGlyph`, 2026-09-07):
  one 9px rounded square, currentColor, `aria-hidden`, deliberately smaller than the 14px pictogram ink
  because it is a colour sample and not a picture. HackTheBox is a platform LOGO but is monochrome (one path, one
  fill), so it lives here, not with the `<img>` logos.
- **Geometry: a 14px grid.** Every glyph's larger ink dimension renders at ~14px in the 15px `.wm-ico` box,
  measured by rasterizing each glyph alone and taking its ALPHA bounding box (not path data). Only HackTheBox
  (letterboxed by a non-square viewBox) and Linux (a backdrop disc that defined its box) were off; the other
  seven already clustered. Standalone and Active Directory are slated for an artwork redraw ONTO this grid.
- **`public/icons` copies:** the three polychrome PLATFORM logos (VulnHub, PicoCTF, OverTheWire) are ALSO
  copied under `public/icons`, consumed by `PlatformIndex.astro` and `about.astro` by literal `/icons/` path.
  The sidebar is NOT a consumer: it uses colored dots, and the commented-out logo block this note used to
  cite as the alternative was deleted from the theme pass in the Phase 4a dead-rule purge. `public/icons/htb.svg`
  is RETAINED as the brand mark for those marketing surfaces and now deliberately DIVERGES from the inlined
  monochrome `src/assets/icons/htb.svg`; the former byte-identity was coincidental.
- **Accessibility:** every inline glyph carries `aria-hidden="true"`, so each chip's accessible name is
  exactly its text label. A build-time `inline()` normalizer in `icons.ts` strips comments, inter-element
  whitespace and the XML prolog from inlined glyphs (an `<?xml?>` prolog becomes a bogus comment node in an
  HTML document), keeping chip `textContent` clean. `active-directory.svg`'s creator credit (Amido Limited /
  Richard Slater, upstream CC0-1.0) ships as a `data-credit` attribute on the svg root (2026-09-07). It used
  to be a `<metadata>` block, which is text content: it sat in the chip's `textContent` and in the Pagefind
  body of every Active Directory page. An attribute survives the normalizer (which strips comments, never
  attributes) and is neither text nor an accessible name.
- `assetsInlineLimit` stays at the Vite default (size-based inline-vs-hashed split for the `<img>` assets).

## 8. Conventions & Non-Negotiables

- **NO em dashes** anywhere in site copy (use commas, colons, parentheses). Owner finds
  them "scream AI." Applies to all generated website text.
- **Tone:** confident, curious, learning-focused. No self-deprecation.
- **Type-safe scripts:** all TS inside `.astro` `<script>` uses explicit assertions
  (`as NodeListOf<HTMLElement>`, `as HTMLElement | null`, `!`, `?? ''`) → zero VS Code problems.
- **Code blocks:** every block has a language label; bash and python render identically; EC frames are
  square-cornered (sharp) in both themes (DECISIONS 2026-06-29).
- **Icons:** SVG for logos/icons; PNG acceptable only for detailed illustrations.
- **Landing is dark-only**; content pages keep the toggle.
- **Never rebuild Starlight**; content pages are themed via the `src/styles/` modules only.
- Real name is fine on the public site.

### The layer law

- **No `!important` inside a layer.** `!important` reverses layer order, so an important declaration in a
  late layer is WEAKER than one in an early layer. That inversion is a trap, so the theme pass keeps
  important declarations out of the layered modules entirely.
- **The tail contract.** `overrides.css` is the only unlayered surface, and a rule earns a place there on
  exactly one of two grounds: it must beat unlayered CSS (a vendor stylesheet, an inline style, or one of
  our own Astro-scoped component styles, all of which sit above every layer), or it carries `!important`.
  Every tail rule carries a comment naming what it beats. The tail is 13 rules today: nine `.ec-cmd-*`
  colour rules (they beat Expressive Code's inline per-token styles), the two `.pi-index .reveal`
  transition rules and the V3 light card shadow (they beat WriteupCard's and PlatformIndex's own scoped
  styles), and the `.flagcap` reduced-motion kill.
- **Growing the tail is a decision, not a convenience.** Reach for a layer first; the tail is for cases
  where layering provably cannot work, and "provably" means measured in a browser, not argued.

### The two instruments

Reach and precedence are separate mechanisms and are routinely confused:

- **`.not-content` governs REACH.** It is a scoping guard on our prose selectors, written
  `:not(:where(.not-content *))`. Matching Starlight's own convention, it excludes DESCENDANTS of a
  `.not-content` element, not the element itself. So a component root that carries the class is still
  matched by a rule that names it, and such self-carriers are resolved by precedence, never by the guard.
  A rule that carries no guard (the bare `:not(pre) > code` inline-code chip, for one) reaches into every
  component subtree regardless of `.not-content`.
- **Layer order governs PRECEDENCE, and components win where they speak.** An Astro scoped style is
  unlayered, so it beats every layered rule of ours at any selector weight. That is the real reason a
  component's own styling holds inside its subtree, and it is the mechanism to cite, not the guard.
- Consequence: to override a component from the theme pass, a layered rule is not enough. It takes a tail
  rule, under the contract above.

### A contrast figure is meaningless without its composite

**Record the surface a ratio was measured against, or the ratio is unverified.** A contrast number is a
statement about a PAIR, and the backdrop half of that pair is the half this project keeps getting
wrong. Text rarely sits on a token: it sits on a stack of a page background, a wash, a translucent
fill, a state tint, and sometimes a repeating texture.

**Every ratio written into these docs, into a CSS comment, or into a commit message names its
backdrop.** Where a surface is layered, name the model. (This convention exists because the project
shipped a wrong number twice by measuring against a simpler surface than the one that renders; see
DECISIONS 2026-07-31 · The platform ink family, and the wash that was causing the failure it hid.)

- **Model A, bare.** Page background plus solid ancestor fills only. Useful as a ceiling, never as a
  verdict for an element that has anything painted over it.
- **Model B, the composite (AUTHORITATIVE).** Everything continuously painted behind the glyphs:
  washes, gradients, translucent fills, state tints. This is what "the contrast" means.
- **Model C, the per-pixel floor.** Model B plus repeating texture (the light dot grid). Report it, and
  know its limit: a grid sampler can MISS a 2px dot on a 22px pitch and silently return model B, so a
  model C figure that equals its model B figure is a sampling miss, not a clean surface. Compute the
  floor analytically when it matters.

### The `--sl-color-white` inversion rule

Starlight's `--sl-color-white` and `--sl-color-black` INVERT per theme: white resolves to the page's
foreground, which is near-black on the light paper. A theme-agnostic declaration that reads one of them
therefore flips meaning between themes. Any such use must be deliberate and must carry a warning comment
saying so; if the intent is a literal colour, write the literal. This already bit the light `h1#_top`
gradient, whose start stop would have vanished on paper had it used the token.

### Dead in effect, not just unreferenced

A rule that matches live elements but always LOSES is dead in effect. It is deleted, never migrated: a
cascade reordering can silently revive it, so carrying it into a new layer structure converts a harmless
no-op into a live regression. Deadness is established by measurement (does it win anywhere, on any real
page, in either theme), not by reading the selector. See DECISIONS 2026-07-26 · The theme pass moves to
declared cascade layers and splits into per-layer modules.

### Selector weight, and the flatten that is not happening

Inside a layer, selector weight still orders ties, so it remains a legitimate tool for expressing "this
specific case beats that general one" within a single concern. What it is no longer used for is
out-ranking another layer. **Selector flattening is formally dropped from this workstream**, in this and
any future phase: the remaining multi-part selectors either express real precedence within their layer or
are load-bearing against unlayered CSS, and flattening them buys tidiness at the cost of the behavior the
layer contract just made legible. Unit conversions are likewise deferred to the retune (see the unit rule
in `layers.css`).

### The context law

**A font-relative length resolves against the element it is declared on. If its purpose is to size,
align, or space content that lives in a DIFFERENT font-size context, it is wrong, even when it correctly
tracks the local font size.** That last clause is the whole point: every instance below passed the older
test and still failed, because "does this `em` track its local font size" is a question the broken
declaration answers yes to.

**Remedies, in strict order. Reach for the first one that applies.**

1. **Delete the number.** Let a layout primitive compute the relationship. A grid track sized
   `max-content` cannot drift from the thing it measures, because it has no value of its own.
2. **Declare it in the governed element's own context.** If the number must exist, put it where the
   `em` resolves against the text it actually governs.
3. **Use `rem` or `px` so both sides agree,** with a comment naming the coupling it holds.

**This supersedes the narrower unit rule in the `layers.css` header,** which asks only whether an `em`
tracks its local font size. That question answers yes in every instance of this defect, so it cannot
catch one. It is insufficient, not wrong.

**One instance is still open:** the `46ch` Principle cap, which measures 36.97 characters rather than 46.
See ROADMAP. The two resolved instances and the full audit are in DECISIONS 2026-07-27 · The context law:
a font-relative length that governs another context is wrong.

### Prefer computed relationships to declared ones

If two elements must align, express it with a layout primitive rather than a number. **A declared
relationship is a standing promise to re-derive it every time a font, a size, or a token moves, and this
project has already failed that promise across two font changes with no build ever going red.** A
computed relationship removes the promise instead of documenting it.

### Content carries data, never presentation

MDX carries semantic data. Class names, separator glyphs, and layout markup belong to components or to
build-time transforms.

**A COMPONENT THAT MUST BE IMPORTED INTO A CONTENT FILE IS ITSELF PRESENTATION IN THAT FILE.**

**The test:** count what a content file must know about how the thing looks. A class name, a separator
glyph, a wrapper element, and an import line are all the same kind of knowledge. **Zero is the target.**
An earlier, weaker form of this test ("if changing the look requires editing content files, the boundary
is wrong") is superseded, because a component pair passed it while still putting an import line and a JSX
tree in every content file.

**When a build-time transform can produce the same structure from data the author already writes, prefer
the transform.** The worked example, including the component attempt that passed the old test and failed
its purpose, is in DECISIONS 2026-07-27 · The recon rail, in three attempts: grid on the list, two
components, then a remark transform.

**The residue, and why it is acceptable:** the ` : ` survives in source. It is not a rendered glyph, it is
a parse delimiter consumed at build time, and it is the least ambiguous way to mark where the port token
ends. A convention that has to be learned is cheaper than markup that has to be maintained, but it is not
free, so it is recorded here rather than treated as invisible.

### A pinned size implies a pinned leading

A component that pins `font-size` off the prose scale must pin `line-height` too, or half its metrics
still track prose and its box keeps growing whenever the body does even though its glyphs do not.
`--mono-chrome-leading` (1.4) is the pinned partner to `--mono-chrome-size`.
**Known remaining consumer: inline code** (`:not(pre) > code`) reads `--mono-chrome-size` but still
inherits prose leading. Left deliberately, because inline code sits inside running paragraphs, so pinning
its leading changes prose line boxes: a reading-surface decision, not a component one.

### CSS-only is a scope boundary, not a universal law

"CSS-only" governs **the theme pass over Starlight**, where the rule against forking Starlight components
is absolute and unchanged. It does **not** govern our own content components. When a presentation problem
needs structure the content does not have, **add the structure**, in a component or in a build-time
transform, rather than encoding it as literals in CSS. **Where that structure is added is a separate
question from whether to add it**, and the rule above answers it: a transform, when the data is already
there. Worked example in DECISIONS 2026-07-27 · The recon rail, in three attempts: grid on the list, two
components, then a remark transform.

## 9. Environment & Tooling

- **Host OS:** Windows. Project at `C:\dev\idanlab` (avoids Hebrew username path).
- **Kali** lives in a VM for actual security work (never the build host).
- **Editors/tools:** VS Code (+ Astro extension, optionally Claude Code), GitHub Desktop, Git.
- `npm config set cache C:\npm-cache`. PowerShell: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`.
- TODO (env): change Windows username from Hebrew to English (create new admin account).

## 10. Glossary

- **"Decrypted"** — the project's visual language (ink + lime/cyan duotone, Syne + JetBrains Mono).
- **Theme pass** — the CSS-only layer that styles Starlight to match the marketing pages.
- **Marketing pages** — standalone immersive pages (home, about).
- **Content pages** — Starlight docs (writeups + platform landings).
- **Platform codes** — HTB (HackTheBox), VH (VulnHub), Pico (PicoCTF), OTW (OverTheWire).

## 11. Rejected and settled

Things considered and decided against, where the rejection still stands. The fact only: the reasoning lives
in `DECISIONS.md` under the entry named on each line. One rejection per line, unwrapped, so a grep returns
whole records.

- Upgrading dependencies outside a stable checkpoint, and hand-bumping versions: rejected. See DECISIONS 2026-05-31 · Stay on current package versions (no upgrade).
- Forking or rebuilding any Starlight component: rejected. See DECISIONS 2026-05-31 · Writeup theme pass is CSS-only.
- Emoji sidebar markers: rejected. See DECISIONS 2026-05-31 · Sidebar markers: CSS colored dots, not emojis.
- Em dashes in site copy: rejected. See DECISIONS (earlier) · No em dashes in site copy.
- The blue / cyan / violet / orange writeup badge palette: rejected. See DECISIONS 2026-06-01 · Canonical platform palette: lime / red / purple / amber.
- A cross-page global model for the Expand/Collapse-all control: rejected. See DECISIONS 2026-06-20 · ToggleAll control: sidebar placement, scroll anchoring, native-anchor fix.
- The risograph title-misregistration effect on light: rejected. See DECISIONS 2026-06-14 · Light-mode art-direction: paper-native "risograph".
- "Co-Authored-By: Claude" and "Generated with Claude Code" trailers: rejected. See DECISIONS 2026-06-14 · Git hygiene: no Claude attribution; trailer scrubbed from history.
- Redacting a published private key to a placeholder: rejected. See DECISIONS 2026-06-26 · Truncate embedded private keys in writeups (GitHub push protection).
- GitHub's allow-secret bypass URL for a real key: rejected. See DECISIONS 2026-06-26 · Truncate embedded private keys in writeups (GitHub push protection).
- Colocated per-writeup folders, and hand-listing writeups in `astro.config.mjs`: rejected. See DECISIONS 2026-06-30 · Content images and writeup structure: flat files + parallel src/assets (supersedes colocated index.mdx).
- Reusing FlagCapture for wargame passwords: rejected. See DECISIONS 2026-07-05 · PasswordReveal: a dedicated amber component for wargame passwords (not a FlagCapture reuse).
- Trusted Types in the CSP: rejected, breaks SecretTerminal. See DECISIONS 2026-07-05 · Application-layer security headers via public/_headers; CSP Report-Only as a staging step toward enforcement.
- HSTS in `public/_headers`: rejected, the Cloudflare zone owns it. See DECISIONS 2026-07-05 · Application-layer security headers via public/_headers; CSP Report-Only as a staging step toward enforcement.
- Enumerating inline-script hashes to drop `script-src 'unsafe-inline'`: rejected. See DECISIONS 2026-07-05 · Application-layer security headers via public/_headers; CSP Report-Only as a staging step toward enforcement.
- Any third-party analytics beacon, including a manual Cloudflare install: rejected. See DECISIONS 2026-07-06 · Cloudflare Web Analytics disabled; CSP stays script-src 'self' (no third-party beacon).
- A script as the content-pipeline mechanism, including `notion_cleaner.py`: rejected. See DECISIONS 2026-07-11 · Content pipeline is manual editorial polish, not a script (retires notion_cleaner.py).
- `astro check`, and the `@astrojs/check` plus `typescript` dependencies it needs: rejected. See DECISIONS 2026-07-12 · Build-time content-taxonomy guard (remark plugin) as the ruled-out astro check alternative.
- Deleting the `platform-*` badge rules WHILE `WriteupCard` still emitted them: rejected (2026-07-19), and the rejection stands as a rule about live emitters. Its premise ended 2026-09-07 when the card moved to the taxonomy vocabulary, and the whole legacy badge family was then deleted with `dist` measured at zero tokens first. See DECISIONS 2026-07-19 · `.machine-meta` deleted; the REST of the badge family is not dead (corrects the entry below), and DECISIONS 2026-09-07 · Two taxonomy palettes: the landing pages re-base onto the WriteupMeta chip model.
- A `misc` fallback tier in `PlatformIndex` for an unknown middle directory: rejected, the build fails naming the allowed directories. See DECISIONS 2026-09-07 · Two taxonomy palettes: the landing pages re-base onto the WriteupMeta chip model.
- Gold or amber as a difficulty or category hue: rejected, gold is the flag-loot signal and amber the OverTheWire identity. See DECISIONS 2026-09-07 · Two taxonomy palettes: the landing pages re-base onto the WriteupMeta chip model.
- One shared ring for difficulty and the categories: rejected on the owner's review the same day (2026-09-07). A rating wore a category's hue, and four hues spread around the wheel read as labels rather than as a scale; difficulty now reads its own four-step arc (`--tier-*`, sky, violet, magenta, orange, cold to hot) and the ring is PicoCTF-only. Single-hue ramps, a yellow or amber seat (the flag gold and the Linux chip own it in both themes) and HackTheBox's own green, yellow, red, purple scale were measured and rejected on the way. See DECISIONS 2026-09-07 · Two taxonomy palettes: the landing pages re-base onto the WriteupMeta chip model.
- The platform accent as the landing card's lead colour (bar, hover border, glare, focus ring): replaced on the owner's review (2026-09-07) by the card's group hue, after a measured study of both rules on both platforms; the platform keeps the hero, the name, the stat, the glow, the wargame card and the footer pagination ring. A bar-only half measure was measured and rejected: the card snapped from its group to the platform on hover. See DECISIONS 2026-09-07 · Two taxonomy palettes: the landing pages re-base onto the WriteupMeta chip model.
- Platform colour on the ALL filter pill: rejected, ALL is a neutral control. See DECISIONS 2026-09-07 · Two taxonomy palettes: the landing pages re-base onto the WriteupMeta chip model.
- `html { overflow-x: hidden }` (or `clip`) ALONE to stop the landing's sideways scroll: shipped once and measured to do nothing at all, because the root's value propagates to the viewport and the root then clips nothing itself. A rule on `body` alone fails identically while the root is `visible`. It takes the pair, and `clip` rather than `hidden` so body never becomes a scroll container. §6 "No sideways scroll on a landing" carries the readings. Do not re-try the single rule.
- Grading all 34 Bandit levels, and giving `difficulty` a fallback value: rejected. See DECISIONS 2026-07-19 · WriteupMeta difficulty becomes optional; Bandit's 34 pages migrate off `.machine-meta` (retiring it site-wide).
- `platform` as a frontmatter field with a missing-key guard: rejected. See DECISIONS 2026-07-20 · WriteupMeta is injected from frontmatter, platform is derived from the directory.
- Grid on the recon markdown list, and the `<Findings>` / `<Finding>` component pair: rejected. See DECISIONS 2026-07-27 · The recon rail, in three attempts: grid on the list, two components, then a remark transform.
- Cherry-picking the CSS refactor to `main` ahead of the retune: rejected. See DECISIONS 2026-07-27 · The release hold is lifted and `dev` ships to production.
- Solving the platform eyebrow inks without moving the hero wash: rejected. See DECISIONS 2026-07-31 · The platform ink family, and the wash that was causing the failure it hid.
- Dimming the platform hero wash for contrast: rejected, no alpha reaches AA. See DECISIONS 2026-07-31 · The platform ink family, and the wash that was causing the failure it hid.
- A Principle coda on Bandit, or on any page outside hackthebox/: rejected. See DECISIONS 2026-09-03 · The Principle coda keeps the pager, and `principle:` is HackTheBox-only with a build guard.
- Suppressing the Prev/Next pager beneath the Principle coda ("the silence"): rejected. See DECISIONS 2026-09-03 · The Principle coda keeps the pager, and `principle:` is HackTheBox-only with a build guard.
