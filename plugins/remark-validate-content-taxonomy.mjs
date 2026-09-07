// plugins/remark-validate-content-taxonomy.mjs
//
// Build-time guardrail. Fails the MDX compile when a writeup uses an unknown hand-authored
// badge/metadata class token, or an unknown component metadata value, so a content typo stops
// shipping as a silently unstyled element (for example `platform-hacktheboxx` renders a bare span
// today and the build stays green). This is the deliberate alternative to `astro check` (which was
// ruled out to avoid adding @astrojs/check + typescript): it targets the string/value surface that
// is authored by hand in MDX, which is the part that grows during the manual writeup pass.
//
// Why the remark (mdast) stage: this runs on the .mdx SOURCE, before any component renders, so it
// only ever sees HAND-AUTHORED markup. Component-generated classes (Callout's `cl-*`, WriteupMeta's
// `wm-*` / `pf-*`) are produced later during .astro rendering and are never visible here, so there
// is no way to false-positive on component output. Marketing pages (index.astro, about.astro) are
// not markdown, so nothing they carry is ever seen here either. Within the
// hand-authored MDX we validate ONLY tokens in the families this guard OWNS (see below) and ignore
// every other class token (utility classes, class names passed as component props, and so on).
//
// Zero new dependencies. Uses only `unist-util-visit` (already a transitive dep via @astrojs/mdx,
// same as remark-inject-passwordreveal) plus Node built-ins. Nothing is added to package.json.
//
// SINGLE SOURCE OF TRUTH for validation. When the design taxonomy changes, update the allow-lists
// below and nowhere else. RETIREMENT NOTE (revised 2026-09-07): the whole legacy badge family is
// RETIRED. `.machine-meta` went on 2026-07-19 when WriteupMeta replaced every hand-authored badge
// row; the meta- / platform- / difficulty- / os- families outlived it only because
// `WriteupCard.astro` still emitted them on the platform landing pages. That card now renders its
// classification through the shared taxonomy vocabulary (.tx-*, a component-emitted class this
// guard never sees), so no component and no content file emits a legacy badge class any more and
// their CSS is deleted. The retired prefixes are kept here as a HARD FAIL rather than dropped
// silently: a hand-authored `meta-badge` span would otherwise render as an unstyled element with a
// green build, which is the exact failure this guard exists to catch. Only port- and task- remain
// as live hand-authored families.

import { visit } from 'unist-util-visit';

// --- Owned class-token families: prefix -> the exact allowed full tokens --------------------------
// A hand-authored class token that STARTS WITH an owned prefix must be one of that prefix's exact
// tokens, otherwise the build fails. A token that starts with no owned prefix is out of scope and is
// ignored. Each of port- / task- maps to a single class, so owning the prefix is airtight.
const CLASS_FAMILIES = {
  'port-': ['port-label'],
  'task-': ['task-title'],
};

// --- Retired badge families: any hand-authored token starting with one of these fails the build ---
// Writeup metadata is FRONTMATTER ONLY (os / environment / difficulty), the badge row is injected by
// plugins/remark-inject-writeupmeta.mjs, and platform and category derive from the directory. The
// component-emitted classes that replaced these (`wm-*`, `tx-*`, `dpips`) are never hand-authored
// and are not listed: the guard's boundary is hand-authored markup, and a writeup has no reason to
// write any of them. `platform-` is owned outright now: the marketing-page classes that used to
// share the prefix (`platform-card`, `platform-grid`) no longer exist anywhere in src/, so the
// prefix has no live meaning left to collide with.
const RETIRED_PREFIXES = ['machine-', 'meta-', 'platform-', 'difficulty-', 'os-'];

