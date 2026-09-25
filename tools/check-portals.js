#!/usr/bin/env node
/* =====================================================================
   Portal consistency check.

   The sidebar is hand-copied into 20 files with no partial and no
   template, so it drifts. It already did once: admin/users.html lost its
   Financial link and nobody noticed until an audit. This script is the
   thing that would have caught it.

   It also tracks the literal-colour count, which is the regression gate
   for the dark theme: a hardcoded `white` or `rgba(0,0,0,...)` survives
   any amount of token work and shows up as a white rectangle on a black
   page. The number should only ever go down.

   Run from anywhere:  node tools/check-portals.js
   Exits non-zero on failure, so it works as a pre-commit hook.
   ===================================================================== */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const list = d => fs.readdirSync(path.join(ROOT, d))
  .filter(f => f.endsWith('.html')).map(f => d + '/' + f).sort();

let failures = 0;
const fail = m => { console.log('  FAIL  ' + m); failures++; };
const pass = m => console.log('  ok    ' + m);

// ---------------------------------------------------------------- nav drift
// Compare each portal's <nav class="sidebar-nav"> across its pages, with
// the per-page `class="active"` marker stripped. They must be identical.
function checkNav(dir, expectedItems) {
  const files = list(dir);
  const seen = new Map();

  for (const f of files) {
    const m = read(f).match(/<nav class="sidebar-nav">([\s\S]*?)<\/nav>/);
    if (!m) { fail(f + ' has no <nav class="sidebar-nav">'); continue; }
    const normalised = m[1]
      .replace(/\s+class="active"/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const hash = crypto.createHash('sha1').update(normalised).digest('hex').slice(0, 10);
    if (!seen.has(hash)) seen.set(hash, { items: normalised.split('</a>').length - 1, files: [] });
    seen.get(hash).files.push(f);
  }

  if (seen.size === 1) {
    const only = [...seen.values()][0];
    if (only.items !== expectedItems) {
      fail(dir + ' nav is consistent but has ' + only.items + ' items, expected ' + expectedItems);
    } else {
      pass(dir + ' nav identical across ' + files.length + ' files (' + only.items + ' items)');
    }
  } else {
    fail(dir + ' nav has drifted into ' + seen.size + ' variants:');
    for (const [hash, v] of seen) {
      console.log('          ' + hash + '  ' + v.items + ' items  ' + v.files.join(', '));
    }
  }
}

// -------------------------------------------------------- literal colours
// Anything here survives token work and becomes a white patch on black.
// Note admin/leads.html writes `rgba(0, 0, 0, 0.5)` WITH spaces, so the
// pattern has to tolerate them.
const LITERAL = /:\s*(white|#fff|#ffffff)\b|rgba\(\s*0\s*,\s*0\s*,\s*0/gi;

function checkLiterals(budget) {
  const files = [...list('admin'), ...list('driver'), 'login.html'];
  const hits = [];
  for (const f of files) {
    const src = read(f);
    src.split('\n').forEach((line, i) => {
      // the print stylesheet is deliberately light -- a printed manual
      // on a black background is unreadable and wastes toner
      if (/@media print/.test(src.slice(0, src.indexOf(line))) && /background:\s*white/.test(line)
          && f === 'admin/help.html') return;
      const m = line.match(LITERAL);
      if (m) hits.push({ f, n: i + 1, text: line.trim().slice(0, 78), count: m.length });
    });
  }
  const total = hits.reduce((s, h) => s + h.count, 0);
  const byFile = {};
  for (const h of hits) byFile[h.f] = (byFile[h.f] || 0) + h.count;

  if (total > budget) {
    fail('literal colours: ' + total + ' (budget ' + budget + ')');
    for (const [f, n] of Object.entries(byFile).sort((a, b) => b[1] - a[1])) {
      console.log('          ' + String(n).padStart(3) + '  ' + f);
    }
  } else {
    pass('literal colours: ' + total + ' (budget ' + budget + ')');
  }
  return total;
}

// ------------------------------------------------- inline style= attributes
// These beat every stylesheet without !important, so a dark theme cannot
// reach them. admin/financial.html builds its whole modal this way.
function checkInlineColourAttrs() {
  const files = [...list('admin'), ...list('driver'), 'login.html'];
  const hits = [];
  for (const f of files) {
    read(f).split('\n').forEach((line, i) => {
      const m = line.match(/style="[^"]*(?:background|color)\s*:\s*(?:white|#fff|rgba\(\s*0)/i);
      if (m) hits.push(f + ':' + (i + 1));
    });
  }
  if (hits.length) fail('inline style= colour attrs (unreachable by CSS): ' + hits.join(', '));
  else pass('no inline style= colour attributes');
}

// ------------------------------------------------------------------- run
console.log('\nPortal consistency check\n');

const budget = Number(process.argv[2] || 41);
checkNav('admin', 11);
checkNav('driver', 6);
checkLiterals(budget);
checkInlineColourAttrs();

console.log('');
if (failures) {
  console.log(failures + ' check(s) failed.\n');
  process.exit(1);
}
console.log('All checks passed.\n');
