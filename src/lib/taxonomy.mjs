// src/lib/taxonomy.mjs
// What a writeup's MIDDLE directory means, per platform, in one dependency-free table.
//
// A writeup lives at src/content/docs/<platform>/<middle>/<slug>.mdx, and the middle tier means
// something different on each platform: a DIFFICULTY tier on HackTheBox and VulnHub, a picoCTF
// CATEGORY on PicoCTF, a wargame on OverTheWire (which renders in wargames mode and never consults
// this table). PlatformIndex used to assume difficulty everywhere and coerce anything else to a
// "misc" tier that existed nowhere in the content, which is how 21 PicoCTF challenges rendered as
// misc. There is no fallback here on purpose: a middle directory outside its platform's list is a
// content error and fails the build, naming the allowed values.
//
// CONSUMED BY BOTH NODE AND VITE. plugins/remark-inject-writeupmeta.mjs imports this at config
// load (plain Node, outside Vite's pipeline) and the Astro components import it through Vite, so
// this file imports NOTHING: no Vite-only "?url" or "?raw" assets, no TypeScript, no other module.
// That constraint is the reason the table is not part of src/components/badges/icons.ts.
//
// COUPLING TO KEEP IN STEP: the PicoCTF category labels and their order are also written as
// literals in the astro.config.mjs sidebar (deliberately untouched, see CORE_SPEC). If the sidebar
// is reordered or a label changes, change it here too; the filter rail and the writeup chip read
// this table, the sidebar reads its own.

// Ordinal. The level feeds the difficulty pips (filled count = level) and is the same 1 to 4 that
// src/components/badges/icons.ts records as difficultyLevel for the frontmatter enum.
export const DIFFICULTY_TIERS = [
  { slug: 'easy', label: 'Easy', level: 1 },
  { slug: 'medium', label: 'Medium', level: 2 },
  { slug: 'hard', label: 'Hard', level: 3 },
  { slug: 'insane', label: 'Insane', level: 4 },
];

// Nominal. The SIX official picoCTF categories, in the platform's own order (the sidebar order).
// reverse-engineering holds no writeup yet; it is listed so the day one lands it groups, filters
// and colours with no code change.
export const PICO_CATEGORIES = [
  { slug: 'general-skills', label: 'General Skills' },
  { slug: 'cryptography', label: 'Cryptography' },
  { slug: 'web-exploitation', label: 'Web Exploitation' },
  { slug: 'forensics', label: 'Forensics' },
  { slug: 'reverse-engineering', label: 'Reverse Engineering' },
  { slug: 'binary-exploitation', label: 'Binary Exploitation' },
];

// Which axis each platform groups by. OverTheWire is absent on purpose: it renders in wargames
// mode (PlatformIndex mode="wargames") and its middle tier is a wargame name, not a taxonomy. A
// platform missing from this table that renders in writeups mode fails the build in PlatformIndex
// rather than defaulting, so a fifth platform is a decision, not an accident.
export const PLATFORM_AXIS = {
  hackthebox: 'difficulty',
  vulnhub: 'difficulty',
  picoctf: 'category',
};

// The registry an axis resolves against.
export const AXIS_GROUPS = {
  difficulty: DIFFICULTY_TIERS,
  category: PICO_CATEGORIES,
};

// Lookup helper shared by the components and the injector. Returns the group record or undefined.
export function findGroup(axis, slug) {
  const groups = AXIS_GROUPS[axis];
  if (!groups) return undefined;
  return groups.find((g) => g.slug === slug);
}
