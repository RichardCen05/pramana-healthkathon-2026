# Corpus sintetis Veritas Autentik

Corpus ini berisi **60 kasus sintetis** untuk demo dan pengujian UX. Semua nama, nomor kartu, SEP, rumah sakit, dan dokter fiktif. Tidak ada data peserta JKN nyata. Corpus **tidak** dipakai untuk melatih model atau mengukur akurasi deteksi.

| Kategori | Jumlah | Tujuan demo |
|---|---:|---|
| Tanpa anomali | 10 | Menunjukkan batas pemeriksaan dan verifikasi biasa |
| Klaim tidak cocok | 8 | Membandingkan sesi ditagih dengan baris pendukung |
| Dokumen duplikat | 10 | Melihat lembar serupa dipakai untuk klaim berbeda |
| Copy–paste dalam dokumen | 8 | Melihat baris layanan berulang |
| Tempelan lintas berkas | 6 | Memeriksa area tanda tangan yang serupa |
| Edit teks atau angka | 8 | Meninjau jumlah kunjungan yang tampak ditimpa |
| Indikasi elemen sintetis | 6 | Menandai elemen digital yang perlu diperiksa |
| Scan buruk | 4 | Meminta scan ulang tanpa menyimpulkan kecurangan |

Terdapat 17 kasus awal di `01-berkas-asli` sampai `05-scan-buram`, dan 43 kasus tambahan di `06-korpus-demo`. Setiap kasus punya `.jpg`, `.pdf`, dan `.json`; beberapa kasus awal juga punya `.png`. `manifest.json` dan `manifest.js` menjadi indeks yang dibaca prototipe. `klaim.csv` dan `label.csv` adalah tabel pendamping.

Fixture JSON memuat `caseId`, `synthetic`, `overallStatus`, `checkResults`, `topFindings`, `evidenceRegions`, `relatedCaseIds`, `recommendation`, `participantConfirmation`, `auditTrail`, dan `fileHashes`. Status keseluruhan menggunakan `tidak_ada_anomali`, `scan_ulang`, `perlu_dicek`, atau `prioritas`. Hasil cek menggunakan `tidak_ditemukan`, `indikasi`, atau `tidak_dapat_dinilai`. Kekuatan bukti menggunakan `lemah`, `sedang`, atau `kuat`. Nilai numerik internal pada 17 fixture lama bukan probabilitas model dan tidak ditampilkan di UI.

## Aset gambar

Dua foto kertas kosong di `assets/document-photo-template*.jpg` dibuat dengan image generation, dengan variasi bayangan, lipatan, pencahayaan, dan noda halus. Script `tools/dataset/expand-demo.js` menempatkan teks, tabel delapan baris, nilai klaim, tanda tangan, dan ID secara deterministik di atasnya. Script juga menerapkan variasi kompresi, kecerahan, dan blur untuk kasus scan buruk. Karena itu teks dan metadata dapat diuji secara konsisten, tanpa bergantung pada teks acak hasil image generation.

Untuk membangun ulang 43 berkas tambahan setelah `npm install`, jalankan dari root proyek:

```bash
npm run build:corpus
```

Pengulangan script memperbarui manifest, CSV, JSON, JPG, dan PDF. Hash SHA-256 dihitung ulang. Jangan menganggap hasil ini setara dokumen dunia nyata: gaya tanda tangan dan variasi formulir masih terbatas. Pengembangan model sungguhan membutuhkan izin, data yang representatif, pemisahan train/test, label adjudikasi, serta validasi eksternal yang terpisah.
