/* Uji menyeluruh tur produk PRAMANA */
const path = require('node:path');
const { chromium } = require('playwright');

const TARGET = process.env.TARGET_URL || 'file:///Users/richard/Desktop/pramana-prototype/index.html';
const ART = process.env.PW_ARTIFACT_DIR || '/private/tmp/claude-501/-Users-richard-Desktop/5750f6e4-8463-41bd-bd88-ed41c690341f/scratchpad/uji';

const lolos = [];
const gagal = [];
const ok = (n) => { lolos.push(n); console.log('  PASS  ' + n); };
const no = (n, d) => { gagal.push(n + (d ? ' :: ' + d : '')); console.log('  FAIL  ' + n + (d ? ' :: ' + d : '')); };
const cek = (syarat, n, d) => syarat ? ok(n) : no(n, d);

async function kartuDiDalamLayar(page, label) {
  const r = await page.evaluate(() => {
    const k = document.getElementById('turKartu');
    if (!k) return null;
    const b = k.getBoundingClientRect();
    return { top: b.top, left: b.left, bottom: b.bottom, right: b.right, w: innerWidth, h: innerHeight };
  });
  if (!r) return no(label, 'kartu tidak ada');
  const muat = r.top >= -1 && r.left >= -1 && r.bottom <= r.h + 1 && r.right <= r.w + 1;
  cek(muat, label, muat ? '' : `kartu keluar layar top=${r.top.toFixed(0)} left=${r.left.toFixed(0)} bottom=${r.bottom.toFixed(0)}/${r.h} right=${r.right.toFixed(0)}/${r.w}`);
}

async function sorotanWajar(page, label) {
  const r = await page.evaluate(() => {
    const s = document.getElementById('turSorot');
    if (!s) return 'tidak-ada';
    const b = s.getBoundingClientRect();
    return { top: b.top, bottom: b.bottom, w: b.width, h: b.height, vh: innerHeight };
  });
  if (r === 'tidak-ada') return; // langkah tengah memang tanpa sorotan
  const terlihat = r.w > 20 && r.h > 10 && r.bottom > 0 && r.top < r.vh;
  cek(terlihat, label, terlihat ? '' : `sorotan meleset ${JSON.stringify(r)}`);
}

