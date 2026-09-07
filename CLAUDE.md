# CLAUDE.md

Router for this repository. It tells a session how to operate and what to load. Keep it short: it loads every time.

**Idan.Lab** ([idanlab.dev](https://idanlab.dev)): a personal cybersecurity lab notebook and portfolio. CTF writeups (HackTheBox, VulnHub, PicoCTF, OverTheWire) plus a recruiter-facing profile. Astro + Starlight, static, on Cloudflare Pages. Content is the product; the design is deliberately high-effort ("Curiosity is my exploit").

## Documents: four files, four jobs

| File | Job | Loaded |
| --- | --- | --- |
| `CLAUDE.md` | ROUTER. How to operate, what to load. | always |
| `docs/CORE_SPEC.md` | CURRENT STATE. What is true now, what is forbidden, and `Rejected and settled` for what was already decided against. | always |
| `docs/ROADMAP.md` | THE FUTURE. Planned, in progress, deliberately deferred. Forward-looking only. | always |
| `docs/DECISIONS.md` and `docs/DECISIONS-ARCHIVE.md` | THE WHY. Reasoning, rejected alternatives, evidence. | on demand only |

**Default context set: `CLAUDE.md` + `docs/CORE_SPEC.md` + `docs/ROADMAP.md`.** That is the whole default load.

**`docs/DECISIONS.md` and `docs/DECISIONS-ARCHIVE.md` exist, are current, and are maintained.** They are excluded from the default load ON PURPOSE, to keep session context affordable. Their absence is the architecture, not an oversight and not a missing file. Do not add them to the default set.

If CORE_SPEC conflicts with a chat, CORE_SPEC wins.

## When to read DECISIONS

A session needs three things: what is true, what is forbidden, and what was already decided against. CORE_SPEC carries all three, the third in its `Rejected and settled` section. So read DECISIONS only when:

- writing a new entry (protocol below);
- a specific "why was this decided this way" question arises that CORE_SPEC does not answer;
- checking whether something has been proposed before, and `Rejected and settled` does not settle it.

Read `DECISIONS-ARCHIVE.md` only when tracing a superseded decision's history. That is rare. Search both, never browse them.

## Writing to DECISIONS

- **Never write to `docs/DECISIONS.md` or `docs/DECISIONS-ARCHIVE.md` unless I explicitly ask.** Propose the entry in chat, wait for approval, then write.
- DECISIONS is loaded ON DEMAND AT THE MOMENT OF WRITING, never as persistent session context. A well-formed entry has to know what is already there (a `Supersedes:` line needs the prior entry's exact date and title), so the load happens once, at the point of writing, and only when a decision was actually made.

### The supersession check, part of every write

Before writing an entry, check whether it supersedes an in-force decision. If it does, pick the form first, then do the move in the SAME edit.

**`Supersedes:` is WHOLESALE.** The old entry is entirely replaced:

1. Move the superseded entry from `DECISIONS.md` to `DECISIONS-ARCHIVE.md`.
2. The moved entry gains, at its top: `Superseded by: <date> · <title>`.
3. The new entry gains: `Supersedes: <date> · <title>`.
4. Both references use date and title.

**`Supersedes in part:` is PARTIAL.** Only some of the old entry is replaced. Name the specific bullet or claim that dies. The old entry STAYS LIVE in `DECISIONS.md`, is NOT archived, and gains NO `Superseded by:` line, because it is not superseded.

**`Partly superseded by:` is the RECIPROCAL of `Supersedes in part:`,** and both halves of a partial pair should exist. The live entry gains `Partly superseded by: <date> · <title>`, naming what specifically is stale, placed AT THE AFFECTED BULLET rather than at the top: a reader meets the caveat where the stale claim is, instead of carrying a top-of-entry warning through the whole entry. It stays live and is NOT archived. Do not confuse it with `Superseded by:`, which appears ONLY on an archived entry and ONLY at its top.

When unsure which applies, use `Supersedes in part:` and name what is replaced. The two errors are not symmetric: archiving a live entry silently removes content from the default context, while leaving a partly-stale entry live is merely untidy.

Entries move at the moment of supersession, never on a periodic cleanup pass. Miss this and the superseded entry stays live while a newer one contradicts it, and the structure rots silently.

### Cross-reference convention (standing rule)

Reference a DECISIONS entry by **DATE AND TITLE**.

- Never by git hash. A hash points at history that may be rewritten.
- Never by positional language: "the entry above", "the entry below", "the top entry", "the previous entry". This is the worse defect of the two. A broken hash fails to resolve and is detectable; a stale positional reference silently resolves to the WRONG entry. In a newest-first log, "the top entry" decays on its own every time an entry is prepended, with no migration needed to break it. Found live in three entries that had been pointing at the wrong decision for weeks.

## ROADMAP rule

Completed items are **deleted** from ROADMAP on completion. Not archived, not moved to a "Shipped" list. They leave at completion, not on a periodic audit. ROADMAP describes the future; a shipped plan is superseded by reality, its state lives in CORE_SPEC and its rationale in DECISIONS.

This is deliberately the OPPOSITE of the DECISIONS rule, which never deletes, because provenance is what DECISIONS is for.

## Commands

| Command | Action |
| --- | --- |
| `npm run dev` | Dev server at `localhost:4321` (alias: `npm start`) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the built site |

- **No test runner and no linter.** `npm run build` is the validation gate: it fails on TypeScript errors and on Starlight sidebar misconfiguration.
- **`astro check` is not available and must not be added.** It needs `@astrojs/check` plus `typescript`, both absent and both rejected as new dependencies. The build, plus the taxonomy guard in `plugins/remark-validate-content-taxonomy.mjs`, is the substitute.
- **Never hand-bump dependency versions.** Pinned at a known-good set; upgrade only from a stable checkpoint via `npx @astrojs/upgrade`.

### Which server

- `npm run dev` for implementation and visual iteration. HMR makes it the right loop for anything you are looking at rather than measuring.
- `npm run build` then `astro preview` for production verification, deployment behaviour, and any computed-style measurement that gates a commit. CSS emission order differs between the two, and unlayered rules (the `overrides.css` tail and every Astro scoped style) settle by source order, so dev can resolve a tie differently from production.
- Never iterate on `astro preview`. Never compare a baseline captured on one server against an after-state captured on the other.

`.claude/launch.json` carries `astro-dev` on 4321 and `astro-preview` on 4331, so a measurement run does not displace the iteration server.

## Architecture rules

Full description in CORE_SPEC §5. What a session must not get wrong:

- **Two surfaces.** Marketing pages are standalone `.astro` in `src/pages/`: own `<head>`, inline token block and inline FX. Everything in `src/content/docs/` is Starlight. Picking the wrong one is the easiest mistake here. **Only `/` is dark-only.** `/about` has a working theme toggle and a full `html[data-theme='light']` block, so treating both as dark-only will produce a light-mode regression nobody sees on the homepage. CORE_SPEC §5 "Theme behavior" is authoritative.
- **Route collision.** A `src/pages/` route and a Starlight doc must not both claim the same URL. Adding a marketing page means deleting any Starlight doc on that route, and the reverse.
- **Never fork or rebuild a Starlight component.** The theme pass is CSS only and must not touch Starlight's functionality.
- **A sidebar `autogenerate.directory` must exist** or the build errors. Create the folder with at least one writeup before enabling its entry. HTB Hard is commented out for this reason (the folder is empty); Medium is live.
- **Directory casing must match exactly.** Difficulty folders are lowercase. Starlight matches case-sensitively, so pointing at `hackthebox/Easy` silently drops writeups in `hackthebox/easy/`: the page still builds and stays URL-reachable, it just never appears in the sidebar. Windows hides this, a Linux/Cloudflare build does not, and a case-only rename needs `git mv` (`core.ignorecase=true`).
- **`@components` alias:** the FUNCTIONAL one is the Vite alias in `astro.config.mjs`. The `tsconfig.json` `paths` entry only satisfies the editor and does not affect the build.
- **The marketing token block is duplicated** in `index.astro` and `about.astro`. Keep them in sync if you edit one.

## Writeups

Flat `.mdx` at `src/content/docs/<platform>/<middle>/<slug>.mdx`, where the middle directory is validated per platform (first rule below). Reference file: `busqueda.mdx`. Full conventions in CORE_SPEC §7. The rules that break the build or the page if missed:

- **Metadata is FRONTMATTER ONLY.** Set `os`, `environment`, and `difficulty`. The `WriteupMeta` badge row is INJECTED by `plugins/remark-inject-writeupmeta.mjs`: never import it, never write the tag. `platform` is NOT a frontmatter field, it is derived from the directory, so it cannot be mistyped. Values are strict enums in `src/content.config.ts`, so casing matters. **The middle directory is validated per platform** (`src/lib/taxonomy.mjs`): a HackTheBox or VulnHub writeup sits in a tier directory (`easy`, `medium`, `hard`, `insane`) and its `difficulty` is REQUIRED and must match that directory; a PicoCTF writeup sits in one of the six category directories and carries NO `difficulty` (its category is derived from the directory, never a frontmatter field); OverTheWire carries no `difficulty` either. Each of those fails the build otherwise, and there is no `misc` fallback. `badges: false` (unquoted boolean, never `no` or `off`) opts a page out. `principle:` (the closing coda) is HackTheBox-only and optional; anywhere else the build fails.
- **The recon findings rail is a PLAIN MARKDOWN LIST** inside `<Callout type="recon">`. No component, no import, no markup:

  ```mdx
  <Callout type="recon">

  - 53/tcp : DNS, Simple DNS Plus
  - 389/tcp : LDAP for `htb.local`

  The concluding paragraph is treated as the Assessment.

  </Callout>
  ```

  `plugins/remark-transform-recon-rail.mjs` converts it at build time. **The ` : ` is a PARSE DELIMITER, consumed at build time and never rendered**; the separator the reader sees is a CSS rule, because a separator is presentation. Conversion is all or nothing per list: one unparseable item leaves the whole list as bullets, which is visibly wrong so you notice.
- **Images live in `src/assets`**, in a mirrored tree, referenced by relative Markdown path (four `../` from a difficulty tier) so `astro:assets` optimizes and hashes them. Plain Markdown image syntax, not `<Image />`.
- Import the toggle: `import Toggle from '@components/Toggle.astro'`. Code blocks take `frame="code"` plus a language `title`. Bold inside a fence is impossible: use line highlighting, for example ` ```bash {3} `.
- Flag answers and spoilers go in `:::tip[Answer]` admonitions, often inside a `<Toggle>`.
- Every writeup follows Recon, Foothold, Escalation, Reflection, and documents the thinking and the dead ends, not just the commands.

## Git policy

- Never run `git commit` or `git push` unless I explicitly ask. Edit locally; I commit myself.
- Only `main` and `dev`. Never create or rename branches unless I explicitly ask.
- **NEVER open a pull request, for any reason, including if asked in a task brief.** This is not a "unless I say otherwise" rule any more. A PR mints a server-managed `refs/pull/N/head` on GitHub that permanently pins the branch's entire ancestry and is not writable or removable by push. See the `main` merge rule below for the second reason.
- Never add "Co-Authored-By: Claude" or modify commit authors.
- **Never rewrite git history: no rebase, amend, force push, or reset, unless I explicitly request it.**
- **`main` is reached by a COMMAND-LINE merge, never a pull request and never the GitHub web UI.** Run `git merge --no-ff dev` so the merge is an explicit two-parent commit. Never `--squash`: it would collapse the atomic commit history this project preserves on purpose. Two standing reasons, both permanent, not situational: (1) the account has "keep my email addresses private" enabled, so a web-UI merge authors with a `users.noreply.github.com` address, reintroducing a second identity into a history that was deliberately normalized to one; (2) a pull request mints a `refs/pull/N/head` that pins its entire ancestry permanently and is not removable by push, which is why a GitHub Support request is currently open. Pushing `main` still needs an explicit instruction. Reasoning: DECISIONS 2026-08-06 · Merges to `main` run from the command line, not through a pull request.
- **Identity is `Idan-Babayan <contact@idanlab.dev>`** on every commit, merge, and other git operation. No other email address, ever.
- Before committing, confirm `git config user.email` is `contact@idanlab.dev` and `git config user.name` is `Idan-Babayan`.
- If a task involves git, ask before doing anything.

Delegated authority (2026-07-25, owner instruction): Claude Code may run read commands, stage, commit, and push to `dev` under the phase-gate protocol, with the build green before any commit. Everything above still binds.

## My rules

- NO em dashes in any copy. Use commas, colons, or parentheses.
- Don't upgrade dependencies unless I ask. Versions are pinned.
- Marketing pages are standalone. The homepage is dark-only; `/about` supports light and dark. Writeups are Starlight, themed via the `src/styles/` modules under the layer contract (tokens, base, prose, chrome, components, pages, utilities), with `overrides.css` the only unlayered surface. Never rebuild Starlight.
- No `!important` inside a layer (it reverses layer order). Rules that must beat unlayered CSS, including our own Astro-scoped component styles, go in `overrides.css` with a comment naming what they beat.
- No selector flattening and no unit conversions in the theme pass.
- TypeScript in `.astro` `<script>` blocks uses explicit assertions (`as HTMLElement | null`, `!`, `?? ''`). Match that style.
- Real name is fine on the public site.
- `docs/CORE_SPEC.md` is the source of truth.
