# Asal aset Veritas Autentik

`veritas-mark.svg` adalah logo vektor khusus: dua lembar dokumen membentuk huruf V, dengan satu titik bukti. Tidak memakai shield-check, logo BPJS, foto avatar, gradient, atau ilustrasi hero.

`document-photo-template.jpg` dan `document-photo-template-shadow.jpg` dibuat dengan image generation bawaan dalam mode edit gambar. Prompt pertama meminta foto dokumenter satu lembar A4 kosong di meja abu-abu, dengan perspektif, tepi kertas, bayangan lembut, lipatan, dan tekstur foto ponsel, sekaligus menghapus semua garis dan teks. Prompt kedua mempertahankan geometri lembar yang sama dan menambah bayangan diagonal, noda kecil, serta pencahayaan lebih hangat. Kedua file hanya menyediakan permukaan fisik dokumen. Semua kata, angka, tabel, nomor identitas, tanda tangan, serta area temuan dalam 43 berkas tambahan dibuat secara deterministik oleh `tools/dataset/expand-demo.js`.

Foto hasil image generation tidak dipakai sebagai foto pasien, petugas, atau bukti dunia nyata. Seluruh berkas adalah simulasi berlabel data sintetis.
