// Expressive Code plugin: tag shell command words with a per-CATEGORY CSS class so they can be
// colored by semantic signal value, theme-aware, in src/styles/overrides.css.
//
// Mechanism choice (verified against astro-expressive-code 0.42.0):
//   - A Shiki `span` transformer (the obvious first try) is REJECTED by EC 0.42: it only allows
//     transformer hooks that modify highlighting tokens (code/line/pre/root/span/postprocess are
//     blocked with "hook not supported by Expressive Code yet"). So adding a DOM class via a Shiki
//     transformer is impossible in this version.
//   - EC's own plugin API IS supported: the `postprocessRenderedLine` hook runs on each rendered
//     line's hast, and the exported `addClassName` helper adds a class to a token node. That is the
//     clean, supported path here, so this is implemented as an Expressive Code plugin.
//
// Tokenization (verified on the live build): Shiki renders bash word-by-word, so each command,
// flag, and argument is its own leaf <span> (whitespace too). That lets us read a line as an ordered
// token stream and apply COMMAND-POSITION detection (below), which the short command words need.
//
// sudo is KEPT EXACTLY AS BEFORE: it is still content-matched (any whole-token "sudo" is tagged
// ec-cmd-priv), so its existing behavior and color are untouched. Everything else (su, doas, and the
// recon / network / inspection categories) is matched ONLY in command position to avoid tagging the
// same short word where it appears inside command OUTPUT.
//
// Command position = the first command word on a line (after skipping a leading prompt such as $, #,
// or the powerline `╰─❯` / `╭─`), or the word right after a privilege prefix (sudo / su / doas) or a
// shell separator (|, ||, &&, ;). Flags keep the theme's flag color because only the command TOKEN is
// matched ("ls -la" tags ls, never -la).
//
// Scope limitation (documented, not guessed): EC 0.42 highlights with includeExplanation:false, so
// per-token TextMate scopes are unavailable; we cannot skip string/comment scopes directly. Command
// position handles the common false positives (a short word mid-output is never in command position).
// Residual risk: an OUTPUT line whose FIRST word happens to be exactly a listed command (rare) would
// be tagged. Accepted and documented.

import { definePlugin, addClassName } from '@expressive-code/core';

// sudo stays content-matched (unchanged behavior). Color lives in overrides.css (ec-cmd-priv).
const PRIV_CLASS = 'ec-cmd-priv';
const SUDO_CONTENT = new Set(['sudo']);

// Command -> category class, matched in COMMAND POSITION only. Each list is configurable, so adding a
// future tool is a one-line edit. su / doas reuse the existing privilege class/color.
const CATEGORIES = [
  { cls: 'ec-cmd-priv', commands: ['su', 'doas'] },
  { cls: 'ec-cmd-recon', commands: ['nmap', 'gobuster', 'ffuf', 'feroxbuster', 'nikto', 'whatweb', 'enum4linux', 'smbclient'] },
  { cls: 'ec-cmd-net', commands: ['nc', 'ncat', 'netcat', 'penelope', 'socat', 'curl', 'wget', 'ssh', 'chisel'] },
  { cls: 'ec-cmd-inspect', commands: ['ls', 'cd', 'cat', 'echo', 'whoami', 'id', 'find', 'grep', 'pwd', 'ping'] },
];
const COMMAND_POS_CLASS = new Map();
for (const { cls, commands } of CATEGORIES) for (const c of commands) COMMAND_POS_CLASS.set(c, cls);

// A privilege prefix is itself a command, but the word AFTER it is also a command position.
const PRIV_PREFIX = new Set(['sudo', 'su', 'doas']);
// After any of these, the next word starts a new command.
const SEPARATORS = new Set(['|', '||', '&&', ';', '|&', '&']);

// Recursively read the text content of a hast node.
function textOf(node) {
  if (!node) return '';
  if (node.type === 'text') return node.value ?? '';
  if (node.children) return node.children.map(textOf).join('');
  return '';
}

// Collect the leaf token <span>s (those with no element children) in document order.
function collectTokens(node, out) {
  if (!node) return;
  if (node.type === 'element' && node.tagName === 'span') {
    const hasElementChild = node.children?.some((c) => c.type === 'element');
    if (!hasElementChild) {
      out.push(node);
      return;
    }
  }
  node.children?.forEach((c) => collectTokens(c, out));
}

// A leading prompt token to skip at command position, so the real command after it is detected:
//   - pure punctuation decoration: $, #, >, %, the powerline `╰─❯` / `╭─`, shell separators, OR
//   - a session prompt that ends in a shell sigil: `svc@host:/home$`, `root@host:~#`, zsh `... %`
//     (these render as one token, ending in $ / # / %).
function isLeadingPrompt(t) {
  return t.length > 0 && (/^[^\p{L}\p{N}/.~_-]+$/u.test(t) || /[$#%]$/.test(t));
}

function tagLine(lineAst) {
  const tokens = [];
  collectTokens(lineAst, tokens);

  let expectCommand = true; // start of line is a command position
  for (const tok of tokens) {
    const t = textOf(tok).trim();
    if (t === '') continue; // whitespace does not change position

    // sudo: existing content-match, tagged wherever it appears (behavior unchanged).
    if (SUDO_CONTENT.has(t)) addClassName(tok, PRIV_CLASS);

    // All other categories: command position only.
    if (expectCommand) {
      if (isLeadingPrompt(t)) continue; // leading prompt / separator, keep expecting the command
      const cls = COMMAND_POS_CLASS.get(t);
      if (cls) addClassName(tok, cls);
      // After a privilege prefix the next word is still a command; otherwise args follow.
      expectCommand = PRIV_PREFIX.has(t);
    } else {
      expectCommand = SEPARATORS.has(t);
    }
  }
}

export function pluginPrivCommand() {
  return definePlugin({
    name: 'priv-command',
    hooks: {
      postprocessRenderedLine(context) {
        tagLine(context.renderData.lineAst);
      },
    },
  });
}
