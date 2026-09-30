/* Uji alur prototype Veritas Autentik.
   python3 -m http.server 8899; NODE_PATH=<runtime-node-modules> node tests/alur.test.js */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { chromium } = require("playwright");
const sharp = require("sharp");
const ROOT = path.resolve(__dirname, "..");
const TARGET = (process.env.TARGET_URL || "http://localhost:8899/").replace(/#.*$/, "");
const cases = JSON.parse(fs.readFileSync(path.join(ROOT, "dataset/manifest.json"), "utf8"));
const expected = { tanpa_anomali: 10, klaim_tidak_cocok: 8, duplikat: 10, copy_paste: 8, tempelan_lintas_berkas: 6, angka_disunting: 8, elemen_sintetis: 6, scan_buruk: 4 };
function assert(ok, message) { if (!ok) throw new Error(message); console.log("LULUS", message); }
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
async function noOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `${label}: tanpa overflow (${overflow}px)`);
}
async function touchTargets(page, label) {
  const small = await page.evaluate(() => [...document.querySelectorAll('a[href], button, input, select, summary')]
    .filter((el) => { const r = el.getBoundingClientRect(); return !el.matches('input.sr') && r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; })
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width < 44 || r.height < 44; })
    .map((el) => (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 32)));
  assert(small.length === 0, `${label}: target interaksi ≥44px` + (small.length ? ` (${small.join(', ')})` : ''));
}

