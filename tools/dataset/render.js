/* Render lembar bukti pelayanan fisioterapi ke PNG A4 150 dpi (1240 x 1754 px).

   Untuk setiap sampel ditulis ke out/:
   - <id>.png              lembar bersih, sebelum efek pindai
   - <id>.lapis-<n>.png    lapisan transparan untuk manipulasi (identitas pengganti, angka suntingan)
   - <id>.kotak.json       koordinat setiap region [x, y, w, h] untuk ground truth dan sorotan UI

   Pemakaian: node render.js [--chrome <path ke Chrome>] */

"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { FASKES, DIAGNOSIS, JADWAL, SAMPEL, sep } = require("./spec");
const SIG = require("./sig");

const OUT = path.join(__dirname, "out");
const W = 1240, H = 1754;

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* Tulisan tangan: sedikit miring dan naik-turun, tetap sama untuk benih yang sama. */
function tangan(teks, kunci, benih, kelas) {
  const r = SIG.rng(benih);
  const putar = (r() - 0.5) * 2.2, geser = (r() - 0.5) * 4;
  return '<span class="hw ' + (kelas || "") + '" data-r="' + kunci + '" style="transform:translateY(' + geser.toFixed(1) +
    "px) rotate(" + putar.toFixed(2) + 'deg)">' + esc(teks) + "</span>";
}

/* Model gambar AI sering mengacaukan teks kecil. Dipakai hanya pada mode "ai". */
function kacau(teks) {
  return teks.replace(/Kenanga/g, "Kenagna").replace(/Raya/g, "Rya").replace(/41/g, "4I")
    .replace(/Cempaka/g, "Cempeka").replace(/Rehabilitasi/g, "Rehabilitsai").replace(/10430/g, "1O43O")
    .replace(/Instalasi/g, "Instalsai").replace(/Tanda Tangan/g, "Tanda Tanagn");
}

