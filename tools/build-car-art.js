const fs = require('fs');
const path = require('path');
const P = path.join(__dirname, '..', 'index.html');
let h = fs.readFileSync(P, 'utf8');

// Side-profile line art on one shared 800x400 grid.
//
// Drawn to the published dimensions rather than by eye:
//
//            length   height   h/L     roofline y
//   Saga     4331mm   1491mm   .344    104
//   Bezza    4150mm   1510mm   .364    100
//   Alza     4445mm   1630mm   .366     86
//
// Three details do most of the work in making these read as current cars
// rather than 1980s saloons:
//   1. the hood rises to MEET the beltline at the cowl, so there is no step
//      at the base of the windscreen -- that step is the single strongest
//      period cue and it is what the first four attempts got wrong;
//   2. the beltline rises slightly towards the rear instead of running level;
//   3. a long raked A-pillar with the cowl pulled back, giving a cab-forward
//      stance, and wheels large enough to fill their arches.
//
// Everything else is shared so the three read as one technical set: ground
// line y=348, rocker y=286, wheel centres x=170 and x=588 at r=56, arch
// radius 66. The rocker sits ABOVE the axle centre (286 vs 292) as it does
// on a real car -- drop it below and the body swallows the wheels. The
// lower crease is clipped to the span between the arches so it never runs
// across a tyre.
function art(id, title, body, glass, lines, ground) {
  const pad = '                    ';
  const g = glass.map(d => pad + '<path class="ca-glass" d="' + d + '"/>').join('\n');
  const l = lines.map(d => pad + '<path class="ca-line" d="' + d + '"/>').join('\n');
  const w = [170, 588].map(cx =>
    pad + '<circle class="ca-tyre" cx="' + cx + '" cy="292" r="56"/>\n' +
    pad + '<circle class="ca-rim" cx="' + cx + '" cy="292" r="28"/>').join('\n');
  return [
    '<svg class="car-art" viewBox="0 0 800 400" fill="none" role="img" aria-labelledby="' + id + '-art">',
    pad + '<title id="' + id + '-art">' + title + '</title>',
    pad + '<path class="ca-ground" d="' + ground + '"/>',
    pad + '<path class="ca-body" pathLength="1" d="' + body + '"/>',
    g, l, w,
    '                </svg>'
  ].join('\n');
}

const ARCH = 'L653 286 A66 66 0 0 0 523 286 L235 286 A66 66 0 0 0 105 286 Z';

const saga = art('saga', 'Line drawing of a four-door sedan, side view',
  'M70 288 C62 284 58 278 60 268 L60 238 C60 228 64 222 72 219 L116 202 ' +
  'C166 194 214 187 246 184 L348 108 C354 105 360 104 370 104 L546 104 ' +
  'C556 104 562 107 568 114 L628 180 L734 188 C746 189 754 197 756 210 ' +
  'C758 228 758 258 752 274 C748 281 742 288 734 288 ' + ARCH,
  ['M356 112 L432 112 L432 176 L265 176 Z',
   'M442 112 L504 112 L504 176 L442 176 Z',
   'M514 112 L556 112 L614 176 L514 176 Z'],
  ['M262 180 L624 174', 'M508 178 V276', 'M452 196 h30', 'M516 194 h30', 'M256 254 H502'],
  'M72 348 H740');

const bezza = art('bezza', 'Line drawing of a compact four-door sedan, side view',
  'M70 288 C62 284 58 278 60 268 L60 240 C60 230 64 224 72 221 L116 204 ' +
  'C164 196 212 189 244 186 L342 104 C348 101 354 100 364 100 L538 100 ' +
  'C548 100 554 103 560 110 L620 178 L726 186 C738 187 746 195 748 208 ' +
  'C750 226 750 256 744 272 C740 279 734 286 726 286 ' + ARCH,
  ['M350 108 L426 108 L426 174 L262 174 Z',
   'M436 108 L496 108 L496 174 L436 174 Z',
   'M506 108 L548 108 L606 174 L506 174 Z'],
  ['M258 178 L616 172', 'M500 176 V276', 'M446 194 h30', 'M510 192 h30', 'M256 254 H502'],
  'M72 348 H732');

const alza = art('alza', 'Line drawing of a seven-seat MPV, side view',
  'M68 288 C60 284 56 278 58 268 L58 240 C58 230 62 223 70 220 L110 204 ' +
  'C150 194 184 186 210 182 L300 94 C306 89 314 86 326 86 L652 86 ' +
  'C666 86 676 90 682 98 L718 170 C730 184 740 198 742 214 ' +
  'C744 234 744 262 738 277 C734 284 728 288 720 288 ' + ARCH,
  ['M308 96 L396 96 L396 174 L226 174 Z',
   'M406 96 L476 96 L476 174 L406 174 Z',
   'M486 96 L556 96 L556 174 L486 174 Z',
   'M566 96 L672 96 L702 174 L566 174 Z'],
  ['M222 178 H704', 'M480 176 V276', 'M560 176 V276', 'M420 194 h30', 'M500 194 h30', 'M256 254 H502'],
  'M72 348 H738');

const next = [saga, bezza, alza];

// Idempotent: swaps whichever is currently in the file -- the original
// <img>, or a previous generation of this drawing.
const slugs = [['saga', 'Proton Saga'], ['bezza', 'Perodua Bezza'], ['alza', 'Perodua Alza']];
let mode;
if (h.includes('<svg class="car-art"')) {
  mode = 'svg';
  const existing = h.match(/<svg class="car-art"[\s\S]*?<\/svg>/g) || [];
  if (existing.length !== 3) { console.error('expected 3 svgs, got ' + existing.length); process.exit(1); }
  existing.forEach((old, i) => { h = h.replace(old, next[i]); });
} else {
  mode = 'img';
  slugs.forEach(([slug, alt], i) => {
    const needle = '<img src="img/' + slug + '.jpg" width="1600" height="800" alt="' +
                   alt + '" loading="lazy" decoding="async">';
    if (!h.includes(needle)) { console.error('NO MATCH: ' + slug); process.exit(1); }
    h = h.split(needle).join(next[i]);
  });
}

fs.writeFileSync(P, h);
console.log('mode=' + mode +
  '  drawings=' + (h.match(/<svg class="car-art"/g) || []).length +
  '  leftover jpg refs=' + (h.match(/img\/(saga|bezza|alza)\.jpg/g) || []).length);
