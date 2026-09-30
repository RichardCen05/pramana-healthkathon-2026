/* Uji alur Vedika Autentik dari ujung ke ujung.

   Pemakaian:
     python3 -m http.server 8899          # dari akar repositori
     node tests/alur.test.js              # TARGET_URL=https://... untuk menguji hasil deploy
   Variabel opsional: CHROME=/path/ke/chrome, PW_HEADLESS=false */

const path = require("node:path");
const { chromium } = require("playwright");

const TARGET = (process.env.TARGET_URL || "http://localhost:8899/").replace(/#.*$/, "");
const DATASET = path.join(__dirname, "..", "dataset");

const lolos = [];
const gagal = [];
const cek = (syarat, nama, detail) => {
  if (syarat) { lolos.push(nama); console.log("  LULUS  " + nama); }
  else { gagal.push(nama); console.log("  GAGAL  " + nama + (detail ? " :: " + detail : "")); }
};

const HARAP = {
  "VA-ASL-01": "Lolos", "VA-KMB-01": "Prioritas", "VA-DST-01": "Prioritas", "VA-AI-01": "Perlu dicek", "VA-BRM-01": "Scan ulang"
};

async function labelBaris(page, id) {
  return page.$eval('tr[data-id="' + id + '"] .label', (el) => el.textContent.trim()).catch(() => null);
}

async function tanpaGeserSamping(page, nama) {
  const lebih = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  cek(lebih <= 1, nama, "halaman melebar " + lebih + "px");
}

(async () => {
  const browser = await chromium.launch({ headless: process.env.PW_HEADLESS !== "false", executablePath: process.env.CHROME || undefined });
  const konteks = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await konteks.newPage();
  const galat = [];
  page.on("pageerror", (e) => galat.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") galat.push(m.text()); });

  console.log("\nMasuk dan panduan");
  await page.goto(TARGET);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  cek(await page.isVisible("text=Otentikasi pengguna"), "halaman masuk tampil");
  await page.click('[data-aksi="masuk"]');
  await page.waitForSelector(".tur-kartu");
  cek((await page.textContent(".tur-kartu h3")).includes("Selamat datang"), "panduan terbuka otomatis setelah masuk");
  await page.click('[data-aksi="tur-maju"]');
  await page.waitForURL(/#\/autentik/);
  const langkah2 = await page.waitForSelector("text=Tab baru di Vedika", { timeout: 3000 }).then(() => true).catch(() => false);
  cek(langkah2 && (await page.$(".tur-sorot")) !== null, "langkah 2 menyorot tab Autentik");
  await page.click('[data-aksi="tur-maju"]');
  await page.waitForSelector("text=Masukkan lima berkas contoh");

  console.log("\nDemo otomatis");
  await page.click("#tombolDemo");
  await page.waitForSelector("text=Empat label, satu urutan kerja", { timeout: 30000 });
  cek(true, "panduan maju sendiri setelah demo selesai");
  for (const [id, label] of Object.entries(HARAP)) cek((await labelBaris(page, id)) === label, id + " berlabel " + label, "dapat " + (await labelBaris(page, id)));
  const urutan = await page.$$eval("tbody tr .label", (el) => el.map((e) => e.textContent.trim()));
  const peringkat = { "Prioritas": 0, "Perlu dicek": 1, "Scan ulang": 2, "Lolos": 3 };
  cek(urutan.every((l, i) => i === 0 || peringkat[urutan[i - 1]] <= peringkat[l]), "antrean terurut dari Prioritas ke Lolos");
  await page.click('[data-aksi="tur-tutup"]');

  console.log("\nKartu bukti");
  await page.goto(TARGET + "#/berkas/VA-KMB-01");
  await page.waitForSelector(".penampil img");
  cek((await page.$$(".halaman-berkas.dua .lembar")).length === 2, "berkas kembar tampil berdampingan dengan pembandingnya");
  cek((await page.$$(".sorot")).length >= 3, "area temuan disorot");
  await page.waitForFunction(() => [...document.querySelectorAll(".penampil img")].every((i) => i.complete));
  const gambarOk = await page.$$eval(".penampil img", (imgs) => imgs.every((i) => i.naturalWidth > 0));
  cek(gambarOk, "gambar berkas termuat");
  await page.click(".daftar-temuan li[data-fokus]");
  cek((await page.$$(".sorot.fokus")).length > 0, "klik temuan menyorot area di berkas");

  await page.click('[data-aksi="pilih-lain"]');
  await page.click('[data-aksi="simpan-lain"]');
  cek(await page.isVisible(".galat"), "tindakan lain tanpa pilihan ditolak dengan pesan");
  await page.check('input[value="klarifikasi"]');
  await page.click('[data-aksi="simpan-lain"]');
  cek((await page.textContent(".galat")).includes("alasan"), "tindakan lain tanpa alasan ditolak");
  await page.click('[data-aksi="batal-lain"]');

  await page.goto(TARGET + "#/berkas/VA-KMB-01/peserta");
  await page.click('[data-aksi="jawab"][data-nilai="3"]');
  cek((await page.textContent(".jawaban-kartu")).includes("Hanya sebagian"), "jawaban peserta tercatat");
  await page.goto(TARGET + "#/berkas/VA-KMB-01/peta");
  cek((await page.$$(".peta-simpul")).length === 3, "peta hubungan menampilkan tiga klaim dari satu lembar");

  await page.goto(TARGET + "#/berkas/VA-KMB-01/bukti");
  await page.click('[data-aksi="setujui"]');
  cek((await page.textContent(".putusan")).includes("Diteruskan ke telaah lanjut"), "setujui saran mencatat keputusan");
  await page.click("text=Buka laporan temuan");
  await page.waitForSelector(".kertas-laporan");
  await page.waitForFunction(() => /[0-9a-f]{64}/.test(document.querySelector(".kertas-laporan").innerText), null, { timeout: 8000 }).catch(() => {});
  cek(/[0-9a-f]{64}/.test(await page.textContent(".kertas-laporan")), "laporan memuat SHA-256 berkas asli");
  const [unduhan] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), page.click('[data-aksi="unduh-pdf"]')]);
  cek(/Laporan-Temuan-VA-KMB-01\.pdf$/.test(unduhan.suggestedFilename()), "PDF laporan terunduh");

  console.log("\nScan buram tidak dianggap curang");
  await page.goto(TARGET + "#/berkas/VA-BRM-01");
  cek((await page.textContent(".saran h3")).includes("Minta scan ulang"), "saran untuk scan buram adalah minta scan ulang");

  console.log("\nUnggah berkas");
  await page.goto(TARGET + "#/autentik");
  await page.click('[data-aksi="ulang-demo"]');
  await page.setInputFiles("#pilihBerkas", path.join(DATASET, "03-angka-disunting", "VA-DST-01.pdf"));
  await page.waitForSelector('tr[data-id="VA-DST-01"]', { timeout: 20000 });
  cek((await labelBaris(page, "VA-DST-01")) === "Prioritas", "berkas dataset yang diunggah dikenali");
  await page.setInputFiles("#pilihBerkas", { name: "scan-lain.png", mimeType: "image/png", buffer: Buffer.from("89504e47", "hex") });
  await page.waitForSelector('tr[data-id="UNGGAH-01"]', { timeout: 20000 });
  cek((await labelBaris(page, "UNGGAH-01")) === "Perlu dicek", "berkas tak dikenal ditandai Perlu dicek, tidak pernah Lolos");

  console.log("\nLayar ponsel");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const r of ["#/beranda", "#/autentik", "#/berkas/VA-DST-01", "#/laporan/VA-DST-01"]) {
    await page.goto(TARGET + r);
    await page.waitForTimeout(300);
    await tanpaGeserSamping(page, "ponsel " + r + " tanpa geser samping");
  }

  cek(galat.length === 0, "konsol bersih", galat.join(" | "));
  await browser.close();
  console.log("\n" + lolos.length + " lulus, " + gagal.length + " gagal");
  process.exit(gagal.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
