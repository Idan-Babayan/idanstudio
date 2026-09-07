// plugins/remark-inject-writeupmeta.mjs
// Injects the <WriteupMeta /> badge row (and its import) into every writeup at build time, so a
// writeup carries its metadata in frontmatter only and never hand-places the component.
// Platform is NOT a frontmatter field: it is derived from the platform directory in the path, the
// same way the sidebar and PlatformIndex treat the directory as authoritative. That removes the
// whole "missing or misspelled platform key" failure class structurally.
// os / environment / difficulty come from frontmatter. os and environment are optional; difficulty is
// REQUIRED on the difficulty axis and FORBIDDEN elsewhere (the axis rules below), so a progressive
// wargame with no rating (Bandit) omits it and WriteupMeta renders without that chip. Each present
// value is forwarded only when it holds a non-empty string.
// It also owns the `principle` scope guard (validatePrinciple below): a frontmatter rule that depends
// on the file path can only live in the one remark pass that sees both the path and the frontmatter.
// Reading frontmatter requires the transformer take the vfile as its SECOND argument; a (tree)-only
// transformer, like the PasswordReveal injector, never sees it.
//
// THE PER-PLATFORM AXIS RULES live here too (2026-09-07), for the same reason as the principle guard:
// they depend on the path AND the frontmatter. What a writeup's MIDDLE directory means is declared
// once in src/lib/taxonomy.mjs: on PicoCTF it is the picoCTF category and is forwarded as a
// `category` prop, derived exactly as platform is (a frontmatter `category:` key is an error); on
// HackTheBox and VulnHub it is the difficulty tier, and frontmatter `difficulty` must be present and
// equal to it, so the landing card (which groups by directory) and the writeup row (which reads
// frontmatter) can never disagree; on a platform with no axis (OverTheWire) a `difficulty` key is an
// invented rating and fails. There is no fallback tier anywhere: an unknown middle directory fails
// the build naming the allowed values, which is what replaced the old "misc" coercion.
// Dependency-free beyond the toolchain: unist-util-visit and acorn both already ship as transitive
// deps of @astrojs/mdx, so this adds nothing to package.json. taxonomy.mjs is plain data.

import { visit } from "unist-util-visit";
import { parse } from "acorn";
import { PLATFORM_AXIS, AXIS_GROUPS, findGroup } from "../src/lib/taxonomy.mjs";

const COMPONENT_NAME = "WriteupMeta";
const IMPORT_SPECIFIER = "@components/badges/WriteupMeta.astro";

// SINGLE SOURCE OF TRUTH for platform. The directory is authoritative: a writeup's platform is a
// fact about where it lives, not a value an author restates (and can mistype) in frontmatter.
// Keys are the on-disk lowercase directory names under src/content/docs/.
const DIR_TO_PLATFORM = {
  hackthebox: "HackTheBox",
  vulnhub: "VulnHub",
  picoctf: "PicoCTF",
  overthewire: "OverTheWire",
};

// Frontmatter axes forwarded to the component, in the order they are rendered.
const OPTIONAL_FIELDS = ["os", "environment", "difficulty"];

const CONTENT_ROOT = "/src/content/docs/";

// A file is a writeup, and gets the badge row, only when it sits under one of the four platform
// directories and is not a section index. Hubs (index.mdx) and everything outside those directories
// are exempt, so a stray os/environment field elsewhere can never trigger an injection.
// Returns { platform, dir, segments } for a writeup, or null when the file is not one. `dir` is the
// on-disk platform directory (the key of DIR_TO_PLATFORM and of PLATFORM_AXIS); `segments` is the
// path under the content root, so segments[1] is the middle directory when there is one.
const writeupLocation = (filePath) => {
  const normalized = String(filePath ?? "").replace(/\\/g, "/");
  const at = normalized.lastIndexOf(CONTENT_ROOT);
  if (at === -1) return null;

  const segments = normalized.slice(at + CONTENT_ROOT.length).split("/");
  if (segments.length < 2) return null;

  const dir = segments[0];
  const platform = DIR_TO_PLATFORM[dir];
  if (!platform) return null;

  const filename = segments[segments.length - 1];
  if (!/\.mdx$/i.test(filename)) return null;
  if (/^index\.mdx$/i.test(filename)) return null;

  return { platform, dir, segments };
};

// Absent means "no usable value": undefined, null (an empty `os:` parses to null), a non-string, or
// an empty string. Deliberately not a bare `in` test, which reports an empty-valued key as present.
const presentString = (value) => typeof value === "string" && value.trim() !== "";

