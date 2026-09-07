export type Platform = 'HackTheBox' | 'VulnHub' | 'PicoCTF' | 'OverTheWire';
export type OS = 'Linux' | 'Windows';
export type Environment = 'Standalone' | 'Active Directory' | 'Progressive';
export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Insane';

// Single registry, split by CONSUMPTION MECHANISM (what each icon needs), not stored uniformly.
// The split axis is POLYCHROME vs MONOCHROME, not logo vs glyph.
//
// POLYCHROME marks render as native-color <img> from a hashed `?url` import: VulnHub (5 fills),
// PicoCTF (3), OverTheWire (8), and Linux (literals plus 16 gradients). currentColor would flatten
// them, so they keep their own fills, and a file served once and cached beats inlining it per page.
import vulnhubUrl from '../../assets/icons/vulnhub.svg?url';
import picoctfUrl from '../../assets/icons/picoctf.svg?url';
import overthewireUrl from '../../assets/icons/overthewire.svg?url';
import linuxUrl from '../../assets/icons/linux.svg?url';

// MONOCHROME marks inline via `?raw` + set:html and inherit currentColor, so they tint to the chip
// accent in both themes. HackTheBox is a platform logo but is a single path with a single fill, so it
// belongs here: it was only in the native-color group because it was a logo, never because native
// color was right for it. On dark, currentColor lands within a hair of its brand #9FEF00; on paper it
// becomes the deep lime ink instead of a 1.20:1 ghost, and it inherits the light-ink tier for free
// when the badge palette pass lands. Standalone is purpose-drawn inline below (no source file exists).
//
// Inlining requires importing and public/ is not in the import graph, so these live only in
// src/assets/icons/. The three polychrome platform logos are ALSO copied in public/icons, consumed by
// PlatformIndex.astro and about.astro via a literal /icons/ path (NOT by the sidebar, whose logo CSS
// is commented out). public/icons/htb.svg is deliberately NO LONGER a twin of this htb.svg: this one
// is a chip glyph that follows its label, that one is a brand mark on marketing surfaces. Their former
// byte-identity was coincidental. The divergence is intended, not drift.
import htbRaw from '../../assets/icons/htb.svg?raw';
import windowsRaw from '../../assets/icons/windows.svg?raw';
import activeDirectoryRaw from '../../assets/icons/active-directory.svg?raw';
import progressiveRaw from '../../assets/icons/progressive.svg?raw';

// set:html injects a raw file VERBATIM, so a source file's authoring artifacts become DOM nodes inside
// every chip. Three of them, all stripped once at build time here rather than by hand-cleaning each
// source file, so any future glyph is normalised on arrival:
//   1. Comments: the rationale above each glyph would otherwise ship on every page.
//   2. Pretty-printing: inter-element newlines land in the chip's textContent, which is part of its
//      accessible name (Windows read " \n\n    \nWindows ").
//   3. The XML prolog: <?xml ...?> is meaningless in an HTML document, so the parser turns it into a
//      BOGUS COMMENT node inside the chip. Inert, but it is junk and it is trivially avoidable.
// Safe for this set: no glyph contains a <text> element or xml:space="preserve", where collapsing
// whitespace would be meaningful. Revisit that if a future glyph ever carries real text.
const inline = (raw: string): string =>
  raw
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .trim();

// Platform spans both mechanisms: HackTheBox is monochrome (set:html), the other three are <img>.
export const platformLogos: Record<Exclude<Platform, 'HackTheBox'>, string> = {
  VulnHub: vulnhubUrl,
  PicoCTF: picoctfUrl,
  OverTheWire: overthewireUrl,
};
export const platformIcons: Record<Extract<Platform, 'HackTheBox'>, string> = { HackTheBox: inline(htbRaw) };

// OS spans both mechanisms: Linux is a logo (<img>), Windows is a tinting glyph (set:html).
export const osLogos: Record<Extract<OS, 'Linux'>, string> = { Linux: linuxUrl };
export const osIcons: Record<Extract<OS, 'Windows'>, string> = { Windows: inline(windowsRaw) };

// Environment marks are all tinting currentColor glyphs (set:html).
export const environmentIcons: Record<Environment, string> = {
  Standalone: `<svg viewBox="3 3 18 18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="8" opacity="0.35"/></svg>`,
  'Active Directory': inline(activeDirectoryRaw),
  Progressive: inline(progressiveRaw),
};

// PicoCTF category chips carry ONE shared nominal glyph rather than six drawn marks: a 9px rounded
// square in the 15px box, currentColor, aria-hidden, so it tints from the chip's --wm-c like every
// other monochrome mark. Square on purpose: the sidebar's platform markers are round dots and the
// difficulty glyph is round pips, so a square can never read as either. It is deliberately smaller
// than the 14px pictogram grid the other glyphs sit on, because it is a colour swatch and not a
// picture, and a 14px solid square outweighs its own label. Six drawn category glyphs are an owner
// option later; until then one shape says "a category" and the hue says which. The same swatch is
// drawn as a plain span on the landing card (WriteupCard .wc-swatch); this is the chip copy.
export const categoryGlyph: string =
  `<svg viewBox="0 0 15 15" aria-hidden="true"><rect x="3" y="3" width="9" height="9" rx="2" fill="currentColor"/></svg>`;

// Platform slug for the future filter route, e.g. /platform/hackthebox
export const platformSlug: Record<Platform, string> = {
  HackTheBox: 'hackthebox',
  VulnHub: 'vulnhub',
  PicoCTF: 'picoctf',
  OverTheWire: 'overthewire',
};

export const difficultyLevel: Record<Difficulty, number> = {
  Easy: 1, Medium: 2, Hard: 3, Insane: 4,
};
