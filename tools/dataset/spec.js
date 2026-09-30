/* Spesifikasi dataset berkas fisioterapi sintetis untuk Vedika Autentik.
   Semua nama, nomor kartu, SEP, dan fasilitas kesehatan di sini fiktif.

   Setiap sampel menjelaskan dua sisi:
   - isi lembar: apa yang tertulis di kertas (yang nanti dibaca OCR)
   - `ditagih`: jumlah sesi yang diklaim rumah sakit lewat E-Klaim
   `rekayasa` menentukan manipulasi yang diterapkan finish.py setelah render. */

"use strict";

const FASKES = {
  melati: {
    nama: "RS Melati Sehat", kode: "0901R014", kelas: "Kelas C",
    alamat: "Jl. Kenanga Raya No. 41, Jakarta Pusat 10430", telp: "(021) 555-0141",
    unit: "Instalasi Rehabilitasi Medik", dpjp: "dr. Ayu Prameswari, Sp.KFR",
    terapis: ["Tri Wibowo, S.Ft", "Rina Anggraini, S.Ft"], formKode: "RM-KFR/05 Rev.02"
  },
  bakti: {
    nama: "RSU Bakti Mulia", kode: "0901R041", kelas: "Kelas C",
    alamat: "Jl. Cempaka Barat No. 17, Jakarta Pusat 10510", telp: "(021) 555-0417",
    unit: "Unit Rehabilitasi Medik", dpjp: "dr. Bimo Aryasatya, Sp.KFR",
    terapis: ["Maya Pradipta, S.Ft"], formKode: "F-REHAB/03"
  },
  cipta: {
    nama: "RS Cipta Medika", kode: "0901R027", kelas: "Kelas B",
    alamat: "Jl. Percetakan Negara VII No. 9, Jakarta Pusat 10560", telp: "(021) 555-0279",
    unit: "Instalasi Kedokteran Fisik dan Rehabilitasi", dpjp: "dr. H. Suparman, Sp.KFR",
    terapis: ["Dimas Kurniawan, S.Ft", "Laras Setyowati, A.Md.Ft"], formKode: "IKFR-012"
  }
};

const DIAGNOSIS = {
  lbp: { teks: "Low back pain", icd: "M54.5", fungsi: "Gangguan mobilitas lumbal", program: ["IR + TENS + Exercise", "IR + TENS + Stretching"] },
  oa: { teks: "Gonartrosis bilateral", icd: "M17.0", fungsi: "Gangguan ambulasi", program: ["US + Latihan penguatan", "MWD + Latihan LGS"] },
  fs: { teks: "Frozen shoulder kanan", icd: "M75.0", fungsi: "Keterbatasan LGS bahu", program: ["US + Mobilisasi sendi", "IR + Codman exercise"] },
  stroke: { teks: "Sekuele stroke iskemik", icd: "I69.4", fungsi: "Hemiparesis sinistra", program: ["NMES + Latihan fungsional", "Latihan keseimbangan + gait"] },
  cts: { teks: "Carpal tunnel syndrome", icd: "G56.0", fungsi: "Gangguan fungsi tangan", program: ["US + Tendon gliding", "TENS + Nerve gliding"] }
};

/* Penjaminan fisioterapi maksimal 2 kali seminggu, 8 kali sebulan (Perdir Jampelkes 5/2018). */
const JADWAL = {
  selasaJumat_ags: ["04/08", "07/08", "11/08", "14/08", "18/08", "21/08", "25/08", "28/08"],
  seninKamis_ags: ["03/08", "06/08", "10/08", "13/08", "17/08", "20/08", "24/08", "27/08"],
  rabuSabtu_ags: ["05/08", "08/08", "12/08", "15/08", "19/08", "22/08", "26/08", "29/08"],
  selasaJumat_sep: ["01/09", "04/09", "08/09", "11/09", "15/09", "18/09", "22/09", "25/09"],
  seninKamis_jul: ["06/07", "09/07", "13/07", "16/07", "20/07", "23/07", "27/07", "30/07"]
};