(async () => {
  const browser = await chromium.launch({ headless: process.env.PW_HEADLESS !== 'false' });
  const galat = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => galat.push('PAGEERROR: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') galat.push('CONSOLE: ' + m.text()); });

    /* ---------- 1. mulai otomatis ---------- */
    console.log('\n[1] Kunjungan pertama');
    await page.goto(TARGET);
    await page.locator('#turKartu').waitFor({ timeout: 8000 });
    ok('tur mulai otomatis pada kunjungan pertama');
    cek((await page.locator('.tur-hitung').innerText()).includes('1 DARI 12'), 'penghitung mulai dari langkah 1');

    /* ---------- 2. seluruh langkah maju ---------- */
    console.log('\n[2] Dua belas langkah maju');
    const interaktif = {
      2: '[data-aksi="putar-mesin"]',
      3: '.sel--k4',
      6: '[data-aksi="sig"][data-mode="pembanding"]',
      10: '[data-aksi="pilih-aksi"][data-key="eskalasi"]'
    };
    const judul = [];
    for (let i = 1; i <= 12; i++) {
      const h = await page.locator('#turKartu h3').innerText();
      judul.push(h);
      const hitung = await page.locator('.tur-hitung').innerText();
      cek(hitung.includes(`${i} DARI 12`), `langkah ${i}: penghitung benar`, hitung);
      cek(h.trim().length > 0 && h.length < 60, `langkah ${i}: judul ringkas (${h.length} huruf)`, h);
      const teks = await page.locator('#turKartu p').innerText();
      cek(teks.length < 190, `langkah ${i}: teks ringkas (${teks.length} huruf)`, teks.slice(0, 60));
      await kartuDiDalamLayar(page, `langkah ${i}: kartu di dalam layar`);
      await sorotanWajar(page, `langkah ${i}: sorotan menempel pada elemen`);
      await page.screenshot({ path: path.join(ART, `d${String(i).padStart(2, '0')}.png`) });
      if (i === 12) break;
      if (interaktif[i]) {
        const t = page.locator(interaktif[i]).first();
        cek(await t.isVisible(), `langkah ${i}: target interaktif terlihat`, interaktif[i]);
        await t.click();
        await page.waitForTimeout(1150);
      } else {
        await page.getByRole('button', { name: /Lanjut|Selesai/ }).click();
        await page.waitForTimeout(750);
      }
    }
    cek(new Set(judul).size === 12, 'dua belas judul berbeda', String(new Set(judul).size));

    /* ---------- 3. langkah interaktif memajukan sendiri ---------- */
    cek(judul[2].includes('Empat rute'), 'klik Putar ulang proses memajukan tur', judul[2]);
    cek(judul[3].includes('41 klaim'), 'klik kuadran K4 memajukan tur', judul[3]);
    cek(judul[6].includes('Lembar yang sama'), 'klik Pembanding memajukan tur', judul[6]);
    cek(judul[10].includes('Berita acara'), 'klik Setujui eskalasi memajukan tur', judul[10]);

    /* ---------- 4. selesai ---------- */
    console.log('\n[3] Menutup tur');
    await page.getByRole('button', { name: 'Selesai' }).click();
    await page.waitForTimeout(600);
    cek(await page.locator('#turKartu').count() === 0, 'kartu hilang setelah Selesai');
    cek(await page.locator('.tur-blok').count() === 0, 'penghalang klik dibersihkan');
    cek(await page.locator('#turSorot').count() === 0, 'sorotan dibersihkan');
    const simpan = await page.evaluate(() => localStorage.getItem('pramana.tur'));
    cek(simpan === 'selesai', 'status tersimpan di localStorage', String(simpan));

    /* ---------- 5. aplikasi tetap bisa dipakai ---------- */
    console.log('\n[4] Aplikasi setelah tur');
    await page.goto(TARGET + '#/antrean');
    await page.waitForTimeout(900);
    cek(await page.locator('#turKartu').count() === 0, 'kunjungan kedua tidak memulai tur lagi');
    await page.locator('.tautan-klaim').first().click();
    await page.waitForTimeout(900);
    cek((await page.locator('.tab-bar .tab').count()) === 4, 'kartu bukti terbuka dengan 4 tab');
    await page.getByRole('tab', { name: /Bukti Jejak/ }).click();
    await page.waitForTimeout(700);
    cek(await page.locator('.denyut svg').count() > 0, 'tab Bukti Jejak menampilkan linimasa');

    /* ---------- 6. ulang lewat tombol ---------- */
    console.log('\n[5] Mengulang tur dari tombol');
    await page.getByRole('button', { name: 'Panduan demo' }).click();
    await page.waitForTimeout(900);
    cek(await page.locator('#turKartu').count() === 1, 'tombol Panduan demo memulai ulang tur');
    cek((await page.locator('.tur-hitung').innerText()).includes('1 DARI 12'), 'tur diulang dari langkah 1');

    /* ---------- 7. mundur ---------- */
    console.log('\n[6] Kembali dan papan tik');
    for (let i = 0; i < 3; i++) { await page.getByRole('button', { name: /Lanjut/ }).first().click().catch(() => {}); await page.waitForTimeout(700); }
    const sebelum = await page.locator('.tur-hitung').innerText();
    await page.getByRole('button', { name: 'Kembali' }).click();
    await page.waitForTimeout(700);
    const sesudah = await page.locator('.tur-hitung').innerText();
    cek(sebelum !== sesudah, 'tombol Kembali memundurkan langkah', `${sebelum} -> ${sesudah}`);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(700);
    cek((await page.locator('.tur-hitung').innerText()) === sebelum, 'panah kanan memajukan langkah');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    cek(await page.locator('#turKartu').count() === 0, 'Escape menutup tur');

    /* ---------- 8. lewati ---------- */
    console.log('\n[7] Lewati panduan');
    await page.evaluate(() => localStorage.removeItem('pramana.tur'));
    await page.goto(TARGET);
    await page.locator('#turKartu').waitFor({ timeout: 8000 });
    await page.getByRole('button', { name: 'Lanjut' }).click();
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: 'Lewati panduan' }).click();
    await page.waitForTimeout(500);
    cek(await page.locator('#turKartu').count() === 0, 'Lewati panduan menutup tur');
    cek(await page.locator('.tur-blok').count() === 0, 'tidak ada penghalang tersisa setelah dilewati');

    /* ---------- 9. ponsel ---------- */
    console.log('\n[8] Layar ponsel 390x844');
    const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const pm = await ctxM.newPage();
    pm.on('pageerror', (e) => galat.push('MOBILE PAGEERROR: ' + e.message));
    pm.on('console', (m) => { if (m.type() === 'error') galat.push('MOBILE CONSOLE: ' + m.text()); });
    await pm.goto(TARGET);
    await pm.locator('#turKartu').waitFor({ timeout: 8000 });
    for (let i = 1; i <= 12; i++) {
      await kartuDiDalamLayar(pm, `ponsel langkah ${i}: kartu di dalam layar`);
      if (i <= 3) await pm.screenshot({ path: path.join(ART, `p${i}.png`) });
      if (i === 12) break;
      if (interaktif[i]) { await pm.locator(interaktif[i]).first().click(); await pm.waitForTimeout(1150); }
      else { await pm.getByRole('button', { name: /Lanjut|Selesai/ }).click(); await pm.waitForTimeout(750); }
    }
    ok('tur ponsel menyelesaikan dua belas langkah');
    await ctxM.close();

    /* ---------- 10. em dash ---------- */
    const em = await page.evaluate(() => (document.body.innerText.match(/—/g) || []).length);
    cek(em === 0, 'tidak ada em dash di layar', String(em));

    cek(galat.length === 0, 'konsol bersih', galat.slice(0, 4).join(' | '));
  } finally {
    await browser.close();
  }

  console.log(`\n===== HASIL =====\nLolos : ${lolos.length}\nGagal : ${gagal.length}`);
  if (gagal.length) { console.log('\nYang gagal:'); gagal.forEach((g) => console.log(' - ' + g)); process.exitCode = 1; }
})();
