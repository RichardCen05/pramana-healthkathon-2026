/* Tambah 43 berkas sintetis terkurasi tanpa mengubah 17 berkas asli.
   Jalankan dengan NODE_PATH mengarah ke runtime yang menyediakan sharp dan pdf-lib.
   Hasil ini untuk demo UX, bukan pelatihan atau pengukuran model. */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const sharp = require("sharp");
const { PDFDocument } = require("pdf-lib");

const root = path.resolve(__dirname, "../..");
const dataset = path.join(root, "dataset");
const folder = "06-korpus-demo";
const out = path.join(dataset, folder);
const base = path.join(root, "assets", "document-photo-template.jpg");
const baseShadow = path.join(root, "assets", "document-photo-template-shadow.jpg");
const W = 1240, H = 1754;
const tarif = 207300;
const groups = [
  ["OK", 5, "tanpa_anomali"], ["CLM", 8, "klaim_tidak_cocok"],
  ["DUP", 7, "duplikat"], ["COP", 6, "copy_paste"],
  ["XDC", 6, "tempelan_lintas_berkas"], ["EDT", 6, "angka_disunting"],
  ["SYN", 4, "elemen_sintetis"], ["SCN", 1, "scan_buruk"]
];
const names = [
  "Nadia Permatasari", "Arman Saputra", "Lilis Wulandari", "Farhan Maulana", "Diah Puspitasari",
  "Taufik Hidayat", "Mira Kurniawati", "Suharto Prabowo", "Anisa Rahma", "Yusuf Aditya",
  "Rika Sulastri", "Hendra Gunawan", "Putri Melati", "Wahyu Setiawan", "Nina Kartika",
  "Bayu Pamungkas", "Sari Oktaviani", "Dedi Firmansyah", "Ayu Lestari", "Ridwan Hakim",
  "Intan Maharani", "Lukman Haris", "Wulan Anggraini", "Fikri Ramadhan", "Yuni Astuti",
  "Darmawan Putra", "Fitri Amelia", "Adnan Prasetyo", "Ratih Cahyani", "Irfan Nugraha",
  "Siska Andriani", "Aditia Kusuma", "Nur Aini", "Rangga Mahendra", "Hani Pertiwi",
  "Dimas Ardiansyah", "Maya Safitri", "Bagas Wicaksono", "Niken Pratiwi", "Rizal Fadilah",
  "Citra Dewi", "Suryo Wibowo", "Dina Kurniasih"
];
const hospitals = [
  ["RS Melati Sehat", "0901R014", "dr. Ayu Prameswari, Sp.KFR"],
  ["RS Cipta Medika", "0901R027", "dr. H. Suparman, Sp.KFR"],
  ["RSU Bakti Mulia", "0901R041", "dr. Bimo Aryasatya, Sp.KFR"]
];
const labels = { tanpa_anomali: "Lolos", klaim_tidak_cocok: "Perlu dicek", duplikat: "Prioritas", copy_paste: "Prioritas", tempelan_lintas_berkas: "Prioritas", angka_disunting: "Prioritas", elemen_sintetis: "Perlu dicek", scan_buruk: "Scan ulang" };
const expected = { tanpa_anomali: 10, klaim_tidak_cocok: 8, duplikat: 10, copy_paste: 8, tempelan_lintas_berkas: 6, angka_disunting: 8, elemen_sintetis: 6, scan_buruk: 4 };
const xml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
const csv = (s) => /[",\n]/.test(String(s)) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s);

function entries() {
  const cases = [];
  let index = 0;
  for (const [prefix, count, category] of groups) {
    for (let n = 1; n <= count; n++) {
      const serial = ++index;
      const id = `VA-${prefix}-${String(n).padStart(2, "0")}`;
      let hospital = hospitals[(serial - 1) % hospitals.length];
      const name = names[serial - 1];
      const claimed = ["klaim_tidak_cocok", "angka_disunting"].includes(category) ? 8 : serial % 5 === 0 ? 6 : 8;
      const supported = ["klaim_tidak_cocok", "angka_disunting"].includes(category) ? 5 + (n % 2) : claimed;
      const source = category === "duplikat" ? `VA-OK-${String(((n - 1) % 4) + 1).padStart(2, "0")}`
        : category === "tempelan_lintas_berkas" ? `VA-OK-${String(((n + 1) % 4) + 1).padStart(2, "0")}` : null;
      if (category === "duplikat") hospital = hospitals[(Number(source.slice(-2)) - 1) % hospitals.length];
      cases.push({ id, category, serial, n, name, hospital, claimed, supported, source });
    }
  }
  return cases;
}

function findings(x) {
  const reg = {
    table: [90, 455, 1060, 720], signs: [880, 610, 260, 440], rows: [90, 980, 1060, 180],
    total: [870, 1210, 270, 75], head: [100, 275, 1040, 175], scan: [50, 430, 1140, 900]
  };
  switch (x.category) {
    case "klaim_tidak_cocok": return [{ cek: "kecocokan_klaim", kekuatan: "kuat", region: reg.rows, kalimat: `Klaim menagih ${x.claimed} sesi, tetapi hanya ${x.supported} baris memiliki tanggal dan tanda tangan. Minta klarifikasi sebelum melanjutkan.` }];
    case "duplikat": return [
      { cek: "berkas_kembar", kekuatan: "kuat", pasangan: x.source, region: reg.table, kalimat: `Susunan sesi dan tanda tangan berulang seperti berkas ${x.source}. Identitas dan SEP berbeda.` },
      { cek: "tempelan", kekuatan: "kuat", pasangan: x.source, region: reg.signs, kalimat: `Area tanda tangan pada berkas ini memakai pola yang sama dengan ${x.source}.` }
    ];
    case "copy_paste": return [
      { cek: "copy_paste", kekuatan: "kuat", region: reg.rows, kalimat: "Baris 7 dan 8 mengulang isi dan bentuk tanda tangan baris 1 dan 2." },
      { cek: "kecocokan_klaim", kekuatan: "sedang", region: reg.rows, kalimat: "Dua sesi terakhir perlu dikonfirmasi karena buktinya berulang." }
    ];
    case "tempelan_lintas_berkas": return [
      { cek: "tempelan", kekuatan: "kuat", pasangan: x.source, region: reg.signs, kalimat: `Potongan tanda tangan serupa dengan yang ada di ${x.source}. Periksa sumber aslinya.` },
      { cek: "copy_paste", kekuatan: "sedang", region: reg.signs, kalimat: "Tekstur di sekitar tanda tangan berbeda dari kertas sekitarnya." }
    ];
    case "angka_disunting": return [
      { cek: "kecocokan_klaim", kekuatan: "kuat", region: reg.rows, kalimat: `Hanya ${x.supported} sesi terisi, sedangkan klaim menagih ${x.claimed} sesi.` },
      { cek: "suntingan", kekuatan: "sedang", region: reg.total, kalimat: `Angka jumlah kunjungan tampak ditimpa dari ${x.supported} menjadi ${x.claimed}.` }
    ];
    case "elemen_sintetis": return [{ cek: "tanda_ai", kekuatan: "sedang", region: reg.signs, kalimat: "Bentuk tanda tangan berulang identik. Ini indikasi elemen digital yang perlu diperiksa, bukan bukti dokumen dibuat AI." }];
    case "scan_buruk": return [{ cek: "kualitas_scan", kekuatan: "info", region: reg.scan, kalimat: "Foto buram dan tepi formulir terpotong. Minta unggahan ulang agar isi dapat dinilai." }];
    default: return [];
  }
}

function summary(x) {
  return ({ tanpa_anomali: "Tidak ada anomali pada pemeriksaan yang tersedia.", klaim_tidak_cocok: `Klaim ${x.claimed} sesi, berkas mendukung ${x.supported} sesi.`,
    duplikat: `Susunan sesi serupa dengan ${x.source}; identitas berbeda.`, copy_paste: "Dua baris layanan mengulang isi dan tanda tangan baris sebelumnya.",
    tempelan_lintas_berkas: `Tanda tangan serupa dengan berkas ${x.source}.`, angka_disunting: `Jumlah kunjungan tampak ditimpa; ${x.supported} baris terisi.`,
    elemen_sintetis: "Ada indikasi elemen digital yang perlu diperiksa.", scan_buruk: "Foto buram; pemeriksaan keaslian belum dapat dilakukan." })[x.category];
}

function signature(seed, row) {
  const offset = (seed * 17 + row * 13) % 14;
  const first = 15 + (seed * 7 + row * 3) % 15;
  const middle = 27 + (seed * 11 + row * 5) % 17;
  const last = 5 + (seed * 13 + row * 7) % 18;
  return `<path d="M0 ${24 + offset} C${first} ${3 + offset}, ${middle} ${43 + offset}, 60 ${18 + offset} S${82 + first % 12} ${30 + offset}, 116 ${last + offset} M${22 + row % 9} ${31 + offset} Q${54 + middle % 18} ${42 + offset}, 104 ${34 + offset}" fill="none" stroke="#2f4d73" stroke-width="2.1" stroke-linecap="round" opacity=".82"/>`;
}

function overlay(x) {
  const sourceSerial = x.source ? Number(x.source.slice(-2)) : x.serial;
  const rows = Array.from({ length: 8 }, (_, i) => {
    const visible = i < x.supported || x.category === "copy_paste";
    if (!visible) return "";
    const copied = x.category === "copy_paste" && i >= 6;
    const row = copied ? i - 6 : i;
    const dateSerial = x.category === "duplikat" ? sourceSerial : x.serial;
    const day = 3 + row * 3 + (dateSerial % 3);
    const y = 570 + i * 76;
    const signSeed = x.category === "elemen_sintetis" ? x.serial : ["duplikat", "tempelan_lintas_berkas"].includes(x.category) ? sourceSerial * 3 + row : x.serial * 3 + row;
    const signRow = x.category === "elemen_sintetis" ? 1 : row;
    return `<text x="135" y="${y}" class="body">${i + 1}</text><text x="230" y="${y}" class="body">${String(day).padStart(2, "0")}/08/2026</text><text x="435" y="${y}" class="body">Fisioterapi · latihan gerak</text><g transform="translate(890 ${y - 34})">${signature(signSeed, signRow)}</g>`;
  }).join("");
  const total = x.category === "angka_disunting" ? x.claimed : x.supported;
  const patch = x.category === "angka_disunting" ? '<rect x="862" y="1190" width="145" height="47" rx="2" fill="#f0f1ee" opacity=".86"/>' : "";
  const signPatch = x.category === "tempelan_lintas_berkas" ? Array.from({ length: x.supported }, (_, i) => `<rect x="879" y="${526 + i * 76}" width="143" height="55" rx="1" fill="#f6f4ed" opacity=".82"/>`).join("") : "";
  const tag = x.category === "elemen_sintetis" ? '<text x="845" y="1480" class="note">DOKUMEN DIGITAL</text>' : "";
  const tableRules = Array.from({ length: 9 }, (_, i) => `<path d="M120 ${520 + i * 76}H1120"/>`).join("");
  const form = `<g fill="none" stroke="#81909a" stroke-width="1.3" opacity=".68"><path d="M120 232H1120"/><rect x="120" y="257" width="1000" height="124"/><path d="M120 319H1120M670 257V381"/><rect x="120" y="421" width="1000" height="52"/><rect x="120" y="520" width="1000" height="608"/>${tableRules}<path d="M205 520V1128M410 520V1128M870 520V1128"/><rect x="120" y="1170" width="1000" height="108"/><rect x="120" y="1380" width="1000" height="145"/><path d="M120 1420H1120M680 1380V1525"/></g>`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><style>.head{font:700 27px Arial,sans-serif;fill:#1c374f}.title{font:700 23px Arial,sans-serif;fill:#1c374f}.body{font:19px Arial,sans-serif;fill:#243b4b}.meta{font:16px Arial,sans-serif;fill:#415567}.note{font:700 14px Arial,sans-serif;fill:#77828a}</style>${form}<text x="120" y="172" class="head">${xml(x.hospital[0])}</text><text x="120" y="213" class="title">LEMBAR BUKTI PELAYANAN FISIOTERAPI</text><text x="135" y="297" class="body">Nama: ${xml(x.name)}</text><text x="690" y="297" class="body">No. kartu: ${x.card}</text><text x="135" y="346" class="body">No. SEP: ${x.sep}</text><text x="690" y="346" class="body">Periode: Agustus 2026</text><text x="120" y="398" class="meta">Diagnosis: nyeri muskuloskeletal · DPJP: ${xml(x.hospital[2])}</text><text x="132" y="502" class="meta">NO.</text><text x="226" y="502" class="meta">TANGGAL</text><text x="432" y="502" class="meta">TINDAKAN</text><text x="877" y="502" class="meta">TTD PASIEN</text>${signPatch}${rows}${patch}<text x="135" y="1225" class="body">Jumlah kunjungan tercatat</text><text x="887" y="1225" class="title">${total} sesi</text><text x="135" y="1410" class="meta">Verifikator pelayanan</text><text x="135" y="1465" class="body">${xml(x.hospital[2])}</text>${tag}<text x="120" y="1600" class="note">Formulir simulasi · data sintetis · ${x.id}</text></svg>`);
}

async function render(x) {
  const template = x.serial % 3 === 0 ? baseShadow : base;
  const canvas = await sharp(template).resize(W, H, { fit: "fill" }).composite([{ input: overlay(x) }]).jpeg({ quality: 88 }).toBuffer();
  const photo = x.category === "scan_buruk" ? await sharp(canvas).blur(3.2).modulate({ brightness: .72 }).jpeg({ quality: 55 }).toBuffer()
    : await sharp(canvas).modulate({ brightness: .96 + (x.serial % 5) * .01, saturation: .92 + (x.serial % 4) * .03 }).jpeg({ quality: 82 + x.serial % 7 }).toBuffer();
  fs.writeFileSync(path.join(out, x.id + ".jpg"), photo);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const image = await pdf.embedJpg(photo);
  page.drawImage(image, { x: 0, y: 0, width: 595.28, height: 841.89 });
  pdf.setTitle(`Bukti fisioterapi sintetis ${x.id}`);
  pdf.setAuthor("Veritas Autentik · data sintetis");
  pdf.setProducer("Veritas demo corpus");
  fs.writeFileSync(path.join(out, x.id + ".pdf"), await pdf.save());
}

function record(x) {
  const dateSerial = x.category === "duplikat" ? Number(x.source.slice(-2)) : x.serial;
  const dates = Array.from({ length: x.supported }, (_, i) => `${String(3 + i * 3 + dateSerial % 3).padStart(2, "0")}/08`);
  const temuan = findings(x);
  return {
    id: x.id, folder, berkas: { jpg: x.id + ".jpg", pdf: x.id + ".pdf" }, ukuran: [W, H], demo: false,
    peran: "demo_ux", kategori_demo: x.category, synthetic: true, label_diharapkan: labels[x.category], ringkasan: summary(x),
    klaim: { sep: x.sep, peserta: x.name, no_kartu: x.card, faskes: x.hospital[0], kode_faskes: x.hospital[1], periode: "Agustus 2026", layanan: "Fisioterapi rawat jalan", sesi_ditagih: x.claimed, tarif_per_sesi: tarif, nilai_klaim: x.claimed * tarif, nilai_klaim_teks: `Rp${(x.claimed * tarif).toLocaleString("id-ID")}` },
    isi_lembar: { nama: x.name, tanggal_lahir: "01-01-1970", no_rm: `SIM-${String(x.serial).padStart(4, "0")}`, no_kartu: x.card, no_sep: x.sep, diagnosis: "Nyeri muskuloskeletal", icd10: "M79.1", dpjp: x.hospital[2], periode: "Agustus 2026", baris_terisi: x.supported, baris_asli: x.supported, tanggal_sesi: dates, jumlah_kunjungan_tertulis: x.category === "angka_disunting" ? x.claimed : x.supported, kemiripan_ttd_rerata: ["duplikat", "copy_paste", "tempelan_lintas_berkas", "elemen_sintetis"].includes(x.category) ? .99 : .82 },
    kualitas_scan: { status: x.category === "scan_buruk" ? "scan_ulang" : "baik", catatan: x.category === "scan_buruk" ? "Foto buram; beberapa baris tidak terbaca." : "Foto formulir terbaca." },
    temuan, metadata_file: { Producer: "Veritas demo corpus", Creator: "Formulir sintetis" }, pindai: { alat: x.category === "scan_buruk" ? "ponsel-buram" : "ponsel", miring: x.serial % 3 - 1 },
    region_lembar: { kop: [100, 135, 1040, 125], nama: [115, 275, 500, 45], sep: [115, 320, 540, 45], tabel: [90, 455, 1060, 720], total: [870, 1210, 270, 75] }
  };
}

function kindOf(b) {
  if (b.kategori_demo) return b.kategori_demo;
  if (b.kualitas_scan.status === "scan_ulang") return "scan_buruk";
  if (!b.temuan.length) return "tanpa_anomali";
  if (b.temuan.some((t) => t.cek === "berkas_kembar")) return "duplikat";
  if (b.temuan.some((t) => t.cek === "copy_paste")) return "copy_paste";
  if (b.temuan.some((t) => t.cek === "tanda_ai")) return "elemen_sintetis";
  if (b.temuan.some((t) => t.cek === "suntingan")) return "angka_disunting";
  return "klaim_tidak_cocok";
}

function enrich(b) {
  const status = { Lolos: "tidak_ada_anomali", "Scan ulang": "scan_ulang", "Perlu dicek": "perlu_dicek", Prioritas: "prioritas" };
  const checks = ["kualitas_scan", "kecocokan_klaim", "berkas_kembar", "copy_paste", "tempelan", "suntingan", "tanda_ai"];
  b.caseId = b.id;
  b.synthetic = true;
  b.overallStatus = status[b.label_diharapkan];
  b.checkResults = checks.map((check) => {
    const found = b.temuan.filter((t) => t.cek === check);
    return { check, result: b.overallStatus === "scan_ulang" && check !== "kualitas_scan" ? "tidak_dapat_dinilai" : found.length ? "indikasi" : "tidak_ditemukan", strength: found[0] ? (found[0].kekuatan === "info" ? "lemah" : found[0].kekuatan) : null };
  });
  b.topFindings = b.temuan.slice(0, 3);
  b.evidenceRegions = b.temuan.filter((t) => t.region).map((t) => ({ check: t.cek, region: t.region }));
  b.relatedCaseIds = [...new Set(b.temuan.map((t) => t.pasangan).filter(Boolean))];
  b.recommendation = ({ tidak_ada_anomali: "wajar", scan_ulang: "scanUlang", perlu_dicek: "klarifikasi", prioritas: "telaah" })[b.overallStatus];
  b.participantConfirmation = null;
  b.auditTrail = [];
  b.fileHashes = {};
  for (const ext of ["jpg", "pdf", "png"]) {
    const file = path.join(dataset, b.folder, b.id + "." + ext);
    if (fs.existsSync(file)) b.fileHashes[ext] = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  }
  return b;
}

async function main() {
  if (!fs.existsSync(base)) throw new Error("Template foto dokumen tidak ditemukan.");
  fs.mkdirSync(out, { recursive: true });
  const originals = JSON.parse(fs.readFileSync(path.join(dataset, "manifest.json"), "utf8")).filter((b) => b.folder !== folder);
  if (originals.length !== 17) throw new Error(`Dibutuhkan 17 kasus awal, ditemukan ${originals.length}.`);
  originals.forEach((b) => {
    b.ringkasan = b.ringkasan
      .replace("metadatanya menandai gambar buatan AI", "metadata memuat tag asal digital yang perlu diverifikasi")
      .replace("Disusun di aplikasi desain.", "Metadata mencantumkan aplikasi desain.");
    if (!b.temuan.length) b.ringkasan = "Tidak ditemukan anomali pada pemeriksaan yang tersedia.";
    else if (b.temuan.some((t) => t.cek === "berkas_kembar")) b.ringkasan = "Ada indikasi bagian dokumen digunakan ulang untuk klaim berbeda; periksa berkas pembanding.";
    else if (b.temuan.some((t) => t.cek === "suntingan")) b.ringkasan = "Ada indikasi bagian dokumen disunting; cocokkan dengan data klaim dan berkas asal.";
    b.temuan.forEach((t) => {
      t.kalimat = t.kalimat
        .replace("Isi berkas 97% sama dengan berkas", "Susunan sesi dan tanda tangan berulang seperti berkas")
        .replace("Tangan manusia tidak pernah menulis sepersis ini.", "Pola berulang ini perlu diperiksa pada berkas asal.")
        .replace("Berkas dibuat di aplikasi desain (Producer: Canva), bukan hasil pindai. Tulisan tangannya adalah huruf komputer.", "Metadata mencantumkan Producer: Canva dan huruf menyerupai font komputer. Asal berkas perlu diverifikasi.")
        .replace("Metadata berkas menandai gambar dibuat oleh generator AI (IPTC trainedAlgorithmicMedia).", "Metadata memuat tag IPTC trainedAlgorithmicMedia. Tag dapat diubah dan bukan bukti akhir asal gambar.");
    });
  });
  const specs = entries();
  for (const x of specs) {
    x.sep = `${x.hospital[1]}0826V${String(700000 + x.serial * 131).slice(-6)}`;
    x.card = `0001${String(500000000 + x.serial * 419).slice(-9)}`;
    await render(x);
  }
  const generated = specs.map(record);
  const all = originals.concat(generated).map(enrich);
  const byId = Object.fromEntries(all.map((b) => [b.id, b]));
  all.forEach((b) => b.relatedCaseIds.forEach((relatedId) => {
    const related = byId[relatedId];
    if (!related) throw new Error(`Relasi ${b.id} menunjuk berkas yang tidak ada: ${relatedId}`);
    if (!related.relatedCaseIds.includes(b.id)) related.relatedCaseIds.push(b.id);
  }));
  const counts = Object.fromEntries(Object.keys(expected).map((k) => [k, all.filter((x) => kindOf(x) === k).length]));
  for (const [k, n] of Object.entries(expected)) if (counts[k] !== n) throw new Error(`${k}: ${counts[k]} alih-alih ${n}`);
  all.forEach((x) => fs.writeFileSync(path.join(dataset, x.folder, x.id + ".json"), JSON.stringify(x, null, 2) + "\n"));
  fs.writeFileSync(path.join(dataset, "manifest.json"), JSON.stringify(all, null, 2) + "\n");
  fs.writeFileSync(path.join(dataset, "manifest.js"), "/* Data sintetis untuk prototipe. Dibangkitkan oleh tools/dataset/expand-demo.js. */\nwindow.VEDIKA_BERKAS = " + JSON.stringify(all) + ";\n");
  fs.writeFileSync(path.join(dataset, "klaim.csv"), "id_berkas,sep,peserta,no_kartu,faskes,kode_faskes,periode,sesi_ditagih,nilai_klaim\n" + all.map((b) => [b.id, b.klaim.sep, b.klaim.peserta, b.klaim.no_kartu, b.klaim.faskes, b.klaim.kode_faskes, b.klaim.periode, b.klaim.sesi_ditagih, b.klaim.nilai_klaim].map(csv).join(",")).join("\n") + "\n");
  fs.writeFileSync(path.join(dataset, "label.csv"), "id_berkas,folder,berkas_pdf,label_diharapkan,cek_terpicu,baris_terisi,sesi_ditagih,ringkasan\n" + all.map((b) => [b.id, b.folder, `${b.folder}/${b.berkas.pdf}`, b.label_diharapkan, b.temuan.map((t) => t.cek).join(";"), b.isi_lembar.baris_terisi, b.klaim.sesi_ditagih, b.ringkasan].map(csv).join(",")).join("\n") + "\n");
  console.log(JSON.stringify({ total: all.length, counts, files: generated.length * 3 }, null, 2));
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
