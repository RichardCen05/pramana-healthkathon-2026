/* PRAMANA — pembangkit berkas sintetis.
   Tanda tangan dan lembar klaim dibangun runtime dari benih, bukan gambar jadi.
   Konsekuensinya: skor kemiripan yang muncul di layar benar-benar dihitung dari
   selisih titik pada kurva — bukan angka yang ditulis tangan di berkas data. */

(function (global) {
  "use strict";

  const rng = global.DATA.rng;

  /* Berkas gandaan tetap menyisakan variasi pemindaian sekecil ini. */
  const VARIASI_PINDAI = 0.004;

  /* ---------------- tanda tangan ---------------- */

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
    return { pts: pts, tebal: s(w.tebal, 0.5) };
  }

  /* Catmull-Rom → bezier, supaya goresan terbaca mengalir */
  function jalur(pts) {
    if (pts.length < 2) return "";
    let d = "M " + pts[0][0].toFixed(2) + " " + pts[0][1].toFixed(2);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || pts[i + 1];
      d += " C " + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(2) + " " + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(2) +
        ", " + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(2) + " " + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(2) +
        ", " + p2[0].toFixed(2) + " " + p2[1].toFixed(2);
    }
    return d;
  }

  function pathData(seed, jitter, instans) {
    const j = jitter > 0 ? jitter : VARIASI_PINDAI;
    const t = titik(seed, j, instans);
    return { d: jalur(t.pts), tebal: t.tebal };
  }

  function tandaTangan(seed, jitter, instans, opts) {
    opts = opts || {};
    const p = pathData(seed, jitter, instans);
    return '<svg class="sig" viewBox="0 0 190 74" role="img" aria-label="Tanda tangan tersimulasi" focusable="false">' +
      '<path d="' + p.d + '" fill="none" stroke="' + (opts.tinta || "#1B3A6B") + '" stroke-width="' + p.tebal.toFixed(2) +
      '" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/></svg>';
  }

  /* Kemiripan = 1 − jarak rata-rata antar titik sepadan, dinormalkan ke diagonal kotak. */
  function kemiripan(seed, jitter, a, b) {
    const j = jitter > 0 ? jitter : VARIASI_PINDAI;
    const A = titik(seed, j, a).pts, B = titik(seed, j, b).pts;
    const n = Math.min(A.length, B.length);
    let jml = 0;
    for (let i = 0; i < n; i++) jml += Math.hypot(A[i][0] - B[i][0], A[i][1] - B[i][1]);
    return Math.max(0, 1 - (jml / n) / (Math.hypot(190, 74) * 0.075));
  }

  function kemiripanRerata(seed, jitter, n) {
    let jml = 0, pasang = 0;
    for (let i = 1; i <= n; i++)
      for (let k = i + 1; k <= n; k++) { jml += kemiripan(seed, jitter, i, k); pasang++; }
    return pasang ? jml / pasang : 1;
  }

  /* ---------------- potongan lembar ---------------- */

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const tulis = (s, kelas) => '<span class="hw ' + (kelas || "") + '">' + esc(s) + "</span>";

  function stempel(baris1) {
    const id = "arc" + Math.random().toString(36).slice(2, 8);
    return '<svg class="stempel" viewBox="0 0 96 96" role="presentation" focusable="false">' +
      '<defs><path id="' + id + '" d="M 48 88 A 40 40 0 1 1 48 8 A 40 40 0 1 1 48 88" fill="none"/></defs>' +
      '<circle cx="48" cy="48" r="42" fill="none" stroke="#2A5FA8" stroke-width="2.4" opacity="0.7"/>' +
      '<circle cx="48" cy="48" r="34" fill="none" stroke="#2A5FA8" stroke-width="1.1" opacity="0.6"/>' +
      '<text font-size="7.2" fill="#2A5FA8" opacity="0.76" letter-spacing="1.1">' +
      '<textPath href="#' + id + '" startOffset="25%">' + esc(baris1) + "</textPath></text>" +
      '<text x="48" y="45" text-anchor="middle" font-size="8.6" font-weight="700" fill="#2A5FA8" opacity="0.78">SAH</text>' +
      '<text x="48" y="56" text-anchor="middle" font-size="6.4" fill="#2A5FA8" opacity="0.68">TERVERIFIKASI</text></svg>';
  }

  function kop(k, judul) {
    return '<header class="kertas-kop"><div class="kertas-lembaga">' +
      "<strong>" + esc(k.faskes.toUpperCase()) + "</strong>" +
      "<span>" + esc(k.unit || "") + " &middot; Jl. Kramat Raya No. 118, Jakarta Pusat</span></div>" +
      '<div class="kertas-kode">' + esc(k.faskesId) + "</div></header>" +
      '<h4 class="kertas-judul">' + esc(judul) + "</h4>";
  }

  function identitas(k, opts) {
    const d = (v) => (opts && opts.diff ? '<mark class="diff">' + v + "</mark>" : v);
    return '<dl class="kertas-id">' +
      "<div><dt>Nama Pasien</dt><dd>" + d(tulis(k.nama.replace(/^(Tn\.|Ny\.)\s/, ""))) + "</dd></div>" +
      "<div><dt>No. Kartu BPJS</dt><dd>" + d(tulis(k.kartu, "mono-hw")) + "</dd></div>" +
      "<div><dt>No. SEP</dt><dd>" + d(tulis(k.sep, "mono-hw")) + "</dd></div>" +
      "<div><dt>Diagnosis</dt><dd>" + tulis(k.diagnosa + " (" + k.icd + ")") + "</dd></div>" +
      "<div><dt>DPJP</dt><dd>" + tulis(k.dpjp || "—") + "</dd></div>" +
      "<div><dt>Pelaksana</dt><dd>" + tulis(k.pelaksana || "—") + "</dd></div></dl>";
  }

  function kaki(k, label) {
    return '<footer class="kertas-kaki"><div><span>Mengetahui,</span><strong>' + esc(label) + "</strong>" +
      tandaTangan(k.sigSeed + 501, 0.09, 1, { tinta: "#20365E" }) +
      "<em>" + esc(k.dpjp || "—") + "</em></div>" +
      '<div class="kertas-stempel">' + stempel(k.faskes.toUpperCase()) + "</div></footer>";
  }

  function bungkus(k, isi, opts) {
    opts = opts || {};
    const rusak = k.mutuBerkas ? " kertas--rusak kertas--" + k.mutuBerkas.replace(/\s/g, "") : "";
    return '<figure class="kertas' + rusak + '" style="--miring:' + (opts.miring || "-0.35deg") + '">' +
      '<div class="kertas-lubang" aria-hidden="true"><i></i><i></i></div>' +
      '<div class="kertas-isi">' + isi + "</div>" +
      (k.mutuBerkas ? '<figcaption class="kertas-rusak-label">Hasil pindai ' + esc(k.mutuBerkas) + " — tidak layak audit</figcaption>" : "") +
      "</figure>";
  }

  /* ---------------- tiga varian lembar ---------------- */

  function lembarFisio(k, opts) {
    opts = opts || {};
    const sorot = opts.sorot ? " sorot" : "";
    const baris = (k.sesi || []).map((s, i) =>
      "<tr><td>" + s.no + "</td><td>" + tulis(s.tgl) + "</td><td>" + tulis(s.tindakan) + "</td><td>" + tulis(s.jam) +
      '</td><td class="sel-paraf">' + tandaTangan(k.sigSeed + 900, 0.14, i + 1) +
      '</td><td class="sel-ttd' + sorot + '">' + tandaTangan(k.sigSeed, k.sigJitter, i + 1) + "</td></tr>").join("");
    return bungkus(k, kop(k, "Lembar Bukti Pelayanan Fisioterapi") + identitas(k, opts) +
      '<div class="kertas-tabel-bungkus"><table class="kertas-tabel"><thead><tr>' +
      "<th>No</th><th>Tanggal</th><th>Jenis Tindakan</th><th>Jam</th><th>Paraf Terapis</th><th>Tanda Tangan Pasien</th>" +
      "</tr></thead><tbody>" + baris + "</tbody></table></div>" +
      kaki(k, "Kepala Instalasi Rehabilitasi Medik"), opts);
  }

  function lembarHD(k, opts) {
    opts = opts || {};
    const sorot = opts.sorot ? " sorot" : "";
    const baris = (k.monitoring || []).map((m, i) =>
      "<tr><td>" + m.no + "</td><td>" + tulis(m.tgl) + "</td>" +
      '<td class="sel-td' + sorot + '">' + tulis(m.tdPre) + "</td>" +
      '<td class="sel-td' + sorot + '">' + tulis(m.tdPost) + "</td>" +
      "<td>" + tulis(m.bbPre) + "</td><td>" + tulis(m.bbPost) + "</td><td>" + tulis(m.uf) + "</td>" +
      "<td>" + tulis(m.mulai) + '</td><td class="sel-td' + sorot + '">' + tulis(m.selesai) + "</td>" +
      '<td class="sel-paraf">' + tandaTangan(k.sigSeed, k.sigJitter, i + 1) + "</td></tr>").join("");
    return bungkus(k, kop(k, "Lembar Monitoring Hemodialisis") + identitas(k, opts) +
      '<div class="kertas-tabel-bungkus"><table class="kertas-tabel kertas-tabel--rapat"><thead><tr>' +
      "<th>No</th><th>Tgl</th><th>TD Pra</th><th>TD Pasca</th><th>BB Pra</th><th>BB Pasca</th><th>UF (L)</th><th>Mulai</th><th>Selesai</th><th>Paraf</th>" +
      "</tr></thead><tbody>" + baris + "</tbody></table></div>" +
      kaki(k, "Kepala Unit Hemodialisis"), opts);
  }

  function lembarObat(k, opts) {
    opts = opts || {};
    const sorot = opts.sorot ? " sorot" : "";
    const baris = (k.obat || []).map((o, i) =>
      "<tr" + (o.diserahkan ? "" : ' class="baris-kosong' + sorot + '"') + "><td>" + (i + 1) + "</td>" +
      "<td>" + tulis(o.nama) + "</td><td>" + o.jumlah + "</td>" +
      "<td>" + (o.diserahkan ? tulis(String(o.jumlah)) : "") + "</td>" +
      '<td class="sel-ttd">' + (o.diserahkan ? tandaTangan(k.sigSeed, 0.14, i + 1) : "") + "</td></tr>").join("");
    return bungkus(k, kop(k, "Bukti Serah Terima Obat Kronis") + identitas(k, opts) +
      '<div class="kertas-tabel-bungkus"><table class="kertas-tabel"><thead><tr>' +
      "<th>No</th><th>Nama Obat</th><th>Jumlah Diresepkan</th><th>Jumlah Diterima</th><th>Tanda Tangan Penerima</th>" +
      "</tr></thead><tbody>" + baris + "</tbody></table></div>" +
      '<p class="kertas-catatan">' + tulis("Obat diserahkan untuk 30 hari terapi.") + "</p>" +
      kaki(k, "Apoteker Penanggung Jawab"), opts);
  }

  const lembar = (k, opts) => k.segmen === "hd" ? lembarHD(k, opts) : k.segmen === "obat" ? lembarObat(k, opts) : lembarFisio(k, opts);

  /* berapa baris bertanda tangan pada lembar klaim ini */
  const jumlahParaf = (k) => k.segmen === "obat"
    ? (k.obat || []).filter((o) => o.diserahkan).length
    : (k.sesi || k.monitoring || []).length;

  global.DOCS = {
    tandaTangan: tandaTangan, pathData: pathData,
    kemiripan: kemiripan, kemiripanRerata: kemiripanRerata,
    lembar: lembar, jumlahParaf: jumlahParaf, stempel: stempel
  };
})(window);
