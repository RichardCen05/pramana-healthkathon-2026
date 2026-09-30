# Dataset uji Vedika Autentik

Tujuh belas lembar bukti pelayanan fisioterapi sintetis yang dipakai untuk dua hal:

1. **Demo prototipe.** Lima berkas bertanda `demo: true` diunggah ke prototipe dan masing-masing menghasilkan label berbeda.
2. **Bahan awal untuk AI engineer.** Setiap berkas punya ground truth: isi yang seharusnya terbaca OCR, data klaim pembandingnya, jenis manipulasi, dan koordinat area yang dimanipulasi.

Semua nama, nomor kartu JKN, SEP, rumah sakit, dan dokter di sini fiktif. Tidak ada data peserta JKN yang nyata.

## Isi folder

| Folder | Berkas | Label yang diharapkan | Yang diuji |
|---|---|---|---|
| `01-berkas-asli` | VA-ASL-01 sampai 04 | Lolos | Berkas jujur, termasuk yang difoto dengan HP (VA-ASL-04). Sistem tidak boleh salah tangkap. |
| `02-berkas-kembar` | VA-KMB-00 sampai 03 | Prioritas (00 Lolos) | Satu lembar dipakai untuk pasien lain atau bulan lain. VA-KMB-00 adalah lembar asli Bu Siti yang sudah ada di arsip. |
| `03-angka-disunting` | VA-DST-01 sampai 03 | Prioritas / Perlu dicek | Angka jumlah kunjungan diubah, baris disalin-tempel, bulan pada tanggal diganti. |
| `04-buatan-ai` | VA-AI-01 sampai 03 | Perlu dicek / Prioritas | Gambar dari generator AI dan berkas dari aplikasi desain. |
| `05-scan-buram` | VA-BRM-01 sampai 03 | Scan ulang | Buram, gelap, terpotong. Tidak boleh dianggap kecurangan. |

Berkas demo: `VA-ASL-01`, `VA-KMB-01`, `VA-DST-01`, `VA-AI-01`, `VA-BRM-01`.

`label.csv` memuat tabel lengkapnya, dan `klaim.csv` memuat data klaim dari sisi E-Klaim (jumlah sesi yang ditagih dan nilainya).

## Format berkas

Setiap sampel punya:

- `.pdf`: berkas seperti yang diunggah rumah sakit ke JKN Drive. Metadata `Producer`, `Creator`, `CreationDate`, dan `ModDate` ikut diisi. Contohnya, berkas kembar dibuka ulang di editor PDF beberapa hari setelah dipindai.
- `.jpg`: halaman yang sama sebagai gambar, dipakai prototipe dan untuk pelatihan.
- `.png` (khusus `04-buatan-ai`): VA-AI-01 membawa metadata IPTC `trainedAlgorithmicMedia` tiruan, VA-AI-03 tanpa metadata sama sekali.
- `.json`: ground truth.

## Ground truth

Potongan dari `03-angka-disunting/VA-DST-01.json`:

```json
{
  "id": "VA-DST-01",
  "label_diharapkan": "Prioritas",
  "klaim":      { "sep": "0901R0140826V583301", "sesi_ditagih": 8, "nilai_klaim": 1658400 },
  "isi_lembar": { "nama": "Ratna Kusuma", "baris_terisi": 5, "jumlah_kunjungan_tertulis": 8, "kemiripan_ttd_rerata": 0.815 },
  "kualitas_scan": { "status": "baik", "catatan": "Terbaca, miring 0.4 derajat." },
  "temuan": [
    { "cek": "kecocokan_klaim", "kekuatan": "kuat", "region": [90, 1036, 1065, 283],
      "kalimat": "Ditagih 8 sesi, berkas hanya mendukung 5. Baris 6 sampai 8 kosong, tanpa tanggal dan tanda tangan." },
    { "cek": "suntingan", "kekuatan": "sedang", "region": [347, 1360, 29, 44],
      "kalimat": "Angka 8 di kolom jumlah kunjungan terdeteksi ditempel di atas angka 5." }
  ],
  "metadata_file": { "Producer": "Microsoft: Print To PDF", "Creator": "Adobe Photoshop 25.0", "ModDate": "2026-09-01T22:05:00" },
  "region_lembar": { "tabel": [86, 541, 1069, 779] }
}
```

- Nilai `cek` mengikuti enam pemeriksaan di PRD (`kecocokan_klaim`, `berkas_kembar`, `copy_paste`, `tempelan`, `suntingan`, `tanda_ai`), ditambah `kualitas_scan`.
- `kekuatan` bernilai `kuat`, `sedang`, `lemah`, atau `info` (khusus kualitas scan).
- `region` berformat `[x, y, lebar, tinggi]` dalam piksel pada `.jpg`, sudah mengikuti kemiringan dan perspektif pindaian. Nilainya `null` bila temuan berlaku untuk seluruh berkas, misalnya metadata. Temuan suntingan juga punya `area`, yaitu daftar kotak per tambalan.
- Label mengikuti aturan PRD bagian 9. Dua sinyal kuat, atau satu kuat ditambah sinyal lain, menjadi Prioritas. Satu sinyal sedang menjadi Perlu dicek. Tanda AI tidak pernah menjadi satu-satunya alasan Prioritas.
- `kemiripan_ttd_rerata` dihitung dari selisih titik kurva tanda tangan. Tanda tangan asli ada di kisaran 0,8, sedangkan tanda tangan tempelan bernilai 1.

## Format lembar

Formulir mengikuti lampiran klaim rehabilitasi medik yang umum dipakai rumah sakit: identitas pasien dan SEP, diagnosis medis dan fungsi, program terapi dari DPJP Sp.KFR, satu baris per sesi dengan paraf terapis dan tanda tangan pasien, jumlah kunjungan, serta tanda tangan dan stempel DPJP. Jadwalnya dua kali seminggu, maksimal delapan sesi per bulan, sesuai batas penjaminan rehabilitasi medik di Peraturan Direktur Jaminan Pelayanan Kesehatan BPJS Kesehatan No. 5 Tahun 2018.

Kop, nomor formulir, dan tata letak setiap rumah sakit dibuat sendiri dan tidak meniru formulir rumah sakit tertentu.

## Membangun ulang

```bash
cd tools/dataset
npm install && npx playwright install chromium
pip install -r requirements.txt
./build.sh
```

`spec.js` menentukan setiap sampel. Untuk menambah variasi, tambahkan entri baru dengan pasien, benih tanda tangan, dan jenis rekayasa yang berbeda.

## Batasan

- Tulisan tangan memakai huruf tulisan tangan komputer (Kalam, Caveat), dan tanda tangan dibangkitkan dari kurva. Dataset ini cukup untuk demo dan untuk menguji pipeline dari ujung ke ujung. Untuk melatih dan mengukur model, tetap dibutuhkan formulir yang ditulis tangan oleh 20–30 relawan, sesuai rencana di PRD bagian 13.
- Metadata C2PA di VA-AI-01 hanya teks tiruan, bukan manifes C2PA yang ditandatangani.
- Semua berkas satu halaman.
