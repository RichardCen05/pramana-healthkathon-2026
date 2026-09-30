/* Veritas Autentik: prototipe tab pemeriksaan keaslian berkas di aplikasi verifikasi klaim.

   Alur: masuk → beranda → Autentik (unggah berkas, antrean berlabel) → kartu bukti
   (temuan, saran tindakan, konfirmasi peserta, peta hubungan, jejak) → laporan temuan.

   Tidak ada AI yang berjalan di sini. Temuan dibaca dari ground truth dataset
   (dataset/manifest.js) dan labelnya dihitung ulang oleh DATA.hitungLabel. */

(function () {
  "use strict";

  const D = window.DATA;

  /* ================================================================== util */

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rp = (n) => "Rp" + Number(n).toLocaleString("id-ID");
  /* Jam kerja simulasi: demo selalu terasa berlangsung pagi hari di kantor cabang. */
  const MULAI = Date.now();
  const jam = () => {
    const menit = 9 * 60 + 20 + Math.floor((Date.now() - MULAI) / 60000);
    return String(Math.floor(menit / 60)).padStart(2, "0") + "." + String(menit % 60).padStart(2, "0");
  };
  const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));
  const koma = (n) => String(n).replace(".", ",");

  /* Ikon garis 24px, satu ketebalan untuk seluruh antarmuka. */
  const IKON = {
    perisai: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    rumah: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    berkas: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M9 15h6"/><path d="M9 11h6"/>',
    riwayat: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    tanya: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    ulang: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    unggah: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    main: '<polygon points="6 3 20 12 6 21 6 3"/>',
    cek: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    jeda: '<path d="M12 8v4"/><path d="M12 16h.01"/>',
    menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
    pengguna: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
    kunci: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    unduh: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    cetak: '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
    kiri: '<path d="m15 18-6-6 6-6"/>',
    klik: '<path d="M14 4.1 12 6"/><path d="m5.1 8-2.9-.8"/><path d="m6 12-1.9 2"/><path d="M7.2 2.2 8 5.1"/><path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z"/>',
    pesan: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    tautan: '<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><path d="M8 12h8"/>',
    lencanaCek: '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>',
    kaca: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/>'
  };
  const ikon = (n) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + IKON[n] + "</svg>";

  const labelChip = (kunci, besar) => '<span class="label label--' + kunci + (besar ? " label--besar" : "") + '">' + D.LABEL[kunci].nama + "</span>";

  /* ================================================================ status */

  const KUNCI_SIMPAN = "veritas.autentik.v2";

  function statusAwal() {
    return {
      masuk: false,
      antrean: D.ANTREAN_AWAL.map((a) => ({ id: a[0], tanggal: a[1], jam: a[2] })),
      keputusan: {},
      audit: [],
      jawaban: {},
      dibuka: [],
      bulkUndo: null
    };
  }

  function muat() {
    try {
      const s = JSON.parse(localStorage.getItem(KUNCI_SIMPAN));
      if (s && Array.isArray(s.antrean)) return Object.assign(statusAwal(), s);
    } catch (e) { /* penyimpanan peramban tidak tersedia: mulai dari awal */ }
    return statusAwal();
  }

  let S = muat();
  const simpan = () => {
    try {
      localStorage.setItem(KUNCI_SIMPAN, JSON.stringify(Object.assign({}, S, { antrean: S.antrean.filter((a) => !a.luar) })));
    } catch (e) { /* diabaikan */ }
  };

  /* Status tampilan yang tidak perlu bertahan setelah halaman dimuat ulang. */
  const ui = {
    filter: "semua", faskes: "", q: "", visibleCount: 20, filterBuka: false, demoBuka: false, bulk: false, help: false,
    sorot: true, perbesar: false, fokus: null,
    pilihLain: false, tindakanLain: null, catatan: null, galat: "", pendingDecision: null,
    proses: null, menuBuka: false, hash: {}, luarUrut: 0, crop: null, cropFromFinding: null
  };

  const diAntrean = (id) => S.antrean.some((a) => a.id === id);
  const berkas = (id) => D.PETA[id];

  /* ============================================================== perute */

  function rute() {
    const bagian = (location.hash || "").replace(/^#\/?/, "").split("/").filter(Boolean);
    return { nama: bagian[0] || "beranda", id: bagian[1] || null, tab: bagian[2] || "ringkasan" };
  }
  const ke = (h) => { if (location.hash !== h) location.hash = h; else gambar(true); };

  /* ============================================================== kerangka */

  function kerangka(r, isi, jejak) {
    const prioritasBaru = S.antrean.filter((a) => berkas(a.id).label === "prioritas" && !S.keputusan[a.id]).length;
    const aktif = (nama) => (r.nama === nama || (nama === "autentik" && (r.nama === "berkas" || r.nama === "laporan")) ? ' aria-current="page"' : "");
    const mobileDrawer = window.matchMedia("(max-width: 960px)").matches;
    return '<a class="skip-link" href="#isi">Lewati ke konten</a><div class="kerangka">' +
      (ui.menuBuka ? '<button class="drawer-backdrop" type="button" data-aksi="menu" aria-label="Tutup menu"></button>' : "") +
      '<aside class="sisi' + (ui.menuBuka ? " buka" : "") + '" id="sisi"' + (mobileDrawer && !ui.menuBuka ? ' inert aria-hidden="true"' : "") + '>' +
        '<div class="drawer-head"><a class="merek" href="#/beranda"><span class="merek-ikon"><img src="assets/veritas-mark.svg" alt=""></span><span><b>Veritas Autentik</b><span>Fitur Vedika · Powered by PRAMANA</span></span></a><button class="drawer-close" type="button" data-aksi="menu" aria-label="Tutup menu">' + ikon("x") + '</button></div>' +
        '<nav class="nav" aria-label="Menu utama">' +
          '<a href="#/beranda"' + aktif("beranda") + ">" + ikon("rumah") + "Beranda</a>" +
          '<span class="nav-judul kapital">Verifikasi</span>' +
          '<span class="mati nav-statis" title="Menu Vedika di luar prototipe">' + ikon("berkas") + "Verifikasi klaim<small>Sudah ada</small></span>" +
          '<a class="nav-autentik" href="#/autentik"' + aktif("autentik") + ">" + ikon("berkas") + "Veritas Autentik" +
            (prioritasBaru ? '<span class="lencana" title="Berkas Prioritas yang belum diputuskan">' + prioritasBaru + "</span>" : '<span class="lencana lencana--halus">Baru</span>') + "</a>" +
          '<a href="#/riwayat"' + aktif("riwayat") + ">" + ikon("riwayat") + "Riwayat keputusan</a>" +
        "</nav>" +
        '<div class="sisi-kaki nav">' +
          '<button type="button" data-aksi="tur-mulai">' + ikon("tanya") + "Panduan demo</button>" +
          '<button type="button" data-aksi="ulang-demo">' + ikon("ulang") + "Mulai ulang demo</button>" +
          '<p class="catatan-prototipe"><b>Prototipe · data sintetis.</b> Hasil pemeriksaan disimulasikan. Keputusan klaim tetap melalui verifikasi biasa.</p>' +
        "</div>" +
      "</aside>" +
      '<div class="kolom">' +
        '<header class="atas">' +
          '<button class="tombol-menu" type="button" data-aksi="menu" aria-label="' + (ui.menuBuka ? "Tutup" : "Buka") + ' menu" aria-expanded="' + ui.menuBuka + '" aria-controls="sisi">' + ikon("menu") + "</button>" +
          '<div class="jejak-rute">' + jejak + "</div>" +
          '<div class="atas-kanan"><span class="lencana-prototipe">Prototipe · data sintetis</span>' +
            '<div class="pengguna"><span class="avatar">RS</span><div><b>' + D.VERIFIKATOR.nama + "</b><span>" + D.VERIFIKATOR.peran + " · " + D.VERIFIKATOR.kantor + "</span></div></div></div>" +
        "</header>" +
        '<main class="isi" id="isi">' + isi + (ui.help ? dialogHelp() : '') + "</main>" +
      "</div></div>";
  }

  /* ============================================================== masuk */

  function lamanMasuk() {
    return '<div class="masuk"><div class="masuk-bungkus">' +
      '<div class="merek-ikon"><img src="assets/veritas-mark.svg" alt=""></div>' +
      "<h1>Veritas Autentik</h1><p>Fitur Vedika · Powered by PRAMANA</p>" +
      '<div class="masuk-kartu">' +
        "<h2>Otentikasi pengguna</h2><p>Masuk dengan akun verifikator kantor cabang.</p>" +
        '<div class="medan"><span class="kapital">Username</span><div class="medan-isi">' + ikon("pengguna") + "rsantoso.kc0901</div></div>" +
        '<div class="medan"><span class="kapital">Kata sandi</span><div class="medan-isi">' + ikon("kunci") + "••••••••••</div></div>" +
        '<button class="btn btn--primer btn--lebar btn--kapital" type="button" data-aksi="masuk">Masuk sebagai verifikator demo</button>' +
        '<p class="masuk-catatan">Ini prototipe. Akunnya fiktif dan tidak ada data yang dikirim ke mana pun.</p>' +
      "</div>" +
      '<p class="masuk-versi">PROTOTIPE · DATA SINTETIS · Healthkathon 2026</p>' +
    "</div></div>";
  }

  /* ============================================================== beranda */

  function lamanBeranda() {
    const pending = S.antrean.filter((a) => !S.keputusan[a.id]);
    const prioritas = pending.filter((a) => berkas(a.id).label === "prioritas").length;
    const perlu = pending.filter((a) => berkas(a.id).label === "cek").length;
    return '<div class="kepala"><div><h1>Beranda</h1><p>' + D.HARI_INI + " · " + D.VERIFIKATOR.kantor + "</p></div></div>" +
      '<section class="pengumuman"><span class="merek-ikon"><img src="assets/veritas-mark.svg" alt=""></span>' +
        '<div><b>Periksa berkas yang membutuhkan perhatian</b><p>Veritas menampilkan indikasi pada dokumen fisioterapi dan area buktinya. Verifikator menentukan langkah berikutnya.</p></div>' +
        '<a class="btn btn--primer" href="#/autentik">Buka antrean</a></section>' +
      '<section class="panel beranda-ringkas"><div class="panel-kepala"><h2>Antrean saat ini</h2></div><div class="ringkas">' +
        '<div><b>' + pending.length + '</b><span>Belum diputuskan</span></div>' +
        '<div><b>' + prioritas + '</b><span>Prioritas</span></div>' +
        '<div><b>' + perlu + '</b><span>Perlu dicek</span></div></div>' +
        '<p class="beranda-catatan">Hasil pada layar ini berasal dari data sintetis. Tidak ada model deteksi yang berjalan dalam prototipe.</p></section>';
  }

  /* ============================================================== autentik */

  function barisAntrean() {
    const q = ui.q.trim().toLowerCase();
    const urutJawaban = (id) => (S.jawaban[id] === "2" || S.jawaban[id] === "3" ? 0 : 1);
    return S.antrean
      .map((a, i) => Object.assign({ b: berkas(a.id), urut: i }, a))
      .filter((a) => ui.filter === "semua" || a.b.label === ui.filter)
      .filter((a) => !ui.faskes || a.b.klaim.faskes === ui.faskes)
      .filter((a) => !q || (a.b.klaim.peserta + " " + a.b.klaim.sep + " " + a.id).toLowerCase().includes(q))
      .sort((x, y) => D.LABEL[x.b.label].urut - D.LABEL[y.b.label].urut || urutJawaban(x.id) - urutJawaban(y.id) || y.urut - x.urut);
  }

  function alasanSingkat(b) {
    if (b.label === "lolos") return "Tidak ditemukan anomali pada pemeriksaan yang tersedia.";
    const utama = b.temuan.find((t) => t.kekuatan === "kuat") || b.temuan[0];
    return utama ? utama.kalimat.split(". ")[0].replace(/\.$/, "") + "." : "";
  }

  function panelUnggah() {
    const jalan = !!(ui.proses && !ui.proses.selesai);
    const kartu = D.DEMO.map((d) => {
      const b = berkas(d.id);
      const ada = diAntrean(d.id);
      const dibuka = S.dibuka.includes(d.id);
      const ket = !ada ? "Belum diunggah" : dibuka ? "Sudah dibuka" : "Buka kartu bukti";
      return '<button type="button" data-aksi="skenario" data-id="' + d.id + '"' + (jalan ? " disabled" : "") + ">" +
        '<span class="gambar"><img src="' + b.jpg + '" alt="" loading="lazy">' + (dibuka ? '<span class="centang">' + ikon("cek") + "</span>" : "") + "</span>" +
        '<span class="keterangan"><b>' + d.judul + "</b><span>" + ket + "</span></span></button>";
    }).join("");
    const semuaAda = D.DEMO.every((d) => diAntrean(d.id));

    return '<section class="panel unggah" id="panelUnggah">' +
      '<label class="unggah-jatuh" id="jatuh" for="pilihBerkas">' + ikon("unggah") +
        "<b>Tarik berkas demo ke sini</b><p>PDF, JPG, atau PNG dari corpus sintetis. Berkas lain tidak dianalisis oleh prototipe.</p>" +
        '<span class="btn btn--kecil">Pilih berkas</span>' +
        '<input class="sr" type="file" id="pilihBerkas" accept=".pdf,.jpg,.jpeg,.png" multiple></label>' +
      '<div class="unggah-demo">' +
        '<div class="unggah-demo-kepala"><div><b>Coba lima berkas contoh</b><p>Satu berkas untuk setiap jenis hasil. Klik satu kartu, atau masukkan kelimanya sekaligus.</p></div>' +
          '<button class="btn" type="button" id="tombolDemo" data-aksi="demo"' + (jalan ? " disabled" : "") + ">" + ikon("main") + (semuaAda ? "Jalankan ulang demo" : "Jalankan demo") + "</button></div>" +
        '<div class="skenario">' + kartu + "</div>" +
      "</div>" +
      (ui.proses ? tampilanProses() : "") +
    "</section>";
  }

  function tampilanProses() {
    const p = ui.proses;
    const antre = p.daftar.map((d, i) => {
      const b = berkas(d.id);
      const kelas = i === p.aktif && !p.selesai ? "aktif" : d.selesai ? "selesai" : "";
      return '<div class="' + kelas + '"><span class="mono">' + d.id + "</span>" + (d.selesai ? labelChip(b.label) : "") + "</div>";
    }).join("");
    if (p.selesai) {
      const hasil = p.daftar.map((d) => {
        const x = berkas(d.id);
        return "<li>" + labelChip(x.label) + '<div><a href="#/berkas/' + d.id + '">' + esc(x.klaim.peserta) + "</a> <span>" + esc(alasanSingkat(x)) + "</span></div></li>";
      }).join("");
      return '<div class="proses" id="proses" aria-live="polite"><div class="proses-antre"><span class="kapital">Berkas masuk</span>' + antre + "</div>" +
        '<div><p style="font-weight:700;margin-bottom:10px">' + p.daftar.length + ' berkas selesai diperiksa. Klik nama untuk membuka kartu bukti.</p><ul class="ringkas-hasil">' + hasil + "</ul></div></div>";
    }
    const b = berkas(p.daftar[p.aktif].id);
    const daftar = D.langkah(b);
    const langkah = daftar.map((l, j) => {
      const kelas = j < p.langkah || p.daftar[p.aktif].selesai ? l.status : j === p.langkah ? "jalan" : "menunggu";
      const tanda = kelas === "ok" ? ikon("cek") : kelas === "temuan" ? ikon("jeda") : kelas === "henti" ? ikon("jeda") : "";
      const hasil = kelas === "menunggu" ? "" : kelas === "jalan" ? "Memeriksa…" : esc(l.hasil);
      return '<li class="' + kelas + '"><span class="ikon">' + tanda + "</span><b>" + l.nama + '</b><span class="hasil">' + hasil + "</span></li>";
    }).join("");
    const judul = "Memeriksa " + b.klaim.peserta + " · " + b.id;
    return '<div class="proses" id="proses" aria-live="polite"><div class="proses-antre"><span class="kapital">Berkas masuk</span>' + antre + "</div>" +
      '<div><p style="font-weight:700;margin-bottom:8px">' + esc(judul) + '</p><ol class="langkah">' + langkah + "</ol></div></div>";
  }

  function lamanAutentik() {
    const semua = S.antrean.map((a) => berkas(a.id));
    const hitung = (k) => semua.filter((b) => b.label === k).length;
    const segmen = [["semua", "Semua", semua.length, ""], ["prioritas", "Prioritas", hitung("prioritas"), "var(--prioritas)"], ["cek", "Perlu dicek", hitung("cek"), "var(--cek)"],
      ["ulang", "Scan ulang", hitung("ulang"), "var(--ulang)"], ["lolos", "Tanpa anomali", hitung("lolos"), "var(--lolos)"]]
      .map((s) => '<button type="button" data-aksi="saring" data-nilai="' + s[0] + '" aria-pressed="' + (ui.filter === s[0]) + '">' +
        (s[3] ? '<i class="titik" style="background:' + s[3] + '"></i>' : "") + s[1] + " <b>" + s[2] + "</b></button>").join("");
    const faskes = [...new Set(semua.map((b) => b.klaim.faskes))].sort();
    const lolosTerbuka = S.antrean.filter((a) => berkas(a.id).label === "lolos" && !S.keputusan[a.id]).length;
    const bisaUndo = S.bulkUndo?.entries.filter((x) => S.keputusan[x.id]?.batchId === S.bulkUndo.id).length || 0;

    const tersaring = barisAntrean();
    const baris = tersaring.slice(0, ui.visibleCount).map((a) => {
      const b = a.b, k = S.keputusan[a.id];
      const jawab = S.jawaban[a.id];
      return '<tr class="' + (a.baru ? "baru" : "") + '">' +
        '<td class="nama-berkas"><a class="queue-case-link" href="#/berkas/' + a.id + '"><b>' + esc(b.klaim.peserta) + '</b><span class="mono">' + a.id + "</span></a></td>" +
        '<td class="queue-status">' + labelChip(b.label) + "</td>" +
        '<td class="alasan">' + esc(alasanSingkat(b)) + (jawab ? ' <b class="peserta-sinyal">Peserta: ' + D.JAWABAN[jawab].teks + ".</b>" : "") + "</td>" +
        '<td class="queue-faskes">' + esc(b.klaim.faskes) + "</td>" +
        '<td class="queue-time redup">' + a.tanggal + ", " + a.jam + "</td>" +
        '<td class="queue-action">' + (k ? '<span class="status-keputusan">' + D.TINDAKAN[k.tindakan].status + '</span>' : '<a class="btn btn--hantu" href="#/berkas/' + a.id + '">Buka bukti</a>') + "</td>" +
      "</tr>";
    }).join("");

    return '<div class="kepala"><div><h1>Veritas Autentik</h1><p>Temukan anomali pada berkas fisioterapi, lihat buktinya, lalu tentukan tindak lanjut.</p></div>' +
      '<div class="kepala-aksi"><a class="btn btn--primer" href="#/berkas/VA-KMB-02">Lihat contoh bukti</a></div></div>' +
      '<div class="status-strip" aria-label="Ringkasan antrean"><div><b>' + hitung("prioritas") + '</b><span>Prioritas</span></div><div><b>' + hitung("cek") + '</b><span>Perlu dicek</span></div><div><b>' + hitung("ulang") + '</b><span>Scan ulang</span></div><div><b>' + hitung("lolos") + '</b><span>Tanpa anomali</span></div></div>' +
      (bisaUndo ? '<div class="undo-banner" role="status"><span>' + bisaUndo + ' berkas diteruskan ke verifikasi biasa. Keputusan kelompok masih dapat dibatalkan.</span><button class="btn" type="button" data-aksi="undo-bulk">Urungkan keputusan kelompok</button><small class="undo-mobile-note">Buka di desktop untuk membatalkan keputusan kelompok.</small></div>' : '') +
      '<section class="panel tabel-antrean"><div class="queue-toolbar"><label class="queue-search"><span>Cari berkas</span><input class="cari" type="search" data-aksi="cari" placeholder="Nama, SEP, atau ID" value="' + esc(ui.q) + '"></label>' +
        '<button class="btn" type="button" data-aksi="toggle-filter" aria-expanded="' + ui.filterBuka + '" aria-controls="filter-lanjutan">Filter' + (ui.filter !== "semua" || ui.faskes ? ' aktif' : '') + '</button></div>' +
        (ui.filterBuka ? '<div class="filter-lanjutan" id="filter-lanjutan"><div class="segmen" role="group" aria-label="Saring menurut status">' + segmen + '</div><label class="filter-faskes"><span>Rumah sakit</span><select class="pilih" data-aksi="saring-faskes"><option value="">Semua rumah sakit</option>' +
          faskes.map((f) => '<option value="' + esc(f) + '"' + (ui.faskes === f ? " selected" : "") + ">" + esc(f) + "</option>").join("") + '</select></label>' +
          (lolosTerbuka ? '<button class="btn bulk-trigger" type="button" data-aksi="setujui-lolos">Tinjau ' + lolosTerbuka + ' berkas tanpa anomali</button>' : '') + '</div>' : '') +
        (baris
          ? '<div class="tabel-bungkus"><table class="tabel tabel--kartu queue-table"><thead><tr><th>Berkas</th><th>Status</th><th>Alasan utama</th><th>Rumah sakit</th><th>Masuk</th><th>Tindak lanjut</th></tr></thead><tbody>' + baris + "</tbody></table></div>"
          : '<div class="kosong"><b>Tidak ada berkas yang cocok</b><p>Ubah kata pencarian atau filter untuk melihat kasus lain.</p><button class="btn" type="button" data-aksi="reset-filter">Hapus filter</button></div>') +
        (tersaring.length > ui.visibleCount ? '<div class="queue-more"><span>Menampilkan ' + ui.visibleCount + ' dari ' + tersaring.length + ' berkas</span><button class="btn" type="button" data-aksi="lihat-lagi">Lihat 20 berikutnya</button></div>' : '') +
      '</section><div class="mode-demo"><button type="button" data-aksi="toggle-demo" aria-expanded="' + ui.demoBuka + '" aria-controls="panelUnggah">' + (ui.demoBuka ? 'Tutup mode demo' : 'Mode demo dan unggah berkas') + '</button><p>Seluruh hasil pada halaman ini disimulasikan dari data sintetis.</p></div>' +
      (ui.demoBuka ? panelUnggah() : '') +
      (ui.bulk ? dialogBulk() : '');
  }

  function dialogBulk() {
    const daftar = S.antrean.filter((a) => berkas(a.id).label === "lolos" && !S.keputusan[a.id]);
    return '<div class="dialog-shade"><section class="dialog-bulk" role="dialog" aria-modal="true" aria-labelledby="judul-bulk" aria-describedby="dampak-bulk">' +
      '<h2 id="judul-bulk">Tinjau ' + daftar.length + ' berkas tanpa anomali</h2>' +
      '<p id="dampak-bulk">Berkas ini akan kembali ke verifikasi klaim biasa. Hasil Veritas tidak menetapkan klaim valid atau layanan sudah terjadi.</p>' +
      '<ul class="bulk-list">' + daftar.map((a) => '<li><b>' + esc(berkas(a.id).klaim.peserta) + '</b><span class="mono">' + a.id + '</span></li>').join('') + '</ul>' +
      '<div class="dialog-actions"><button class="btn" type="button" data-aksi="batal-bulk">Batal</button><button class="btn btn--primer" type="button" data-aksi="konfirmasi-bulk">Lanjutkan ' + daftar.length + ' berkas ke verifikasi biasa</button></div>' +
      '</section></div>';
  }

  function dialogHelp() {
    return '<div class="dialog-shade"><section class="dialog-bulk" role="dialog" aria-modal="true" aria-labelledby="judul-panduan">' +
      '<h2 id="judul-panduan">Cara membaca Veritas</h2><ol class="panduan-ringkas"><li>Pilih kasus di antrean. Prioritas berada di atas.</li><li>Baca tiga temuan utama, lalu buka area bukti di dokumen.</li><li>Di desktop, tinjau akibat tindakan sebelum menyimpan keputusan.</li></ol>' +
      '<p>Seluruh hasil adalah simulasi dari data sintetis. Status Veritas tidak menentukan hasil akhir klaim.</p>' +
      '<div class="dialog-actions"><button class="btn btn--primer" type="button" data-aksi="tutup-panduan">Tutup panduan</button></div></section></div>';
  }

  /* ============================================================ kartu bukti */

  const persen = (region, ukuran) => "left:" + (region[0] / ukuran[0] * 100) + "%;top:" + (region[1] / ukuran[1] * 100) + "%;width:" + (region[2] / ukuran[0] * 100) + "%;height:" + (region[3] / ukuran[1] * 100) + "%";

  function kotakSorot(b, hanyaCek) {
    return b.temuan.map((t, i) => {
      if (!t.region || (hanyaCek && !hanyaCek.includes(t.cek))) return "";
      const kotak = t.area && t.area.length > 1 ? t.area : [t.region];
      return kotak.map((r, j) => '<span class="sorot sorot--' + t.kekuatan + (ui.fokus === i ? " fokus" : "") + '" data-temuan="' + i + '" style="' + persen(r, b.ukuran) + '">' +
        (j === 0 ? '<span class="sorot-nomor">' + (i + 1) + "</span>" : "") + "</span>").join("");
    }).join("");
  }

  function penampil(b) {
    const kembar = b.temuan.find((t) => t.cek === "berkas_kembar");
    const gambarLembar = (x, sorotan) => x.jpg
      ? '<div class="lembar"><img src="' + x.jpg + '" alt="Halaman berkas ' + esc(x.id) + '" width="' + x.ukuran[0] + '" height="' + x.ukuran[1] + '">' + sorotan + "</div>"
      : '<div class="lembar" style="aspect-ratio:1240/1754;display:grid;place-items:center;color:var(--muted-fg)">Pratinjau tidak tersedia untuk berkas ini</div>';
    let isi;
    if (kembar) {
      const p = berkas(kembar.pasangan);
      const cekSama = ["berkas_kembar", "tempelan"];
      isi = '<div class="halaman-berkas dua">' +
        '<div><p class="lembar-judul">Berkas ini <span>' + esc(b.klaim.peserta) + " · SEP " + esc(b.klaim.sep) + "</span></p>" + gambarLembar(b, kotakSorot(b)) + "</div>" +
        '<div><p class="lembar-judul">Berkas pembanding <span>' + esc(p.klaim.peserta) + " · SEP " + esc(p.klaim.sep) + "</span></p>" + gambarLembar(p, kotakSorot(b, cekSama)) + "</div>" +
      "</div>";
    } else {
      isi = '<div class="halaman-berkas">' + gambarLembar(b, kotakSorot(b)) + "</div>";
    }
    return '<section class="panel penampil' + (ui.sorot ? "" : " tanpa-sorot") + (ui.perbesar ? " perbesar" : "") + '">' +
      '<div class="penampil-alat"><label class="saklar"><input type="checkbox" data-aksi="saklar-sorot"' + (ui.sorot ? " checked" : "") + "> Tampilkan sorotan</label>" +
        '<div class="kanan"><button class="btn btn--kecil" type="button" data-aksi="perbesar">' + ikon("kaca") + (ui.perbesar ? "Muat di layar" : "Ukuran asli") + "</button>" +
        (b.pdf ? '<a class="btn btn--kecil" href="' + b.pdf + '" target="_blank" rel="noopener">' + ikon("berkas") + "PDF asli</a>" : "") + "</div></div>" +
      isi + "</section>";
  }

  function daftarTemuan(b) {
    const jawab = S.jawaban[b.id];
    const renderTemuan = (t, i) => '<li class="' + (ui.fokus === i ? "fokus" : "") + '"><span class="nomor nomor--' + t.kekuatan + '">' + (i + 1) + '</span><div><div class="atas-temuan"><b>' + D.CEK[t.cek] + '</b><span class="kekuatan kekuatan--' + t.kekuatan + '">' + D.KEKUATAN[t.kekuatan] + '</span></div><p>' + esc(t.kalimat) + '</p>' +
      (t.region ? '<button class="temuan-link" type="button" data-aksi="fokus" data-i="' + i + '">Lihat area bukti ' + (i + 1) + '</button>' : '') + '</div></li>';
    const awal = jawab ? 2 : 3;
    let li = b.temuan.slice(0, awal).map(renderTemuan).join("");
    if (jawab) {
      li += '<li><span class="nomor nomor--tanpa">P</span><div><div class="atas-temuan"><b>Konfirmasi peserta</b></div><p>Peserta menjawab: <b>' +
        D.JAWABAN[jawab].teks + "</b>. " + esc(D.JAWABAN[jawab].akibat) + "</p></div></li>";
    }
    if (!b.temuan.length) li = '<li class="bersih">' + ikon("lencanaCek") + "<span>Tidak ditemukan anomali pada pemeriksaan yang tersedia.</span></li>";
    return '<section class="panel"><div class="panel-kepala"><h3>Temuan utama</h3><span class="kanan redup">' + (b.label === "ulang" ? "Belum dinilai" : b.temuan.filter((t) => t.kekuatan !== "info").length + " indikasi") + "</span></div>" +
      '<ul class="daftar-temuan">' + li + '</ul>' +
      (b.temuan.length > awal ? '<details class="temuan-lain"><summary>Lihat ' + (b.temuan.length - awal) + ' temuan lain</summary><ul class="daftar-temuan">' + b.temuan.slice(awal).map((t, i) => renderTemuan(t, i + awal)).join('') + '</ul></details>' : '') + '</section>';
  }

  function kelompokPemeriksaan(b) {
    const kelompok = [
      ["Kualitas dokumen", ["kualitas_scan"]],
      ["Keaslian elemen", ["berkas_kembar", "copy_paste", "tempelan", "suntingan", "tanda_ai"]],
      ["Konsistensi klaim", ["kecocokan_klaim"]]
    ];
    return '<details class="panel kelompok-cek"><summary>Lihat semua pemeriksaan</summary><div class="kelompok-cek-isi">' + kelompok.map(([nama, keys]) => {
      const hasil = b.checkResults.filter((x) => keys.includes(x.check));
      const indikasi = hasil.filter((x) => x.result === "indikasi").length;
      return '<section><h4>' + nama + '</h4><p>' + (indikasi ? indikasi + ' indikasi' : hasil.every((x) => x.result === "tidak_dapat_dinilai") ? 'Belum dapat dinilai' : 'Tidak ada indikasi') + '</p><ul>' + hasil.map((x) => '<li><span>' + D.CEK[x.check] + '</span><b>' + ({ indikasi: 'Indikasi', tidak_ditemukan: 'Tidak ditemukan', tidak_dapat_dinilai: 'Belum dinilai' }[x.result]) + '</b></li>').join('') + '</ul></section>';
    }).join('') + '</div></details>';
  }

  function tabelBanding(b) {
    if (b.luar) return "";
    const isi = b.isi_lembar, k = b.klaim;
    const ulang = b.label === "ulang";
    const mendukung = b.temuan.some((t) => t.cek === "kecocokan_klaim") ? isi.baris_asli : isi.baris_terisi;
    const sesiBeda = mendukung < k.sesi_ditagih;
    const ttd = isi.kemiripan_ttd_rerata;
    const baris = [
      ["Peserta", esc(k.peserta)],
      ["SEP", '<span class="mono">' + esc(k.sep) + "</span>"],
      ["Sesi ditagih", k.sesi_ditagih + " sesi · " + rp(k.nilai_klaim)],
      ["Sesi di berkas", ulang ? '<span class="redup">Belum terbaca</span>'
        : '<span class="' + (sesiBeda ? "beda" : "sama") + '">' + mendukung + " sesi" + (sesiBeda ? ", kurang " + (k.sesi_ditagih - mendukung) : ", cocok") + "</span>"],
      ["Tanda tangan pasien", ulang ? '<span class="redup">Belum terbaca</span>'
        : ttd > 0.97 ? '<span class="beda">Identik (kemiripan ' + koma(ttd.toFixed(2)) + ")</span>" : '<span class="sama">Bervariasi wajar (' + koma(ttd.toFixed(2)) + ")</span>"],
      ["Pembuat berkas", esc(b.metadata_file.Creator || "–") + (b.metadata_file.ModDate ? '<br><span class="redup">Diubah ' + esc(b.metadata_file.ModDate.replace("T", " ").slice(0, 16)) + "</span>" : "")]
    ];
    return '<section class="panel"><div class="panel-kepala"><h3>Klaim dan isi berkas</h3></div><table class="banding"><tbody>' +
      baris.map((r) => "<tr><th>" + r[0] + "</th><td>" + r[1] + "</td></tr>").join("") + "</tbody></table></section>";
  }

  function ringkasCatatan(b) {
    const cek = b.temuan.filter((t) => t.kekuatan !== "info").map((t) => D.CEK[t.cek].toLowerCase());
    const unik = cek.filter((v, i) => cek.indexOf(v) === i);
    const jawab = S.jawaban[b.id];
    return "Temuan: " + (unik.join(", ") || "tidak ada") + ". Peserta: " + (jawab ? "menjawab " + D.JAWABAN[jawab].teks.toLowerCase() : "belum menjawab") + ".";
  }

  function kartuSaran(b) {
    const k = S.keputusan[b.id];
    const saranKey = D.SARAN[b.label];
    const saran = D.TINDAKAN[saranKey];
    const jawab = S.jawaban[b.id];

    if (k) {
      const t = D.TINDAKAN[k.tindakan];
      return '<section class="panel saran"><div class="saran-isi"><span class="kapital">Langkah yang disarankan</span><h3>' + saran.nama + "</h3></div>" +
        '<div class="putusan"><b>' + ikon("lencanaCek") + t.status + "</b>" +
        "<p>" + esc(k.oleh) + " memilih <b>" + t.nama.toLowerCase() + "</b> pada " + esc(k.waktu) + (k.ikutSaran ? ", sesuai saran sistem." : ", berbeda dari saran sistem.") + "</p>" +
        (k.catatan ? "<blockquote>" + esc(k.catatan) + "</blockquote>" : "") +
        '<div class="aksi">' + (t.laporan ? '<a class="btn" href="#/laporan/' + b.id + '">' + ikon("berkas") + "Buka laporan temuan</a>" : "") +
          '<button class="btn" type="button" data-aksi="batal-putusan">Batalkan keputusan</button></div></div></section>';
    }

    const catatan = ui.catatan != null ? ui.catatan : saran.laporan ? ringkasCatatan(b) : "";
    const lain = Object.keys(D.TINDAKAN).filter((x) => x !== saranKey);
    const pesertaInfo = b.label === "prioritas"
      ? '<p class="peserta-info-inline">Konfirmasi peserta: ' + (jawab ? "menjawab <b>" + D.JAWABAN[jawab].teks + "</b>" : "menunggu jawaban") + '. <a href="#/berkas/' + b.id + '/bukti">Lihat detail di Bukti</a></p>'
      : "";

    let bawah;
    if (!ui.pilihLain) {
      bawah = (saran.laporan
        ? '<label class="catatan-medan" style="display:block;margin-top:14px"><span class="kapital">Catatan untuk tim telaah</span><textarea data-aksi="catatan" rows="3">' + esc(catatan) + "</textarea></label>"
        : "") +
        '<div class="saran-tombol decision-actions"><button class="btn btn--primer" type="button" data-aksi="setujui">' + ikon("cek") + saran.nama + "</button>" +
        '<button class="btn btn--hantu" type="button" data-aksi="pilih-lain">Pilih tindakan lain</button></div>';
    } else {
      bawah = '<div class="pilihan-lain" role="radiogroup" aria-label="Tindakan lain">' +
        lain.map((x) => '<label class="' + (ui.tindakanLain === x ? "dipilih" : "") + '"><input type="radio" name="tindakan" data-aksi="tindakan-lain" value="' + x + '"' + (ui.tindakanLain === x ? " checked" : "") + ">" +
          "<span><b>" + D.TINDAKAN[x].nama + "</b><span>" + D.TINDAKAN[x].akibat + "</span></span></label>").join("") +
        '<label class="catatan-medan"><span class="kapital">Alasan tidak mengikuti saran</span><textarea data-aksi="catatan" rows="3" placeholder="Contoh: pasien memang tanda tangan sekali untuk semua sesi, sudah dikonfirmasi ke RS.">' + esc(catatan) + "</textarea>" +
          (ui.galat ? '<p class="galat" role="alert">' + esc(ui.galat) + "</p>" : "") + "</label>" +
        '<div class="saran-tombol decision-actions"><button class="btn btn--primer" type="button" data-aksi="simpan-lain">Tinjau keputusan</button>' +
        '<button class="btn btn--hantu" type="button" data-aksi="batal-lain">Kembali ke saran</button></div></div>';
    }

    return '<section class="panel saran"><div class="saran-isi"><span class="kapital">Langkah yang disarankan</span>' +
      "<h3>" + saran.nama + "</h3><p>" + D.ALASAN_SARAN[b.label] + " " + saran.akibat + "</p>" + pesertaInfo + bawah +
      '<p class="mobile-decision-note">Buka di desktop untuk keputusan. Ringkasan dan bukti tetap dapat dilihat di ponsel.</p></div></section>';
  }

  function tabBerkas(b, tab) {
    const daftar = [["ringkasan", "Ringkasan"], ["bukti", "Bukti"], ["jejak", "Jejak"]];
    return '<nav class="tab" aria-label="Bagian kartu bukti">' + daftar.map((d) =>
      '<a href="#/berkas/' + b.id + "/" + d[0] + '"' + (tab === d[0] ? ' aria-current="page"' : "") + ">" + d[1] +
      "</a>").join("") + "</nav>";
  }

  function cuplikanBukti(b, banyak = 2) {
    const temuan = b.temuan.filter((t) => t.region).slice(0, banyak);
    if (!temuan.length) return '<div class="cuplikan-tunggal"><img src="' + b.jpg + '" alt="Pratinjau berkas ' + b.id + '" loading="lazy"><p>Tidak ada area bukti yang ditandai. Dokumen lengkap dapat ditinjau di desktop.</p></div>';
    return '<div class="cuplikan-grid">' + temuan.map((t, i) => '<figure><button class="crop-trigger" type="button" data-aksi="lihat-crop" data-i="' + i + '" aria-label="Perbesar potongan bukti ' + (i + 1) + '"><canvas data-potong="' + b.id + '" data-region="' + t.region.join(',') + '" width="10" height="10" aria-hidden="true"></canvas><span>Perbesar bukti ' + (i + 1) + '</span></button><figcaption><b>' + (i + 1) + '. ' + D.CEK[t.cek] + '</b><span>' + esc(t.kalimat.split('. ')[0]) + '</span></figcaption></figure>').join('') + '</div>';
  }

  function dialogCrop(b) {
    const t = b.temuan.filter((x) => x.region)[ui.crop];
    if (!t) return '';
    return '<div class="dialog-shade"><section class="dialog-bulk crop-dialog" role="dialog" aria-modal="true" aria-labelledby="judul-crop"><h2 id="judul-crop">Bukti ' + (ui.crop + 1) + ': ' + D.CEK[t.cek] + '</h2><p>' + esc(t.kalimat) + '</p><canvas data-potong="' + b.id + '" data-region="' + t.region.join(',') + '" width="10" height="10" aria-label="Area dokumen yang ditandai"></canvas><div class="dialog-actions"><button class="btn btn--primer" type="button" data-aksi="tutup-crop">Tutup bukti</button></div></section></div>';
  }

  function lamanBerkas(id, tab) {
    const b = berkas(id);
    if (!b || !diAntrean(id)) {
      return '<div class="kosong"><b>Berkas belum ada di antrean</b>Unggah berkasnya dulu dari halaman Autentik.<br><br><a class="btn btn--primer" href="#/autentik">Ke Autentik</a></div>';
    }
    const a = S.antrean.find((x) => x.id === id);
    const kepala = '<div class="berkas-kepala"><div>' +
      '<div class="berkas-judul">' + labelChip(b.label, true) + "<h1>" + esc(b.klaim.peserta) + '</h1><span class="mono redup">' + b.id + "</span></div>" +
      '<p class="berkas-alasan">' + esc(alasanSingkat(b)) + '</p>' +
      '<div class="berkas-meta"><span><b>Rumah sakit</b>' + esc(b.klaim.faskes) + '</span><span><b>Masuk</b>' + a.tanggal + ', ' + a.jam + '</span></div></div></div>';

    let isi;
    if (tab === "jejak") isi = tabJejak(b, a);
    else if (tab === "bukti" || tab === "peta" || tab === "peserta") {
      isi = '<div class="evidence-page"><div class="mobile-evidence"><h2>Potongan bukti</h2>' + cuplikanBukti(b, 3) + '</div>' + penampil(b) +
        '<div class="evidence-details">' + tabelBanding(b) +
        (D.keluargaBerkas(b.id) ? '<details class="evidence-extra"' + (tab === "peta" ? ' open' : '') + '><summary>Peta hubungan berkas</summary>' + tabPeta(b) + '</details>' : '') +
        (b.label === "prioritas" ? '<details class="evidence-extra" id="peserta"' + (tab === "peserta" ? ' open' : '') + '><summary>Konfirmasi peserta</summary>' + tabPeserta(b) + '</details>' : '') + '</div></div>';
    } else {
      isi = '<div class="bukti case-layout"><div class="case-primary">' + daftarTemuan(b) +
        '<section class="panel bukti-ringkas"><div class="panel-kepala"><h2>Bukti utama</h2><a href="#/berkas/' + b.id + '/bukti">Buka dokumen lengkap</a></div>' + cuplikanBukti(b) + '</section>' + kelompokPemeriksaan(b) + '</div><aside class="samping">' + kartuSaran(b) + '</aside></div>';
    }
    return kepala + tabBerkas(b, tab === "peta" || tab === "peserta" ? "bukti" : tab) + isi + (ui.pendingDecision ? dialogKeputusan() : '') + (ui.crop !== null ? dialogCrop(b) : '');
  }

  function dialogKeputusan() {
    const p = ui.pendingDecision;
    const t = D.TINDAKAN[p.tindakan];
    return '<div class="dialog-shade"><section class="dialog-bulk" role="dialog" aria-modal="true" aria-labelledby="judul-putusan" aria-describedby="dampak-putusan">' +
      '<h2 id="judul-putusan">Tinjau keputusan untuk ' + esc(p.id) + '</h2><p id="dampak-putusan">' + esc(t.akibat) + '</p>' +
      (p.catatan ? '<blockquote>' + esc(p.catatan) + '</blockquote>' : '') +
      '<div class="dialog-actions"><button class="btn" type="button" data-aksi="batal-konfirmasi">Kembali</button><button class="btn btn--primer" type="button" data-aksi="konfirmasi-putusan">' + t.nama + '</button></div></section></div>';
  }

  function tabPeta(b) {
    const kel = D.keluargaBerkas(b.id);
    const akar = berkas(kel.akar);
    const pasien = new Set(kel.anggota.map((x) => x.klaim.peserta)).size;
    const bulan = new Set(kel.anggota.map((x) => x.klaim.periode)).size;
    const cabang = kel.anggota.map((x) => {
      const dipakai = x.id === kel.akar ? "Berkas pembanding" : x.temuan.some((t) => t.cek === "berkas_kembar") ? "Lembar serupa dengan " + kel.akar : "Area serupa dengan " + kel.akar;
      const ada = diAntrean(x.id);
      return '<li><a class="peta-simpul' + (x.id === b.id ? " ini" : "") + '" href="' + (ada ? "#/berkas/" + x.id : "#/berkas/" + b.id + "/peta") + '">' +
        "<b>" + esc(x.klaim.peserta) + (x.id === b.id ? ' <span class="redup" style="font-weight:600">· berkas ini</span>' : "") + "</b>" +
        '<span><span class="mono">SEP ' + esc(x.klaim.sep) + "</span> · " + esc(x.klaim.periode) + " · " + dipakai + "</span>" + labelChip(x.label) + "</a></li>";
    }).join("");
    return '<section class="panel"><div class="panel-kepala"><h3>Hubungan ' + kel.anggota.length + " berkas</h3><span class=\"kanan redup\">" + pasien + " peserta · " + bulan + " periode</span></div>" +
      '<div class="peta"><div class="peta-akar"><img src="' + akar.jpg + '" alt="Lembar ' + akar.id + '">' +
        "<div><b>Lembar " + akar.id + "</b><p>Berkas pembanding dari " + esc(akar.klaim.faskes) + ". Area yang ditandai memiliki pola serupa dan perlu ditinjau bersama dokumen asal.</p></div></div>" +
        '<ul class="peta-cabang">' + cabang + "</ul></div></section>";
  }

  function tabPeserta(b) {
    const p = D.pesanPeserta(b);
    const jawab = S.jawaban[b.id];
    return '<section class="panel konfirmasi-ringkas"><div class="panel-kepala"><h3>Konfirmasi peserta</h3><span class="kanan redup">Simulasi, tidak ada pesan terkirim</span></div><div class="panel-isi">' +
      '<p>Pesan netral yang dapat dikirim melalui kanal resmi:</p><blockquote>' + esc(p.teks + ' ' + p.tanya + ' ' + p.pilihan) + '</blockquote>' +
      (jawab ? '<div class="jawaban-kartu"><b>Jawaban simulasi: ' + D.JAWABAN[jawab].teks + '</b><p>' + D.JAWABAN[jawab].akibat + '</p></div><button class="btn" type="button" data-aksi="hapus-jawaban">Ulangi simulasi</button>'
        : '<div class="jawaban-pilihan"><span>Simulasikan jawaban</span>' + ["1", "2", "3"].map((n) => '<button class="btn" type="button" data-aksi="jawab" data-nilai="' + n + '">' + D.JAWABAN[n].teks + '</button>').join('') + '</div>') +
      '<p class="konfirmasi-catatan">Jawaban peserta menambah konteks pemeriksaan. Veritas tidak menetapkan kecurangan.</p></div></section>';
  }

  function tabJejak(b, a) {
    const k = S.keputusan[b.id];
    const jawab = S.jawaban[b.id];
    const langkah = D.langkah(b);
    const item = [
      { waktu: a.jam, judul: "Diunggah rumah sakit ke JKN Drive", teks: b.klaim.faskes + " · " + (b.berkas ? b.berkas.pdf : b.nama) },
      { waktu: a.jam, judul: "Diperiksa Veritas Autentik", teks: langkah.length + " langkah simulasi selesai. Status " + D.LABEL[b.label].nama + ". " + (b.temuan.length ? b.temuan.length + " temuan." : "Tanpa temuan.") }
    ];
    if (b.label === "prioritas") {
      item.push({ waktu: "Simulasi", judul: "Contoh pesan konfirmasi peserta disiapkan", teks: "Tidak ada pesan yang dikirim dari prototipe." });
      item.push(jawab ? { waktu: "Hari ini", judul: "Peserta menjawab: " + D.JAWABAN[jawab].teks, teks: D.JAWABAN[jawab].akibat }
        : { menunggu: true, waktu: "", judul: "Menunggu jawaban peserta", teks: "Label tidak berubah kalau peserta tidak menjawab." });
    }
    (S.audit || []).filter((x) => x.id === b.id).forEach((x) => item.push({ waktu: x.waktu, judul: x.jenis === "batal" ? "Keputusan dibatalkan" : D.VERIFIKATOR.nama + ": " + D.TINDAKAN[x.tindakan].nama, teks: x.jenis === "batal" ? "Kasus kembali ke antrean untuk ditinjau." : (x.catatan || "Tindakan tercatat dalam prototipe.") }));
    if (k && D.TINDAKAN[k.tindakan].laporan) item.push({ waktu: k.waktu.split(", ")[1] || k.waktu, judul: "Laporan temuan tersedia", teks: '<a href="#/laporan/' + b.id + '">Buka laporan</a>', html: true });
    if (!k) {
      item.push({ menunggu: true, waktu: "", judul: "Menunggu keputusan verifikator", teks: "Saran sistem: " + D.TINDAKAN[D.SARAN[b.label]].nama.toLowerCase() + "." });
    }
    return '<section class="panel"><div class="panel-kepala"><h3>Jejak keputusan</h3><span class="kanan redup">Setiap langkah tercatat: siapa, kapan, dan alasannya</span></div><ol class="linimasa">' +
      item.map((x) => '<li class="' + (x.menunggu ? "menunggu" : "") + '"><time>' + esc(x.waktu) + '</time><span class="bulat">' + (x.menunggu ? "" : ikon("cek")) + "</span><div><b>" + esc(x.judul) + "</b><p>" + (x.html ? x.teks : esc(x.teks)) + "</p></div></li>").join("") +
      "</ol></section>";
  }

  /* ============================================================== laporan */

  function nomorLaporan(b) { return "LT-VA/" + b.id.replace("VA-", "").replace("-", "") + "/X/2026"; }

  function lamanLaporan(id) {
    const b = berkas(id);
    if (!b || !diAntrean(id)) return '<div class="kosong"><b>Laporan belum tersedia</b>Berkas ini belum ada di antrean.</div>';
    const k = S.keputusan[id];
    const jawab = S.jawaban[id];
    const hash = ui.hash[id];
    if (hash === undefined) hitungHash(b);

    const potongan = b.temuan.filter((t) => t.region).map((t, i) =>
      '<figure><canvas data-potong="' + b.id + '" data-region="' + t.region.join(",") + '" width="10" height="10"></canvas><figcaption>' + (i + 1) + ". " + D.CEK[t.cek] + "</figcaption></figure>").join("");

    return '<div class="laporan-alat"><a class="btn" href="#/berkas/' + id + '">' + ikon("kiri") + "Kartu bukti</a>" +
        '<button class="btn btn--primer" type="button" data-aksi="unduh-pdf" data-id="' + id + '">' + ikon("unduh") + "Unduh PDF</button>" +
        '<button class="btn" type="button" data-aksi="cetak">' + ikon("cetak") + "Cetak</button></div>" +
      '<article class="kertas-laporan">' +
        '<header><span class="merek-ikon"><img src="assets/veritas-mark.svg" alt=""></span><div><b>VERITAS AUTENTIK</b><span>Fitur Vedika · Powered by PRAMANA · ' + D.VERIFIKATOR.kantor + '</span></div><div class="kanan"><span>' + D.HARI_INI + "</span></div></header>" +
        "<h2>LAPORAN TEMUAN DOKUMEN KLAIM</h2>" +
        '<p class="nomor-laporan">Nomor ' + nomorLaporan(b) + (k ? "" : " · DRAF, belum ada keputusan verifikator") + "</p>" +
        "<h3>Identitas klaim</h3><dl>" +
          "<dt>Peserta</dt><dd>" + esc(b.klaim.peserta) + " · No. kartu " + esc(b.klaim.no_kartu) + "</dd>" +
          '<dt>Nomor SEP</dt><dd class="mono">' + esc(b.klaim.sep) + "</dd>" +
          "<dt>Fasilitas kesehatan</dt><dd>" + esc(b.klaim.faskes) + " (" + esc(b.klaim.kode_faskes) + ")</dd>" +
          "<dt>Layanan</dt><dd>" + esc(b.klaim.layanan) + ", " + esc(b.klaim.periode) + "</dd>" +
          "<dt>Ditagihkan</dt><dd>" + b.klaim.sesi_ditagih + " sesi · " + rp(b.klaim.nilai_klaim) + "</dd>" +
          '<dt>ID berkas</dt><dd class="mono">' + b.id + "</dd></dl>" +
        "<h3>Hasil pemeriksaan</h3><p>" + labelChip(b.label) + " " + esc(b.ringkasan) + "</p>" +
        "<h3>Temuan</h3>" + (b.temuan.length ? "<ol>" + b.temuan.map((t) => "<li><b>" + D.CEK[t.cek] + "</b> (" + D.KEKUATAN[t.kekuatan].toLowerCase() + "). " + esc(t.kalimat) + "</li>").join("") + "</ol>" : "<p>Tidak ada temuan.</p>") +
        (potongan ? "<h3>Potongan bukti</h3><div class=\"potongan\">" + potongan + "</div>" : "") +
        (b.label === "prioritas" ? "<h3>Konfirmasi peserta</h3><p>" + (jawab ? "Jawaban simulasi peserta: <b>" + D.JAWABAN[jawab].teks + "</b>." : "Belum ada jawaban simulasi peserta.") + "</p>" : "") +
        "<h3>Jejak berkas</h3><dl>" +
          '<dt>SHA-256 berkas asli</dt><dd class="mono">' + (hash ? esc(hash) : hash === null ? "Tersedia saat prototipe dibuka lewat server" : "Menghitung…") + "</dd>" +
          "<dt>Pembuat berkas</dt><dd>" + esc([b.metadata_file.Creator, b.metadata_file.Producer].filter(Boolean).join(" · ")) + "</dd>" +
          "<dt>Versi aturan</dt><dd>VA-aturan 2026.09 (PRD bagian 9)</dd></dl>" +
        "<h3>Keputusan verifikator</h3>" + (k
          ? "<dl><dt>Tindakan</dt><dd><b>" + D.TINDAKAN[k.tindakan].nama + "</b>" + (k.ikutSaran ? ", sesuai saran sistem" : ", berbeda dari saran sistem") + "</dd><dt>Oleh</dt><dd>" + esc(k.oleh) + ", " + esc(k.waktu) + "</dd>" + (k.catatan ? "<dt>Catatan</dt><dd>" + esc(k.catatan) + "</dd>" : "") + "</dl>"
          : "<p class=\"redup\">Belum ada keputusan.</p>") +
        '<div class="ttd-laporan"><div>Verifikator<span></span><b>' + D.VERIFIKATOR.nama + "</b></div><div>Kepala Bidang Penjaminan Manfaat<span></span><b>......................................</b></div></div>" +
        '<p class="kaki-laporan">PROTOTIPE · DATA SINTETIS. Hasil pemeriksaan disimulasikan. Laporan ini menampilkan indikasi pada dokumen; keputusan akhir klaim dan penetapan kecurangan berada di luar Veritas Autentik.</p>' +
      "</article>";
  }

  async function hitungHash(b) {
    ui.hash[b.id] = "";
    try {
      const data = await fetch(b.pdf).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); });
      const hasil = await crypto.subtle.digest("SHA-256", data);
      ui.hash[b.id] = [...new Uint8Array(hasil)].map((x) => x.toString(16).padStart(2, "0")).join("");
    } catch (e) {
      ui.hash[b.id] = null;
    }
    if (rute().nama === "laporan") gambar(true);
  }

  /* Potong area temuan dari halaman berkas ke kanvas, untuk laporan dan PDF. */
  function muatGambar(src) {
    return new Promise((ok, gagal) => { const img = new Image(); img.onload = () => ok(img); img.onerror = gagal; img.src = src; });
  }

  async function potong(b, region, lebarMaks) {
    const img = await muatGambar(b.jpg);
    const pad = 12;
    const x = Math.max(0, region[0] - pad), y = Math.max(0, region[1] - pad);
    const w = Math.min(img.naturalWidth - x, region[2] + pad * 2), h = Math.min(img.naturalHeight - y, region[3] + pad * 2);
    const skala = Math.min(1, lebarMaks / w);
    const c = document.createElement("canvas");
    c.width = Math.round(w * skala); c.height = Math.round(h * skala);
    c.getContext("2d").drawImage(img, x, y, w, h, 0, 0, c.width, c.height);
    return c;
  }

  async function isiPotongan() {
    const kanvas = document.querySelectorAll("canvas[data-potong]");
    for (const k of kanvas) {
      try {
        const c = await potong(berkas(k.dataset.potong), k.dataset.region.split(",").map(Number), 600);
        k.width = c.width; k.height = c.height;
        k.getContext("2d").drawImage(c, 0, 0);
      } catch (e) { /* gambar gagal dimuat: kanvas dibiarkan kosong */ }
    }
  }

  const bersihPdf = (s) => String(s).replace(/[—–]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, "...").replace(/·/g, "-");

  async function unduhPdf(id) {
    const b = berkas(id);
    if (!window.jspdf) { toast("Pembuat PDF belum termuat. Periksa koneksi, lalu coba lagi."); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const L = 18, R = 192, lebar = R - L;
    let y = 18;
    const baru = (perlu) => { if (y + perlu > 278) { doc.addPage(); y = 18; } };
    const teks = (t, o) => {
      o = o || {};
      doc.setFont("helvetica", o.tebal ? "bold" : "normal"); doc.setFontSize(o.ukuran || 9.5); doc.setTextColor(o.warna || "#1a1a19");
      doc.splitTextToSize(bersihPdf(t), o.lebar || lebar).forEach((baris) => { baru(6); doc.text(baris, o.x || L, y, { align: o.align || "left" }); y += (o.ukuran || 9.5) * 0.45 + 1.2; });
    };
    const judul = (t) => { y += 4; baru(12); teks(t.toUpperCase(), { tebal: true, ukuran: 8, warna: "#6b6a66" }); doc.setDrawColor("#e4e4e0"); doc.line(L, y - 1, R, y - 1); y += 3; };
    const kv = (p) => p.forEach((r) => { baru(6); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor("#6b6a66"); doc.text(bersihPdf(r[0]), L, y);
      doc.setFont("helvetica", "normal"); doc.setTextColor("#1a1a19"); const isi = doc.splitTextToSize(bersihPdf(r[1]), 118); doc.text(isi, L + 52, y); y += 5.2 * isi.length; });

    const k = S.keputusan[id], jawab = S.jawaban[id];
    doc.setFillColor("#15324A"); doc.rect(0, 0, 210, 3, "F");
    teks("VERITAS AUTENTIK", { tebal: true, ukuran: 12 });
    teks("Fitur Vedika - Powered by PRAMANA - " + D.VERIFIKATOR.kantor, { ukuran: 8.5, warna: "#6b6a66" });
    y += 6;
    teks("LAPORAN TEMUAN DOKUMEN KLAIM", { tebal: true, ukuran: 12, x: 105, align: "center" });
    teks("Nomor " + nomorLaporan(b) + (k ? "" : " - DRAF"), { ukuran: 8.5, warna: "#6b6a66", x: 105, align: "center" });

    judul("Identitas klaim");
    kv([["Peserta", b.klaim.peserta + " - No. kartu " + b.klaim.no_kartu], ["Nomor SEP", b.klaim.sep], ["Fasilitas kesehatan", b.klaim.faskes + " (" + b.klaim.kode_faskes + ")"],
      ["Layanan", b.klaim.layanan + ", " + b.klaim.periode], ["Ditagihkan", b.klaim.sesi_ditagih + " sesi - " + rp(b.klaim.nilai_klaim)], ["ID berkas", b.id]]);
    judul("Hasil pemeriksaan");
    teks("Label " + D.LABEL[b.label].nama + ". " + b.ringkasan);
    judul("Temuan");
    if (!b.temuan.length) teks("Tidak ada temuan.");
    b.temuan.forEach((t, i) => teks((i + 1) + ". " + D.CEK[t.cek] + " (" + D.KEKUATAN[t.kekuatan].toLowerCase() + "). " + t.kalimat));

    const berregion = b.temuan.filter((t) => t.region);
    if (berregion.length) {
      judul("Potongan bukti");
      for (let i = 0; i < berregion.length; i++) {
        try {
          const c = await potong(b, berregion[i].region, 900);
          const w = Math.min(lebar, 80 * (c.width / c.height)), h = w * (c.height / c.width);
          const tinggi = Math.min(h, 90), lebarAkhir = tinggi * (c.width / c.height);
          baru(tinggi + 8);
          doc.addImage(c.toDataURL("image/jpeg", 0.85), "JPEG", L, y, lebarAkhir, tinggi);
          y += tinggi + 3;
          teks((i + 1) + ". " + D.CEK[berregion[i].cek], { ukuran: 8, warna: "#6b6a66" });
          y += 2;
        } catch (e) {
          teks("Potongan bukti hanya tersedia saat prototipe dibuka lewat server.", { ukuran: 8.5, warna: "#6b6a66" });
          break;
        }
      }
    }
    if (b.label === "prioritas") { judul("Konfirmasi peserta"); teks(jawab ? "Jawaban simulasi peserta: " + D.JAWABAN[jawab].teks + "." : "Belum ada jawaban simulasi peserta."); }
    judul("Jejak berkas");
    kv([["SHA-256 berkas asli", ui.hash[id] || "tidak tersedia"], ["Pembuat berkas", [b.metadata_file.Creator, b.metadata_file.Producer].filter(Boolean).join(" - ")], ["Versi aturan", "VA-aturan 2026.09"]]);
    judul("Keputusan verifikator");
    if (k) kv([["Tindakan", D.TINDAKAN[k.tindakan].nama + (k.ikutSaran ? ", sesuai saran sistem" : ", berbeda dari saran sistem")], ["Oleh", k.oleh + ", " + k.waktu]].concat(k.catatan ? [["Catatan", k.catatan]] : []));
    else teks("Belum ada keputusan.", { warna: "#6b6a66" });
    y += 4;
    teks("Laporan ini berisi prioritas pemeriksaan beserta buktinya, bukan penetapan kecurangan. Penetapan tetap wewenang Tim Pencegahan dan Penanganan Kecurangan JKN sesuai Permenkes 16/2019. Prototipe Healthkathon 2026, seluruh data sintetis.", { ukuran: 8, warna: "#6b6a66" });

    doc.save("Laporan-Temuan-" + id + ".pdf");
    toast("Laporan " + id + " diunduh.");
  }

  /* ============================================================== riwayat */

  function lamanRiwayat() {
    const daftar = Object.keys(S.keputusan).map((id) => Object.assign({ id: id, b: berkas(id) }, S.keputusan[id])).filter((x) => x.b);
    const isi = daftar.length
      ? '<div class="tabel-bungkus"><table class="tabel tabel--kartu"><thead><tr><th>Waktu</th><th>Peserta</th><th>Label</th><th>Tindakan</th><th>Saran sistem</th><th>Catatan</th></tr></thead><tbody>' +
        daftar.reverse().map((x) => '<tr class="bisa-klik" data-aksi="buka-berkas" data-id="' + x.id + '"><td class="redup">' + esc(x.waktu) + '</td><td class="nama-berkas"><b>' + esc(x.b.klaim.peserta) + '</b><span class="mono">' + x.id + "</span></td><td>" + labelChip(x.b.label) + "</td><td><b>" + D.TINDAKAN[x.tindakan].nama + '</b></td><td class="sembunyi-hp">' + (x.ikutSaran ? "Diikuti" : '<b style="color:var(--cek-fg)">Tidak diikuti</b>') + '</td><td class="alasan lebar-penuh">' + esc(x.catatan || "–") + "</td></tr>").join("") +
        "</tbody></table></div>"
      : '<div class="riwayat-kosong"><b>Belum ada keputusan</b><p>Setiap keputusan di kartu bukti tercatat di sini, lengkap dengan waktu, tindakan, dan alasannya.</p><a class="btn btn--primer" href="#/autentik">Buka antrean Autentik</a></div>';
    return '<div class="kepala"><div><h1>Riwayat keputusan</h1><p>Keputusan verifikator dan pembatalannya tercatat di sini untuk audit prototipe.</p></div></div><section class="panel">' + isi + "</section>";
  }

  /* ============================================================== proses */

  async function jalankan(ids) {
    if (ui.proses && !ui.proses.selesai) return;
    ids.forEach((id) => { S.antrean = S.antrean.filter((a) => a.id !== id); delete S.keputusan[id]; delete S.jawaban[id]; });
    ui.proses = { daftar: ids.map((id) => ({ id: id, selesai: false })), aktif: 0, langkah: 0, selesai: false };
    if (rute().nama !== "autentik") ke("#/autentik"); else gambar(true);
    for (let i = 0; i < ids.length; i++) {
      ui.proses.aktif = i;
      const jumlah = D.langkah(berkas(ids[i])).length;
      for (let j = 0; j < jumlah; j++) { ui.proses.langkah = j; perbaruiProses(); await tunggu(260); }
      ui.proses.langkah = jumlah;
      ui.proses.daftar[i].selesai = true;
      S.antrean.push({ id: ids[i], tanggal: "1 Okt", jam: jam(), baru: true, luar: berkas(ids[i]).luar });
      simpan();
      gambar(true);
      await tunggu(380);
    }
    ui.proses.selesai = true;
    gambar(true);
    document.dispatchEvent(new CustomEvent("demo-selesai"));
    const prioritas = ids.filter((id) => berkas(id).label === "prioritas").length;
    toast(ids.length + " berkas diperiksa" + (prioritas ? ", " + prioritas + " berlabel Prioritas." : "."));
  }

  /* Perbarui hanya bagian proses supaya halaman tidak berkedip setiap langkah. */
  function perbaruiProses() {
    const el = document.getElementById("proses");
    if (el) el.outerHTML = tampilanProses();
    else gambar(true);
  }

  /* Hanya file corpus dengan hash yang cocok yang boleh memakai hasil simulasi. */
  async function terimaBerkas(files) {
    const ids = [];
    let tidakDikenal = 0;
    for (const f of files) {
      if (!window.crypto?.subtle) { toast("Pemeriksaan file tidak tersedia di peramban ini."); return; }
      const bytes = await f.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const hash = [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, "0")).join("");
      const cocok = D.MANIFEST.find((b) => Object.values(b.fileHashes || {}).includes(hash));
      if (cocok) ids.push(cocok.id); else tidakDikenal++;
    }
    if (tidakDikenal) toast(tidakDikenal + " berkas tidak ada dalam corpus demo dan tidak dianalisis.");
    if (ids.length) jalankan([...new Set(ids)]);
  }

  /* ============================================================== keputusan */

  function putuskan(id, tindakan, catatan, ikutSaran) {
    S.keputusan[id] = { tindakan: tindakan, catatan: catatan, ikutSaran: ikutSaran, oleh: D.VERIFIKATOR.nama, waktu: "1 Okt 2026, " + jam() };
    S.audit.push({ id: id, jenis: "keputusan", tindakan: tindakan, catatan: catatan, waktu: jam() });
    ui.pendingDecision = null;
    ui.pilihLain = false; ui.tindakanLain = null; ui.catatan = null; ui.galat = "";
    simpan();
    gambar(true);
    const t = D.TINDAKAN[tindakan];
    toast(t.status + " · " + id, t.laporan ? "#/laporan/" + id : null);
  }

  function bukaBerkas(id) { if (!S.dibuka.includes(id)) { S.dibuka.push(id); simpan(); } }

  /* ============================================================== render */

  function gambar(tetap) {
    const y = window.scrollY;
    const r = rute();
    const akar = document.getElementById("akar");
    document.body.style.overflow = ui.menuBuka || ui.bulk || ui.pendingDecision || ui.help || ui.crop !== null ? "hidden" : "";

    if (!S.masuk) {
      akar.innerHTML = lamanMasuk();
      return;
    }

    let isi, jejak;
    const b = r.id ? berkas(r.id) : null;
    if (r.nama === "autentik") { isi = lamanAutentik(); jejak = "<b>Autentik</b>"; }
    else if (r.nama === "berkas") {
      if (b && diAntrean(r.id)) bukaBerkas(r.id);
      isi = lamanBerkas(r.id, r.tab);
      jejak = '<a href="#/autentik">Autentik</a><span>/</span><b>' + esc(b ? b.klaim.peserta : "Berkas") + "</b>";
    } else if (r.nama === "laporan") {
      isi = lamanLaporan(r.id);
      jejak = '<a href="#/autentik">Autentik</a><span>/</span><a href="#/berkas/' + esc(r.id) + '">' + esc(b ? b.klaim.peserta : "Berkas") + "</a><span>/</span><b>Laporan temuan</b>";
    } else if (r.nama === "riwayat") { isi = lamanRiwayat(); jejak = "<b>Riwayat keputusan</b>"; }
    else { isi = lamanBeranda(); jejak = "<b>Beranda</b>"; }

    akar.innerHTML = kerangka(r, isi, jejak);
    document.title = (r.nama === "beranda" ? "Beranda" : r.nama === "riwayat" ? "Riwayat keputusan" : b ? b.klaim.peserta : "Antrean") + " · Veritas Autentik";
    window.scrollTo(0, tetap ? y : 0);
    if (document.querySelector("canvas[data-potong]")) isiPotongan();
    if (ui.fokus != null && !tetap) {
      const f = window.matchMedia("(max-width: 640px)").matches
        ? document.querySelector('.mobile-evidence .crop-trigger[data-i="' + ui.fokus + '"]')
        : document.querySelector(".sorot.fokus");
      f?.scrollIntoView({ block: "center" });
    }
  }

  function toast(pesan, tautan, aksi) {
    const w = document.getElementById("toast");
    while (w.children.length >= 2) {
      const biasa = [...w.children].find((x) => !x.querySelector('button'));
      (biasa || w.firstElementChild).remove();
    }
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = ikon("lencanaCek") + "<span>" + esc(pesan) + (tautan ? ' <a href="' + tautan + '">Buka laporan</a>' : "") + (aksi ? ' <button type="button" data-aksi="' + aksi + '">Urungkan</button>' : '') + "</span>";
    w.appendChild(t);
    setTimeout(() => { t.style.transition = "opacity .3s"; t.style.opacity = "0"; setTimeout(() => t.remove(), 320); }, 4200);
  }

  /* ============================================================== peristiwa */

  const AKSI = {
    masuk() { S.masuk = true; simpan(); ke("#/autentik"); },
    menu() { ui.menuBuka = !ui.menuBuka; gambar(true); (document.querySelector(ui.menuBuka ? '.drawer-close' : '.tombol-menu') || document.body).focus(); },
    "buka-antrean"(el) {
      const ada = S.antrean.some((a) => berkas(a.id).klaim.faskes === el.dataset.faskes);
      ui.faskes = ada ? el.dataset.faskes : "";
      if (!ada) toast("Belum ada berkas Autentik dari " + el.dataset.faskes + " di antrean demo.");
      ke("#/autentik");
    },
    "buka-berkas"(el) { ui.fokus = null; ke("#/berkas/" + el.dataset.id); },
    saring(el) { ui.filter = el.dataset.nilai; ui.visibleCount = 20; gambar(true); document.querySelector('[data-aksi="saring"][data-nilai="' + ui.filter + '"]')?.focus(); },
    "toggle-filter"() { ui.filterBuka = !ui.filterBuka; gambar(true); document.querySelector('[data-aksi="toggle-filter"]')?.focus(); },
    "toggle-demo"() { ui.demoBuka = !ui.demoBuka; gambar(true); document.querySelector('[data-aksi="toggle-demo"]')?.focus(); },
    "reset-filter"() { ui.filter = "semua"; ui.faskes = ""; ui.q = ""; ui.visibleCount = 20; gambar(true); document.querySelector('[data-aksi="cari"]')?.focus(); },
    "lihat-lagi"() { const jumlahAwal = ui.visibleCount; ui.visibleCount += 20; gambar(true); (document.querySelector('[data-aksi="lihat-lagi"]') || document.querySelectorAll('.queue-case-link')[jumlahAwal])?.focus(); },
    demo() { jalankan(D.DEMO.map((d) => d.id)); },
    skenario(el) { const id = el.dataset.id; if (diAntrean(id)) ke("#/berkas/" + id); else jalankan([id]); },
    "setujui-lolos"() { if (window.matchMedia("(max-width: 640px)").matches) return; ui.bulk = true; gambar(true); document.querySelector('.dialog-bulk [data-aksi="batal-bulk"]')?.focus(); },
    "batal-bulk"() { ui.bulk = false; gambar(true); document.querySelector('[data-aksi="setujui-lolos"]')?.focus(); },
    "konfirmasi-bulk"() {
      if (window.matchMedia("(max-width: 640px)").matches) return;
      const ids = S.antrean.filter((a) => berkas(a.id).label === "lolos" && !S.keputusan[a.id]).map((a) => a.id);
      const batchId = Date.now().toString(36);
      S.bulkUndo = { id: batchId, entries: ids.map((id) => ({ id: id, sebelum: S.keputusan[id] || null })) };
      ids.forEach((id) => {
        S.keputusan[id] = { tindakan: "wajar", catatan: "Tidak ada anomali terdeteksi pada pemeriksaan yang tersedia.", ikutSaran: true, oleh: D.VERIFIKATOR.nama, waktu: "1 Okt 2026, " + jam(), batchId: batchId };
        S.audit.push({ id: id, jenis: "keputusan", tindakan: "wajar", catatan: "Keputusan kelompok", waktu: jam() });
      });
      ui.bulk = false; simpan(); gambar(true); toast(ids.length + " berkas diteruskan ke verifikasi biasa.", null, "undo-bulk");
    },
    "undo-bulk"() {
      if (window.matchMedia("(max-width: 640px)").matches) return;
      if (!S.bulkUndo) return;
      const entries = S.bulkUndo.entries.filter((x) => S.keputusan[x.id]?.batchId === S.bulkUndo.id);
      entries.forEach((x) => { if (x.sebelum) S.keputusan[x.id] = x.sebelum; else delete S.keputusan[x.id]; S.audit.push({ id: x.id, jenis: "batal", waktu: jam() }); });
      S.bulkUndo = null; simpan(); gambar(true); toast(entries.length + " keputusan kelompok dibatalkan.");
    },
    fokus(el) {
      const i = Number(el.dataset.i); ui.fokus = i; ui.fokusCase = rute().id; ui.sorot = true;
      if (window.matchMedia("(max-width: 640px)").matches && i >= 3) {
        ui.crop = berkas(rute().id).temuan.slice(0, i + 1).filter((t) => t.region).length - 1;
        ui.cropFromFinding = i;
        gambar(true); document.querySelector('[data-aksi="tutup-crop"]')?.focus(); return;
      }
      if (rute().tab !== "bukti") ke("#/berkas/" + rute().id + "/bukti"); else gambar(true);
      requestAnimationFrame(() => {
        const target = window.matchMedia("(max-width: 640px)").matches
          ? document.querySelector('.mobile-evidence .crop-trigger[data-i="' + i + '"]')
          : document.querySelector(".sorot.fokus");
        target?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    },
    "lihat-crop"(el) { ui.crop = Number(el.dataset.i); ui.cropFromFinding = null; gambar(true); document.querySelector('[data-aksi="tutup-crop"]')?.focus(); },
    "tutup-crop"() { const i = ui.crop, finding = ui.cropFromFinding; ui.crop = null; ui.cropFromFinding = null; gambar(true); document.querySelector(finding === null ? '.crop-trigger[data-i="' + i + '"]' : '.temuan-link[data-i="' + finding + '"]')?.focus(); },
    perbesar() { ui.perbesar = !ui.perbesar; gambar(true); },
    setujui() {
      if (window.matchMedia("(max-width: 640px)").matches) { toast("Buka di desktop untuk mengambil keputusan."); return; }
      const r = rute(), b = berkas(r.id), saran = D.SARAN[b.label];
      const catatan = D.TINDAKAN[saran].laporan ? (ui.catatan != null ? ui.catatan : ringkasCatatan(b)) : "";
      ui.pendingDecision = { id: b.id, tindakan: saran, catatan: catatan.trim(), ikutSaran: true }; gambar(true); document.querySelector('[data-aksi="batal-konfirmasi"]')?.focus();
    },
    "pilih-lain"() { ui.pilihLain = true; ui.catatan = ""; ui.galat = ""; gambar(true); },
    "batal-lain"() { ui.pilihLain = false; ui.tindakanLain = null; ui.catatan = null; ui.galat = ""; gambar(true); },
    "simpan-lain"() {
      if (window.matchMedia("(max-width: 640px)").matches) { toast("Buka di desktop untuk mengambil keputusan."); return; }
      if (!ui.tindakanLain) { ui.galat = "Pilih salah satu tindakan dulu."; gambar(true); return; }
      if (!ui.catatan || !ui.catatan.trim()) { ui.galat = "Tulis alasan singkat. Catatan ini masuk ke jejak keputusan dan laporan."; gambar(true); return; }
      ui.pendingDecision = { id: rute().id, tindakan: ui.tindakanLain, catatan: ui.catatan.trim(), ikutSaran: false }; gambar(true); document.querySelector('[data-aksi="batal-konfirmasi"]')?.focus();
    },
    "batal-konfirmasi"() { ui.pendingDecision = null; gambar(true); document.querySelector('[data-aksi="setujui"]')?.focus(); },
    "konfirmasi-putusan"() { if (window.matchMedia("(max-width: 640px)").matches) return; const p = ui.pendingDecision; if (p) putuskan(p.id, p.tindakan, p.catatan, p.ikutSaran); },
    "batal-putusan"() { if (window.matchMedia("(max-width: 640px)").matches) return; const id = rute().id; delete S.keputusan[id]; S.audit.push({ id: id, jenis: "batal", waktu: jam() }); simpan(); gambar(true); toast("Keputusan dibatalkan. Berkas kembali ke antrean."); },
    jawab(el) { const id = rute().id; S.jawaban[id] = el.dataset.nilai; ui.catatan = null; simpan(); gambar(true); toast("Jawaban peserta tercatat: " + D.JAWABAN[el.dataset.nilai].teks + "."); },
    "hapus-jawaban"() { delete S.jawaban[rute().id]; simpan(); gambar(true); },
    "unduh-pdf"(el) { unduhPdf(el.dataset.id); },
    cetak() { window.print(); },
    "tur-mulai"() { ui.menuBuka = false; ui.help = true; gambar(true); document.querySelector('[data-aksi="tutup-panduan"]')?.focus(); },
    "tutup-panduan"() { ui.help = false; gambar(true); document.querySelector('[data-aksi="tur-mulai"]')?.focus(); },
    "ulang-demo"() {
      const tetapMasuk = S.masuk;
      S = statusAwal(); S.masuk = tetapMasuk;
      ui.proses = null; ui.filter = "semua"; ui.faskes = ""; ui.q = ""; ui.fokus = null; ui.pilihLain = false; ui.catatan = null; ui.bulk = false;
      simpan(); ke("#/autentik"); toast("Demo dimulai ulang. Antrean kembali ke keadaan awal.");
    }
  };

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-aksi]");
    if (!el || el.tagName === "SELECT" || el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && el.type !== "checkbox" && el.type !== "radio")) return;
    const f = AKSI[el.dataset.aksi];
    if (f) { if (el.tagName === "A") e.preventDefault(); f(el); }
    if (ui.menuBuka && !e.target.closest("#sisi") && el.dataset.aksi !== "menu") { ui.menuBuka = false; gambar(true); }
  });

  document.addEventListener("change", (e) => {
    const a = e.target.dataset && e.target.dataset.aksi;
    if (a === "saring-faskes") { ui.faskes = e.target.value; ui.visibleCount = 20; gambar(true); document.querySelector('[data-aksi="saring-faskes"]')?.focus(); }
    else if (a === "saklar-sorot") { ui.sorot = e.target.checked; gambar(true); }
    else if (a === "tindakan-lain") { ui.tindakanLain = e.target.value; ui.galat = ""; gambar(true); }
    else if (e.target.id === "pilihBerkas" && e.target.files.length) terimaBerkas(e.target.files);
  });

  document.addEventListener("input", (e) => {
    const a = e.target.dataset && e.target.dataset.aksi;
    if (a === "catatan") ui.catatan = e.target.value;
    else if (a === "cari") {
      ui.q = e.target.value;
      ui.visibleCount = 20;
      const pos = e.target.selectionStart;
      gambar(true);
      const baru = document.querySelector('[data-aksi="cari"]');
      if (baru) { baru.focus(); baru.setSelectionRange(pos, pos); }
    }
  });

  ["dragenter", "dragover"].forEach((t) => document.addEventListener(t, (e) => {
    const z = e.target.closest && e.target.closest("#jatuh");
    if (!z) return;
    e.preventDefault(); z.classList.add("aktif");
  }));
  document.addEventListener("dragleave", (e) => { const z = e.target.closest && e.target.closest("#jatuh"); if (z) z.classList.remove("aktif"); });
  document.addEventListener("drop", (e) => {
    const z = e.target.closest && e.target.closest("#jatuh");
    if (!z) return;
    e.preventDefault(); z.classList.remove("aktif");
    if (e.dataTransfer && e.dataTransfer.files.length) terimaBerkas(e.dataTransfer.files);
  });

  document.addEventListener("keydown", (e) => {
    const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
    if (dialog) {
      if (e.key === "Escape") {
        e.preventDefault();
        const target = ui.crop !== null ? ui.cropFromFinding === null ? '.crop-trigger[data-i="' + ui.crop + '"]' : '.temuan-link[data-i="' + ui.cropFromFinding + '"]'
          : ui.bulk ? '[data-aksi="setujui-lolos"]' : ui.pendingDecision ? ui.pilihLain ? '[data-aksi="simpan-lain"]' : '[data-aksi="setujui"]' : window.matchMedia("(max-width: 960px)").matches ? '.tombol-menu' : '[data-aksi="tur-mulai"]';
        ui.bulk = false; ui.pendingDecision = null; ui.help = false; ui.crop = null; ui.cropFromFinding = null;
        gambar(true); document.querySelector(target)?.focus(); return;
      }
      if (e.key === "Tab") {
        const nodes = [...dialog.querySelectorAll('button, a[href], input, textarea, select')].filter((x) => !x.disabled);
        if (nodes.length) {
          const first = nodes[0], last = nodes[nodes.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
      return;
    }
    if (ui.menuBuka) {
      if (e.key === "Escape") { e.preventDefault(); ui.menuBuka = false; gambar(true); document.querySelector('.tombol-menu')?.focus(); return; }
      if (e.key === "Tab") {
        const nodes = [...document.querySelectorAll('#sisi a[href], #sisi button:not([disabled])')];
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      return;
    }
  });
  window.addEventListener("hashchange", () => { ui.pilihLain = false; ui.tindakanLain = null; ui.catatan = null; ui.galat = ""; if (ui.fokusCase !== rute().id) ui.fokus = null; ui.menuBuka = false; ui.pendingDecision = null; ui.bulk = false; ui.help = false; ui.crop = null; ui.cropFromFinding = null; gambar(false); });
  let wasMobile = window.matchMedia("(max-width: 960px)").matches;
  window.addEventListener("resize", () => { const mobile = window.matchMedia("(max-width: 960px)").matches; if (mobile !== wasMobile) { wasMobile = mobile; ui.menuBuka = false; gambar(true); } });

  gambar(false);
})();
