/* Tanda tangan sintetis sebagai jalur SVG, dibangun dari benih.
   Diturunkan dari docs.js di prototipe: `jitter` besar berarti variasi tangan manusia,
   jitter 0 berarti goresan yang persis sama setiap kali (hasil tempel). */

"use strict";

function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function watak(seed) {
  const r = rng(seed);
  return {
    loopW: 12 + r() * 9, loopH: 17 + r() * 11, loopTilt: -0.5 + r() * 1.0,
    f1: 1.6 + r() * 1.1, f2: 3.1 + r() * 2.2, f3: 6.0 + r() * 3.5,
    a1: 8 + r() * 6, a2: 3.5 + r() * 3, a3: 1.2 + r() * 1.6,
    p1: r() * 6.28, p2: r() * 6.28, p3: r() * 6.28,
    slant: -0.16 + r() * 0.1, naik: 4 + r() * 7,
    flourish: 0.45 + r() * 0.4, tebal: 1.35 + r() * 0.55, ekor: r() > 0.45
  };
}

function titik(seed, jitter, instans) {
  const w = watak(seed);
  const g = rng(seed * 31 + instans * 977 + 7);
  const v = () => (g() - 0.5) * 2;
  const s = (nilai, kuat) => nilai * (1 + jitter * kuat * v());
  const pts = [];
  const loopW = s(w.loopW, 1.1), loopH = s(w.loopH, 1.1);
  const tilt = w.loopTilt + jitter * 0.9 * v();
  const cx = 22, cy = 40;
  for (let i = 0; i <= 26; i++) {
    const t = (i / 26) * Math.PI * 2.05 - Math.PI * 0.62;
    const x = cx + Math.cos(t) * loopW + tilt * Math.sin(t) * 6;
    const y = cy - Math.sin(t) * loopH * (0.72 + 0.28 * Math.cos(t * 0.5));
    pts.push([x + jitter * 2.4 * v(), y + jitter * 2.4 * v()]);
  }
  const x0 = cx + loopW * 0.5, x1 = 168;
  const a1 = s(w.a1, 0.8), a2 = s(w.a2, 0.9), a3 = s(w.a3, 1.1);
  const f1 = s(w.f1, 0.35), f2 = s(w.f2, 0.35), f3 = s(w.f3, 0.4);
  const slant = w.slant + jitter * 0.35 * v();
  for (let i = 0; i <= 62; i++) {
    const u = i / 62;
    const x = x0 + (x1 - x0) * u;
    let y = cy - s(w.naik, 0.7) * u * 0.55
      - a1 * Math.sin(f1 * u * Math.PI * 2 + w.p1)
      - a2 * Math.sin(f2 * u * Math.PI * 2 + w.p2)
      - a3 * Math.sin(f3 * u * Math.PI * 2 + w.p3);
    y += slant * (x - x0) * 0.34;
    pts.push([x + jitter * 1.7 * v(), y + jitter * 1.7 * v()]);
  }
  if (w.ekor) {
    const fl = s(w.flourish, 0.6);
    for (let i = 1; i <= 22; i++) {
      const u = i / 22;
      const x = x1 - (x1 - 46) * u * fl * 1.9;
      const y = 30 + Math.sin(u * Math.PI) * 26 + u * 6;
      pts.push([x + jitter * 2.1 * v(), y + jitter * 2.1 * v()]);
    }
  }
  return { pts, tebal: s(w.tebal, 0.5) };
}

function jalur(pts) {
  let d = "M " + pts[0][0].toFixed(2) + " " + pts[0][1].toFixed(2);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || pts[i + 1];
    d += " C " + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(2) + " " + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(2) +
      ", " + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(2) + " " + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(2) +
      ", " + p2[0].toFixed(2) + " " + p2[1].toFixed(2);
  }
  return d;
}

/* jitter 0 menghasilkan goresan yang sama persis di setiap baris. */
function svg(seed, jitter, instans, opts) {
  opts = opts || {};
  const t = titik(seed, jitter, jitter > 0 ? instans : 1);
  const tebal = (opts.tebal || 1) * t.tebal;
  return '<svg class="ttd" viewBox="0 0 190 74" aria-hidden="true"><path d="' + jalur(t.pts) +
    '" fill="none" stroke="' + (opts.tinta || "#1c2d63") + '" stroke-width="' + tebal.toFixed(2) +
    '" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

/* Kemiripan dua tanda tangan dari selisih titik sepadan; 1 berarti identik. */
function kemiripan(seed, jitter, a, b) {
  const A = titik(seed, jitter, jitter > 0 ? a : 1).pts, B = titik(seed, jitter, jitter > 0 ? b : 1).pts;
  let jml = 0;
  for (let i = 0; i < A.length; i++) jml += Math.hypot(A[i][0] - B[i][0], A[i][1] - B[i][1]);
  return Math.max(0, 1 - (jml / A.length) / (Math.hypot(190, 74) * 0.075));
}

module.exports = { svg, kemiripan, rng };
