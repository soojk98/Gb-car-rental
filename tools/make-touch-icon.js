#!/usr/bin/env node
/* =====================================================================
   Generates apple-touch-icon-bluegrid.png (180x180).

   Safari ignores SVG for touch icons, so favicon-bluegrid.svg cannot
   cover this case -- a home-screened admin portal would keep the GB icon
   forever. The mark is four solid rectangles on a flat field, which is
   simple enough to encode as a PNG directly rather than round-tripping
   through a browser screenshot.

   Run:  node tools/make-touch-icon.js
   ===================================================================== */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 180;
const BG = [0x0b, 0x0b, 0x0c];      // --bg
const BLUE = [0x00, 0x80, 0xff];    // --accent
const LIT = [0xf2, 0xf4, 0xf7];     // --text, the one lit cell

// Same geometry as favicon-bluegrid.svg, scaled from its 32px viewBox.
const k = SIZE / 32;
const cells = [
  { x: 5,  y: 5,  c: BLUE },
  { x: 18, y: 5,  c: LIT  },
  { x: 5,  y: 18, c: BLUE },
  { x: 18, y: 18, c: BLUE },
].map(r => ({
  x0: Math.round(r.x * k), y0: Math.round(r.y * k),
  x1: Math.round((r.x + 9) * k), y1: Math.round((r.y + 9) * k),
  c: r.c,
}));

// ---- raw pixels, one filter byte (0 = None) per scanline
const raw = Buffer.alloc(SIZE * (SIZE * 3 + 1));
let p = 0;
for (let y = 0; y < SIZE; y++) {
  raw[p++] = 0;
  for (let x = 0; x < SIZE; x++) {
    let c = BG;
    for (const r of cells) {
      if (x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1) { c = r.c; break; }
    }
    raw[p++] = c[0]; raw[p++] = c[1]; raw[p++] = c[2];
  }
}

// ---- CRC32
const TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;    // bit depth
ihdr[9] = 2;    // colour type 2 = truecolour RGB
ihdr[10] = 0;   // deflate
ihdr[11] = 0;   // adaptive filtering
ihdr[12] = 0;   // no interlace

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = path.join(__dirname, '..', 'apple-touch-icon-bluegrid.png');
fs.writeFileSync(out, png);
console.log('wrote ' + path.basename(out) + '  ' + SIZE + 'x' + SIZE + '  ' +
            (png.length / 1024).toFixed(1) + 'KB');
