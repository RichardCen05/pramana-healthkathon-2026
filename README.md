# PRAMANA: Konsol Telaah Klaim JKN

Prototipe untuk **BPJS Kesehatan Healthkathon 2026**
Kategori: *Efisiensi Risiko pada Fasilitas Kesehatan*

**Demo langsung: <https://pramana-flax.vercel.app>**

> BPJS Kesehatan memeriksa apakah berkas klaim lengkap, bukan apakah layanannya diberikan.
> PRAMANA membaca citra berkasnya, menjejak alur obatnya, lalu bertanya ke pesertanya,
> dan menyilangkan ketiganya jadi satu keputusan.

---

## Masalah

Modus kecurangan yang paling terbukti di Indonesia bukan klaim mahal yang rumit, melainkan klaim
kecil yang berulang. Pada temuan KPK di tiga rumah sakit, **3.269 dari 4.341 tagihan fisioterapi
tidak punya catatan medis pendukung** . Sekitar 75% kasus phantom billing berasal dari satu jenis
layanan saja.

Bukti kunci pada klaim seperti ini berbentuk lembaran hasil pindai: jadwal terapi, lembar bukti
pelayanan bertanda tangan pasien, bukti serah terima obat. Justru bentuk bukti inilah yang paling
mudah digandakan dan paling jarang diperiksa keasliannya. Audit konvensional hanya menyentuh
5–10% klaim lewat sampling.

## Modus yang disasar

| No. | Jenis kecurangan (Permenkes 16/2019) |
|-----|--------------------------------------|
| 5   | Cloning (penjiplakan klaim) |
| 6   | Phantom billing (klaim palsu) |
| 14  | Menagihkan tindakan yang tidak dilakukan |
| 17  | Klaim fiktif obat/alkes/tindakan |
| 18  | Pengurangan jumlah obat |
| 20  | Manipulasi hasil pemeriksaan |

## Tiga lapisan bukti , kerangka Tri Pramana

| Lapisan | Makna | Yang diperiksa |
|---------|-------|----------------|
| **Pratyaksa** · Bukti Lihat | kebenaran dari pengamatan langsung | Keragaman tanda tangan, kloning lembar antar pasien, jejak tulisan & media, nilai klinis pada lembar monitoring, selisih penyerahan obat |
| **Anumana** · Bukti Jejak | kebenaran dari penalaran atas tanda | Denyut ritme perawatan, ketimpangan antar-obat dalam satu resep, uji kehadiran terapi, beban kapasitas pelaksana |
| **Sabda** · Bukti Saksi | kebenaran dari kesaksian yang tepercaya | Konfirmasi mikro satu ketuk kepada peserta lewat Mobile JKN |

Keduanya disilangkan pada **Matriks Bukti Ganda** menjadi empat rute tindak lanjut yang berbeda:

|                              | Bukti visual sahih            | Bukti visual cacat / gandaan     |
|------------------------------|-------------------------------|----------------------------------|
| **Jejak konsisten**          | K1 lolos cepat              | K2 cacat administrasi          |
| **Jejak janggal / kosong**   | K3 audit penyerahan obat    | K4 dugaan phantom / cloning    |

Kuadran K2 adalah alasan produk ini ada: berkas yang sekadar berantakan tidak boleh diperlakukan
sama seperti klaim fiktif.

---

## Menjalankan secara lokal

Tidak ada build step dan tidak ada dependensi npm. Cukup layani foldernya:

```bash
python3 -m http.server 8899
```

Lalu buka <http://localhost:8899>.

## Menguji tur

Tur produk punya uji regresi Playwright: 98 pemeriksaan meliputi dua belas langkah,
tombol kembali, lewati, ulang, papan tik, empat langkah interaktif, kurungan kartu
di dalam layar, layar ponsel, dan kebersihan konsol.

```bash
npm i playwright && npx playwright install chromium
PW_HEADLESS=true TARGET_URL=https://pramana-flax.vercel.app/ node tests/tur.test.js
```

Hilangkan `TARGET_URL` untuk menguji berkas lokal.

## Struktur

| Berkas | Isi |
|--------|-----|
| `index.html` | Kerangka halaman. Ditulis tanpa `<!doctype>/<html>/<head>/<body>` supaya satu berkas jalan lokal sekaligus bisa dipublikasikan sebagai artifact |
| `app.css` | Token warna monokrom hangat, tipografi, komponen, gaya cetak |
| `data.js` | PRNG berbenih, 1.184 klaim sintetis, perakit bukti, enam kasus yang ditulis tangan |
| `docs.js` | Pembangkit tanda tangan dan lembar klaim sebagai SVG |
| `app.js` | Perute, tampilan, indikator, mesin tur, pembuat PDF |
| `tests/tur.test.js` | Uji regresi tur produk |

### Catatan teknis yang tidak terlihat dari kode

Tanda tangan dan lembar klaim **digenerate runtime sebagai SVG**, bukan gambar jadi. Konsekuensinya:
skor kemiripan yang muncul di layar benar-benar dihitung dari selisih titik pada kurva Bézier-nya,
bukan angka yang ditulis tangan di berkas data.

- `jitter = 0` → goresan identik, dengan variasi pemindaian 0,004 → **berkas gandaan**
- `jitter ≈ 0,15` → variasi alami manusia → **berkas asli**

Ambang variasi alami tanda tangan manusia diletakkan pada 0,90.

---

## Batasan

- Seluruh data bersifat **sintetis**. Tidak ada data peserta JKN yang nyata, sesuai ketentuan
  kerahasiaan pada panduan Healthkathon 2026.
- Sistem menghasilkan **prioritas audit beserta alasannya**, bukan penetapan kecurangan. Keputusan
  akhir tetap pada Tim Pencegahan dan Penanganan Kecurangan JKN sesuai Permenkes 16/2019.
- Ambang setiap indikator perlu dikalibrasi bersama BPJS Kesehatan menggunakan data riil.
