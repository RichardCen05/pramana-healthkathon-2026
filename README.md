# Veritas Autentik

Prototipe fitur Vedika/JKN Drive, **Powered by PRAMANA**, untuk BPJS Kesehatan Healthkathon 2026. Veritas membantu verifikator menemukan anomali dokumen fisioterapi, memahami bukti, dan menentukan tindak lanjut. Veritas **tidak** menetapkan fraud, menolak klaim, membuktikan layanan terjadi, atau menggantikan verifikasi klaim biasa.

Seluruh data pada prototipe ini sintetis. Hasil pemeriksaan berasal dari fixture yang sudah dikurasi, **bukan dari model AI yang berjalan atau terkalibrasi**. Tampilan selalu memberi label `PROTOTIPE · DATA SINTETIS`.

## Alur demo tiga menit

1. Masuk sebagai verifikator demo. Antrean langsung berisi 60 kasus; buka kasus `VA-KMB-02` untuk melihat indikasi berkas kembar dan dua bukti bernomor.
2. Di tab **Bukti**, lihat dokumen pembanding dan hubungan antarberkas. Temuan awal dibatasi tiga; pemeriksaan lain tersedia melalui disclosure.
3. Buka kasus `VA-DST-01` untuk melihat jumlah sesi yang tidak sesuai, lalu lihat konfirmasi peserta sebagai konteks tambahan yang netral.
4. Di desktop, tinjau konsekuensi tindakan, konfirmasi keputusan manusia, lalu lihat **Jejak** dan laporan temuan. Keputusan dapat dibatalkan.

Mobile sengaja hanya untuk triage dan monitoring: prioritas, cari/filter, ringkasan kasus, dan potongan bukti yang dapat diperbesar. Perbandingan penuh dan keputusan akhir tersedia di desktop.

## Corpus demo

`dataset/` berisi 60 kasus: 17 berkas sintetis awal dan 43 berkas tambahan yang dibuat dari dua foto kertas kosong hasil image generation, lalu diberi teks, tabel, angka, ID, dan label secara deterministik. Rinciannya: 10 tanpa anomali, 8 klaim tidak cocok, 10 duplikat, 8 copy–paste, 6 tempelan lintas berkas, 8 angka disunting, 6 indikasi elemen sintetis, dan 4 scan buruk. Setiap kasus memiliki gambar, PDF, JSON, relasi kasus, area bukti, rekomendasi, audit awal, dan SHA-256. Lihat [panduan corpus](dataset/README.md).

Unggah berkas dalam mode demo hanya mengenali file yang hash-nya cocok dengan corpus. Nama file yang sama tanpa isi yang cocok ditolak. Ini bukan analisis dokumen baru.

## Menjalankan dan menguji

Tidak ada build step untuk UI. Dari folder proyek:

```bash
npm install
npx playwright install chromium
npm run serve
```

Buka <http://localhost:8899>. Pengujian browser dan validasi fixture:

```bash
npm test
```

Tes mencakup seluruh 60 fixture dan hash file, alur keputusan dan undo, unggah, aksesibilitas drawer, serta viewport 1440×900, 1280×720, 1024×768, 390×844, dan 360×800. Untuk menguji URL lain, gunakan `TARGET_URL=...`.

## Batasan

- Tidak ada data peserta JKN nyata, integrasi JKN Drive/PANDAWA nyata, atau pengiriman pesan.
- Corpus ini untuk demo alur dan uji UX, **bukan** data pelatihan atau validasi akurasi model.
- Saran Veritas adalah urutan kerja berbasis fixture, bukan keputusan medis, pembayaran, atau kecurangan.
- Evaluasi usability dengan minimal lima verifikator dan audit VoiceOver tetap perlu dilakukan sebelum klaim kesiapan implementasi nyata.
