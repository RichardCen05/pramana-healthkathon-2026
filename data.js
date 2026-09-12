/* PRAMANA: dataset sintetis.
   Seluruh nama, nomor, dan angka dibangkitkan dari benih tetap.
   Tidak ada data peserta JKN yang nyata di berkas ini.

   Setiap klaim pada antrean punya bukti lengkap: lembar sesi, riwayat obat,
   linimasa perawatan. Tidak ada klaim yang berhenti sebagai baris tabel. */

(function (global) {
  "use strict";

  /* ---------- PRNG berbenih (mulberry32) ---------- */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const between = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  function benih(teks) {
    let h = 2166136261;
    for (let i = 0; i < teks.length; i++) { h ^= teks.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /* ---------- waktu ---------- */
  const HARI_INI = new Date(2026, 8, 2);
  const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  const pad = (n) => String(n).padStart(2, "0");
  const fmtTgl = (d) => pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear();
  const fmtPendek = (d) => pad(d.getDate()) + " " + BULAN[d.getMonth()] + " " + d.getFullYear();
  const selisihHari = (d) => Math.round((HARI_INI - d) / 86400000);
  const tambahHari = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

  /* ---------- kosakata ---------- */
  const DEPAN_L = ["Ahmad", "Bambang", "Slamet", "Agus", "Hendra", "Rudi", "Joko", "Iwan", "Dedi", "Yusuf", "Taufik", "Bagus", "Hartono", "Suryadi", "Wahyu", "Gunawan", "Rizal", "Fajar", "Anwar", "Darmawan"];
  const DEPAN_P = ["Siti", "Sri", "Endang", "Ratna", "Dewi", "Lastri", "Mariam", "Yuliana", "Nurhayati", "Rohani", "Kartini", "Wulandari", "Suminah", "Tuti", "Ani", "Hartini", "Ningsih", "Sumarni", "Rahayu", "Marlina"];
  const BELAKANG = ["Wijaya", "Santoso", "Pratama", "Nugroho", "Halim", "Siregar", "Situmorang", "Rahmawati", "Kusuma", "Firdaus", "Maulana", "Suryana", "Wiryanto", "Hidayat", "Purnomo", "Lestari", "Handayani", "Prakoso", "Saputra", "Mulyani"];

  const FASKES = [
    { id: "F-3171-014", nama: "RS Melati Sehat", kelas: "Kelas C", unit: "Instalasi Rehabilitasi Medik" },
    { id: "F-3171-027", nama: "RS Cipta Medika", kelas: "Kelas B", unit: "Unit Hemodialisis" },
    { id: "F-3171-008", nama: "RS Harapan Bunda", kelas: "Kelas B", unit: "Poliklinik Jantung" },
    { id: "F-3171-041", nama: "RS Bakti Mulia", kelas: "Kelas C", unit: "Instalasi Rehabilitasi Medik" },
    { id: "F-3171-055", nama: "RSU Tirta Husada", kelas: "Kelas C", unit: "Unit Hemodialisis" }
  ];

  const DPJP = {
    fisio: ["dr. H. Suparman, Sp.KFR", "dr. Ayu Prameswari, Sp.KFR", "dr. Bimo Aryasatya, Sp.KFR"],
    hd: ["dr. Ratna Kusuma, Sp.PD-KGH", "dr. Teguh Wicaksana, Sp.PD-KGH"],
    obat: ["dr. Gunawan Halim, Sp.JP", "dr. Indira Saraswati, Sp.PD", "dr. Rendra Mahendra, Sp.JP"]
  };
  const PELAKSANA = {
    fisio: ["T. Wibowo, S.Ft", "R. Anggraini, S.Ft", "M. Pradipta, S.Ft"],
    hd: ["Ns. A. Maulana", "Ns. D. Kurniasih", "Ns. P. Ramadhan"],
    obat: ["Apt. L. Handayani", "Apt. S. Nurbaiti"]
  };
  const TINDAKAN_FISIO = ["Terapi latihan + IR", "SWD + Ter. latihan", "TENS + Ter. latihan", "US terapi + Ter. latihan"];

  const OBAT_JANTUNG = ["Bisoprolol 5 mg", "Candesartan 8 mg", "Atorvastatin 20 mg", "Clopidogrel 75 mg", "Spironolakton 25 mg"];
  const OBAT_DM = ["Metformin 500 mg", "Glimepirid 2 mg", "Amlodipin 10 mg", "Atorvastatin 20 mg", "Asam folat 1 mg"];

  const SEGMEN = {
    fisio: {
      kode: "Q-5-42-0", label: "Fisioterapi", unit: "sesi", icd9: "93.39",
      lembar: "Lembar Bukti Pelayanan Fisioterapi",
      diagnosa: [["I63.9", "Stroke non-hemoragik"], ["M54.5", "Nyeri punggung bawah"], ["M25.51", "Nyeri sendi bahu"], ["G62.9", "Polineuropati"]]
    },
    hd: {
      kode: "N-3-14-0", label: "Hemodialisis", unit: "sesi", icd9: "39.95",
      lembar: "Lembar Monitoring Hemodialisis",
      diagnosa: [["N18.5", "Penyakit ginjal kronik stadium 5"], ["N18.4", "Penyakit ginjal kronik stadium 4"]]
    },
    obat: {
      kode: "M-3-11-0", label: "Kontrol kronis + obat", unit: "kunjungan", icd9: "-",
      lembar: "Bukti Serah Terima Obat Kronis",
      diagnosa: [["I50.0", "Gagal jantung kongestif"], ["I11.0", "Penyakit jantung hipertensi"], ["E11.9", "Diabetes melitus tipe 2"]]
    }
  };

  const INDIKATOR = {
    IKT: { nama: "Indeks Keragaman Tanda Tangan", lapisan: "lihat", ambang: "≤ 0,90" },
    KLP: { nama: "Kloning Lintas-Pasien", lapisan: "lihat", ambang: "≤ 70%" },
    JTM: { nama: "Jejak Tulisan & Media", lapisan: "lihat", ambang: "≤ 0,80" },
    KKN: { nama: "Konsistensi Klinis Numerik", lapisan: "lihat", ambang: "≥ 6 mmHg" },
    SPO: { nama: "Selisih Penyerahan Obat", lapisan: "lihat", ambang: "selisih 0" },
    GMB: { nama: "Gerbang Mutu Berkas", lapisan: "lihat", ambang: "terbaca penuh" },
    DRP: { nama: "Denyut Ritme Perawatan", lapisan: "jejak", ambang: "variasi ≥ 1 hari" },
    IKAO: { nama: "Indeks Ketimpangan Antar-Obat", lapisan: "jejak", ambang: "≤ 0,40" },
    UKT: { nama: "Uji Kehadiran Terapi", lapisan: "jejak", ambang: "≥ 1 jejak" },
    BKF: { nama: "Beban Kapasitas Fisik", lapisan: "jejak", ambang: "≤ 24 sesi/hari" },
    SBD: { nama: "Konfirmasi Peserta", lapisan: "saksi", ambang: "-" }
  };

  const KUADRAN = {
    K1: { kode: "K1", nama: "Lolos cepat", rute: "Jalur cepat menuju pembayaran" },
    K2: { kode: "K2", nama: "Cacat administrasi", rute: "Permintaan perbaikan berkas" },
    K3: { kode: "K3", nama: "Audit penyerahan obat", rute: "Audit farmasi, modus No. 17 dan 18" },
    K4: { kode: "K4", nama: "Dugaan phantom / cloning", rute: "Eskalasi Tim Anti-Kecurangan" },
    TLA: { kode: "TLA", nama: "Tidak layak audit", rute: "Permintaan pindai ulang" }
  };

  /* ---------- pembangkit klaim ---------- */
  const TARGET = { K1: 962, K2: 74, K3: 89, K4: 41, TLA: 18 };

  function buatKlaim() {
    const r = rng(20260902);
    const urutan = [];
    Object.keys(TARGET).forEach((k) => { for (let i = 0; i < TARGET[k]; i++) urutan.push(k); });
    for (let i = urutan.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [urutan[i], urutan[j]] = [urutan[j], urutan[i]];
    }

    return urutan.map((kuadran, i) => {
      const perempuan = r() > 0.5;
      const nama = (perempuan ? pick(r, DEPAN_P) : pick(r, DEPAN_L)) + " " + pick(r, BELAKANG);
      const segmen = kuadran === "K3" ? "obat" : pick(r, ["fisio", "fisio", "hd", "obat"]);
      const seg = SEGMEN[segmen];

      let fas;
      if (segmen === "fisio") fas = r() > 0.45 ? FASKES[0] : FASKES[3];
      else if (segmen === "hd") fas = r() > 0.45 ? FASKES[1] : FASKES[4];
      else fas = FASKES[2];

      const dx = pick(r, seg.diagnosa);
      const jumlah = segmen === "hd" ? between(r, 8, 13) : segmen === "fisio" ? between(r, 4, 10) : between(r, 1, 2);
      const satuan = segmen === "hd" ? 930000 : segmen === "fisio" ? 155000 : between(r, 620000, 980000);

      return {
        id: "RJ-2608-" + String(i + 1).padStart(5, "0"),
        sep: "0801" + between(r, 1000, 9999) + "V" + between(r, 100000, 999999),
        nama: (perempuan ? "Ny. " : "Tn. ") + nama,
        usia: between(r, 38, 74),
        kartu: "000" + between(r, 1000000, 9999999) + between(r, 100, 999),
        faskes: fas.nama, faskesId: fas.id, unit: fas.unit,
        segmen: segmen, segmenLabel: seg.label, inacbg: seg.kode,
        icd: dx[0], diagnosa: dx[1], icd9: seg.icd9,
        dpjp: pick(r, DPJP[segmen]), pelaksana: pick(r, PELAKSANA[segmen]),
        jumlah: jumlah, satuanLabel: seg.unit, nilai: jumlah * satuan,
        kuadran: kuadran,
        tanggal: new Date(2026, 7, between(r, 1, 22))
      };
    });
  }

  const KLAIM = buatKlaim();
  const PETA = {};
  KLAIM.forEach((k) => { PETA[k.id] = k; });

  /* =====================================================================
     Perakit bukti: berlaku untuk SETIAP klaim, bukan hanya kasus contoh.
     ===================================================================== */

  function rakit(k) {
    if (k._rakit) return k;
    k._rakit = true;
    const r = rng(benih(k.id + k.nama));
    const q = k.kuadran;
    const rapi = q === "K4";

    k.sigSeed = (benih(k.nama + k.id) % 90000) + 1000;
    k.sigJitter = (q === "K4" || q === "K2") ? 0 : 0.15 + r() * 0.03;
    k.mutuBerkas = q === "TLA" ? pick(r, ["buram", "terpotong", "halaman hilang"]) : null;

    const nBaris = k.segmen === "obat" ? 0 : Math.min(k.jumlah, 10);
    let d = new Date(k.tanggal);
    const tglSesi = [];
    for (let i = 0; i < nBaris; i++) {
      tglSesi.push(new Date(d));
      d = tambahHari(d, rapi ? 3 + (i % 2) : 3 + between(r, 0, 2));
    }

    if (k.segmen === "fisio") {
      const jam = between(r, 8, 15);
      const tindakan = pick(r, TINDAKAN_FISIO);
      k.sesi = tglSesi.map((t, i) => ({
        no: i + 1, tgl: fmtTgl(t), tindakan: tindakan,
        jam: rapi ? pad(jam) + ".15" : pad(jam) + "." + pick(r, ["00", "15", "30", "45"])
      }));
      k.tindakan = tindakan;
    } else if (k.segmen === "hd") {
      const tdS = between(r, 122, 150), tdD = between(r, 76, 92);
      const bbDasar = between(r, 520, 720) / 10;
      k.monitoring = tglSesi.map((t, i) => {
        const bbPre = rapi ? 62.4 : bbDasar + between(r, -9, 9) / 10;
        const turun = rapi ? 2.3 : between(r, 16, 32) / 10;
        const kom = (x) => x.toFixed(1).replace(".", ",");
        return {
          no: i + 1, tgl: pad(t.getDate()) + "/" + pad(t.getMonth() + 1),
          tdPre: rapi ? "120/80" : (tdS + between(r, -13, 13)) + "/" + (tdD + between(r, -8, 8)),
          tdPost: rapi ? "120/80" : (tdS + between(r, -16, 8)) + "/" + (tdD + between(r, -9, 6)),
          bbPre: kom(bbPre), bbPost: kom(bbPre - turun), uf: kom(turun),
          mulai: rapi ? "07.00" : pick(r, ["07.00", "07.15", "07.30", "12.00", "13.05"]),
          selesai: rapi ? "11.00" : pick(r, ["11.00", "11.20", "11.45", "16.10", "17.05"])
        };
      });
      k.tindakan = "Hemodialisis rutin";
    } else {
      const daftar = k.icd === "E11.9" ? OBAT_DM : OBAT_JANTUNG;
      const n = between(r, 4, 5);
      const hilang = q === "K3" ? between(r, 1, 2) : 0;
      k.obat = daftar.slice(0, n).map((nama, i) => {
        const diserahkan = i < n - hilang;
        return {
          nama: nama, jumlah: 30, diserahkan: diserahkan,
          mpr: !diserahkan ? between(r, 6, 19) : q === "K3" ? (i === 0 ? between(r, 118, 152) : between(r, 30, 104)) : between(r, 84, 108)
        };
      });
      k.tindakan = "Kontrol rutin + obat kronis 30 hari";
    }

    /* linimasa 90 hari, dihitung mundur dari hari ini */
    const sesiLalu = tglSesi.map(selisihHari).filter((x) => x >= 0 && x <= 90);
    let obatLalu = [], kunjunganLalu = [];
    if (q === "K4") {
      obatLalu = []; kunjunganLalu = [];
    } else if (q === "TLA") {
      obatLalu = [between(r, 62, 80), between(r, 26, 44)];
      kunjunganLalu = [between(r, 62, 80)];
    } else if (k.segmen === "obat") {
      const b = between(r, 82, 88);
      obatLalu = [b, b - between(r, 4, 9), b - 29, b - 37, b - 58, b - 67, b - 79].filter((x) => x >= 0);
      kunjunganLalu = [b, b - 29, b - 58].filter((x) => x >= 0);
    } else {
      const b = between(r, 82, 88);
      obatLalu = [b, b - 29, b - 58, b - 79].filter((x) => x >= 0);
      kunjunganLalu = [b, b - 29, b - 58].filter((x) => x >= 0);
    }
    if (k.segmen === "obat" && sesiLalu.length === 0) sesiLalu.push(selisihHari(k.tanggal));
    k.denyut = { sesi: sesiLalu, obat: obatLalu, kunjungan: kunjunganLalu };

    /* jarak antar sesi, dipakai indikator DRP */
    k.jarakSesi = [];
    for (let i = 1; i < sesiLalu.length; i++) k.jarakSesi.push(Math.abs(sesiLalu[i - 1] - sesiLalu[i]));

    k.bebanPelaksana = q === "K4" ? between(r, 38, 66) : between(r, 11, 23);
    k.berkasHash = ((benih(k.id + "h") >>> 0).toString(16) + (benih(k.nama) >>> 0).toString(16)).slice(0, 16);

    if (q === "K4") {
      const dijawab = r() > 0.25;
      k.konfirmasi = {
        kirim: "02 Sep 2026, 09.14",
        pertanyaan: "Apakah Anda menjalani " + k.jumlah + " " + k.satuanLabel + " " + k.segmenLabel.toLowerCase() + " di " + k.faskes + " pada Agustus 2026?",
        jawab: dijawab ? "02 Sep 2026, 11.47" : null,
        jawaban: dijawab ? "Tidak" : null
      };
    } else if (q === "K3") {
      k.konfirmasi = {
        kirim: "02 Sep 2026, 09.20",
        pertanyaan: "Apakah Anda menerima seluruh obat yang tertulis pada resep terakhir Anda di " + k.faskes + "?",
        jawab: null, jawaban: null
      };
    } else k.konfirmasi = null;

    return k;
  }

  /* pasangan berkas kloning: dijalin setelah semua K4 dirakit */
  function jalinKloning() {
    const r = rng(77123);
    ["fisio", "hd", "obat"].forEach((seg) => {
      const daftar = KLAIM.filter((x) => x.kuadran === "K4" && x.segmen === seg);
      for (let i = 0; i + 1 < daftar.length; i += 2) {
        if (r() > 0.3) {
          const a = daftar[i], b = daftar[i + 1];
          rakit(a); rakit(b);
          b.sigSeed = a.sigSeed;
          const mirip = (968 + Math.floor(r() * 28)) / 1000;
          a.klon = { nama: b.nama, klaim: b.id, kartu: b.kartu, sep: b.sep, kemiripan: mirip };
          b.klon = { nama: a.nama, klaim: a.id, kartu: a.kartu, sep: a.sep, kemiripan: mirip };
        }
      }
    });
  }

  /* ---------- enam kasus yang ditulis tangan ---------- */
  function jadikanKasus(id, patch) {
    const dasar = KLAIM.find((x) => x.kuadran === patch.kuadran && x.segmen === patch.segmen && !x.hero && !x._rakit);
    Object.assign(dasar, patch, { hero: true });
    delete PETA[dasar.id];
    dasar.id = id; PETA[id] = dasar;
    return dasar;
  }

  const KASUS = {};

  KASUS["RJ-2608-00417"] = jadikanKasus("RJ-2608-00417", {
    kuadran: "K4", segmen: "fisio",
    nama: "Ny. Siti Rahmawati", usia: 58, kartu: "0001427865331", sep: "08014261V447215",
    faskes: "RS Melati Sehat", faskesId: "F-3171-014", unit: "Instalasi Rehabilitasi Medik",
    icd: "I63.9", diagnosa: "Stroke non-hemoragik",
    dpjp: "dr. H. Suparman, Sp.KFR", pelaksana: "T. Wibowo, S.Ft",
    jumlah: 8, nilai: 1240000, tanggal: new Date(2026, 7, 4),
    judul: "Delapan sesi yang tidak pernah terjadi",
    ringkas: "Delapan sesi fisioterapi ditagihkan. Delapan tanda tangan pada lembar bukti pelayanan identik satu sama lain, dan lembarnya sama dengan milik pasien lain. Peserta tidak punya jejak perawatan apa pun selama tiga bulan, dan membantah pernah menjalani terapi."
  });

  KASUS["RJ-2608-01133"] = jadikanKasus("RJ-2608-01133", {
    kuadran: "K4", segmen: "hd",
    nama: "Tn. Hartono Siregar", usia: 61, kartu: "0003518820147", sep: "08014261V551903",
    faskes: "RS Cipta Medika", faskesId: "F-3171-027", unit: "Unit Hemodialisis",
    icd: "N18.5", diagnosa: "Penyakit ginjal kronik stadium 5",
    dpjp: "dr. Ratna Kusuma, Sp.PD-KGH", pelaksana: "Ns. A. Maulana",
    jumlah: 8, nilai: 7440000, tanggal: new Date(2026, 7, 3),
    judul: "Angka yang terlalu sempurna",
    ringkas: "Delapan sesi hemodialisis ditagihkan. Lembar monitoring mencatat tekanan darah 120/80 persis di seluruh sesi, berat badan identik hingga satu desimal, dan jam selesai selalu 11.00 tepat. Dialisis yang benar-benar dilakukan selalu meninggalkan variasi."
  });

  KASUS["RJ-2608-02051"] = jadikanKasus("RJ-2608-02051", {
    kuadran: "K3", segmen: "obat",
    nama: "Tn. Ahmad Suryana", usia: 64, kartu: "0002744190852", sep: "08014261V618440",
    faskes: "RS Harapan Bunda", faskesId: "F-3171-008", unit: "Poliklinik Jantung",
    icd: "I50.0", diagnosa: "Gagal jantung kongestif",
    dpjp: "dr. Gunawan Halim, Sp.JP", pelaksana: "Apt. L. Handayani",
    jumlah: 1, nilai: 1865000, tanggal: new Date(2026, 7, 12),
    judul: "Ditagih lima, diserahkan tiga",
    ringkas: "Klaim memuat lima jenis obat untuk tiga puluh hari, tetapi bukti serah terima hanya memuat tiga baris yang terisi dan ditandatangani peserta. Dua obat sisanya juga hampir tidak pernah muncul pada riwayat pengambilan selama enam bulan.",
    dualitas: {
      a: "Peserta tidak mengonsumsi seluruh obatnya. Pola konsumsi timpang, bukan kecurangan.",
      b: "Fasilitas kesehatan menagihkan lima obat tetapi menyerahkan tiga. Modus No. 18, pengurangan jumlah obat."
    }
  });

  KASUS["RJ-2608-00629"] = jadikanKasus("RJ-2608-00629", {
    kuadran: "K2", segmen: "fisio",
    nama: "Tn. Bambang Wiryanto", usia: 52, kartu: "0001938276104", sep: "08014261V449028",
    faskes: "RS Melati Sehat", faskesId: "F-3171-014", unit: "Instalasi Rehabilitasi Medik",
    icd: "M54.5", diagnosa: "Nyeri punggung bawah",
    dpjp: "dr. H. Suparman, Sp.KFR", pelaksana: "R. Anggraini, S.Ft",
    jumlah: 6, nilai: 930000, tanggal: new Date(2026, 7, 5),
    judul: "Berkasnya salah, terapinya nyata",
    ringkas: "Enam tanda tangan pada lembar bukti pelayanan memang hasil gandaan: peserta diminta menandatangani satu kali untuk seluruh sesi. Tetapi jejak obat dan kunjungannya lengkap dan konsisten. Perawatannya nyata; yang keliru administrasinya."
  });

  KASUS["RJ-2608-00874"] = jadikanKasus("RJ-2608-00874", {
    kuadran: "K1", segmen: "fisio",
    nama: "Ny. Rohani Lestari", usia: 55, kartu: "0002116490733", sep: "08014261V462118",
    faskes: "RS Bakti Mulia", faskesId: "F-3171-041", unit: "Instalasi Rehabilitasi Medik",
    icd: "M25.51", diagnosa: "Nyeri sendi bahu",
    dpjp: "dr. Ayu Prameswari, Sp.KFR", pelaksana: "M. Pradipta, S.Ft",
    jumlah: 7, nilai: 1085000, tanggal: new Date(2026, 7, 6),
    judul: "Bukti lengkap, jejak utuh",
    ringkas: "Tanda tangan bervariasi wajar di seluruh sesi, jam terapi bergeser seperti jadwal sungguhan, dan obat diambil di empat titik waktu yang sejalan dengan periode terapi. Klaim seperti ini keluar dari antrean tanpa pernah dibuka verifikator."
  });

  KASUS["RJ-2608-00133"] = jadikanKasus("RJ-2608-00133", {
    kuadran: "TLA", segmen: "fisio",
    nama: "Tn. Slamet Hidayat", usia: 67, kartu: "0004052871190", sep: "08014261V470035",
    faskes: "RS Bakti Mulia", faskesId: "F-3171-041", unit: "Instalasi Rehabilitasi Medik",
    icd: "G62.9", diagnosa: "Polineuropati",
    dpjp: "dr. Bimo Aryasatya, Sp.KFR", pelaksana: "R. Anggraini, S.Ft",
    jumlah: 5, nilai: 775000, tanggal: new Date(2026, 7, 9),
    judul: "Belum bisa dinilai",
    ringkas: "Hasil pindai tidak terbaca penuh. Berkas dikembalikan untuk dipindai ulang, tidak dinilai dan tidak dituduh. Fasilitas kesehatan dengan pemindai seadanya tidak boleh jatuh ke kuadran kecurangan hanya karena keterbatasan alat."
  });

  KLAIM.forEach(rakit);
  jalinKloning();
  KASUS["RJ-2608-00133"].mutuBerkas = "buram";

  const SOROT = ["RJ-2608-00417", "RJ-2608-01133", "RJ-2608-02051", "RJ-2608-00629", "RJ-2608-00874", "RJ-2608-00133"];
  SOROT.forEach((id) => { if (PETA[id]) PETA[id].sorot = true; });

  /* ---------- rekap ---------- */
  function rekap() {
    const out = { K1: 0, K2: 0, K3: 0, K4: 0, TLA: 0, nilai: { K1: 0, K2: 0, K3: 0, K4: 0, TLA: 0 }, total: 0, totalNilai: 0 };
    KLAIM.forEach((k) => { out[k.kuadran]++; out.nilai[k.kuadran] += k.nilai; out.total++; out.totalNilai += k.nilai; });
    return out;
  }

  const LAPISAN = [
    { kode: "L0", nama: "Gerbang Mutu Berkas", detail: "Menguji keterbacaan, halaman hilang, orientasi, dan resolusi sebelum apa pun dinilai.", hasil: "1.166 layak audit · 18 dikembalikan untuk pindai ulang" },
    { kode: "L1", nama: "Pratyaksa · Bukti Lihat", detail: "Membaca citra berkas: keragaman tanda tangan, kloning lembar, jejak tulisan, nilai klinis pada lembar monitoring.", hasil: "115 berkas bukti visual cacat · 41 di antaranya kloning lintas-pasien" },
    { kode: "L2", nama: "Anumana · Bukti Jejak", detail: "Menilai denyut perawatan, ketimpangan antar-obat, kapasitas fisik pelaksana, dan jejak lintas faskes.", hasil: "41 tanpa jejak perawatan · 89 selisih penyerahan obat" },
    { kode: "L3", nama: "Sabda · Bukti Saksi", detail: "Konfirmasi mikro satu ketuk kepada peserta melalui Mobile JKN, hanya untuk kasus yang sudah bersinyal.", hasil: "130 konfirmasi terkirim · 31 dibantah peserta" },
    { kode: "L4", nama: "Matriks Bukti Ganda", detail: "Menyilangkan dua sumbu bukti menjadi empat rute tindak lanjut yang berbeda.", hasil: "962 K1 · 74 K2 · 89 K3 · 41 K4" },
    { kode: "L5", nama: "Penyusun Dosir", detail: "Merakit potongan bukti, kalimat temuan, rujukan modus, dan rantai bukti digital.", hasil: "130 berkas temuan siap ditelaah" }
  ];

  const INTEGRITAS = [
    {
      id: "F-3171-014", nama: "RS Melati Sehat", kelas: "Kelas C", skor: 41,
      klaim: 312, temuan: 38, nilaiTertahan: 46200000, tren: [78, 74, 69, 61, 52, 41],
      modus: [{ kode: "No. 5", nama: "Cloning", n: 17 }, { kode: "No. 6", nama: "Phantom billing", n: 14 }, { kode: "No. 14", nama: "Tindakan tidak dilakukan", n: 7 }],
      unit: [{
        nama: "Instalasi Rehabilitasi Medik", skor: 28, temuan: 34, pelaksana: [
          { nama: "T. Wibowo, S.Ft", sesi: 63, batas: 24, temuan: 29 },
          { nama: "R. Anggraini, S.Ft", sesi: 19, batas: 24, temuan: 3 },
          { nama: "M. Pradipta, S.Ft", sesi: 17, batas: 24, temuan: 2 }
        ]
      }]
    },
    { id: "F-3171-027", nama: "RS Cipta Medika", kelas: "Kelas B", skor: 58, klaim: 468, temuan: 26, nilaiTertahan: 88300000, tren: [71, 70, 66, 63, 60, 58], modus: [{ kode: "No. 20", nama: "Manipulasi hasil pemeriksaan", n: 18 }, { kode: "No. 6", nama: "Phantom billing", n: 8 }], unit: [] },
    { id: "F-3171-008", nama: "RS Harapan Bunda", kelas: "Kelas B", skor: 66, klaim: 404, temuan: 89, nilaiTertahan: 61700000, tren: [69, 68, 70, 67, 66, 66], modus: [{ kode: "No. 18", nama: "Pengurangan jumlah obat", n: 74 }, { kode: "No. 17", nama: "Klaim fiktif obat", n: 15 }], unit: [] },
    { id: "F-3171-041", nama: "RS Bakti Mulia", kelas: "Kelas C", skor: 83, klaim: 188, temuan: 6, nilaiTertahan: 4100000, tren: [80, 81, 82, 82, 83, 83], modus: [{ kode: "No. 5", nama: "Cloning", n: 6 }], unit: [] },
    { id: "F-3171-055", nama: "RSU Tirta Husada", kelas: "Kelas C", skor: 91, klaim: 241, temuan: 2, nilaiTertahan: 1860000, tren: [88, 89, 89, 90, 91, 91], modus: [{ kode: "No. 14", nama: "Tindakan tidak dilakukan", n: 2 }], unit: [] }
  ];

  global.DATA = {
    rng: rng, benih: benih, rakit: rakit,
    KLAIM: KLAIM, PETA: PETA, KASUS: KASUS, SOROT: SOROT,
    KUADRAN: KUADRAN, INDIKATOR: INDIKATOR, SEGMEN: SEGMEN,
    LAPISAN: LAPISAN, INTEGRITAS: INTEGRITAS, rekap: rekap,
    fmtTgl: fmtTgl, fmtPendek: fmtPendek, HARI_INI: HARI_INI,
    periode: "Agustus 2026",
    cabang: "Kantor Cabang Jakarta Pusat",
    dianalisis: "02 September 2026, 08.41 WIB",
    durasi: "4,2 detik",
    versiModel: "pramana-1.0.3 · aturan 2026.08"
  };
})(window);