function isi(s, opsi) {
  opsi = opsi || {};
  const f = FASKES[s.faskes], dx = DIAGNOSIS[s.dx], p = s.pasien;
  const mode = opsi.mode || "pindai";
  const kecil = (t) => (mode === "ai" ? kacau(t) : t);
  const jadwal = JADWAL[opsi.jadwal || s.jadwal];
  const periode = opsi.periode || s.periode;
  const b = p.sigSeed * 7;
  const [bulanNama, tahun] = periode.split(" ");
  const terisi = opsi.terisi != null ? opsi.terisi : s.terisi;
  const ttdPasienJitter = mode === "desain" ? 0 : 0.15;

  const baris = [];
  for (let i = 0; i < 8; i++) {
    const ada = i < terisi;
    const tgl = jadwal[i].split("/");
    const terapis = f.terapis[i % f.terapis.length];
    const parafSeed = 500 + f.terapis.indexOf(terapis) * 37 + f.kode.length;
    baris.push(
      '<tr data-r="baris-' + (i + 1) + '"><td class="no">' + (i + 1) + "</td>" +
      '<td class="tgl" data-r="tgl-' + (i + 1) + '">' + (ada
        ? '<span class="tgl-isi" style="display:inline-block;transform:rotate(' + ((SIG.rng(b + i)() - 0.5) * 2).toFixed(2) + 'deg)">' +
          '<span class="hw" data-r="tgl-hari-' + (i + 1) + '">' + tgl[0] + '</span><span class="hw">/</span>' +
          '<span class="hw" data-r="tgl-bulan-' + (i + 1) + '">' + tgl[1] + "</span></span>"
        : "") + "</td>" +
      '<td class="tindakan">' + (ada ? tangan(dx.program[i % 2], "tindakan-" + (i + 1), b + 40 + i, "hw-kecil") : "") + "</td>" +
      '<td class="paraf" data-r="paraf-' + (i + 1) + '">' + (ada ? SIG.svg(parafSeed, mode === "desain" ? 0 : 0.14, i + 1, { tebal: 0.9 }) : "") + "</td>" +
      '<td class="ttd-pasien" data-r="ttd-' + (i + 1) + '">' + (ada ? SIG.svg(p.sigSeed, ttdPasienJitter, i + 1) : "") + "</td></tr>");
  }

  const nomorSep = opsi.sep || sep(s.faskes, s.bulanSep, p.sepUrut);
  const totalTeks = opsi.total != null ? opsi.total : String(terisi);
  const tglAkhir = jadwal[Math.max(0, terisi - 1)].split("/")[0];
  const hanya = opsi.hanya
    ? "body *{visibility:hidden}" + opsi.hanya.map((k) => '[data-r="' + k + '"],[data-r="' + k + '"] *').join(",") + "{visibility:visible!important}"
    : "";

  return `<!doctype html><html lang="id"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Kalam:wght@300;400&family=Caveat:wght@500&family=Homemade+Apple&display=block" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${W}px;height:${H}px;background:${opsi.transparan ? "transparent" : "#fff"};overflow:hidden}
  body{font-family:Arial,"Helvetica Neue",Helvetica,sans-serif;color:#111;padding:70px 88px 0;position:relative}
  .hw{font-family:${mode === "desain" ? "'Homemade Apple'" : "Kalam"},cursive;font-weight:${mode === "desain" ? 400 : 300};color:#1c2d63;font-size:${mode === "desain" ? 20 : 27}px;display:inline-block;line-height:1;white-space:nowrap}
  .hw-kecil{font-family:${mode === "desain" ? "'Homemade Apple'" : "Caveat"},cursive;font-size:${mode === "desain" ? 16 : 27}px;font-weight:500}
  .kop{display:grid;grid-template-columns:96px 1fr 210px;gap:22px;align-items:center;padding-bottom:16px;border-bottom:3px double #111}
  .logo{width:96px;height:96px}
  .kop h1{font-size:30px;letter-spacing:.5px;font-weight:700}
  .kop p{font-size:16px;line-height:1.45;color:#222}
  .kotak-rm{border:1.5px solid #111;padding:10px 12px;font-size:14px;align-self:start}
  .kotak-rm b{display:block;font-size:13px;margin-bottom:4px}
  .kode{position:absolute;top:34px;right:88px;font-size:13px;color:#333}
  .judul{text-align:center;margin:24px 0 18px}
  .judul h2{font-size:25px;letter-spacing:1px}
  .judul p{font-size:15px;margin-top:5px;color:#222}
  .id{display:grid;grid-template-columns:1fr 1fr;column-gap:40px;row-gap:12px;margin-bottom:16px}
  .f{display:grid;grid-template-columns:176px 1fr;align-items:end;font-size:16px;min-height:38px}
  .f .v{border-bottom:1.3px dotted #333;min-height:34px;padding:0 4px 3px;display:flex;align-items:flex-end}
  .program{border:1.5px solid #111;padding:10px 14px;font-size:16px;display:flex;gap:28px;align-items:center;margin-bottom:14px}
  table{width:100%;border-collapse:collapse;font-size:15px}
  th{border:1.5px solid #111;background:#ececec;padding:8px 6px;font-size:14px;line-height:1.25}
  td{border:1.5px solid #111;height:92px;padding:4px 8px;vertical-align:middle}
  td.no{width:48px;text-align:center;font-size:16px}
  td.tgl{width:128px;text-align:center}
  td.paraf{width:150px;text-align:center}
  td.ttd-pasien{width:250px;text-align:center}
  .ttd{width:100%;height:76px;display:block}
  td.paraf .ttd{height:62px}
  .kaki{display:grid;grid-template-columns:1fr 360px;margin-top:22px;gap:30px}
  .total{border:1.5px solid #111;padding:14px 16px;font-size:17px;align-self:start;display:flex;gap:12px;align-items:center}
  .kotak-angka{border:1.5px solid #111;width:62px;height:52px;display:inline-flex;align-items:center;justify-content:center}
  .kotak-angka .hw{font-size:38px}
  .catatan{font-size:13px;color:#333;margin-top:16px;line-height:1.5}
  .dpjp{text-align:center;font-size:16px;position:relative}
  .dpjp .ttd{height:92px;margin:4px 0}
  .stempel{position:absolute;left:8px;top:40px;width:128px;height:128px;opacity:.72;transform:rotate(-12deg)}
  .dpjp .nama{font-weight:700;text-decoration:underline}
  .dpjp .tempat{text-align:left;padding-left:52px;margin-bottom:2px}
  .hal{position:absolute;left:88px;right:88px;bottom:46px;display:flex;justify-content:space-between;font-size:12px;color:#444;border-top:1px solid #999;padding-top:6px}
  ${hanya}
</style></head><body>
<div class="kode">${esc(f.formKode)}</div>
<header class="kop" data-r="kop">
  <svg class="logo" viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="44" fill="none" stroke="#111" stroke-width="3"/><path d="M48 18c10 12 10 26 0 38-10-12-10-26 0-38zM18 52c14-4 26 0 30 12-14 4-26 0-30-12zM78 52c-14-4-26 0-30 12 14 4 26 0 30-12z" fill="#111"/><rect x="45" y="60" width="6" height="18" fill="#111"/></svg>
  <div><h1>${esc(f.nama.toUpperCase())}</h1><p>${esc(kecil(f.unit))}<br>${esc(kecil(f.alamat))} · Telp. ${esc(f.telp)}</p></div>
  <div class="kotak-rm"><b>No. Rekam Medis</b>${tangan(p.rm, "rm", b + 1)}</div>
</header>
<div class="judul"><h2>${esc(kecil("LEMBAR BUKTI PELAYANAN FISIOTERAPI"))}</h2><p>Program Terapi Rehabilitasi Medik · Pasien Rawat Jalan JKN</p></div>
<section class="id">
  <div class="f"><span>Nama Pasien</span><span class="v">${tangan(p.nama + (p.lk ? " (L)" : " (P)"), "nama", b + 2)}</span></div>
  <div class="f"><span>Tanggal Lahir</span><span class="v">${tangan(p.lahir, "lahir", b + 3)}</span></div>
  <div class="f"><span>No. Kartu JKN</span><span class="v">${tangan(p.kartu, "kartu", b + 4)}</span></div>
  <div class="f"><span>No. SEP</span><span class="v">${tangan(nomorSep, "sep", b + 5)}</span></div>
  <div class="f"><span>Diagnosis Medis</span><span class="v">${tangan(dx.teks + " (" + dx.icd + ")", "dx", b + 6)}</span></div>
  <div class="f"><span>Diagnosis Fungsi</span><span class="v">${tangan(dx.fungsi, "fungsi", b + 7)}</span></div>
  <div class="f"><span>DPJP (Sp.KFR)</span><span class="v">${tangan(f.dpjp, "dpjp", b + 8)}</span></div>
  <div class="f"><span>Periode Layanan</span><span class="v">${tangan(periode, "periode", b + 9)}</span></div>
</section>
<div class="program"><span><b>Program terapi:</b> ${tangan(dx.program[0].split(" + ").slice(0, 2).join(" + "), "program", b + 10, "hw-kecil")}</span><span><b>Frekuensi:</b> 2x / minggu</span><span><b>Kode:</b> 93.39</span></div>
<table data-r="tabel"><thead><tr><th>No</th><th>Tanggal</th><th>Program / Tindakan</th><th>Paraf Terapis</th><th>${esc(kecil("Tanda Tangan Pasien"))}</th></tr></thead>
<tbody>${baris.join("")}</tbody></table>
<div class="kaki">
  <div>
    <div class="total" data-r="total">Jumlah kunjungan bulan ini: <span class="kotak-angka">${tangan(totalTeks, "total-angka", b + 11)}</span> kali</div>
    <p class="catatan">Tanda tangan pasien atau keluarga dibubuhkan setiap selesai sesi terapi.<br>Coretan atau koreksi wajib diparaf oleh terapis. Lembar ini dilampirkan pada berkas klaim JKN.</p>
  </div>
  <div class="dpjp" data-r="blok-dpjp"><div class="tempat">Jakarta, ${tangan(tglAkhir + " " + bulanNama + " " + tahun, "tgl-dpjp", b + 12, "hw-kecil")}</div>Mengetahui, DPJP
    ${SIG.svg(900 + f.kode.charCodeAt(7), mode === "desain" ? 0 : 0.1, p.sigSeed % 9 + 1, { tebal: 1.1 })}
    <svg class="stempel" data-r="stempel" viewBox="0 0 96 96" aria-hidden="true"><defs><path id="busur" d="M 48 88 A 40 40 0 1 1 48 8 A 40 40 0 1 1 48 88" fill="none"/></defs>
      <circle cx="48" cy="48" r="44" fill="none" stroke="#2c4ea3" stroke-width="2.6"/><circle cx="48" cy="48" r="33" fill="none" stroke="#2c4ea3" stroke-width="1.2"/>
      <text font-size="7.4" fill="#2c4ea3" letter-spacing="1.2" font-family="Arial"><textPath href="#busur" startOffset="24%">${esc(f.nama.toUpperCase())} · JAKARTA</textPath></text>
      <text x="48" y="46" text-anchor="middle" font-size="8" font-weight="700" fill="#2c4ea3" font-family="Arial">REHAB</text>
      <text x="48" y="57" text-anchor="middle" font-size="8" font-weight="700" fill="#2c4ea3" font-family="Arial">MEDIK</text></svg>
    <div class="nama">${esc(f.dpjp)}</div>
  </div>
</div>
<div class="hal"><span>Dicetak dari SIMRS ${esc(f.nama)}</span><span>Hal. 1 dari 1</span></div>
</body></html>`;
}