const importsComponent = (node) => {
  if (node.type !== "mdxjsEsm") return false;

  const body = node.data?.estree?.body ?? [];
  const hasEstreeImport = body.some(
    (statement) =>
      statement.type === "ImportDeclaration" &&
      statement.specifiers.some(
        (specifier) =>
          (specifier.type === "ImportDefaultSpecifier" || specifier.type === "ImportSpecifier") &&
          specifier.local.name === COMPONENT_NAME
      )
  );

  // Fallback for the rare case data.estree is missing: match the raw source text instead.
  const value = node.value ?? "";
  const hasTextImport = /^\s*import\b/.test(value) && new RegExp(`\\b${COMPONENT_NAME}\\b`).test(value);

  return hasEstreeImport || hasTextImport;
};

const createImportNode = (specifier) => {
  const source = `import ${COMPONENT_NAME} from '${specifier}';`;
  const estree = parse(source, { ecmaVersion: "latest", sourceType: "module" });
  return { type: "mdxjsEsm", value: source, data: { estree } };
};

const createMetaNode = (attributes) => ({
  type: "mdxJsxFlowElement",
  name: COMPONENT_NAME,
  attributes,
  children: [],
});

// The badge row sits directly under the title, ahead of the body, so it goes in as the first
// non-import node. ESM nodes are hoisted to module scope by MDX regardless of position, but keeping
// the element after the file's own imports matches how these writeups read when hand-authored.
const firstBodyIndex = (tree) => {
  let index = 0;
  while (index < tree.children.length && tree.children[index].type === "mdxjsEsm") index += 1;
  return index;
};

// Only the unquoted boolean `false` opts a writeup out. YAML makes this a trap worth failing on:
// `badges: no` and `badges: off` parse as the strings "no" and "off", and `badges: "false"` as the
// string "false", all of which are truthy, so an author who meant to opt out would silently get
// badges anyway. Anything present that is not a real boolean is therefore a build error.
const optedOut = (frontmatter, filePath) => {
  if (!("badges" in frontmatter)) return false;

  const badges = frontmatter.badges;
  if (typeof badges !== "boolean") {
    throw new Error(
      `${COMPONENT_NAME} injector: invalid "badges" value ${JSON.stringify(badges)} in ${filePath}. ` +
        `The opt-out must be the unquoted boolean false (badges: false). A quoted or word form ` +
        `("false", no, off) parses as a truthy string and would silently fail to opt out.`
    );
  }

  return badges === false;
};

// `principle` is a HackTheBox-only frontmatter field: the closing coda, rendered by
// src/components/overrides/MarkdownContent.astro. Anywhere else it is a BUILD ERROR, not a silent
// no-op. Bandit is a minigame and never carries one, and at 50+ writeups a field that is quietly
// ignored on the wrong page is how drift starts. Runs on EVERY file, ahead of the writeup gate, so a
// principle on a hub page or a non-content page is caught too. A non-string or empty value is also
// rejected (an empty `principle:` parses to null), so a blank coda cannot ship. Optional on
// HackTheBox by decision (2026-09-03): to make it required later, add one check after the platform
// gate in the transformer that throws when platform === PRINCIPLE_PLATFORM and the key is absent.
const PRINCIPLE_PLATFORM = "HackTheBox";

const validatePrinciple = (frontmatter, platform, filePath) => {
  if (!("principle" in frontmatter)) return;

  const principle = frontmatter.principle;
  if (!presentString(principle)) {
    throw new Error(
      `principle guard: invalid "principle" value ${JSON.stringify(principle)} in ${filePath}. ` +
        `It must be a non-empty string (the closing maxim); omit the key for no coda.`
    );
  }
  if (platform !== PRINCIPLE_PLATFORM) {
    throw new Error(
      `principle guard: "principle" is only valid on a ${PRINCIPLE_PLATFORM} writeup ` +
        `(src/content/docs/hackthebox/<tier>/<slug>.mdx), found in ${filePath}. ` +
        `Bandit and the other platforms carry no closing coda; remove the key.`
    );
  }
};

const allowedSlugs = (axis) => AXIS_GROUPS[axis].map((group) => group.slug).join(", ");

