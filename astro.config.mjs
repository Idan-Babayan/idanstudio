import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import starlightImageZoom from 'starlight-image-zoom';
import path from 'path';
import { pluginPrivCommand } from './src/lib/ec-priv-command.mjs';
import rehypeContentImageLoading from './plugins/rehype-content-image-loading.mjs';
import remarkInjectPasswordReveal from './plugins/remark-inject-passwordreveal.mjs';
import remarkInjectWriteupMeta from './plugins/remark-inject-writeupmeta.mjs';
import remarkValidateContentTaxonomy from './plugins/remark-validate-content-taxonomy.mjs';
import remarkTransformReconRail from './plugins/remark-transform-recon-rail.mjs';

export default defineConfig({
  site: 'https://idanlab.dev',

  // Pinned to Astro 6's current default rather than left implicit, so it is provably a no-op here.
  // Astro 7 changes the default to 'jsx', which strips whitespace BETWEEN inline elements following
  // JSX rules. The badge rows, port-label spans, task-title spans and the wordmark are exactly the
  // markup shape that silently loses a rendered space under that rule. Setting it now keeps
  // whitespace handling a separate decision, made on its own merits, rather than a side effect of
  // the framework upgrade.
  compressHTML: true,

  vite: {
    resolve: {
      alias: {
        '@components': path.resolve('./src/components'),
      }
    }
  },

  // Plugins go to unified() from @astrojs/markdown-remark, not to the top-level
  // markdown.remarkPlugins / markdown.rehypePlugins keys, which Astro 6.4 deprecated and Astro 8
  // removes. Array order is IDENTICAL to what those keys carried and is load-bearing; the rationale
  // for each position is below. gfm, smartypants and remarkRehype are deliberately not passed here:
  // unified() resolves an unset option back to the shared top-level value, and all three already sit
  // at their defaults (gfm true, smartypants true, remarkRehype {}), so passing them would restate
  // the default and invite drift.
  // Content image loading: a rehype pass sets loading/decoding on content <img> (first eager,
  // rest lazy). Covers raw /public absolute-path images that skip astro:assets. See plugins/.
  // remarkInjectPasswordReveal: a remark pass that auto-injects the PasswordReveal import into
  // any MDX file that uses <PasswordReveal /> inline, so writeups need no per-file import.
  // remarkValidateContentTaxonomy: a read-only remark pass that fails the build on an unknown
  // hand-authored badge/metadata class token or component metadata value (a content typo that would
  // otherwise ship as a silently unstyled element). Runs first so it validates the pristine authored
  // tree; ordering is not otherwise significant since it only reads and never mutates. See plugins/.
  // remarkInjectWriteupMeta: injects the <WriteupMeta /> badge row into every writeup, with platform
  // derived from the platform directory and os/environment/difficulty read from frontmatter, so no
  // writeup hand-places the component. Runs LAST, after the guard, so the guard keeps seeing only
  // hand-authored markup (its documented boundary) and never validates generated nodes. Frontmatter
  // is attached to the vfile before any remark plugin runs, so this position does not affect the read.
  // remarkTransformReconRail: rewrites a plain markdown list inside <Callout type="recon"> into the
  // findings rail's dl/dt/dd structure, so a recon rail is authored as data rather than as markup.
  // Appended LAST for the same reason as the injector: the taxonomy guard's boundary is hand-authored
  // markup, and the dl/dt/dd this emits are generated nodes it should never see.
  markdown: {
    processor: unified({
      remarkPlugins: [remarkValidateContentTaxonomy, remarkInjectPasswordReveal, remarkInjectWriteupMeta, remarkTransformReconRail],
      rehypePlugins: [rehypeContentImageLoading],
    }),
  },

  integrations: [
    starlight({
      expressiveCode: {
        // Chosen by A/B on the busiest bash command lines (Busqueda writeup), not corpus-wide
        // counts: a real command line only exercises a couple of token scopes. tokyo-night is the
        // only-tier dark theme that gives command / flag / IP three distinct colors (github-dark
        // collapsed command+flag+path into one band of blues). one-light separates command vs flag
        // on every command line (catppuccin-latte merged them). Both pass WCAG AA on their code bg.
        themes: ['tokyo-night', 'one-light'],
        // Tag privilege commands (sudo, ...) with .ec-cmd-priv so overrides.css can color them
        // distinctly. Implemented as an EC plugin because EC 0.42 rejects Shiki DOM-transformer
        // hooks (span/etc). See src/lib/ec-priv-command.mjs for the mechanism + rationale.
        plugins: [pluginPrivCommand()],
      },
      plugins: [starlightImageZoom()],
      head: [
        // Fonts are self-hosted via @font-face in src/styles/fonts.css (public/fonts/) with
        // metric-matched fallbacks and font-display: swap, so first paint is shift-free with no
        // preload. Font <link rel="preload"> was removed on purpose: Firefox does not credit a
        // same-origin crossorigin font preload served from its own preload cache, so it warned
        // "preloaded but not used" on every page even though both faces paint above the fold. The
        // preload only shortened first-load FOUT (no CLS or LCP effect here). Do not re-add font preloads.
        // Reading-progress bar (styled by #tp-progress in chrome.css)
        { tag: 'script', content: "window.addEventListener('DOMContentLoaded',function(){var b=document.createElement('div');b.id='tp-progress';document.body.appendChild(b);var u=function(){var h=document.documentElement,m=h.scrollHeight-h.clientHeight;b.style.width=(m>0?h.scrollTop/m*100:0)+'%';};document.addEventListener('scroll',u,{passive:true});window.addEventListener('resize',u);u();});" },
      ],
      title: "Idan.Lab",
      customCss: [
        './src/styles/layers.css',
        './src/styles/fonts.css',
        './src/styles/tokens.css',
        './src/styles/base.css',
        './src/styles/prose.css',
        './src/styles/chrome.css',
        './src/styles/components.css',
        './src/styles/pages.css',
        './src/styles/utilities.css',
        './src/styles/overrides.css',
      ],
      // Additive override: render the default right "On this page" sidebar and add the ToggleAll
      // control at the top (see src/components/overrides/PageSidebar.astro). Default TOC preserved.
      components: {
        PageSidebar: './src/components/overrides/PageSidebar.astro',
        // Additive MarkdownContent override: appends the <Principle> coda from frontmatter INSIDE the
        // content wrapper on HackTheBox writeups (see src/components/overrides/MarkdownContent.astro).
        // The default Footer, and its Prev/Next pagination, renders unchanged on every page.
        MarkdownContent: './src/components/overrides/MarkdownContent.astro',
        // Additive Head override: appends only the four social tags Starlight does not emit
        // (og:image, twitter:image/title/description). See src/components/overrides/Head.astro.
        Head: './src/components/overrides/Head.astro',
      },
      description: 'CTF Writeups, Machine Walkthroughs & Security Notes By Idan Babayan',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/Idan-Babayan' },
      ],
      sidebar: [
        {
          label: 'About',
          link: '/about',
          attrs: { class: 'sb-about' },
        },
        {
          label: 'HackTheBox',
          collapsed: true,
          items: [
            // Manual structure (unlike the autogenerated platforms) must surface the platform
            { label: 'Overview', link: '/hackthebox/' },
            { label: 'Easy', collapsed: true, items: [{ autogenerate: { directory: 'hackthebox/easy' } }] },
            { label: 'Medium', collapsed: true, items: [{ autogenerate: { directory: 'hackthebox/medium' } }] },
            // { label: 'Hard',   collapsed: true, items: [{ autogenerate: { directory: 'hackthebox/hard' } }] },
          ],
        },
        {
          label: 'VulnHub',
          collapsed: true,
          items: [{ autogenerate: { directory: 'vulnhub', collapsed: true } }],
        },
        {
          label: 'PicoCTF',
          collapsed: true,
          items: [
            // Manual structure, same reason as HackTheBox: an autogenerate over the whole platform
            // labels each middle-tier group with the RAW LOWERCASE DIRECTORY NAME, so the category
            // tier would read "binary-exploitation" instead of "Binary Exploitation", and the
            // platform's own index.mdx would render as a second "PicoCTF" entry nested under the
            // group of the same name. Naming the groups here fixes both and lets the categories sit
            // in a chosen order rather than alphabetically. Within a category, autogenerate's
            // alphabetical order is correct: PicoCTF challenges are standalone, not sequential, so
            // no page carries a sidebar.order.
            // The SIX official picoCTF categories, in the platform's own order, each a collapsed
            // toggle. There is no per-category index page and none is wanted: the toggle IS the
            // middle tier, exactly as HackTheBox's Easy / Medium groups are.
            // Each stays commented until its directory exists and holds a writeup: an
            // autogenerate.directory that does not exist fails the build (same reason HTB Hard is
            // commented out). Uncomment a line when its first writeup lands.
            { label: 'Overview', link: '/picoctf/' },
            { label: 'General Skills', collapsed: true, items: [{ autogenerate: { directory: 'picoctf/general-skills' } }] },
            // { label: 'Cryptography', collapsed: true, items: [{ autogenerate: { directory: 'picoctf/cryptography' } }] },
            { label: 'Web Exploitation', collapsed: true, items: [{ autogenerate: { directory: 'picoctf/web-exploitation' } }] },
            // { label: 'Forensics', collapsed: true, items: [{ autogenerate: { directory: 'picoctf/forensics' } }] },
            // { label: 'Reverse Engineering', collapsed: true, items: [{ autogenerate: { directory: 'picoctf/reverse-engineering' } }] },
            { label: 'Binary Exploitation', collapsed: true, items: [{ autogenerate: { directory: 'picoctf/binary-exploitation' } }] },
          ],
        },
        {
          label: 'OverTheWire',
          collapsed: true,
          items: [
            { label: 'Overview', link: '/overthewire/' },
            { label: 'Bandit', collapsed: true, items: [{ autogenerate: { directory: 'overthewire/bandit' } }] },
          ],
        },
      ],
    }),
  ],
});
