/* PRAMANA — konsol telaah klaim JKN */

(function () {
  "use strict";

  const D = window.DATA, DOC = window.DOCS;

  /* ---------------- ikon ---------------- */
  const I = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + d + "</svg>";
  const IK = {
    pandu: I('<path d="M12 5.5C10.4 4.2 8.4 3.5 6 3.5H4v15h2c2.4 0 4.4.7 6 2 1.6-1.3 3.6-2 6-2h2v-15h-2c-2.4 0-4.4.7-6 2z"/><path d="M12 5.5v13"/>'),
    antrean: I('<path d="M4 6h10M4 12h10M4 18h7"/><path d="M16.5 16.8l1.8 1.8 3.2-3.6"/>'),
    faskes: I('<path d="M4 21V6.5L12 3l8 3.5V21"/><path d="M9.5 21v-4.5h5V21"/><path d="M9.5 9h1.5M13 9h1.5M9.5 12.5h1.5M13 12.5h1.5"/>'),
    dosir: I('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h4"/>'),
    kiri: I('<path d="M14.5 5.5L8 12l6.5 6.5"/>'),
    kanan: I('<path d="M9.5 5.5L16 12l-6.5 6.5"/>'),
    unduh: I('<path d="M12 3.5v11"/><path d="M7.5 10L12 14.5 16.5 10"/><path d="M4.5 17v2.5h15V17"/>'),
    cari: I('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>'),
    urut: I('<path d="M8 4v16M8 4L5 7.5M8 4l3 3.5"/><path d="M16 20V4M16 20l-3-3.5M16 20l3-3.5"/>'),
    cek: I('<path d="M5 12.5l4.5 4.5L19 7"/>'),
    info: I('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="8" r=".7" fill="currentColor"/>'),
    silang: I('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
    mata: I('<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>'),
    ulang: I('<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/>'),
    panah: I('<path d="M4.5 12h15"/><path d="M14 6.5L19.5 12 14 17.5"/>')
  };

  /* ---------------- bantu ---------------- */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rp = (n) => "Rp " + n.toLocaleString("id-ID");
  const rpRingkas = (n) => n >= 1e9 ? "Rp " + (n / 1e9).toFixed(2).replace(".", ",") + " M" : "Rp " + Math.round(n / 1e6) + " jt";
  const dec = (n, d) => n.toFixed(d === undefined ? 3 : d).replace(".", ",");
  const kuadChip = (k, mini) => '<span class="kuad' + (mini ? " kuad--mini" : "") + " kuad--" + k.toLowerCase() + '"><i></i>' + D.KUADRAN[k].kode + (mini ? "" : " · " + D.KUADRAN[k].nama) + "</span>";

  const state = {
    rute: "panduan", param: null, tab: "lihat",
    filter: null, q: "", halaman: 1,
    urut: { kunci: "id", arah: 1 },
    mesinTerbuka: false, mesinJalan: false, lapisHidup: 6,
    keputusan: {}, jawaban: {},
    sigMode: "kasus", sorot: true, panduSig: "gandaan", konfirmasiAksi: null
  };
  try {
    state.keputusan = JSON.parse(sessionStorage.getItem("pramana.keputusan") || "{}");
    state.jawaban = JSON.parse(sessionStorage.getItem("pramana.jawaban") || "{}");
  } catch (e) { /* mode privat: keputusan cukup hidup di memori */ }
  const simpan = () => {
    try {
      sessionStorage.setItem("pramana.keputusan", JSON.stringify(state.keputusan));
      sessionStorage.setItem("pramana.jawaban", JSON.stringify(state.jawaban));
    } catch (e) { /* diabaikan */ }
  };

  const PER_HALAMAN = 25;

  /* =====================================================================
     Indikator — dihitung untuk setiap klaim, bukan diambil dari tabel.
     ===================================================================== */

  function indikator(k) {
    if (k._ind) return k._ind;
    const out = [];
    const n = DOC.jumlahParaf(k);
    const tambah = (kode, nilai, lulus, teks) => out.push({
      kode: kode, nama: D.INDIKATOR[kode].nama, lapisan: D.INDIKATOR[kode].lapisan,
      ambang: D.INDIKATOR[kode].ambang, nilai: nilai, lulus: lulus, teks: teks
    });

    if (k.mutuBerkas) {
      tambah("GMB", k.mutuBerkas, false,
        "Hasil pindai " + k.mutuBerkas + " sehingga lembar tidak dapat dibaca utuh. Berkas dikembalikan untuk dipindai ulang dan tidak dinilai pada sumbu mana pun.");
      return (k._ind = out);
    }

    /* Pratyaksa */
    if (n > 1) {
      const m = DOC.kemiripanRerata(k.sigSeed, k.sigJitter, n);
      const gandaan = m > 0.9;
      tambah("IKT", dec(m), !gandaan, gandaan
        ? "Kemiripan rata-rata antar tanda tangan pada lembar ini " + dec(m) + ", jauh di atas ambang variasi alami manusia. Lembar ini ditandatangani satu kali, bukan " + n + " kali."
        : "Kemiripan rata-rata " + dec(m) + ", di bawah ambang 0,90. Variasi goresan wajar untuk " + n + " penandatanganan terpisah.");
    }
    if (k.klon) {
      tambah("KLP", dec(k.klon.kemiripan * 100, 1) + "%", false,
        "Lembar milik " + k.nama + " identik " + dec(k.klon.kemiripan * 100, 1) + "% dengan lembar milik " + k.klon.nama + " (klaim " + k.klon.klaim + "). Yang berbeda hanya blok identitas.");
    }
    if (k.kuadran === "K2" && k.segmen !== "obat") {
      tambah("JTM", "0,96", false,
        "Seluruh kolom pada lembar ini diisi dengan goresan, tinta, dan kemiringan yang seragam — ditulis dalam satu sesi pengisian, bukan pada " + n + " tanggal berbeda.");
    }
    if (k.segmen === "hd" && k.monitoring && k.monitoring.length) {
      const td = k.monitoring.map((m) => parseInt(m.tdPre, 10));
      const rentang = Math.max.apply(null, td) - Math.min.apply(null, td);
      tambah("KKN", rentang + " mmHg", rentang >= 6, rentang < 6
        ? "Tekanan darah pra-dialisis tercatat nyaris tanpa variasi di seluruh sesi, berat badan identik hingga satu desimal, dan jam selesai selalu sama. Dialisis nyata selalu meninggalkan variasi."
        : "Tekanan darah, berat badan, dan durasi bervariasi wajar antar sesi. Pola angkanya konsisten dengan pengukuran sungguhan.");
    }
    if (k.segmen === "obat" && k.obat) {
      const diserahkan = k.obat.filter((o) => o.diserahkan).length;
      const selisih = k.obat.length - diserahkan;
      tambah("SPO", k.obat.length + " vs " + diserahkan, selisih === 0, selisih
        ? "Klaim menagihkan " + k.obat.length + " jenis obat. Bukti serah terima hanya memuat " + diserahkan + " baris yang terisi dan ditandatangani peserta. " + selisih + " baris terakhir kosong."
        : "Jumlah jenis obat pada klaim sama dengan yang tertera dan ditandatangani pada bukti serah terima.");
    }

    /* Anumana */
    const jejak = k.denyut.obat.length + k.denyut.kunjungan.length;
    tambah("UKT", jejak + " jejak", jejak >= 1, jejak
      ? "Peserta mengambil obat dan datang kontrol di " + jejak + " titik waktu yang sejalan dengan periode klaim. Ada bukti kuat bahwa perawatan berlangsung."
      : "Sepanjang 90 hari peserta tidak mengambil satu pun obat dan tidak punya kunjungan lain. Tidak ada bukti bahwa perawatan ini pernah berlangsung.");

    if (k.jarakSesi && k.jarakSesi.length > 1) {
      const v = Math.max.apply(null, k.jarakSesi) - Math.min.apply(null, k.jarakSesi);
      tambah("DRP", v + " hari", v >= 1, v < 1
        ? "Jarak antar sesi persis sama di seluruh episode, termasuk melewati akhir pekan dan hari libur. Perawatan nyata selalu bergeser."
        : "Jarak antar sesi bergeser " + v + " hari dan jam layanan berubah-ubah. Ritme ini konsisten dengan jadwal yang benar-benar dijalani.");
    }
    if (k.obat) {
      const mpr = k.obat.map((o) => o.mpr);
      const skew = (Math.max.apply(null, mpr) - Math.min.apply(null, mpr)) / 200;
      tambah("IKAO", dec(skew, 2), skew <= 0.4, skew > 0.4
        ? "Rasio ketersediaan antar obat sangat timpang: " + Math.max.apply(null, mpr) + "% pada satu obat, " + Math.min.apply(null, mpr) + "% pada obat lain. Sebarannya menunjukkan sebagian obat memang tidak pernah sampai."
        : "Rasio ketersediaan seluruh obat dalam resep berdekatan. Tidak ada obat yang tertinggal jauh maupun diambil terlalu cepat.");
    }
    if (k.bebanPelaksana) {
      tambah("BKF", k.bebanPelaksana + " sesi/hari", k.bebanPelaksana <= 24, k.bebanPelaksana > 24
        ? "Pelaksana " + k.pelaksana + " tercatat menangani " + k.bebanPelaksana + " sesi dalam satu hari kerja — melampaui batas fisik yang mungkin untuk satu orang."
        : "Beban " + k.pelaksana + " sebesar " + k.bebanPelaksana + " sesi per hari masih di dalam batas kapasitas.");
    }

    /* Sabda */
    if (k.konfirmasi) {
      const jwb = state.jawaban[k.id] || k.konfirmasi.jawaban;
      tambah("SBD", jwb ? jwb : "Menunggu", jwb !== "Tidak", jwb === "Tidak"
        ? "Peserta menyatakan tidak menerima layanan yang ditagihkan atas namanya."
        : jwb === "Ya"
          ? "Peserta membenarkan menerima layanan yang ditagihkan."
          : "Konfirmasi sudah terkirim dan menunggu jawaban peserta.");
    }
    return (k._ind = out);
  }
  const terpicu = (k) => indikator(k).filter((i) => !i.lulus);
  const perLapisan = (k, lap) => indikator(k).filter((i) => i.lapisan === lap);

  /* =====================================================================
     Kerangka
     ===================================================================== */

  function rail() {
    const r = D.rekap();
    const nav = [
      ["panduan", "#/panduan", "Panduan demo", IK.pandu, ""],
      ["antrean", "#/antrean", "Antrean telaah", IK.antrean, r.total.toLocaleString("id-ID")],
      ["faskes", "#/faskes", "Indeks integritas", IK.faskes, String(D.INTEGRITAS.length)],
      ["dosir", "#/dosir", "Berkas temuan", IK.dosir, String(r.K3 + r.K4)]
    ];
    return '<nav class="rail" aria-label="Navigasi utama">' +
      '<div class="rail-merek"><b>PRAMANA</b><span>Pembuktian penyerahan layanan &amp; obat</span></div>' +
      '<div class="rail-nav">' + nav.map((n, i) =>
        (i === 1 ? '<div class="rail-pisah"></div>' : "") +
        '<a href="' + n[1] + '"' + (state.rute === n[0] ? ' aria-current="page"' : "") + ">" + n[3] + esc(n[2]) +
        (n[4] ? '<span class="hitung num">' + n[4] + "</span>" : "") + "</a>").join("") + "</div>" +
      '<div class="rail-kaki"><div class="rail-akun"><i>RS</i><div><b>R. Santoso</b><span>Verifikator · KC Jakpus</span></div></div></div></nav>';
  }

  const bar = (jejak) => '<header class="bar"><div class="bar-jejak">' +
    jejak.map((t, i) => (i ? IK.kanan : "") + (i === jejak.length - 1 ? "<b>" + esc(t) + "</b>" : esc(t))).join("") +
    '</div><div class="bar-kanan"><span class="tanda-sintetis">' + IK.info + "Data sintetis · prototipe</span></div></header>";

  /* =====================================================================
     Panduan
     ===================================================================== */

  function deretTTD(seed, jitter, n, kecil) {
    let s = "";
    for (let i = 1; i <= n; i++) {
      const m = i === 1 ? null : DOC.kemiripan(seed, jitter, 1, i);
      s += '<div class="sig-kotak ' + (jitter ? "sig-kotak--wajar" : "sig-kotak--tinggi") + '"' + (kecil ? ' style="width:108px"' : "") + ">" +
        '<div class="sig-gambar"' + (kecil ? ' style="height:46px"' : "") + ">" + DOC.tandaTangan(seed, jitter, i) + "</div>" +
        '<div class="sig-kaki"><span>' + i + "</span><b>" + (m === null ? "acuan" : dec(m)) + "</b></div></div>";
    }
    return s;
  }

  function lamanPanduan() {
    const r = D.rekap();
    const gandaan = state.panduSig === "gandaan";
    const seed = gandaan ? 8812 : 4417;
    const jit = gandaan ? 0 : 0.16;
    const rerata = DOC.kemiripanRerata(seed, jit, 6);
    const contoh = D.PETA["RJ-2608-00417"];

    const langkah = [
      ["Mulai dari antrean", "1.184 klaim rawat jalan berulang dari 5 fasilitas kesehatan, sudah selesai dianalisis. Tekan <b>Putar ulang proses</b> untuk melihat enam lapisan mesin berjalan dengan angka nyata.", "#/antrean", "Buka antrean"],
      ["Baca matriksnya", "Dua sumbu bukti disilangkan menjadi empat rute berbeda. Klik satu kuadran untuk menyaring tabel. Kuadran K1 berisi klaim yang justru <b>dipercepat</b> pembayarannya.", "#/antrean", "Lihat matriks"],
      ["Buka satu klaim", "Setiap klaim di antrean punya bukti lengkap — lembar sesi, riwayat obat, linimasa. Mulai dari kasus K4 ini: delapan sesi fisioterapi yang tidak pernah terjadi.", "#/klaim/RJ-2608-00417/lihat", "Buka kasus K4"],
      ["Telusuri tiga lapisan bukti", "Tab <b>Bukti Lihat</b> memeriksa keaslian berkas, <b>Bukti Jejak</b> memeriksa apakah perawatan meninggalkan jejak, <b>Bukti Saksi</b> menanyakan langsung ke peserta.", "#/klaim/RJ-2608-00417/jejak", "Lihat bukti jejak"],
      ["Ambil keputusan", "Empat pilihan dengan konsekuensi berbeda. Setelah disetujui, berita acara terbit otomatis lengkap dengan lampiran bukti dan dapat diunduh sebagai PDF.", "#/dosir/RJ-2608-00417", "Lihat berita acara"],
      ["Cek pola sistemiknya", "Modus seperti ini jarang berdiri sendiri. Indeks integritas menelusuri dari rumah sakit ke unit ke nama pelaksana.", "#/faskes", "Buka indeks integritas"]
    ];

    return bar(["Panduan demo"]) +
      '<div class="pandu-atas"><div class="bungkus">' +
      "<h1>Membuktikan layanan dan obat benar-benar sampai ke pasien</h1>" +
      '<p class="tesis">BPJS Kesehatan memeriksa apakah berkas klaim lengkap, bukan apakah layanannya diberikan. PRAMANA membaca citra berkasnya, menjejak alur obatnya, lalu bertanya ke pesertanya — dan menyilangkan ketiganya jadi satu keputusan.</p>' +
      '<div class="pandu-cta"><a class="btn btn--primer btn--besar" href="#/antrean">Mulai demo dari antrean' + IK.panah + "</a>" +
      '<a class="btn btn--besar" href="#/klaim/RJ-2608-00417/lihat">Langsung ke kasus contoh</a></div>' +
      '<div class="pandu-angka">' +
      "<div><b>1.184</b><span>klaim dianalisis, 100% populasi</span></div>" +
      "<div><b>" + r.K4 + "</b><span>dugaan phantom / cloning</span></div>" +
      "<div><b>" + rpRingkas(r.nilai.K1) + "</b><span>klaim bersih yang dipercepat</span></div>" +
      "<div><b>4,2 dtk</b><span>enam lapisan, sekali jalan</span></div>" +
      "</div></div></div>" +

      '<section class="pandu-bagian"><div class="bungkus muncul">' +
      "<h2>Masalahnya bisa dilihat dalam satu detik</h2>" +
      "<p>Ini enam kolom tanda tangan dari satu lembar bukti pelayanan. Tanda tangan manusia tidak pernah berulang identik — jadi kalau keenamnya sama persis, lembar itu ditandatangani satu kali, bukan enam kali. Tekan tombolnya dan bandingkan sendiri.</p>" +
      '<div class="chrome"><div class="chrome-bar"><span class="chrome-titik"><i></i><i></i><i></i></span>' +
      '<span class="chrome-judul">Lembar bukti pelayanan · kolom tanda tangan pasien</span>' +
      '<div class="kanan"><div class="kelompok-tombol" role="group" aria-label="Pilih jenis berkas">' +
      '<button data-aksi="pandu-sig" data-mode="gandaan" aria-pressed="' + gandaan + '">Berkas gandaan</button>' +
      '<button data-aksi="pandu-sig" data-mode="asli" aria-pressed="' + !gandaan + '">Berkas asli</button>' +
      "</div></div></div>" +
      '<div class="chrome-isi"><div class="sig-deret">' + deretTTD(seed, jit, 6) + "</div>" +
      '<div class="vonis"><span class="angka ' + (gandaan ? "angka--k4" : "angka--k1") + ' num">' + dec(rerata) + "</span>" +
      "<p>" + (gandaan
        ? "Kemiripan rata-rata <b>" + dec(rerata) + "</b> — di atas ambang variasi alami manusia (0,90). Mesin menandai lembar ini sebagai hasil gandaan."
        : "Kemiripan rata-rata <b>" + dec(rerata) + "</b> — di bawah ambang 0,90. Goresan bervariasi wajar. Inilah bentuk berkas yang sah.") +
      "</p></div>" +
      '<p class="catatan" style="margin-top:12px">Tanda tangan ini digambar ulang oleh peramban dari benih acak, dan skor di atas benar-benar dihitung dari selisih titik pada kurvanya. Tidak ada angka yang ditulis tangan di berkas data.</p>' +
      "</div></div></div></section>" +

      '<section class="pandu-bagian"><div class="bungkus muncul">' +
      "<h2>Tiga jenis bukti, satu pertanyaan</h2>" +
      "<p>Kerangkanya meminjam Tri Pramana — tiga cara sah memperoleh kebenaran. Bukan hiasan: ketiganya memetakan persis bukti yang dibutuhkan untuk membuktikan sebuah penyerahan layanan.</p>" +
      '<div class="tiga-lapis">' +
      '<article class="lapis-kartu"><div class="lapis-kartu-atas"><h3>Bukti Lihat</h3><span class="asli">Pratyaksa — dari pengamatan langsung</span>' +
      "<p>Membaca citra berkas klaim: keragaman tanda tangan, kloning lembar antar pasien, nilai klinis yang mustahil pada lembar monitoring.</p></div>" +
      '<div class="lapis-kartu-visual"><div class="sig-deret">' + deretTTD(8812, 0, 3, true) + "</div></div></article>" +
      '<article class="lapis-kartu"><div class="lapis-kartu-atas"><h3>Bukti Jejak</h3><span class="asli">Anumana — dari penalaran atas tanda</span>' +
      "<p>Seperti menyimpulkan api dari asap yang terlihat dari jauh: perawatan nyata selalu meninggalkan jejak obat, kunjungan lain, dan ritme yang masuk akal.</p></div>" +
      '<div class="lapis-kartu-visual">' + denyutSVG(contoh.denyut, true) + "</div></article>" +
      '<article class="lapis-kartu"><div class="lapis-kartu-atas"><h3>Bukti Saksi</h3><span class="asli">Sabda — dari kesaksian yang tepercaya</span>' +
      "<p>Pada modus phantom billing, orang yang paling tahu kebenarannya justru tidak pernah ditanya. Satu pertanyaan netral lewat Mobile JKN.</p></div>" +
      '<div class="lapis-kartu-visual"><div class="gelembung" style="font-size:.6875rem">Apakah Anda menjalani 8 sesi fisioterapi di RS Melati Sehat pada Agustus 2026?</div>' +
      '<div class="gelembung gelembung--saya" style="margin-top:8px;font-size:.6875rem">Tidak</div></div></article>' +
      "</div></div></section>" +

      '<section class="pandu-bagian"><div class="bungkus muncul">' +
      "<h2>Jalannya demo dalam enam langkah</h2>" +
      "<p>Ikuti berurutan untuk melihat alur kerja verifikator dari antrean sampai berita acara. Seluruh data di dalamnya sintetis.</p>" +
      '<div class="langkah">' + langkah.map((l, i) =>
        '<div class="langkah-baris"><div class="langkah-no num">' + (i + 1) + "</div>" +
        "<div><h4>" + esc(l[0]) + "</h4><p>" + l[1] + "</p></div>" +
        '<a class="btn btn--kecil" href="' + l[2] + '">' + esc(l[3]) + IK.panah + "</a></div>").join("") +
      "</div>" +
      '<p class="catatan" style="margin-top:18px;max-width:80ch">Kategori lomba: Efisiensi Risiko pada Fasilitas Kesehatan. Modus yang disasar: No. 5 Cloning, No. 6 Phantom billing, No. 14 Menagihkan tindakan yang tidak dilakukan, No. 17 Klaim fiktif obat, No. 18 Pengurangan jumlah obat, No. 20 Manipulasi hasil pemeriksaan.</p>' +
      "</div></section>";
  }

  /* =====================================================================
     Antrean
     ===================================================================== */

  function mesinPanel() {
    const hidup = state.mesinJalan ? state.lapisHidup : 6;
    return '<section class="mesin"><div class="mesin-ringkas"><span class="titik"></span>' +
      '<span class="teks">Dianalisis <b>' + esc(D.dianalisis) + "</b> · 6 lapisan selesai dalam <b>" + esc(D.durasi) + "</b> · <b>100%</b> populasi, bukan sampel</span>" +
      '<span class="kanan"><button class="btn btn--kecil" data-aksi="putar-mesin"' + (state.mesinJalan ? " disabled" : "") + ">" + IK.ulang + "Putar ulang proses</button>" +
      '<button class="btn btn--kecil btn--sunyi" data-aksi="alih-mesin" aria-expanded="' + state.mesinTerbuka + '">' + (state.mesinTerbuka ? "Sembunyikan" : "Lihat 6 lapisan") + "</button></span></div>" +
      (state.mesinTerbuka ? '<div class="mesin-lapis">' + D.LAPISAN.map((l, i) =>
        '<div class="lapis' + (i < hidup ? " hidup" : "") + '"><span class="lapis-kode">' + l.kode + "</span>" +
        '<span><span class="lapis-nama">' + esc(l.nama) + '</span><span class="lapis-detail">' + esc(l.detail) + "</span></span>" +
        '<span class="lapis-hasil">' + (i < hidup ? esc(l.hasil) : "menunggu") + "</span></div>").join("") + "</div>" : "") +
      "</section>";
  }

  function matriks() {
    const r = D.rekap();
    const sel = (k) => '<button class="sel sel--' + k.toLowerCase() + '" data-aksi="filter" data-kuadran="' + k + '" aria-pressed="' + (state.filter === k) + '">' +
      '<span class="sel-atas"><span class="sel-angka">' + r[k].toLocaleString("id-ID") + '</span><span class="tag">' + k + "</span></span>" +
      '<span class="sel-nama">' + esc(D.KUADRAN[k].nama) + '</span><span class="sel-rute">' + esc(D.KUADRAN[k].rute) + "</span></button>";
    return '<div class="matriks-bungkus"><div class="matriks">' +
      '<div class="matriks-sudut"></div><div class="matriks-kolom">Bukti visual sahih</div><div class="matriks-kolom">Bukti visual cacat / gandaan</div>' +
      '<div class="matriks-baris">Jejak konsisten</div>' + sel("K1") + sel("K2") +
      '<div class="matriks-baris">Jejak janggal / kosong</div>' + sel("K3") + sel("K4") +
      "</div>" +
      '<aside class="sisi-ringkas"><h3>Keluar dari antrean telaah</h3>' +
      '<div class="sisi-angka num">' + rpRingkas(r.nilai.K1) + "</div>" +
      "<p>" + r.K1 + " klaim lolos dua sumbu bukti dan dipercepat menuju pembayaran. Verifikator tidak perlu membukanya.</p>" +
      '<div class="sisi-baris"><span>Perlu ditelaah manusia</span><b class="num">' + (r.K2 + r.K3 + r.K4) + " klaim</b></div>" +
      '<div class="sisi-baris"><span>Nilai tertahan sementara</span><b class="num">' + rpRingkas(r.nilai.K3 + r.nilai.K4) + "</b></div>" +
      '<div class="sisi-baris"><span>Pindai ulang</span><b class="num">' + r.TLA + " berkas</b></div></aside></div>";
  }

  function saring() {
    let baris = D.KLAIM.slice();
    if (state.filter) baris = baris.filter((k) => k.kuadran === state.filter);
    if (state.q.trim()) {
      const q = state.q.trim().toLowerCase();
      baris = baris.filter((k) => (k.id + " " + k.nama + " " + k.faskes + " " + k.diagnosa + " " + k.segmenLabel).toLowerCase().includes(q));
    }
    const u = state.urut, urutKuad = { K4: 0, K3: 1, K2: 2, TLA: 3, K1: 4 };
    baris.sort((a, b) => {
      let x, y;
      if (u.kunci === "nilai") { x = a.nilai; y = b.nilai; }
      else if (u.kunci === "kuadran") { x = urutKuad[a.kuadran]; y = urutKuad[b.kuadran]; }
      else if (u.kunci === "nama") { x = a.nama; y = b.nama; }
      else { x = a.id; y = b.id; }
      return (x < y ? -1 : x > y ? 1 : 0) * u.arah;
    });
    return baris;
  }

  function tabelAntrean() {
    const semua = saring();
    const maks = Math.max(1, Math.ceil(semua.length / PER_HALAMAN));
    if (state.halaman > maks) state.halaman = maks;
    const mulai = (state.halaman - 1) * PER_HALAMAN;
    const baris = semua.slice(mulai, mulai + PER_HALAMAN);

    if (!semua.length) {
      return '<div class="tabel-bungkus"><div class="kosong"><h3>Tidak ada klaim yang cocok</h3>' +
        "<p>Saringan yang aktif tidak menemukan klaim" + (state.q ? ' untuk kata kunci "' + esc(state.q) + '"' : "") + ".</p>" +
        '<button class="btn" data-aksi="reset">Bersihkan saringan</button></div></div>';
    }

    const kepala = (kunci, label, kanan) => {
      const aktif = state.urut.kunci === kunci;
      return "<th" + (kanan ? ' class="kanan"' : "") + (aktif ? ' aria-sort="' + (state.urut.arah > 0 ? "ascending" : "descending") + '"' : "") +
        '><button data-aksi="urut" data-kunci="' + kunci + '">' + esc(label) + IK.urut + "</button></th>";
    };

    return '<div class="tabel-bungkus"><table class="tabel"><thead><tr>' +
      kepala("id", "No. Klaim") + kepala("nama", "Peserta") + "<th>Fasilitas kesehatan</th><th>Layanan</th>" +
      '<th class="kanan">Jumlah</th>' + kepala("nilai", "Nilai", true) + kepala("kuadran", "Kuadran") + "<th>Pemicu</th></tr></thead><tbody>" +
      baris.map((k) => {
        const p = terpicu(k);
        return "<tr" + (k.sorot ? ' class="baris-sorot"' : "") + ">" +
          '<td><a class="tautan-klaim" href="#/klaim/' + k.id + '/lihat">' + k.id + "</a>" + (k.sorot ? ' <span class="tag tag--aktif">contoh</span>' : "") + "</td>" +
          '<td class="nama"><b>' + esc(k.nama) + "</b><span>" + esc(k.diagnosa) + " · " + k.icd + "</span></td>" +
          "<td>" + esc(k.faskes) + "</td>" +
          "<td>" + esc(k.segmenLabel) + '<span class="tag" style="margin-left:6px">' + k.inacbg + "</span></td>" +
          '<td class="kanan num">' + k.jumlah + " " + esc(k.satuanLabel) + "</td>" +
          '<td class="kanan num">' + rp(k.nilai) + "</td>" +
          "<td>" + kuadChip(k.kuadran) + (state.keputusan[k.id] ? ' <span class="tag">diputus</span>' : "") + "</td>" +
          '<td><div class="tabel-pemicu">' + (p.length ? p.map((x) => '<span class="tag">' + x.kode + "</span>").join("") : '<span class="catatan">—</span>') + "</div></td></tr>";
      }).join("") + "</tbody></table></div>" +
      '<div class="tabel-kaki"><span>Menampilkan <b class="num">' + (mulai + 1) + "–" + (mulai + baris.length) + '</b> dari <b class="num">' + semua.length.toLocaleString("id-ID") + "</b> klaim" +
      (state.filter ? " · saringan " + state.filter : "") + "</span>" +
      '<span class="kanan"><button class="btn btn--kecil" data-aksi="halaman" data-ke="' + (state.halaman - 1) + '"' + (state.halaman <= 1 ? " disabled" : "") + ">" + IK.kiri + "Sebelumnya</button>" +
      '<span class="num">Halaman ' + state.halaman + " / " + maks + "</span>" +
      '<button class="btn btn--kecil" data-aksi="halaman" data-ke="' + (state.halaman + 1) + '"' + (state.halaman >= maks ? " disabled" : "") + ">Berikutnya" + IK.kanan + "</button></span></div>";
  }

  function lamanAntrean() {
    return bar([D.cabang, "Antrean telaah " + D.periode]) +
      '<div class="laman"><div class="judul-laman"><h1>Antrean telaah klaim</h1></div>' +
      '<p class="sub-laman">' + D.KLAIM.length.toLocaleString("id-ID") + " klaim rawat jalan berulang dari 5 fasilitas kesehatan · periode " + esc(D.periode) + " · nilai total " + rpRingkas(D.rekap().totalNilai) + "</p>" +
      mesinPanel() + matriks() +
      '<div class="judul-laman" style="margin:28px 0 14px"><h2 style="font-size:1.0625rem">Daftar klaim</h2>' +
      '<div style="margin-left:auto;display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
      '<label class="cari">' + IK.cari + '<input type="search" placeholder="Cari nomor klaim, peserta, faskes…" value="' + esc(state.q) + '" data-aksi="cari" aria-label="Cari klaim"></label>' +
      (state.filter || state.q ? '<button class="btn btn--kecil" data-aksi="reset">' + IK.silang + "Bersihkan</button>" : "") +
      "</div></div>" + tabelAntrean() + "</div>";
  }

  /* =====================================================================
     Bagan
     ===================================================================== */

  function denyutSVG(d, mini) {
    const W = mini ? 320 : 900, padL = mini ? 78 : 132, padR = mini ? 8 : 20;
    const padT = mini ? 6 : 26, laneH = mini ? 22 : 38;
    const H = padT + laneH * 3 + (mini ? 6 : 34);
    const x = (h) => padL + ((90 - h) / 90) * (W - padL - padR);
    const lajur = [
      { nama: "Sesi diklaim", data: d.sesi, warna: "#1f6c9f" },
      { nama: "Pengambilan obat", data: d.obat, warna: "#2c6e33" },
      { nama: "Kunjungan lain", data: d.kunjungan, warna: "#8b8a85" }
    ];
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Linimasa 90 hari: sesi diklaim, pengambilan obat, dan kunjungan lain">';
    if (!mini) {
      for (let h = 90; h >= 0; h -= 15) {
        s += '<line x1="' + x(h) + '" y1="' + padT + '" x2="' + x(h) + '" y2="' + (padT + laneH * 3) + '" stroke="#f0efec" stroke-width="1"/>';
        s += '<text x="' + x(h) + '" y="' + (padT + laneH * 3 + 19) + '" font-size="11" fill="#8b8a85" text-anchor="' + (h === 0 ? "end" : h === 90 ? "start" : "middle") + '" font-family="IBM Plex Mono, monospace">' + (h === 0 ? "hari ini" : "H-" + h) + "</text>";
      }
    }
    lajur.forEach((l, i) => {
      const y = padT + i * laneH;
      s += '<text x="' + (padL - (mini ? 7 : 12)) + '" y="' + (y + laneH / 2 + (mini ? 3 : 4)) + '" font-size="' + (mini ? 9 : 12) + '" fill="#55534e" text-anchor="end" font-family="Plus Jakarta Sans, sans-serif">' + (mini ? l.nama.split(" ")[0] : l.nama) + "</text>";
      s += '<line x1="' + padL + '" y1="' + (y + laneH / 2) + '" x2="' + (W - padR) + '" y2="' + (y + laneH / 2) + '" stroke="#eaeaea" stroke-width="1"' + (l.data.length ? "" : ' stroke-dasharray="3 4"') + "/>";
      if (!l.data.length) s += '<text x="' + (padL + (mini ? 6 : 14)) + '" y="' + (y + laneH / 2 - (mini ? 5 : 8)) + '" font-size="' + (mini ? 8.5 : 11.5) + '" fill="#9f2f2d" font-family="Plus Jakarta Sans, sans-serif">' + (mini ? "tidak ada jejak" : "tidak ada jejak sama sekali") + "</text>";
      const w = mini ? 5 : 9, h2 = mini ? 11 : 18;
      l.data.forEach((hari) => {
        s += '<rect x="' + (x(hari) - w / 2) + '" y="' + (y + laneH / 2 - h2 / 2) + '" width="' + w + '" height="' + h2 + '" rx="' + (mini ? 2 : 3) + '" fill="' + l.warna + '">' +
          (mini ? "" : "<title>" + (hari === 0 ? "hari ini" : hari + " hari lalu") + " · " + l.nama + "</title>") + "</rect>";
      });
    });
    return s + "</svg>";
  }

  function trenSVG(nilai) {
    const W = 90, H = 28, min = 30, maks = 95;
    const x = (i) => (i / (nilai.length - 1)) * (W - 4) + 2;
    const y = (v) => H - 3 - ((v - min) / (maks - min)) * (H - 9);
    const garis = nilai.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
    const akhir = nilai[nilai.length - 1], naik = akhir >= nilai[0];
    const w = naik ? "#2c6e33" : "#9f2f2d";
    return '<svg class="tren" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Tren skor enam bulan, terakhir ' + akhir + '">' +
      '<path d="' + garis + " L " + x(nilai.length - 1).toFixed(1) + " " + H + " L " + x(0).toFixed(1) + " " + H + ' Z" fill="' + w + '" opacity="0.09"/>' +
      '<path d="' + garis + '" fill="none" stroke="' + w + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="' + x(nilai.length - 1).toFixed(1) + '" cy="' + y(akhir).toFixed(1) + '" r="3" fill="' + w + '" stroke="#fff" stroke-width="1.5"/></svg>';
  }

  function daftarIndikator(list) {
    if (!list.length) return "";
    return '<div class="indikator-daftar">' + list.map((t) =>
      '<div class="indikator-baris"><div class="indikator-kode">' + t.kode + "<small>" + esc(t.nama) + "</small></div>" +
      '<div class="indikator-nilai" style="color:' + (t.lulus ? "var(--k1)" : "var(--k4)") + '">' + esc(t.nilai) + "<small>ambang " + esc(t.ambang) + "</small></div>" +
      '<div class="indikator-teks">' + esc(t.teks) + "</div></div>").join("") + "</div>";
  }

  /* =====================================================================
     Kartu bukti — per tab
     ===================================================================== */

  function tabLihat(k) {
    if (k.mutuBerkas) {
      return '<div class="blok"><h3>Berkas tidak layak audit</h3>' +
        '<p class="catatan">Gerbang mutu menolak berkas ini sebelum dinilai. Mutu pindai yang rendah bukan dasar untuk menuduh — berkas dikembalikan untuk dipindai ulang.</p>' +
        '<div class="kertas-panggung"><div class="kertas-kolom" style="max-width:660px">' + DOC.lembar(k, {}) + "</div></div>" +
        daftarIndikator(perLapisan(k, "lihat")) + "</div>";
    }

    const n = DOC.jumlahParaf(k);
    const mode = state.sigMode;
    const pakaiPembanding = mode === "pembanding";
    const seed = pakaiPembanding ? k.sigSeed + 4242 : k.sigSeed;
    const jit = pakaiPembanding ? 0.16 : k.sigJitter;
    const rerata = DOC.kemiripanRerata(seed, jit, n);
    const gandaan = rerata > 0.9;

    let deret = "";
    for (let i = 1; i <= n; i++) {
      const m = i === 1 ? null : DOC.kemiripan(seed, jit, 1, i);
      deret += '<div class="sig-kotak ' + (gandaan ? "sig-kotak--tinggi" : "sig-kotak--wajar") + '">' +
        '<div class="sig-gambar">' + DOC.tandaTangan(seed, jit, i) + "</div>" +
        '<div class="sig-kaki"><span>' + (k.segmen === "obat" ? "obat " : "sesi ") + i + "</span><b>" + (m === null ? "acuan" : dec(m)) + "</b></div></div>";
    }

    let html = '<div class="blok"><h3>Keragaman tanda tangan</h3>' +
      '<p class="catatan">Setiap goresan diubah menjadi vektor, lalu jaraknya diukur terhadap tanda tangan pertama pada lembar yang sama.</p>' +
      '<div class="sig-kendali"><div class="kelompok-tombol" role="group" aria-label="Pilih berkas yang ditampilkan">' +
      '<button data-aksi="sig" data-mode="kasus" aria-pressed="' + !pakaiPembanding + '">Kasus ini</button>' +
      '<button data-aksi="sig" data-mode="pembanding" aria-pressed="' + pakaiPembanding + '">Pembanding: berkas wajar</button></div>' +
      '<span class="catatan">Arahkan kursor ke satu kotak untuk memperbesar goresannya.</span></div>' +
      '<div class="sig-deret">' + deret + "</div>" +
      '<div class="vonis"><span class="angka ' + (gandaan ? "angka--k4" : "angka--k1") + ' num">' + dec(rerata) + "</span><p>" +
      (gandaan
        ? "Kemiripan rata-rata <b>" + dec(rerata) + "</b>, jauh di atas ambang variasi alami manusia (0,90). Lembar ini ditandatangani satu kali, bukan " + n + " kali."
        : "Kemiripan rata-rata <b>" + dec(rerata) + "</b> — di bawah ambang 0,90. Variasi goresan wajar untuk " + n + " penandatanganan terpisah.") +
      "</p></div></div>";

    html += '<div class="blok"><h3>Berkas yang dibaca mesin</h3>' +
      '<div class="sig-kendali"><button class="btn btn--kecil" data-aksi="sorot" aria-pressed="' + state.sorot + '">' + IK.mata + (state.sorot ? "Sembunyikan sorotan" : "Sorot temuan") + "</button>" +
      '<span class="catatan">Hasil pindai berkas klaim sebagaimana diterima melalui Vedika.</span></div>' +
      '<div class="kertas-panggung' + (k.klon ? " kertas-panggung--pasangan" : "") + '">';
    if (k.klon) {
      const kembar = Object.assign({}, k, { nama: k.klon.nama, kartu: k.klon.kartu, sep: k.klon.sep });
      html += '<div class="kertas-kolom"><div class="kertas-label"><b>' + esc(k.nama) + "</b> · " + esc(k.id) + "</div>" + DOC.lembar(k, { sorot: state.sorot, diff: state.sorot }) + "</div>" +
        '<div class="kertas-kolom"><div class="kertas-label"><b>' + esc(k.klon.nama) + "</b> · " + esc(k.klon.klaim) + "</div>" + DOC.lembar(kembar, { sorot: state.sorot, diff: state.sorot, miring: "0.4deg" }) + "</div>";
    } else {
      html += '<div class="kertas-kolom" style="max-width:660px"><div class="kertas-label"><b>' + esc(k.nama) + "</b> · " + esc(k.id) + "</div>" + DOC.lembar(k, { sorot: state.sorot }) + "</div>";
    }
    html += "</div>";
    if (k.klon) {
      html += '<div class="vonis"><span class="angka angka--k4 num">' + dec(k.klon.kemiripan * 100, 1) + "%</span>" +
        "<p>Dua lembar milik pasien berbeda identik pada tata letak, isian tindakan, jam, dan seluruh tanda tangan. Yang berbeda hanya blok identitas — disorot kuning. Ini definisi harfiah modus <b>No. 5 Cloning</b>.</p></div>";
    }
    html += "</div>";

    html += '<div class="blok"><h3>Indikator lapisan ini</h3>' + daftarIndikator(perLapisan(k, "lihat")) + "</div>";
    return html;
  }

  function tabJejak(k) {
    let html = '<div class="blok"><h3>Peta denyut episode</h3>' +
      '<p class="catatan">Sembilan puluh hari terakhir. Perawatan yang nyata meninggalkan jejak di lebih dari satu lajur.</p>' +
      '<div class="denyut">' + denyutSVG(k.denyut) +
      '<div class="denyut-legenda"><span><i style="background:#1f6c9f"></i>Sesi diklaim</span>' +
      '<span><i style="background:#2c6e33"></i>Pengambilan obat</span>' +
      '<span><i style="background:#8b8a85"></i>Kunjungan lain</span></div></div></div>';

    if (k.obat) {
      const maks = 160;
      html += '<div class="blok"><h3>Ketimpangan antar-obat dalam satu resep</h3>' +
        '<p class="catatan">Rasio ketersediaan tiap obat selama enam bulan. Garis tegak menandai jadwal seharusnya (100%). Deteksi refill konvensional hanya melihat satu obat; yang menentukan di sini justru sebarannya.</p>' +
        '<div class="batang-daftar">' + k.obat.map((o) => {
          const w = Math.min(o.mpr, maks) / maks * 100;
          const warna = !o.diserahkan ? "#9f2f2d" : o.mpr > 110 ? "#956400" : o.mpr < 50 ? "#9a5528" : "#2c6e33";
          return '<div class="batang"><div class="batang-nama">' + esc(o.nama) +
            "<small>" + (o.diserahkan ? "ada pada bukti serah terima" : "tidak ada pada bukti serah terima") + "</small></div>" +
            '<div class="batang-jalur"><span class="batang-isi" style="width:' + w.toFixed(1) + "%;background:" + warna + '"></span>' +
            '<span class="batang-ambang" style="left:' + (100 / maks * 100).toFixed(1) + '%"></span></div>' +
            '<div class="batang-nilai" style="color:' + warna + '">' + o.mpr + "%</div></div>";
        }).join("") + "</div></div>";
    }

    html += '<div class="blok"><h3>Indikator lapisan ini</h3>' + daftarIndikator(perLapisan(k, "jejak")) + "</div>";

    if (k.dualitas) {
      html += '<div class="blok"><h3>Dua kemungkinan yang tidak boleh dicampur</h3>' +
        '<p class="catatan">Sistem tidak menyimpulkan sendiri mana yang benar. Yang membedakan keduanya adalah bukti serah terima di lapisan sebelumnya.</p>' +
        '<div class="dualitas"><div><span class="cap">Kemungkinan A · sisi peserta</span><h4>Pola konsumsi tidak merata</h4><p>' + esc(k.dualitas.a) + "</p></div>" +
        '<div><span class="cap">Kemungkinan B · sisi faskes</span><h4>Obat tidak diserahkan utuh</h4><p>' + esc(k.dualitas.b) + "</p></div></div></div>";
    }
    return html;
  }

  function tabSaksi(k) {
    if (!k.konfirmasi) {
      return '<div class="blok"><h3>Tidak ada konfirmasi yang dikirim</h3>' +
        '<p class="catatan" style="max-width:70ch">Konfirmasi mikro hanya dikirim untuk kasus yang sudah bersinyal pada dua lapisan sebelumnya. Klaim ini tidak memicu indikator apa pun, jadi peserta tidak perlu diganggu.</p>' +
        '<p class="catatan" style="margin-top:10px;max-width:70ch">Membatasi kiriman adalah bagian dari rancangan: setiap pertanyaan yang tidak perlu menurunkan kepercayaan peserta pada kanal ini, dan menurunkan nilai jawabannya sebagai alat bukti.</p></div>';
    }
    const jwb = state.jawaban[k.id] || k.konfirmasi.jawaban;
    let isi = '<div class="gelembung">' + esc(k.konfirmasi.pertanyaan) + "<small>" + esc(k.konfirmasi.kirim) + "</small></div>";
    if (jwb) isi += '<div class="gelembung gelembung--saya">' + esc(jwb) + "<small>" + esc(k.konfirmasi.jawab || "Baru saja") + "</small></div>";
    else isi += '<div class="ponsel-tombol"><button class="btn btn--kecil" data-aksi="jawab" data-nilai="Ya">Ya</button>' +
      '<button class="btn btn--kecil" data-aksi="jawab" data-nilai="Tidak">Tidak</button></div>';

    const status = jwb
      ? "Peserta menjawab <b>" + esc(jwb.toLowerCase()) + "</b>. Jawaban ini tersimpan sebagai lampiran bukti sekaligus label yang dipakai melatih ulang model."
      : "Konfirmasi sudah terkirim dan menunggu jawaban. Tekan salah satu tombol pada layar ponsel untuk mensimulasikan jawaban peserta.";

    return '<div class="blok"><h3>Konfirmasi mikro ke peserta</h3>' +
      '<p class="catatan" style="max-width:74ch">Pada modus phantom billing, orang yang paling tahu kebenarannya justru tidak pernah ditanya. Pesan dikirim dengan bahasa netral dan tidak pernah menyebut dugaan kecurangan pada faskes mana pun.</p>' +
      '<div class="sabda-tata"><div class="ponsel"><div class="ponsel-atas"><b>Mobile JKN</b><span>Konfirmasi layanan</span></div>' +
      '<div class="ponsel-isi">' + isi + "</div></div>" +
      "<div><p>" + status + "</p>" +
      '<dl class="rantai" style="margin-top:18px">' +
      "<div><dt>Kanal</dt><dd>Mobile JKN</dd></div>" +
      "<div><dt>Kuota kirim</dt><dd>1 per peserta per periode</dd></div>" +
      "<div><dt>Isi pesan</dt><dd>netral, tanpa tuduhan</dd></div></dl>" +
      '<p class="catatan" style="margin-top:16px;max-width:62ch">Jawaban peserta tidak pernah menjadi keputusan akhir dengan sendirinya. Ia menambah kekuatan bukti pada kuadran yang sudah terbentuk dari dua lapisan sebelumnya.</p>' +
      "</div></div></div>";
  }

  function tabDosir(k) {
    const put = state.keputusan[k.id];
    const bisaDosir = k.kuadran === "K3" || k.kuadran === "K4";
    return '<div class="blok"><h3>Rantai bukti</h3>' +
      '<p class="catatan">Setiap temuan membawa jejak asalnya. Tanpa ini, temuan mesin tidak bisa dipakai di meja audit.</p>' +
      '<dl class="rantai">' +
      "<div><dt>Hash berkas asli</dt><dd>sha256:" + esc(k.berkasHash) + "…</dd></div>" +
      "<div><dt>Versi model &amp; aturan</dt><dd>" + esc(D.versiModel) + "</dd></div>" +
      "<div><dt>Waktu pemrosesan</dt><dd>" + esc(D.dianalisis) + "</dd></div>" +
      "<div><dt>Operator</dt><dd>R. Santoso · KC Jakpus</dd></div>" +
      "<div><dt>Status tindak lanjut</dt><dd>" + (put ? esc(put.label) : "menunggu keputusan") + "</dd></div>" +
      "</dl></div>" +
      '<div class="blok"><h3>Berita acara temuan</h3>' +
      '<p class="catatan" style="max-width:74ch">' + (bisaDosir
        ? "Dokumen resmi dirakit otomatis dari temuan mesin: uraian temuan, lampiran potongan tanda tangan, rujukan modus Permenkes 16/2019, dan rantai bukti."
        : "Berita acara hanya terbit untuk kuadran K3 dan K4. Klaim ini tidak memerlukannya.") + "</p>" +
      (bisaDosir ? '<div class="sig-kendali"><a class="btn btn--primer" href="#/dosir/' + k.id + '">' + IK.dosir + "Buka berita acara</a>" +
        '<button class="btn" data-aksi="unduh-pdf" data-id="' + k.id + '">' + IK.unduh + "Unduh PDF</button></div>" : "") +
      "</div>";
  }

  const PUTUSAN = {
    eskalasi: { label: "Eskalasi disetujui", dosir: true, efek: "Berita acara terbit dan kasus diteruskan ke Tim Anti-Kecurangan JKN. Klaim ditunda sementara, tidak dibatalkan. Faskes tetap berhak memberi klarifikasi." },
    klarifikasi: { label: "Klarifikasi diminta", dosir: true, efek: "Pertanyaan spesifik dikirim ke fasilitas kesehatan beserta daftar lembar yang dipersoalkan. Jawaban masuk ke dosir yang sama." },
    audit: { label: "Diteruskan ke audit farmasi", dosir: true, efek: "Kasus masuk antrean audit penyerahan obat. Yang ditelusuri stok dan bukti serah terima di instalasi farmasi, bukan peserta." },
    perbaikan: { label: "Perbaikan berkas diminta", dosir: false, efek: "Fasilitas kesehatan diminta memperbaiki lembar bukti pelayanan, disertai catatan pembinaan ke unit terkait. Tanpa tuduhan kecurangan." },
    pindai: { label: "Pindai ulang diminta", dosir: false, efek: "Berkas dikembalikan untuk dipindai ulang. Klaim belum dinilai pada sumbu mana pun dan tidak masuk kuadran kecurangan." },
    naik: { label: "Dinaikkan ke K4", dosir: true, efek: "Kasus dipindahkan ke kuadran dugaan phantom dan masuk antrean Tim Anti-Kecurangan." },
    turun: { label: "Diturunkan ke K2", dosir: false, efek: "Diperlakukan sebagai cacat administrasi: permintaan perbaikan berkas, tanpa tuduhan kecurangan." },
    bayar: { label: "Diteruskan ke pembayaran", dosir: false, efek: "Klaim keluar dari antrean telaah dan masuk jalur cepat pembayaran." },
    tandai: { label: "Ditandai untuk telaah manual", dosir: false, efek: "Klaim ditahan dari jalur cepat untuk ditelaah manusia meski mesin tidak menemukan indikator." },
    tutup: { label: "Ditutup — wajar", dosir: false, efek: "Klaim diteruskan ke pembayaran. Keputusan ini menjadi label yang dipakai melatih ulang model." }
  };

  const PILIHAN = {
    K4: [["eskalasi", "Setujui eskalasi", "btn--bahaya"], ["klarifikasi", "Minta klarifikasi RS", ""], ["turun", "Turunkan ke K2", ""], ["tutup", "Tutup — wajar", ""]],
    K3: [["audit", "Teruskan ke audit farmasi", "btn--primer"], ["klarifikasi", "Minta klarifikasi RS", ""], ["tutup", "Tutup — wajar", ""]],
    K2: [["perbaikan", "Minta perbaikan berkas", "btn--primer"], ["naik", "Naikkan ke K4", ""], ["tutup", "Tutup — wajar", ""]],
    K1: [["bayar", "Teruskan ke pembayaran", "btn--primer"], ["tandai", "Tandai untuk telaah manual", ""]],
    TLA: [["pindai", "Minta pindai ulang", "btn--primer"], ["tutup", "Tutup — wajar", ""]]
  };

  function panelAksi(k) {
    const put = state.keputusan[k.id];
    if (put) {
      return '<div class="aksi-panel"><h3>Keputusan tercatat</h3>' +
        '<div class="aksi-hasil"><b>' + esc(put.label) + "</b><p>" + esc(put.efek) + "</p>" +
        '<p class="mono" style="margin-top:8px;font-size:.6875rem;color:var(--tinta-3)">' + esc(put.waktu) + " · R. Santoso</p></div>" +
        (put.dosir ? '<a class="btn btn--penuh" style="margin-top:10px" href="#/dosir/' + k.id + '">' + IK.dosir + "Buka berita acara</a>" : "") +
        '<button class="btn btn--sunyi btn--penuh btn--kecil" style="margin-top:7px" data-aksi="batal-putus">Batalkan keputusan</button></div>';
    }
    const pilihan = PILIHAN[k.kuadran] || PILIHAN.K4;
    let isi = '<div class="aksi-daftar">' + pilihan.map((p) =>
      '<button class="btn ' + p[2] + ' btn--penuh" data-aksi="pilih-aksi" data-key="' + p[0] + '">' + esc(p[1]) + "</button>").join("") + "</div>";
    const buka = state.konfirmasiAksi;
    if (buka && PUTUSAN[buka]) {
      const nama = (pilihan.find((p) => p[0] === buka) || [null, PUTUSAN[buka].label])[1];
      isi += '<div class="aksi-konfirmasi"><p><b>' + esc(nama) + ".</b> " + esc(PUTUSAN[buka].efek) + "</p>" +
        '<div class="baris"><button class="btn btn--primer btn--kecil" data-aksi="terap-aksi" data-key="' + buka + '">Konfirmasi</button>' +
        '<button class="btn btn--kecil" data-aksi="batal-aksi">Batal</button></div></div>';
    }
    return '<div class="aksi-panel"><h3>Keputusan verifikator</h3>' +
      '<p class="catatan">Sistem tidak menutup atau membatalkan klaim sendiri. Keputusan akhir selalu manusia, sesuai Permenkes 16/2019.</p>' + isi + "</div>";
  }

  function lamanKlaim(id, tab) {
    const k = D.PETA[id];
    if (!k) return bar(["Antrean telaah", "Tidak ditemukan"]) +
      '<div class="laman"><div class="kosong"><h3>Klaim tidak ditemukan</h3><p>Nomor klaim ' + esc(id) + ' tidak ada pada antrean periode ini.</p><a class="btn" href="#/antrean">Kembali ke antrean</a></div></div>';
    D.rakit(k);

    const daftar = saring();
    const idx = daftar.findIndex((x) => x.id === id);
    const prev = idx > 0 ? daftar[idx - 1].id : daftar[daftar.length - 1].id;
    const next = idx >= 0 && idx < daftar.length - 1 ? daftar[idx + 1].id : daftar[0].id;

    const tabs = [
      ["lihat", "Bukti Lihat", perLapisan(k, "lihat").filter((i) => !i.lulus).length],
      ["jejak", "Bukti Jejak", perLapisan(k, "jejak").filter((i) => !i.lulus).length],
      ["saksi", "Bukti Saksi", perLapisan(k, "saksi").filter((i) => !i.lulus).length],
      ["dosir", "Dosir & rantai bukti", 0]
    ];
    const isi = tab === "jejak" ? tabJejak(k) : tab === "saksi" ? tabSaksi(k) : tab === "dosir" ? tabDosir(k) : tabLihat(k);
    const picu = terpicu(k);

    return bar(["Antrean telaah", k.id]) +
      '<div class="bukti-atas"><div class="bukti-kepala"><div>' +
      '<span class="id">' + esc(k.id) + "</span><h1>" + esc(k.judul || k.nama) + "</h1>" +
      '<div class="meta">' + (k.judul ? esc(k.nama) + " · " : "") + k.usia + " th · " + esc(k.faskes) + " · " + esc(k.unit) + "</div></div>" +
      kuadChip(k.kuadran) +
      '<div class="nav"><a class="btn btn--kecil" href="#/klaim/' + prev + "/" + tab + '" aria-label="Klaim sebelumnya">' + IK.kiri + "</a>" +
      '<a class="btn btn--kecil" href="#/klaim/' + next + "/" + tab + '" aria-label="Klaim berikutnya">' + IK.kanan + "</a>" +
      '<a class="btn btn--kecil" href="#/antrean">Kembali ke antrean</a></div></div>' +
      '<div class="tab-bar" role="tablist">' + tabs.map((t) =>
        '<button class="tab" role="tab" aria-selected="' + (tab === t[0]) + '" data-aksi="tab" data-tab="' + t[0] + '">' + esc(t[1]) +
        (t[2] ? '<span class="hitung">' + t[2] + "</span>" : "") + "</button>").join("") + "</div></div>" +
      '<div class="bukti-tata"><aside class="bukti-sisi">' +
      '<div class="ringkas-kasus"><p>' + esc(k.ringkas || "Klaim ini dirakit dari data sintetis dengan bukti lengkap: lembar sesi, riwayat pengambilan obat, dan linimasa perawatan 90 hari.") + "</p><dl>" +
      "<div><dt>Layanan</dt><dd>" + esc(k.segmenLabel) + "</dd></div>" +
      "<div><dt>Ditagihkan</dt><dd>" + k.jumlah + " " + esc(k.satuanLabel) + "</dd></div>" +
      "<div><dt>Nilai klaim</dt><dd>" + rp(k.nilai) + "</dd></div>" +
      "<div><dt>INA-CBG</dt><dd>" + esc(k.inacbg) + "</dd></div>" +
      "<div><dt>Diagnosis</dt><dd>" + esc(k.diagnosa) + " (" + esc(k.icd) + ")</dd></div>" +
      "<div><dt>DPJP</dt><dd>" + esc(k.dpjp) + "</dd></div></dl></div>" +
      '<div class="pemicu-daftar"><h3>Indikator terpicu</h3>' +
      (picu.length ? picu.map((t) => '<button class="pemicu-item" data-aksi="tab" data-tab="' + t.lapisan + '">' +
        '<span class="pemicu-atas"><b>' + t.kode + '</b><span class="nilai" style="color:var(--k4)">' + esc(t.nilai) + "</span></span>" +
        '<span class="pemicu-nama">' + esc(t.nama) + "</span></button>").join("")
        : '<p class="pemicu-kosong">Tidak ada indikator yang terpicu. Bukti visual sahih dan jejak perawatannya utuh — klaim ini masuk jalur cepat.</p>') +
      "</div>" + panelAksi(k) + "</aside>" +
      '<div class="panel-tab" role="tabpanel">' + isi + "</div></div>";
  }

  /* =====================================================================
     Berita acara
     ===================================================================== */

  function lamanDosir(id) {
    if (!id || !D.PETA[id]) {
      const calon = D.KLAIM.filter((x) => x.sorot && (x.kuadran === "K3" || x.kuadran === "K4"));
      return bar(["Berkas temuan"]) + '<div class="laman"><div class="judul-laman"><h1>Berkas temuan</h1></div>' +
        '<p class="sub-laman">Berita acara terbit otomatis untuk kuadran K3 dan K4. Pilih salah satu kasus contoh, atau buka klaim mana pun dari antrean lalu masuk ke tab Dosir.</p>' +
        '<div class="panel" style="margin-top:20px"><div class="panel-isi"><div style="display:flex;gap:9px;flex-wrap:wrap">' +
        calon.map((c) => '<a class="btn" href="#/dosir/' + c.id + '">' + IK.dosir + esc(c.id) + " · " + esc(c.nama) + "</a>").join("") +
        "</div></div></div></div>";
    }
    const k = D.PETA[id];
    D.rakit(k);
    const put = state.keputusan[id];
    const n = Math.min(DOC.jumlahParaf(k), 8);
    const rerata = DOC.kemiripanRerata(k.sigSeed, k.sigJitter, Math.max(n, 2));
    let deret = "";
    for (let i = 1; i <= n; i++) {
      deret += '<div class="sig-kotak"><div class="sig-gambar">' + DOC.tandaTangan(k.sigSeed, k.sigJitter, i) + "</div>" +
        '<div class="sig-kaki"><span>' + i + "</span><b>" + (i === 1 ? "acuan" : dec(DOC.kemiripan(k.sigSeed, k.sigJitter, 1, i))) + "</b></div></div>";
    }
    const modus = k.kuadran === "K4"
      ? [["No. 5", "Cloning (penjiplakan klaim)"], ["No. 6", "Phantom billing (klaim palsu)"], ["No. 14", "Menagihkan tindakan yang tidak dilakukan"]]
      : [["No. 17", "Klaim fiktif obat/alkes/tindakan"], ["No. 18", "Pengurangan jumlah obat"]];

    return bar(["Berkas temuan", k.id]) + '<div class="laman">' +
      '<div class="dosir-atas"><a class="btn btn--kecil" href="#/klaim/' + k.id + '/dosir">' + IK.kiri + "Kembali ke kartu bukti</a>" +
      '<button class="btn btn--primer btn--kecil" data-aksi="unduh-pdf" data-id="' + k.id + '">' + IK.unduh + "Unduh PDF</button>" +
      '<button class="btn btn--kecil" data-aksi="cetak">Cetak</button>' +
      '<span class="catatan">Dirakit otomatis dari temuan mesin. Belum ditandatangani.</span></div>' +
      '<article class="dosir"><header class="dosir-kop"><div><b>BPJS KESEHATAN</b><span>' + esc(D.cabang) + " · Tim Pencegahan dan Penanganan Kecurangan JKN</span></div>" +
      '<div class="kanan">PRAMANA<br>' + esc(D.versiModel) + "</div></header>" +
      "<h2>Berita Acara Temuan Audit Klaim</h2>" +
      '<div class="nomor">Nomor: BA-' + esc(k.id.replace(/\D/g, "").slice(0, 8)) + "/KC-JKP/IX/2026</div>" +
      "<h3>Objek pemeriksaan</h3><table><tbody>" +
      "<tr><th>Nomor klaim</th><td>" + esc(k.id) + "</td><th>Nomor SEP</th><td>" + esc(k.sep) + "</td></tr>" +
      "<tr><th>Peserta</th><td>" + esc(k.nama) + "</td><th>Nomor kartu</th><td>" + esc(k.kartu) + "</td></tr>" +
      "<tr><th>Fasilitas kesehatan</th><td>" + esc(k.faskes) + " (" + esc(k.faskesId) + ")</td><th>Unit</th><td>" + esc(k.unit) + "</td></tr>" +
      "<tr><th>Layanan ditagihkan</th><td>" + k.jumlah + " " + esc(k.satuanLabel) + " · " + esc(k.inacbg) + "</td><th>Nilai klaim</th><td>" + rp(k.nilai) + "</td></tr>" +
      "</tbody></table><h3>Uraian temuan</h3>" +
      '<ol class="temuan">' + terpicu(k).map((t) => "<li><b>" + t.kode + " — " + esc(t.nama) + ".</b> " + esc(t.teks) + " Nilai terukur " + esc(t.nilai) + ", ambang " + esc(t.ambang) + ".</li>").join("") + "</ol>" +
      "<h3>Lampiran bukti</h3>" +
      '<div class="dosir-lampiran"><p class="catatan" style="margin-bottom:10px">Potongan kolom tanda tangan pada lembar bukti pelayanan. Kemiripan rata-rata terukur <b>' + dec(rerata) + "</b>.</p>" +
      '<div class="sig-deret">' + deret + "</div></div>" +
      "<h3>Dugaan jenis kecurangan</h3><table><thead><tr><th style=\"width:96px\">Modus</th><th>Uraian sesuai Permenkes 16/2019</th></tr></thead><tbody>" +
      modus.map((m) => "<tr><td>" + m[0] + "</td><td>" + esc(m[1]) + "</td></tr>").join("") + "</tbody></table>" +
      "<h3>Rantai bukti</h3><table><tbody>" +
      '<tr><th>Hash berkas asli</th><td class="mono">sha256:' + esc(k.berkasHash) + "…</td></tr>" +
      "<tr><th>Versi model &amp; aturan</th><td>" + esc(D.versiModel) + "</td></tr>" +
      "<tr><th>Waktu pemrosesan</th><td>" + esc(D.dianalisis) + "</td></tr>" +
      "<tr><th>Status tindak lanjut</th><td>" + (put ? esc(put.label) + " · " + esc(put.waktu) : "Menunggu keputusan verifikator") + "</td></tr>" +
      "</tbody></table><h3>Catatan</h3>" +
      "<p>Dokumen ini memuat rekomendasi prioritas audit berbasis aturan. Dokumen ini bukan penetapan kecurangan. Fasilitas kesehatan berhak menyampaikan klarifikasi sebelum kasus dinaikkan, dan keputusan akhir berada pada Tim Pencegahan dan Penanganan Kecurangan JKN.</p>" +
      '<div class="dosir-ttd"><div><span>Verifikator</span><div class="garis">R. Santoso</div></div>' +
      '<div><span>Kepala Bidang Penjaminan Manfaat</span><div class="garis">…………………………</div></div></div></article></div>';
  }

  /* =====================================================================
     Unduh PDF
     ===================================================================== */

  function sigGambar(seed, jitter, i) {
    const s = 4, c = document.createElement("canvas");
    c.width = 190 * s; c.height = 74 * s;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.scale(s, s);
    const p = DOC.pathData(seed, jitter, i);
    ctx.strokeStyle = "#1B3A6B"; ctx.lineWidth = p.tebal; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.stroke(new Path2D(p.d));
    return c.toDataURL("image/png");
  }

  const bersih = (s) => String(s).replace(/[—–]/g, "-").replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, "...");

  function unduhPdf(id) {
    const k = D.PETA[id];
    if (!k || !window.jspdf) { toast("Pembuat PDF belum siap. Coba muat ulang halaman."); return; }
    D.rakit(k);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const L = 18, R = 192, lebar = R - L;
    let y = 18;

    const teks = (t, o) => {
      o = o || {};
      doc.setFont("helvetica", o.tebal ? "bold" : "normal");
      doc.setFontSize(o.ukuran || 9.5);
      doc.setTextColor(o.warna || "#1a1a19");
      const baris = doc.splitTextToSize(bersih(t), o.lebar || lebar);
      baris.forEach((b) => {
        if (y > 275) { doc.addPage(); y = 18; }
        doc.text(b, o.x || L, y, { align: o.align || "left" });
        y += (o.ukuran || 9.5) * 0.45 + 1.1;
      });
    };
    const judulBagian = (t) => { y += 4; teks(t.toUpperCase(), { tebal: true, ukuran: 8, warna: "#55534e" }); y += 0.5; };
    const garis = () => { doc.setDrawColor("#eaeaea"); doc.line(L, y, R, y); y += 3; };
    const kv = (pasang) => {
      pasang.forEach((p) => {
        if (y > 272) { doc.addPage(); y = 18; }
        doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor("#55534e");
        doc.text(bersih(p[0]), L, y);
        doc.setFont("helvetica", "normal"); doc.setTextColor("#1a1a19");
        doc.text(doc.splitTextToSize(bersih(p[1]), 108), L + 48, y);
        y += 5.4;
      });
    };

    doc.setFillColor("#1a1a19"); doc.rect(0, 0, 210, 3, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor("#1a1a19");
    doc.text("BPJS KESEHATAN", L, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor("#55534e");
    doc.text(bersih(D.cabang + " - Tim Pencegahan dan Penanganan Kecurangan JKN"), L, y);
    doc.setFontSize(7.5); doc.setTextColor("#8b8a85");
    doc.text("PRAMANA " + bersih(D.versiModel), R, y - 4, { align: "right" });
    y += 4; doc.setDrawColor("#1a1a19"); doc.setLineWidth(0.6); doc.line(L, y, R, y); doc.setLineWidth(0.2); y += 9;

    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor("#1a1a19");
    doc.text("BERITA ACARA TEMUAN AUDIT KLAIM", 105, y, { align: "center" }); y += 5.5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor("#55534e");
    doc.text("Nomor: BA-" + k.id.replace(/\D/g, "").slice(0, 8) + "/KC-JKP/IX/2026", 105, y, { align: "center" });
    y += 9;

    judulBagian("Objek pemeriksaan"); garis();
    kv([
      ["Nomor klaim", k.id], ["Nomor SEP", k.sep],
      ["Peserta", k.nama + " (" + k.usia + " th)"], ["Nomor kartu", k.kartu],
      ["Fasilitas kesehatan", k.faskes + " (" + k.faskesId + ")"], ["Unit", k.unit],
      ["Diagnosis", k.diagnosa + " - " + k.icd],
      ["Layanan ditagihkan", k.jumlah + " " + k.satuanLabel + " - " + k.inacbg],
      ["Nilai klaim", rp(k.nilai)],
      ["Kuadran", k.kuadran + " - " + D.KUADRAN[k.kuadran].nama]
    ]);

    judulBagian("Uraian temuan"); garis();
    const picu = terpicu(k);
    if (!picu.length) teks("Tidak ada indikator yang terpicu pada klaim ini.");
    picu.forEach((t, i) => {
      teks((i + 1) + ". " + t.kode + " - " + t.nama, { tebal: true, ukuran: 9.5 });
      teks(t.teks + " Nilai terukur " + t.nilai + ", ambang " + t.ambang + ".", { ukuran: 9, x: L + 5, lebar: lebar - 5 });
      y += 1.5;
    });

    judulBagian("Lampiran bukti - kolom tanda tangan"); garis();
    const n = Math.min(DOC.jumlahParaf(k), 8);
    if (n) {
      const w = 30, h = 12;
      if (y + h + 8 > 275) { doc.addPage(); y = 18; }
      for (let i = 1; i <= n; i++) {
        const col = (i - 1) % 5, row = Math.floor((i - 1) / 5);
        const x = L + col * (w + 4), yy = y + row * (h + 8);
        doc.setDrawColor("#eaeaea"); doc.rect(x, yy, w, h);
        doc.addImage(sigGambar(k.sigSeed, k.sigJitter, i), "PNG", x + 1, yy + 1, w - 2, h - 2);
        doc.setFontSize(6.5); doc.setTextColor("#8b8a85");
        const skor = i === 1 ? "acuan" : dec(DOC.kemiripan(k.sigSeed, k.sigJitter, 1, i));
        doc.text((k.segmen === "obat" ? "obat " : "sesi ") + i + "  " + skor, x, yy + h + 3.4);
      }
      y += Math.ceil(n / 5) * (h + 8) + 2;
      teks("Kemiripan rata-rata terukur " + dec(DOC.kemiripanRerata(k.sigSeed, k.sigJitter, Math.max(n, 2))) + ". Ambang variasi alami tanda tangan manusia berhenti di 0,90.", { ukuran: 8.5, warna: "#55534e" });
    }

    judulBagian("Dugaan jenis kecurangan (Permenkes 16/2019)"); garis();
    const modus = k.kuadran === "K4"
      ? [["No. 5", "Cloning (penjiplakan klaim)"], ["No. 6", "Phantom billing (klaim palsu)"], ["No. 14", "Menagihkan tindakan yang tidak dilakukan"]]
      : k.kuadran === "K3" ? [["No. 17", "Klaim fiktif obat/alkes/tindakan"], ["No. 18", "Pengurangan jumlah obat"]]
        : [["-", "Tidak ada dugaan kecurangan pada klaim ini"]];
    kv(modus);

    judulBagian("Rantai bukti"); garis();
    const put = state.keputusan[k.id];
    kv([
      ["Hash berkas asli", "sha256:" + k.berkasHash + "..."],
      ["Versi model & aturan", D.versiModel],
      ["Waktu pemrosesan", D.dianalisis],
      ["Operator", "R. Santoso - KC Jakpus"],
      ["Status tindak lanjut", put ? put.label + " - " + put.waktu : "Menunggu keputusan verifikator"]
    ]);

    judulBagian("Catatan"); garis();
    teks("Dokumen ini memuat rekomendasi prioritas audit berbasis aturan, bukan penetapan kecurangan. Fasilitas kesehatan berhak menyampaikan klarifikasi sebelum kasus dinaikkan, dan keputusan akhir berada pada Tim Pencegahan dan Penanganan Kecurangan JKN.", { ukuran: 8.5, warna: "#55534e" });
    y += 4;
    teks("Prototipe BPJS Kesehatan Healthkathon 2026. Seluruh data pada dokumen ini bersifat sintetis.", { ukuran: 7.5, warna: "#8b8a85" });

    if (y > 240) { doc.addPage(); y = 24; } else y += 12;
    doc.setFontSize(8.5); doc.setTextColor("#55534e");
    doc.text("Verifikator", L + 14, y); doc.text("Kepala Bidang Penjaminan Manfaat", R - 58, y);
    y += 20; doc.setDrawColor("#55534e");
    doc.line(L, y, L + 56, y); doc.line(R - 66, y, R, y); y += 4.5;
    doc.setTextColor("#1a1a19"); doc.text("R. Santoso", L + 14, y); doc.text(".............................", R - 52, y);

    doc.save("Berita-Acara-" + k.id + ".pdf");
    toast("Berita acara " + k.id + " diunduh");
  }

  /* =====================================================================
     Indeks integritas
     ===================================================================== */

  function lamanFaskes() {
    const baris = D.INTEGRITAS.slice().sort((a, b) => a.skor - b.skor);
    const sorot = D.INTEGRITAS[0];
    const tabel = '<div class="tabel-bungkus"><table class="tabel faskes-tabel"><thead><tr>' +
      "<th>Fasilitas kesehatan</th><th>Kelas</th><th>Skor integritas</th><th>Tren 6 bulan</th>" +
      '<th class="kanan">Klaim</th><th class="kanan">Temuan</th><th class="kanan">Nilai tertahan</th><th>Modus dominan</th></tr></thead><tbody>' +
      baris.map((f) => {
        const w = f.skor < 50 ? "k4" : f.skor < 70 ? "k2" : "k1";
        return "<tr><td><b>" + esc(f.nama) + '</b><span class="catatan" style="display:block">' + esc(f.id) + "</span></td>" +
          '<td class="rapat">' + esc(f.kelas) + "</td>" +
          '<td><div class="skor"><b style="color:var(--' + w + ')">' + f.skor + "</b>" + kuadChip(w.toUpperCase(), true) + "</div></td>" +
          "<td>" + trenSVG(f.tren) + '</td><td class="kanan num">' + f.klaim + '</td><td class="kanan num">' + f.temuan + "</td>" +
          '<td class="kanan num">' + rp(f.nilaiTertahan) + "</td>" +
          "<td>" + f.modus.map((m) => '<span class="tag">' + m.kode + " " + esc(m.nama) + " ×" + m.n + "</span>").join(" ") + "</td></tr>";
      }).join("") + "</tbody></table></div>";

    const unit = sorot.unit.map((u) =>
      '<div class="unit-blok"><div class="unit-kepala"><h4>' + esc(u.nama) + '</h4><span class="tag">skor ' + u.skor + "</span>" +
      '<span class="kanan">' + u.temuan + " temuan · garis tegak pada batang = batas kapasitas 24 sesi/hari</span></div>" +
      '<div class="pelaksana">' + u.pelaksana.map((p) => {
        const lebih = p.sesi > p.batas, w = Math.min(p.sesi / (p.batas * 3), 1) * 100;
        return '<div class="pelaksana-baris"><div><b>' + esc(p.nama) + '</b><div class="catatan">' + p.temuan + " temuan terkait</div></div>" +
          '<div class="kapasitas"><i style="width:' + w.toFixed(1) + "%;background:" + (lebih ? "var(--k4)" : "var(--k1)") + '"></i>' +
          '<span class="batas" style="left:' + (100 / 3).toFixed(1) + '%"></span></div>' +
          '<div class="num" style="text-align:right;font-weight:700;color:' + (lebih ? "var(--k4)" : "inherit") + '">' + p.sesi + " sesi/hari</div></div>";
      }).join("") + "</div></div>").join("");

    return bar([D.cabang, "Indeks integritas faskes"]) +
      '<div class="laman"><div class="judul-laman"><h1>Indeks integritas fasilitas kesehatan</h1></div>' +
      '<p class="sub-laman">Modus pada segmen ini bersifat sistemik, bukan per klaim. Skor dihitung dari proporsi temuan terhadap volume klaim, ditimbang bobot modus.</p>' +
      '<div style="margin-top:22px">' + tabel + "</div>" +
      '<div class="judul-laman" style="margin:34px 0 4px"><h2 style="font-size:1.0625rem">' + esc(sorot.nama) + " · telusuri ke unit dan pelaksana</h2></div>" +
      '<p class="sub-laman">Skor turun dari 78 ke 41 dalam enam bulan. Sebaran temuannya tidak merata — hampir seluruhnya dari satu unit dan satu pelaksana.</p>' +
      unit +
      '<p class="catatan" style="margin-top:18px;max-width:80ch">Angka sebesar ini pada satu nama bukan bukti kecurangan perorangan. Yang ditunjukkannya adalah di mana audit lapangan sebaiknya dimulai, dan unit mana yang perlu pembinaan lebih dulu.</p></div>';
  }

  /* =====================================================================
     Pemberitahuan & perute
     ===================================================================== */

  function toast(pesan, tautan) {
    const w = document.getElementById("toast");
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = IK.cek + "<span>" + pesan + (tautan ? ' <a href="' + tautan + '">Buka berita acara</a>' : "") + "</span>";
    w.appendChild(t);
    setTimeout(() => { t.style.transition = "opacity .3s"; t.style.opacity = "0"; setTimeout(() => t.remove(), 320); }, 4200);
  }

  let pengamat = null;
  function amati() {
    const blok = document.querySelectorAll(".muncul");
    if (!blok.length) return;
    if (!("IntersectionObserver" in window)) { blok.forEach((b) => b.classList.add("tampak")); return; }
    if (!pengamat) {
      pengamat = new IntersectionObserver((masuk) => {
        masuk.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("tampak"); pengamat.unobserve(e.target); } });
      }, { rootMargin: "0px 0px -8% 0px" });
    }
    blok.forEach((b) => pengamat.observe(b));
  }

  function baca() {
    const bagian = (location.hash || "#/panduan").replace(/^#\/?/, "").split("/").filter(Boolean);
    state.rute = bagian[0] || "panduan";
    state.param = bagian[1] || null;
    if (state.rute === "klaim") state.tab = bagian[2] || "lihat";
  }

  function gambar(tetap) {
    const y = window.scrollY;
    baca();
    let isi;
    if (state.rute === "klaim") isi = lamanKlaim(state.param, state.tab);
    else if (state.rute === "dosir") isi = lamanDosir(state.param);
    else if (state.rute === "faskes") isi = lamanFaskes();
    else if (state.rute === "antrean") isi = lamanAntrean();
    else isi = lamanPanduan();
    document.getElementById("akar").innerHTML = rail() + '<main class="utama">' + isi + "</main>";
    if (tetap) window.scrollTo(0, y); else window.scrollTo(0, 0);
    amati();
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-aksi]");
    if (!t) return;
    const a = t.dataset.aksi;

    if (a === "filter") { state.filter = state.filter === t.dataset.kuadran ? null : t.dataset.kuadran; state.halaman = 1; gambar(true); }
    else if (a === "reset") { state.filter = null; state.q = ""; state.halaman = 1; gambar(true); }
    else if (a === "urut") { const k = t.dataset.kunci; state.urut = state.urut.kunci === k ? { kunci: k, arah: -state.urut.arah } : { kunci: k, arah: 1 }; gambar(true); }
    else if (a === "halaman") { state.halaman = Math.max(1, parseInt(t.dataset.ke, 10)); gambar(true); }
    else if (a === "alih-mesin") { state.mesinTerbuka = !state.mesinTerbuka; gambar(true); }
    else if (a === "putar-mesin") {
      state.mesinTerbuka = true; state.mesinJalan = true; state.lapisHidup = 0; gambar(true);
      const jalan = () => {
        state.lapisHidup++; gambar(true);
        if (state.lapisHidup < D.LAPISAN.length) setTimeout(jalan, 560);
        else { state.mesinJalan = false; gambar(true); toast("Analisis selesai · 6 lapisan · 1.184 klaim"); }
      };
      setTimeout(jalan, 380);
    }
    else if (a === "tab") { location.hash = "#/klaim/" + state.param + "/" + t.dataset.tab; }
    else if (a === "sig") { state.sigMode = t.dataset.mode; gambar(true); }
    else if (a === "pandu-sig") { state.panduSig = t.dataset.mode; gambar(true); }
    else if (a === "sorot") { state.sorot = !state.sorot; gambar(true); }
    else if (a === "pilih-aksi") { state.konfirmasiAksi = t.dataset.key; gambar(true); }
    else if (a === "batal-aksi") { state.konfirmasiAksi = null; gambar(true); }
    else if (a === "terap-aksi") {
      const p = PUTUSAN[t.dataset.key];
      const waktu = new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      state.keputusan[state.param] = { label: p.label, efek: p.efek, dosir: p.dosir, waktu: waktu + " WIB" };
      state.konfirmasiAksi = null; simpan(); gambar(true);
      toast(p.label + " · " + state.param, p.dosir ? "#/dosir/" + state.param : null);
    }
    else if (a === "batal-putus") { delete state.keputusan[state.param]; simpan(); gambar(true); }
    else if (a === "jawab") {
      state.jawaban[state.param] = t.dataset.nilai;
      const k = D.PETA[state.param];
      if (k) { k._ind = null; if (k.konfirmasi) { k.konfirmasi.jawaban = t.dataset.nilai; k.konfirmasi.jawab = "Baru saja"; } }
      simpan(); gambar(true);
      toast("Jawaban peserta tercatat pada dosir " + state.param);
    }
    else if (a === "unduh-pdf") { unduhPdf(t.dataset.id); }
    else if (a === "cetak") { window.print(); }
  });

  document.addEventListener("input", (e) => {
    if (e.target.dataset && e.target.dataset.aksi === "cari") {
      state.q = e.target.value; state.halaman = 1;
      const pos = e.target.selectionStart;
      gambar(true);
      const baru = document.querySelector('[data-aksi="cari"]');
      if (baru) { baru.focus(); baru.setSelectionRange(pos, pos); }
    }
  });

  window.addEventListener("hashchange", () => { state.konfirmasiAksi = null; state.sigMode = "kasus"; gambar(false); });
  gambar(false);
})();