(async () => {
  assert(cases.length === 60 && new Set(cases.map((b) => b.id)).size === 60, "60 ID fixture unik");
  for (const [category, count] of Object.entries(expected)) assert(cases.filter((b) => kindOf(b) === category).length === count, `${category}: ${count} kasus`);
  const filesValid = cases.every((b) => b.synthetic && b.caseId === b.id && b.checkResults.length === 7 && b.overallStatus && ["jpg", "pdf", "json"].every((ext) => fs.existsSync(path.join(ROOT, "dataset", b.folder, b.id + "." + ext))) && ["jpg", "pdf"].every((ext) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, "dataset", b.folder, b.id + "." + ext))).digest("hex") === b.fileHashes[ext]));
  assert(filesValid, "seluruh file, kontrak UI, dan hash cocok");
  const byId = Object.fromEntries(cases.map((b) => [b.id, b]));
  const contractValid = cases.every((b) => {
    const file = JSON.parse(fs.readFileSync(path.join(ROOT, "dataset", b.folder, b.id + ".json"), "utf8"));
    const related = b.relatedCaseIds.every((id) => byId[id]?.relatedCaseIds.includes(b.id));
    const regions = b.evidenceRegions.every((e) => e.region[0] >= 0 && e.region[1] >= 0 && e.region[0] + e.region[2] <= b.ukuran[0] && e.region[1] + e.region[3] <= b.ukuran[1]);
    const recommendation = ({ tidak_ada_anomali: "wajar", scan_ulang: "scanUlang", perlu_dicek: "klarifikasi", prioritas: "telaah" })[b.overallStatus] === b.recommendation;
    return JSON.stringify(file) === JSON.stringify(b) && related && regions && recommendation && b.topFindings.length <= 3 && b.topFindings.every((t) => b.temuan.some((x) => x.cek === t.cek && x.kalimat === t.kalimat));
  });
  assert(contractValid, "JSON, relasi, area bukti, dan rekomendasi konsisten");
  const browserManifest = JSON.parse(fs.readFileSync(path.join(ROOT, "dataset/manifest.js"), "utf8").replace(/^.*?window\.VEDIKA_BERKAS = /s, "").replace(/;\s*$/, ""));
  assert(JSON.stringify(browserManifest) === JSON.stringify(cases), "manifest browser cocok dengan indeks JSON");
  const imageSizes = await Promise.all(cases.map(async (b) => { const m = await sharp(path.join(ROOT, "dataset", b.folder, b.id + ".jpg")).metadata(); return m.width === b.ukuran[0] && m.height === b.ukuran[1]; }));
  assert(imageSizes.every(Boolean), "60 ukuran gambar cocok dengan koordinat fixture");

  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME || undefined });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (e) => { if (e.type() === "error") errors.push(e.text()); });
  await page.goto(TARGET);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  assert(await page.isVisible("text=Veritas Autentik"), "merek baru tampil saat masuk");
  await page.click('[data-aksi="masuk"]');
  await page.waitForURL(/#\/autentik/);
  assert(await page.locator(".lencana-prototipe").isVisible(), "badge prototipe tampil");
  assert(await page.locator(".status-strip > div").count() === 4, "empat status ringkas");
  assert(await page.locator(".queue-table tbody tr").count() === 20, "antrean membuka 20 kasus pertama");
  await page.click('[data-aksi="lihat-lagi"]');
  assert(await page.locator(".queue-table tbody tr").count() === 40, "kasus lain dibuka bertahap");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "/tmp/veritas-queue-desktop.png" });

  await page.goto(TARGET + "#/berkas/VA-KMB-02");
  assert(await page.locator(".tab a").count() === 3, "detail memakai tiga tab");
  assert(await page.locator(".daftar-temuan > li").count() <= 3, "maksimal tiga temuan awal");
  assert(await page.locator(".bukti-ringkas canvas").count() >= 1, "potongan bukti tampil");
  assert((await page.locator(".saran .btn--primer").textContent()).trim() === "Teruskan ke telaah lanjut", "CTA menyebut tindakannya");
  await page.screenshot({ path: "/tmp/veritas-detail-desktop.png" });
  await page.click('.bukti-ringkas .crop-trigger >> nth=0');
  assert(await page.getByRole("dialog", { name: /Bukti 1/ }).isVisible(), "potongan bukti dapat diperbesar");
  await page.keyboard.press("Escape");
  assert(await page.getByRole("dialog").count() === 0, "Escape menutup potongan bukti");
  assert(await page.locator('.bukti-ringkas .crop-trigger').first().evaluate((el) => el === document.activeElement), "fokus kembali ke pemicu bukti");
  await page.click('.daftar-temuan [data-aksi="fokus"] >> nth=0');
  await page.waitForURL(/\/bukti/);
  await page.waitForSelector('.halaman-berkas.dua .lembar');
  assert(await page.locator(".halaman-berkas.dua .lembar").count() === 2, "dokumen pembanding tampil di desktop");
  assert(await page.locator(".sorot.fokus").count() > 0, "temuan menunjuk area bukti");
  await page.locator('.evidence-extra').first().evaluate((el) => { el.open = true; });
  assert(await page.locator(".peta-simpul").count() >= 2, "peta hubungan dapat dibuka");

  await page.goto(TARGET + "#/berkas/VA-KMB-02");
  await page.click('[data-aksi="setujui"]');
  assert(await page.getByRole("dialog").isVisible(), "keputusan memiliki dialog tinjau");
  await page.getByRole("dialog").getByRole("button", { name: "Teruskan ke telaah lanjut" }).click();
  assert(await page.locator(".putusan").isVisible(), "keputusan tersimpan");
  await page.goto(TARGET + "#/laporan/VA-KMB-02");
  assert((await page.locator('.kertas-laporan').innerText()).includes('PROTOTIPE · DATA SINTETIS'), "laporan memuat batasan prototipe");
  await page.screenshot({ path: "/tmp/veritas-report-desktop.png" });
  const pdfDownload = page.waitForEvent('download', { timeout: 20000 });
  await page.click('[data-aksi="unduh-pdf"]');
  const savedPdf = await pdfDownload;
  assert(savedPdf.suggestedFilename().endsWith('.pdf'), "laporan PDF dapat diunduh");
  await page.goto(TARGET + "#/berkas/VA-KMB-02");
  await page.click('[data-aksi="batal-putusan"]');
  await page.click('a[href="#/berkas/VA-KMB-02/jejak"]');
  assert((await page.locator(".linimasa").innerText()).includes("Keputusan dibatalkan"), "undo tercatat dalam jejak");

  await page.goto(TARGET + "#/autentik");
  await page.click('[data-aksi="toggle-filter"]');
  await page.click('[data-aksi="setujui-lolos"]');
  assert(await page.getByRole("dialog").isVisible() && await page.locator(".bulk-list li").count() === 10, "bulk menampilkan 10 kasus dan dampaknya");
  await page.click('[data-aksi="konfirmasi-bulk"]');
  assert(await page.locator('.undo-banner [data-aksi="undo-bulk"]').isVisible(), "bulk menyediakan undo persisten");
  await page.reload();
  assert(await page.locator('.undo-banner [data-aksi="undo-bulk"]').isVisible(), "undo tetap ada setelah muat ulang");
  await page.click('.undo-banner [data-aksi="undo-bulk"]');
  await page.click('[data-aksi="toggle-filter"]');
  assert((await page.locator('[data-aksi="setujui-lolos"]').textContent()).includes("10"), "undo mengembalikan 10 kasus");

  await page.click('[data-aksi="toggle-demo"]');
  await page.setInputFiles('#pilihBerkas', path.join(ROOT, "dataset/06-korpus-demo/VA-EDT-01.pdf"));
  await page.waitForSelector('.proses .ringkas-hasil', { timeout: 20000 });
  assert(await page.locator('a[href="#/berkas/VA-EDT-01"]').count() > 0, "file corpus dikenali lewat hash");
  await page.setInputFiles('#pilihBerkas', { name: "VA-KMB-01.pdf", mimeType: "application/pdf", buffer: Buffer.from("bukan file corpus") });
  assert((await page.locator(".toast-wadah").innerText()).includes("tidak ada dalam corpus"), "nama file palsu ditolak");

  for (const [width, height] of [[1440, 900], [1280, 720], [1024, 768], [390, 844], [360, 800]]) {
    await page.setViewportSize({ width, height });
    await page.goto(TARGET + "#/autentik");
    await noOverflow(page, `antrean ${width}×${height}`);
    await touchTargets(page, `antrean ${width}×${height}`);
    await page.goto(TARGET + "#/berkas/VA-KMB-02");
    await noOverflow(page, `detail ${width}×${height}`);
    await touchTargets(page, `detail ${width}×${height}`);
    assert(await page.locator(".lencana-prototipe").isVisible(), `badge tampil ${width}×${height}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(TARGET + "#/autentik");
  if ((await page.locator('[data-aksi="toggle-filter"]').getAttribute('aria-expanded')) === 'true') await page.click('[data-aksi="toggle-filter"]');
  await page.evaluate(() => { document.querySelector('#toast').replaceChildren(); window.scrollTo(0, 0); });
  await page.screenshot({ path: "/tmp/veritas-queue-mobile.png" });
  assert(await page.locator("#sisi").getAttribute("inert") !== null, "drawer tertutup keluar dari urutan fokus");
  await page.click('.tombol-menu');
  assert(await page.locator(".tombol-menu").getAttribute("aria-expanded") === "true", "drawer mengumumkan status terbuka");
  await page.keyboard.press("Escape");
  assert(await page.locator(".tombol-menu").getAttribute("aria-expanded") === "false", "Escape menutup drawer");
  assert(await page.locator('.tombol-menu').evaluate((el) => el === document.activeElement), "fokus kembali ke tombol menu");
  await page.goto(TARGET + "#/berkas/VA-KMB-02");
  assert(await page.locator(".mobile-decision-note").isVisible() && !(await page.locator(".decision-actions").isVisible()), "mobile hanya menampilkan triage");
  await page.goto(TARGET + "#/autentik");
  await page.click('[data-aksi="toggle-filter"]');
  assert(!(await page.locator('.bulk-trigger').isVisible()), "mobile menyembunyikan tindakan kelompok");
  await page.goto(TARGET + "#/berkas/VA-KMB-02/bukti");
  assert(await page.locator('.mobile-evidence .crop-trigger').count() >= 3 && !(await page.locator('.halaman-berkas.dua').isVisible()), "mobile menampilkan tiga crop tanpa pembanding penuh");
  await page.click('.mobile-evidence .crop-trigger >> nth=2');
  assert(await page.getByRole("dialog", { name: /Bukti 3/ }).isVisible(), "crop ketiga dapat diperbesar di mobile");
  await page.click('[data-aksi="tutup-crop"]');
  await page.goto(TARGET + "#/berkas/VA-KMB-02");
  await page.evaluate(() => document.querySelector('#toast').replaceChildren());
  await page.screenshot({ path: "/tmp/veritas-detail-mobile.png" });
  assert(errors.length === 0, "tanpa error browser: " + errors.join(" | "));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