async function kotak(page) {
  return page.evaluate(() => {
    const hasil = {};
    document.querySelectorAll("[data-r]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height) hasil[el.dataset.r] = [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
    });
    return hasil;
  });
}

async function potret(browser, html, file, transparan) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file, omitBackground: !!transparan });
  const k = await kotak(page);
  await page.close();
  return k;
}

/* Lapisan transparan yang dibutuhkan finish.py untuk tiap jenis rekayasa. */
function rencanaLapis(s) {
  const r = s.rekayasa || {};
  const tglBaris = (awalan) => Array.from({ length: 8 }, (_, i) => awalan + (i + 1));
  if (r.jenis === "kembar" && r.ganti.includes("nama")) {
    return [{ nama: "identitas", opsi: { hanya: ["nama", "lahir", "rm", "kartu", "sep"] } }];
  }
  if (r.jenis === "kembar") return [{ nama: "tanggal", opsi: { hanya: ["sep", "periode", "tgl-dpjp"].concat(tglBaris("tgl-")) } }];
  if (r.jenis === "sunting-total") return [{ nama: "total", opsi: { hanya: ["total-angka"], total: r.ke } }];
  if (r.jenis === "salin-baris") return [{ nama: "tanggal", opsi: { hanya: r.salin.map((x) => "tgl-" + (x[1] + 1)), terisi: 8 } }];
  if (r.jenis === "sunting-bulan") {
    return [{ nama: "bulan", opsi: { hanya: ["periode", "tgl-dpjp"].concat(tglBaris("tgl-bulan-")), jadwal: s.jadwal, periode: s.periode } }];
  }
  return [];
}