const TARIF_SESI = 207300;

function pasien(nama, lahir, rm, kartu, sepUrut, sigSeed, lk) {
  return { nama, lahir, rm, kartu, sepUrut, sigSeed, lk };
}

const SAMPEL = [
  /* ---------- 01 · berkas asli ---------- */
  {
    id: "VA-ASL-01", folder: "01-berkas-asli", demo: true, faskes: "melati", dx: "lbp",
    pasien: pasien("Hartono Wijaya", "12-03-1965", "00-41-2287", "0001482215736", "441903", 7311, true),
    periode: "Agustus 2026", bulanSep: "0826", jadwal: "selasaJumat_ags", terisi: 8, ditagih: 8,
    pindai: { alat: "flatbed", miring: -0.45 },
    label: "Lolos", ringkas: "Berkas asli, 8 sesi tercatat dan cocok dengan klaim."
  },
  {
    id: "VA-ASL-02", folder: "01-berkas-asli", faskes: "bakti", dx: "oa",
    pasien: pasien("Sri Handayani", "02-11-1969", "12-08-0931", "0001390447182", "452118", 9127, false),
    periode: "Agustus 2026", bulanSep: "0826", jadwal: "seninKamis_ags", terisi: 8, ditagih: 8,
    pindai: { alat: "flatbed", miring: 0.3 },
    label: "Lolos", ringkas: "Berkas asli. Menjadi sumber berkas kembar VA-KMB-03."
  },
  {
    id: "VA-ASL-03", folder: "01-berkas-asli", faskes: "cipta", dx: "fs",
    pasien: pasien("Agus Pratama", "27-07-1978", "07-55-1204", "0002218390455", "463370", 5503, true),
    periode: "Agustus 2026", bulanSep: "0826", jadwal: "rabuSabtu_ags", terisi: 6, ditagih: 6,
    pindai: { alat: "flatbed", miring: 0.6 },
    label: "Lolos", ringkas: "Berkas asli, 6 sesi, klaim juga 6 sesi."
  },
  {
    id: "VA-ASL-04", folder: "01-berkas-asli", faskes: "melati", dx: "stroke",
    pasien: pasien("Marlina Siregar", "19-01-1960", "00-39-8812", "0001125590318", "471026", 3391, false),
    periode: "Agustus 2026", bulanSep: "0826", jadwal: "seninKamis_ags", terisi: 8, ditagih: 8,
    pindai: { alat: "ponsel", miring: 1.1 },
    label: "Lolos", ringkas: "Berkas asli difoto dengan HP. Bayangan dan perspektif tidak boleh dianggap temuan."
  },

  /* ---------- 02 · berkas kembar ---------- */
  {
    id: "VA-KMB-00", folder: "02-berkas-kembar", faskes: "melati", dx: "lbp", peran: "sumber",
    pasien: pasien("Siti Rahmawati", "08-05-1963", "00-40-7719", "0001367702249", "447215", 6620, false),
    periode: "Agustus 2026", bulanSep: "0826", jadwal: "selasaJumat_ags", terisi: 8, ditagih: 8,
    pindai: { alat: "flatbed", miring: -0.3 },
    label: "Lolos", ringkas: "Berkas asli milik Bu Siti. Sudah ada di arsip sebelum kembarannya diunggah."
  },
  {
    id: "VA-KMB-01", folder: "02-berkas-kembar", demo: true, faskes: "melati", dx: "lbp",
    pasien: pasien("Budi Santoso", "30-09-1961", "00-41-0356", "0001508831967", "578778", 6620, true),
    periode: "Agustus 2026", bulanSep: "0826", jadwal: "selasaJumat_ags", terisi: 8, ditagih: 8,
    rekayasa: { jenis: "kembar", sumber: "VA-KMB-00", ganti: ["nama", "lahir", "rm", "kartu", "sep"] },
    label: "Prioritas", ringkas: "Lembar Bu Siti dipakai untuk klaim Pak Budi. Hanya identitas yang diganti."
  },
  {
    id: "VA-KMB-02", folder: "02-berkas-kembar", faskes: "melati", dx: "lbp",
    pasien: pasien("Siti Rahmawati", "08-05-1963", "00-40-7719", "0001367702249", "612004", 6620, false),
    periode: "September 2026", bulanSep: "0926", jadwal: "selasaJumat_sep", terisi: 8, ditagih: 8,
    rekayasa: { jenis: "kembar", sumber: "VA-KMB-00", ganti: ["sep", "periode", "tanggal"] },
    label: "Prioritas", ringkas: "Lembar Agustus Bu Siti dipakai lagi untuk klaim September. Tanggal dan SEP diganti."
  },
  {
    id: "VA-KMB-03", folder: "02-berkas-kembar", faskes: "bakti", dx: "oa",
    pasien: pasien("Yuliana Kusuma", "14-02-1971", "12-08-1102", "0001772034518", "455640", 9127, false),
    periode: "Agustus 2026", bulanSep: "0826", jadwal: "seninKamis_ags", terisi: 8, ditagih: 8,
    rekayasa: { jenis: "kembar", sumber: "VA-ASL-02", ganti: ["nama", "lahir", "rm", "kartu", "sep"] },
    label: "Prioritas", ringkas: "Lembar Bu Sri (VA-ASL-02) dipakai untuk klaim Bu Yuliana di RS yang sama."
  },

  /* ---------- 03 · angka atau teks disunting ---------- */
  {
    id: "VA-DST-01", folder: "03-angka-disunting", demo: true, faskes: "melati", dx: "oa",
    pasien: pasien("Ratna Kusuma", "23-06-1966", "00-41-3380", "0001611903327", "583301", 4471, false),
    periode: "Agustus 2026", bulanSep: "0826", jadwal: "selasaJumat_ags", terisi: 5, ditagih: 8,
    rekayasa: { jenis: "sunting-total", dari: "5", ke: "8" },
    pindai: { alat: "flatbed", miring: 0.4 },
    label: "Prioritas", ringkas: "Hanya 5 baris terisi, angka jumlah kunjungan diubah dari 5 menjadi 8."
  },
  {
    id: "VA-DST-02", folder: "03-angka-disunting", faskes: "cipta", dx: "cts",
    pasien: pasien("Bambang Nugroho", "05-12-1970", "07-56-0071", "0002304418862", "590117", 8802, true),
    periode: "Agustus 2026", bulanSep: "0826", jadwal: "rabuSabtu_ags", terisi: 6, ditagih: 8,
    rekayasa: { jenis: "salin-baris", salin: [[0, 6], [1, 7]] },
    pindai: { alat: "flatbed", miring: -0.5 },
    label: "Prioritas", ringkas: "Baris 7 dan 8 hasil salin-tempel baris 1 dan 2, lengkap dengan tanda tangannya."
  },
  {
    id: "VA-DST-03", folder: "03-angka-disunting", faskes: "bakti", dx: "lbp",
    pasien: pasien("Kartini Lestari", "11-10-1968", "12-07-8826", "0001457720913", "598845", 2257, false),
    periode: "Agustus 2026", bulanSep: "0826", jadwal: "seninKamis_ags", terisi: 8, ditagih: 8,
    rekayasa: { jenis: "sunting-bulan", jadwalAsli: "seninKamis_jul", periodeAsli: "Juli 2026" },
    pindai: { alat: "flatbed", miring: 0.25 },
    label: "Perlu dicek", ringkas: "Lembar Juli. Angka bulan pada delapan tanggal dan periode diubah ke Agustus."
  },

  /* ---------- 04 · dibuat dengan AI atau aplikasi desain ---------- */
  {
    id: "VA-AI-01", folder: "04-buatan-ai", demo: true, faskes: "melati", dx: "fs",
    pasien: pasien("Joko Prasetyo", "16-04-1974", "00-41-5521", "0001829934470", "601552", 1188, true),
    periode: "Agustus 2026", bulanSep: "0826", jadwal: "selasaJumat_ags", terisi: 8, ditagih: 8,
    rekayasa: { jenis: "generator-ai" },
    label: "Perlu dicek", ringkas: "Isi cocok dengan klaim, tetapi tidak ada ciri hasil pindai dan metadatanya menandai gambar buatan AI."
  },
  {
    id: "VA-AI-02", folder: "04-buatan-ai", faskes: "cipta", dx: "stroke",
    pasien: pasien("Dewi Anggraini", "03-08-1958", "07-55-9930", "0002117765093", "604410", 7777, false),
    periode: "Agustus 2026", bulanSep: "0826", jadwal: "rabuSabtu_ags", terisi: 8, ditagih: 8,
    rekayasa: { jenis: "aplikasi-desain" },
    label: "Prioritas", ringkas: "Disusun di aplikasi desain. Delapan tanda tangan adalah satu gambar yang ditempel berulang."
  },
  {
    id: "VA-AI-03", folder: "04-buatan-ai", faskes: "bakti", dx: "cts",
    pasien: pasien("Rudi Hidayat", "21-01-1976", "12-08-2290", "0001690042275", "607763", 5045, true),
    periode: "Agustus 2026", bulanSep: "0826", jadwal: "seninKamis_ags", terisi: 8, ditagih: 8,
    rekayasa: { jenis: "generator-ai", tanpaMeta: true },
    label: "Perlu dicek", ringkas: "Metadata dihapus. Sinyal yang tersisa hanya tidak adanya ciri hasil pindai dan teks kecil yang janggal."
  },

  /* ---------- 05 · scan buram atau terpotong ---------- */
  {
    id: "VA-BRM-01", folder: "05-scan-buram", demo: true, faskes: "melati", dx: "stroke",
    pasien: pasien("Dewi Lestari", "09-09-1962", "00-40-9904", "0001278853160", "589920", 3920, false),
    periode: "Agustus 2026", bulanSep: "0826", jadwal: "seninKamis_ags", terisi: 8, ditagih: 8,
    pindai: { alat: "buram", miring: 4.2, potongKanan: 0.2, blur: 2.4 },
    label: "Scan ulang", ringkas: "Buram, miring 4 derajat, dan kolom tanda tangan pasien terpotong di tepi kanan."
  },
  {
    id: "VA-BRM-02", folder: "05-scan-buram", faskes: "cipta", dx: "lbp",
    pasien: pasien("Fajar Maulana", "17-06-1980", "07-56-3318", "0002450019786", "592271", 6109, true),
    periode: "Agustus 2026", bulanSep: "0826", jadwal: "rabuSabtu_ags", terisi: 8, ditagih: 8,
    pindai: { alat: "gelap", miring: 2.4 },
    label: "Scan ulang", ringkas: "Foto HP terlalu gelap dan kontrasnya rendah, tanda tangan tidak terbaca."
  },
  {
    id: "VA-BRM-03", folder: "05-scan-buram", faskes: "bakti", dx: "oa",
    pasien: pasien("Nurhayati", "25-04-1959", "12-07-5561", "0001334478025", "595583", 4818, false),
    periode: "Agustus 2026", bulanSep: "0826", jadwal: "seninKamis_ags", terisi: 8, ditagih: 8,
    pindai: { alat: "flatbed", miring: -0.4, potongBawah: 0.3 },
    label: "Scan ulang", ringkas: "Bagian bawah halaman tidak ikut terpindai: baris 7 dan 8, jumlah kunjungan, dan tanda tangan DPJP hilang."
  }
];

function sep(faskes, bulanSep, urut) {
  return FASKES[faskes].kode + bulanSep + "V" + urut;
}

module.exports = { FASKES, DIAGNOSIS, JADWAL, SAMPEL, TARIF_SESI, sep };
