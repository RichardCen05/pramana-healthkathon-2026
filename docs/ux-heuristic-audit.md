# Audit UX Veritas Autentik — 1 Oktober 2026

Ruang lingkup: alur prototipe dari masuk → antrean → ringkasan kasus → bukti → keputusan → laporan/jejak, plus triage mobile. Ini evaluasi heuristik internal atas prototipe sintetis, bukan uji klinis, audit aksesibilitas menyeluruh, atau riset dengan pengguna nyata.

| Heuristik Nielsen | Penerapan yang dapat diperiksa |
|---|---|
| Visibilitas status sistem | Empat status antrean, alasan satu kalimat, progres demo, feedback keputusan, dan jejak audit. Badge prototipe selalu terlihat. |
| Kesesuaian dengan bahasa pengguna | `Scan ulang`, `Perlu dicek`, dan tindakan kontekstual menjelaskan langkah berikutnya; `Tidak ada anomali terdeteksi` tidak disamakan dengan klaim valid. |
| Kontrol dan kebebasan pengguna | Keputusan punya pratinjau, batal, tindakan alternatif, dan pembatalan. Undo kelompok tetap ada setelah reload, dan hanya membatalkan keputusan yang masih berasal dari batch tersebut. |
| Konsistensi dan standar | Antrean berupa tabel desktop/kartu mobile; tiga tab konvensional; filter lanjutan dan detail pemeriksaan memakai disclosure standar. |
| Pencegahan kesalahan | Tindakan kelompok menampilkan daftar 10 berkas dan dampaknya sebelum konfirmasi. Unggahan hanya mengenali hash file corpus; nama palsu ditolak. Mobile tidak menyediakan keputusan akhir. |
| Mengenali, bukan mengingat | Status, alasan, bukti bernomor, konteks fasilitas/tanggal, dan konsekuensi tindakan tersedia di sekitar titik keputusan. |
| Fleksibilitas dan efisiensi | Search/filter, tautan contoh bukti, pembanding dokumen desktop, dan potongan bukti yang dapat diperbesar di mobile. |
| Desain minimalis | Satu CTA primer per keadaan layar; tiga temuan awal; tiga tab; pemeriksaan rinci dan mode demo tertutup secara default. |
| Membantu mengenali dan pulih dari kesalahan | Pesan unggah tidak dikenal menjelaskan keterbatasan prototipe. Keputusan dan bulk dapat dibatalkan; tindakan scan buruk adalah minta scan ulang, bukan tuduhan. |
| Bantuan dan dokumentasi | Panduan singkat tersedia dari menu, tanpa tur wajib yang menghalangi pekerjaan. |

## Pemeriksaan otomatis

`tests/alur.test.js` memeriksa 60 fixture, relasi dan koordinat bukti, hash dan dimensi file, dialog keputusan, undo setelah reload, upload spoof, keyboard Escape/fokus, dan lima viewport. Seluruh viewport 1440×900, 1280×720, 1024×768, 390×844, dan 360×800 tidak mengalami overflow horizontal pada antrean dan detail. Target utama yang terlihat pada antrean, ringkasan, dan tab Bukti memiliki area minimal 44×44 px pada desktop dan ponsel. Rasio kontras pasangan teks utama/status pada palet baru berada di rentang 5,15:1–13,23:1 untuk pasangan yang diperiksa.

Tidak ditemukan temuan P0/P1 pada alur yang diperiksa secara internal. Ini **bukan** bukti bahwa seluruh WCAG AA sudah terpenuhi atau tidak ada masalah lain.

## Validasi yang masih perlu manusia

- Uji VoiceOver pada perangkat nyata, termasuk urutan baca tabel/kartu, bukti canvas, dialog, dan laporan PDF.
- Uji setidaknya lima verifikator dengan empat tugas dalam rencana produk; ukur waktu menemukan prioritas, menjelaskan rekomendasi, membedakan indikasi dari putusan fraud, dan menyelesaikan kasus dalam tiga menit.
- Tinjau kelayakan bahasa dan konsekuensi tindakan bersama pemilik proses klaim sebelum dipakai di luar demo.
- Validasi model, akurasi, dan data dunia nyata adalah pekerjaan terpisah; prototipe ini tidak memberikan hasil tersebut.