// --- Component metadata enums: string prop values authored on component JSX elements ---------------
// The typed unions the components accept, for components still HAND-AUTHORED in writeup bodies.
// Validating here fails earlier than a component's own runtime guard, with a source position and a
// suggestion, and it covers .astro props that are not type-checked at build. Only string-valued props
// are checked; a dynamic `{expr}` value is skipped.
//
// WriteupMeta was RETIRED from this map (2026-07-20). Its metadata is no longer hand-authored: the
// badge row is injected from frontmatter by plugins/remark-inject-writeupmeta.mjs, so no hand-written
// <WriteupMeta> JSX remains in any writeup for this stage to see. That surface is now covered twice
// over instead: the Zod enums in src/content.config.ts catch a bad frontmatter value with editor
// support, and the component's own runtime guard still throws on an unknown axis. This is unrelated
// to the platform- / difficulty- / os- CLASS families, which are RETIRED (RETIRED_PREFIXES above):
// nothing emits them any more and a hand-authored token fails the build.
const COMPONENT_ENUMS = {
  Callout: {
    type: ['recon', 'loot', 'intel', 'defense', 'vuln'],
  },
  FlagCapture: {
    type: ['user', 'root'],
  },
};

const JSX_NODE_TYPES = new Set(['mdxJsxFlowElement', 'mdxJsxTextElement']);
const CLASS_ATTR_NAMES = new Set(['class', 'className']);

// Levenshtein distance (small, dependency-free) so an error can suggest the closest allowed value.
function distance(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[n];
}

function closest(value, candidates) {
  let best = candidates[0];
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const d = distance(value, candidate);
    if (d < bestDistance) {
      bestDistance = d;
      best = candidate;
    }
  }
  return best;
}

function ownedPrefixOf(token) {
  for (const prefix of Object.keys(CLASS_FAMILIES)) {
    if (token.startsWith(prefix)) return prefix;
  }
  return null;
}

export default function remarkValidateContentTaxonomy() {
  return (tree, file) => {
    const locationOf = (node) => {
      const path = (file && (file.path || (file.history && file.history[0]))) || 'unknown file';
      const pos =
        node.position && node.position.start
          ? `:${node.position.start.line}:${node.position.start.column}`
          : '';
      return `${path}${pos}`;
    };
    const fail = (message, node) => {
      throw new Error(`[content-taxonomy-guard] ${message}\n  at ${locationOf(node)}`);
    };

    visit(tree, (node) => {
      if (!JSX_NODE_TYPES.has(node.type)) return;
      const attributes = Array.isArray(node.attributes) ? node.attributes : [];

      // 1. Class-token validation on any element carrying a hand-authored class string.
      for (const attr of attributes) {
        if (attr.type !== 'mdxJsxAttribute') continue;
        if (!CLASS_ATTR_NAMES.has(attr.name)) continue;
        if (typeof attr.value !== 'string') continue; // dynamic {expr}: not hand-authored text

        const tokens = attr.value.split(/\s+/).filter(Boolean);

        for (const token of tokens) {
          // Retired badge families fail loudly rather than rendering as an unstyled span.
          const retired = RETIRED_PREFIXES.find((p) => token.startsWith(p));
          if (retired) {
            fail(
              `Retired badge class token "${token}" (the "${retired}" family; .machine-meta retired 2026-07-19, the rest 2026-09-07). ` +
                `Writeup metadata is frontmatter only: set os / environment / difficulty in frontmatter ` +
                `and the badge row is injected; platform and category derive from the directory. ` +
                `See CLAUDE.md "Writeups".`,
              node,
            );
          }

          const prefix = ownedPrefixOf(token);
          if (!prefix) continue; // out of scope: unrelated / utility / component class, ignore

          const allowed = CLASS_FAMILIES[prefix];
          if (!allowed.includes(token)) {
            fail(
              `Unknown "${prefix}" class token "${token}". Did you mean "${closest(token, allowed)}"? ` +
                `Allowed ${prefix} tokens: ${allowed.join(', ')}.`,
              node,
            );
          }
        }
      }

      // 2. Component metadata enum validation (Callout, FlagCapture).
      const enumsForComponent = COMPONENT_ENUMS[node.name];
      if (enumsForComponent) {
        for (const attr of attributes) {
          if (attr.type !== 'mdxJsxAttribute') continue;
          const allowed = enumsForComponent[attr.name];
          if (!allowed) continue;
          if (typeof attr.value !== 'string') continue; // dynamic value: skip
          if (!allowed.includes(attr.value)) {
            fail(
              `Unknown ${node.name} ${attr.name} "${attr.value}". Did you mean ` +
                `"${closest(attr.value, allowed)}"? Allowed: ${allowed.join(', ')}.`,
              node,
            );
          }
        }
      }
    });

    return tree;
  };
}