// The axis rules (see the header). Validates the writeup's shape against its platform's axis and
// returns the extra attributes to forward to the component: today that is `category` on a
// category-axis platform, nothing on the others. Runs on every writeup, BEFORE the badges opt-out,
// because these are content-shape rules and hold whether or not a badge row renders.
const applyAxisRules = ({ platform, dir, segments, frontmatter, filePath }) => {
  const axis = PLATFORM_AXIS[dir];
  // The middle directory, or null for a file placed directly under the platform (picoctf/x.mdx).
  const middle = segments.length >= 3 ? segments[1] : null;
  const shape = `src/content/docs/${dir}/<${axis ?? "middle"}>/<slug>.mdx`;
  const extra = [];

  // "category" is never a frontmatter field, on ANY platform: on the category axis it IS the directory,
  // and elsewhere it would be metadata with no consumer (CLAUDE.md "Writeups", src/content.config.ts).
  if ("category" in frontmatter) {
    throw new Error(
      `${COMPONENT_NAME} injector: "category" is not a frontmatter field, found in ${filePath}. ` +
        (axis === "category"
          ? `A ${platform} writeup's category IS its directory (${shape}); move the file, do not declare it.`
          : `Only a PicoCTF writeup has a category, and it is the directory, never a key; remove it.`)
    );
  }

  if (axis === "category") {
    if (!middle) {
      throw new Error(
        `${COMPONENT_NAME} injector: ${filePath} sits directly under ${dir}/ with no category directory. ` +
          `Expected ${shape}, where the category is one of: ${allowedSlugs(axis)}.`
      );
    }
    if (!findGroup(axis, middle)) {
      throw new Error(
        `${COMPONENT_NAME} injector: unknown category directory "${middle}" in ${filePath}. ` +
          `Expected one of: ${allowedSlugs(axis)} (the six official picoCTF categories, src/lib/taxonomy.mjs).`
      );
    }
    if ("difficulty" in frontmatter) {
      throw new Error(
        `${COMPONENT_NAME} injector: "difficulty" is not valid on a ${platform} writeup, found in ${filePath}. ` +
          `picoCTF scores in points that are set per edition, so no honest rating exists; remove the key.`
      );
    }
    extra.push({ type: "mdxJsxAttribute", name: "category", value: middle });
    return extra;
  }

  if (axis === "difficulty") {
    if (!middle) {
      throw new Error(
        `${COMPONENT_NAME} injector: ${filePath} sits directly under ${dir}/ with no tier directory. ` +
          `Expected ${shape}, where the tier is one of: ${allowedSlugs(axis)}.`
      );
    }
    if (!findGroup(axis, middle)) {
      throw new Error(
        `${COMPONENT_NAME} injector: unknown difficulty directory "${middle}" in ${filePath}. ` +
          `Expected one of: ${allowedSlugs(axis)} (lowercase, src/lib/taxonomy.mjs).`
      );
    }
    const declared = frontmatter.difficulty;
    if (!presentString(declared)) {
      throw new Error(
        `${COMPONENT_NAME} injector: "difficulty" is required on a ${platform} writeup and is missing in ${filePath}. ` +
          `The file sits in the "${middle}" tier, so declare the matching rating in frontmatter.`
      );
    }
    if (declared.toLowerCase() !== middle) {
      throw new Error(
        `${COMPONENT_NAME} injector: frontmatter difficulty "${declared}" disagrees with the tier directory ` +
          `"${middle}" in ${filePath}. The landing groups by directory and the writeup row reads frontmatter, ` +
          `so the two must match; move the file or fix the value.`
      );
    }
    return extra;
  }

  // No axis: a progressive wargame (OverTheWire). A rating here would be invented metadata, the exact
  // thing the optional difficulty exists to prevent (DECISIONS 2026-07-19).
  if ("difficulty" in frontmatter) {
    throw new Error(
      `${COMPONENT_NAME} injector: "difficulty" is not valid on a ${platform} writeup, found in ${filePath}. ` +
        `A progressive wargame carries no rating; remove the key.`
    );
  }
  return extra;
};

export default function remarkInjectWriteupMeta() {
  return (tree, file) => {
    const filePath = file?.path ?? file?.history?.[0];
    const location = writeupLocation(filePath);
    const platform = location === null ? null : location.platform;
    const frontmatter = file?.data?.astro?.frontmatter ?? {};

    // The principle guard runs on EVERY file, before the writeup gate, so a stray principle on a hub
    // or non-content page fails just as loudly as one on a Bandit level.
    validatePrinciple(frontmatter, platform, filePath);
    if (!location) return;

    // Content-shape rules run whether or not the row renders.
    const extra = applyAxisRules({ ...location, frontmatter, filePath });
    if (optedOut(frontmatter, filePath)) return;

    let alreadyImported = false;
    visit(tree, (node) => {
      if (importsComponent(node)) alreadyImported = true;
    });

    const attributes = [{ type: "mdxJsxAttribute", name: "platform", value: platform }];
    for (const field of OPTIONAL_FIELDS) {
      const value = frontmatter[field];
      if (presentString(value)) {
        attributes.push({ type: "mdxJsxAttribute", name: field, value });
      }
    }
    attributes.push(...extra);

    tree.children.splice(firstBodyIndex(tree), 0, createMetaNode(attributes));
    if (!alreadyImported) {
      tree.children.unshift(createImportNode(IMPORT_SPECIFIER));
    }
  };
}