/* Berkas sunting-bulan dirender dulu sebagai lembar Juli, lalu bulannya disunting. */
function opsiDasar(s) {
  const r = s.rekayasa || {};
  if (r.jenis === "sunting-bulan") return { jadwal: r.jadwalAsli, periode: r.periodeAsli };
  if (r.jenis === "generator-ai") return { mode: "ai" };
  if (r.jenis === "aplikasi-desain") return { mode: "desain" };
  if (r.jenis === "salin-baris") return { total: "8" };
  return {};
}

async function main() {
  const i = process.argv.indexOf("--chrome");
  const executablePath = i > 0 ? process.argv[i + 1] : undefined;
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath });

  for (const s of SAMPEL) {
    const dasar = await potret(browser, isi(s, opsiDasar(s)), path.join(OUT, s.id + ".png"));
    const lapis = {};
    for (const l of rencanaLapis(s)) {
      const opsi = Object.assign({ transparan: true }, opsiDasar(s), l.opsi);
      const semua = await potret(browser, isi(s, opsi), path.join(OUT, s.id + ".lapis-" + l.nama + ".png"), true);
      /* Elemen tersembunyi tetap punya kotak; simpan hanya region yang benar-benar tampil di lapisan. */
      lapis[l.nama] = Object.fromEntries(Object.entries(semua).filter(([k]) => l.opsi.hanya.includes(k)));
    }
    fs.writeFileSync(path.join(OUT, s.id + ".kotak.json"), JSON.stringify({ dasar, lapis }));
    process.stdout.write(s.id + " ");
  }
  await browser.close();

  const kemiripanRerata = (seed, jitter, n) => {
    let jml = 0, pasang = 0;
    for (let a = 1; a <= n; a++) for (let b = a + 1; b <= n; b++) { jml += SIG.kemiripan(seed, jitter, a, b); pasang++; }
    return pasang ? +(jml / pasang).toFixed(3) : 1;
  };

  /* Salinan spesifikasi untuk finish.py, lengkap dengan SEP dan kemiripan tanda tangan terukur. */
  const spec = SAMPEL.map((s) => Object.assign({}, s, {
    sep: sep(s.faskes, s.bulanSep, s.pasien.sepUrut),
    faskesData: FASKES[s.faskes], dxData: DIAGNOSIS[s.dx],
    tanggal: JADWAL[s.jadwal].slice(0, s.rekayasa && s.rekayasa.jenis === "salin-baris" ? 8 : s.terisi),
    kemiripanTtd: kemiripanRerata(s.pasien.sigSeed, s.rekayasa && s.rekayasa.jenis === "aplikasi-desain" ? 0 : 0.15, Math.max(2, s.terisi))
  }));
  fs.writeFileSync(path.join(OUT, "spec.json"), JSON.stringify(spec, null, 1));
  console.log("\nselesai: " + SAMPEL.length + " sampel");
}

main().catch((e) => { console.error(e); process.exit(1); });
