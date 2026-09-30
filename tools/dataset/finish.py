"""Ubah lembar hasil render menjadi berkas yang terlihat seperti unggahan rumah sakit.

Untuk setiap sampel di out/spec.json:
  1. terapkan efek pindai (flatbed, foto HP, buram, gelap) atau biarkan bersih (AI, aplikasi desain)
  2. terapkan manipulasinya (kembar, sunting angka, salin baris, sunting bulan)
  3. tulis <id>.jpg, <id>.pdf (dan .png bila ada metadata), serta <id>.json berisi ground truth
     ke dataset/<folder>/, lalu dataset/manifest.json untuk semua sampel

Setiap operasi geometri dicatat sebagai matriks 3x3, jadi koordinat region di ground truth
selalu sesuai dengan piksel berkas akhir.

Pemakaian: python finish.py
"""

import csv
import json
import os
from datetime import datetime

import cv2
import numpy as np
from PIL import Image, PngImagePlugin

AKAR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(AKAR, "out")
DATASET = os.path.normpath(os.path.join(AKAR, "..", "..", "dataset"))
W, H = 1240, 1754
TARIF_SESI = 207300

KERTAS = np.array([238, 240, 241], np.float32)  # BGR, putih kebiruan khas lampu pemindai


# ---------------------------------------------------------------- geometri

def putar(derajat, cx, cy):
    m = cv2.getRotationMatrix2D((cx, cy), derajat, 1.0)
    return np.vstack([m, [0, 0, 1]])


def kotak_akhir(kotak, M):
    """Bawa kotak [x, y, w, h] dari koordinat render ke koordinat berkas akhir."""
    x, y, w, h = kotak
    sudut = np.array([[x, y], [x + w, y], [x, y + h], [x + w, y + h]], np.float64).reshape(-1, 1, 2)
    p = cv2.perspectiveTransform(sudut, M).reshape(-1, 2)
    x0, y0 = p.min(axis=0)
    x1, y1 = p.max(axis=0)
    return [int(round(x0)), int(round(y0)), int(round(x1 - x0)), int(round(y1 - y0))]


def gabung(kotak_list):
    x0 = min(k[0] for k in kotak_list)
    y0 = min(k[1] for k in kotak_list)
    x1 = max(k[0] + k[2] for k in kotak_list)
    y1 = max(k[1] + k[3] for k in kotak_list)
    return [x0, y0, x1 - x0, y1 - y0]


def warp(img, M, ukuran, isi):
    return cv2.warpPerspective(img, M, ukuran, flags=cv2.INTER_CUBIC,
                               borderMode=cv2.BORDER_CONSTANT, borderValue=isi)


# ---------------------------------------------------------------- efek pindai

def derau(img, sigma, rng):
    return img + rng.normal(0, sigma, img.shape).astype(np.float32)


def cahaya(img, kuat, rng, arah=None):
    """Gradien terang-gelap lembut seperti lampu pemindai atau cahaya ruangan."""
    h, w = img.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    ax, ay = arah if arah else (rng.uniform(-1, 1), rng.uniform(-1, 1))
    g = (xx / w - 0.5) * ax + (yy / h - 0.5) * ay
    return img * (1 + kuat * g)[..., None]


def jpeg(img, kualitas):
    ok, buf = cv2.imencode(".jpg", np.clip(img, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, kualitas])
    return cv2.imdecode(buf, cv2.IMREAD_COLOR).astype(np.float32)


def ke_kertas(img):
    """Putih murni hasil render menjadi warna kertas, tinta sedikit memudar."""
    f = img.astype(np.float32) / 255.0
    return f * KERTAS + (1 - f) * np.array([28, 24, 30], np.float32)


def pindai(img, p, rng):
    """Kembalikan (gambar, M) untuk alat pindai yang disebut di spesifikasi."""
    alat = p.get("alat", "flatbed")
    M = putar(p.get("miring", 0.0), W / 2, H / 2)
    x = cv2.GaussianBlur(ke_kertas(img), (0, 0), 0.55)

    if alat in ("flatbed", "buram"):
        x = warp(x, M, (W, H), tuple(float(v) for v in KERTAS - 6))
        x = derau(cahaya(x, 0.05, rng), 3.2, rng)
        if alat == "buram":
            x = cv2.GaussianBlur(x, (0, 0), p.get("blur", 2.2)) * 0.82 + 40
        if p.get("potongKanan"):
            x = x[:, :int(W * (1 - p["potongKanan"]))]
        if p.get("potongBawah"):
            x = x[:int(H * (1 - p["potongBawah"]))]
        return jpeg(x, 84 if alat == "flatbed" else 70), M

    # Foto HP: lembar diletakkan di meja, difoto agak miring dari atas.
    kanvas_w, kanvas_h, skala = 1500, 2000, 1.08
    tx, ty = (kanvas_w - W * skala) / 2, (kanvas_h - H * skala) / 2
    sumber = np.float32([[0, 0], [W, 0], [W, H], [0, H]])
    geser = rng.uniform(-18, 18, (4, 2)) + np.float32([[26, 10], [-12, 34], [-30, -8], [16, -22]])
    tujuan = (sumber * skala + np.float32([tx, ty]) + geser).astype(np.float32)
    P = cv2.getPerspectiveTransform(sumber, tujuan) @ M
    meja = (62, 84, 104) if alat == "ponsel" else (40, 44, 48)
    x = cahaya(warp(x, P, (kanvas_w, kanvas_h), meja), 0.22, rng, arah=(0.35, 0.55))
    if alat == "gelap":
        x = derau(cv2.GaussianBlur(x * 0.46 + 12, (0, 0), 1.3), 9, rng)
    else:
        bayang = np.ones((kanvas_h, kanvas_w), np.float32)
        cv2.ellipse(bayang, (int(kanvas_w * 0.82), int(kanvas_h * 0.18)), (420, 300), 20, 0, 360, 0.8, -1)
        x = derau(x * cv2.GaussianBlur(bayang, (0, 0), 90)[..., None], 5.5, rng)
    return jpeg(x, 80), P


def bersih_ai(img, rng):
    """Generator gambar: resolusi asli lebih kecil lalu diperbesar, tanpa derau sensor, cahaya terlalu rata."""
    kecil = cv2.resize(ke_kertas(img), (832, 1176), interpolation=cv2.INTER_AREA)
    x = cv2.resize(kecil, (W, H), interpolation=cv2.INTER_CUBIC)
    x = cv2.bilateralFilter(np.clip(x, 0, 255).astype(np.uint8), 7, 30, 7).astype(np.float32)
    x = cahaya(x, 0.03, rng, arah=(0.2, -0.3))
    return x * np.array([0.985, 1.0, 1.02], np.float32), np.eye(3)


# ---------------------------------------------------------------- manipulasi

def tambal(img, kotak, rng, pad=(6, 4)):
    """Tutup area dengan warna kertas di sekitarnya. Teksturnya lebih halus daripada pindaian asli.
    Pad negatif menutup dari dalam kotak, dipakai untuk sel tabel agar garisnya tidak ikut hilang."""
    x, y, w, h = kotak
    x0, y0 = max(0, x - pad[0]), max(0, y - pad[1])
    x1, y1 = min(img.shape[1], x + w + pad[0]), min(img.shape[0], y + h + pad[1])
    tepi = np.concatenate([img[max(0, y0 - 6):y0, x0:x1].reshape(-1, 3), img[y1:y1 + 6, x0:x1].reshape(-1, 3)])
    warna = np.median(tepi, axis=0) if len(tepi) else KERTAS
    img[y0:y1, x0:x1] = warna + rng.normal(0, 0.8, (y1 - y0, x1 - x0, 3))
    return [x0, y0, x1 - x0, y1 - y0]


def tempel_lapis(img, lapis_png, M):
    """Tempel lapisan transparan (tinta baru) mengikuti geometri pindaian berkas dasar."""
    rgba = cv2.imread(lapis_png, cv2.IMREAD_UNCHANGED).astype(np.float32)
    h, w = img.shape[:2]
    warna = warp(rgba[..., :3], M, (w, h), (0, 0, 0))
    alfa = warp(rgba[..., 3], M, (w, h), 0)[..., None] / 255.0
    return img * (1 - alfa) + warna * alfa


def tanpa_nomor(dasar, baris):
    """Kotak satu baris tabel mulai kolom tanggal sampai tepi kanan, tanpa kolom nomor."""
    x_tgl = dasar[f"tgl-{baris}"][0]
    bx, by, bw, bh = dasar[f"baris-{baris}"]
    return [x_tgl, by, bx + bw - x_tgl, bh]


def manipulasi(s, img, M, kotak, rng, spec):
    """Terapkan rekayasa sampel. Kembalikan (gambar, temuan, metadata berkas)."""
    r = s.get("rekayasa") or {}
    jenis = r.get("jenis")
    dasar = kotak["dasar"]
    lapis_png = lambda nama: os.path.join(OUT, s["id"] + ".lapis-" + nama + ".png")
    ttd_semua = lambda: gabung([kotak_akhir(dasar[f"ttd-{i}"], M) for i in range(1, 9)])
    temuan = []

    if jenis == "kembar":
        sumber = next(x for x in spec if x["id"] == r["sumber"])
        kotak_sumber = json.load(open(os.path.join(OUT, r["sumber"] + ".kotak.json")))["dasar"]
        ganti_identitas = "nama" in r["ganti"]
        nama_lapis = "identitas" if ganti_identitas else "tanggal"
        area = []
        for kunci, kb in kotak["lapis"][nama_lapis].items():
            if kunci.startswith("tgl-hari") or kunci.startswith("tgl-bulan"):
                continue
            sel = kunci.startswith("tgl-") and kunci[4:].isdigit()
            lama = [] if sel or kunci not in kotak_sumber else [kotak_sumber[kunci]]
            pad = (-5, -5) if sel else (3, 1) if kunci == "tgl-dpjp" else (6, 4)
            area.append(tambal(img, kotak_akhir(gabung([kb] + lama), M), rng, pad=pad))
        img = jpeg(tempel_lapis(img, lapis_png(nama_lapis), M), 91)
        beda = "identitas pasien" if ganti_identitas else "SEP, periode, dan tanggal sesi"
        temuan += [
            {"cek": "berkas_kembar", "kekuatan": "kuat", "pasangan": r["sumber"], "kemiripan": 0.97,
             "kalimat": f"Isi berkas 97% sama dengan berkas {sumber['pasien']['nama']} (SEP {sumber['sep']}). Yang berbeda hanya {beda}.",
             "region": kotak_akhir(dasar["tabel"], M)},
            {"cek": "tempelan", "kekuatan": "kuat", "pasangan": r["sumber"],
             "kalimat": f"Delapan tanda tangan pasien identik sampai tingkat piksel dengan tanda tangan di berkas {sumber['pasien']['nama']}.",
             "region": ttd_semua()},
            {"cek": "suntingan", "kekuatan": "sedang", "area": area, "region": gabung(area),
             "kalimat": "Kolom " + ("nama, tanggal lahir, nomor rekam medis, kartu, dan SEP" if ganti_identitas else "SEP, periode, dan tanggal sesi")
                        + " ditimpa. Tekstur kertasnya lebih halus daripada bagian lain."}]
        return img, temuan, {"Producer": "Adobe Acrobat Pro (64-bit) 24.2", "Creator": "Canon iR-ADV C3826", "ModDate": datetime(2026, 9, 2, 21, 47)}

    if jenis == "sunting-total":
        area = tambal(img, kotak_akhir(dasar["total-angka"], M), rng, pad=(4, 3))
        img = jpeg(tempel_lapis(img, lapis_png("total"), M), 92)
        temuan += [
            {"cek": "kecocokan_klaim", "kekuatan": "kuat",
             "kalimat": f"Ditagih {s['ditagih']} sesi, berkas hanya mendukung {s['terisi']}. Baris {s['terisi'] + 1} sampai 8 kosong, tanpa tanggal dan tanda tangan.",
             "region": gabung([kotak_akhir(dasar[f"baris-{i}"], M) for i in range(s["terisi"] + 1, 9)])},
            {"cek": "suntingan", "kekuatan": "sedang", "region": area,
             "kalimat": f"Angka {r['ke']} di kolom jumlah kunjungan terdeteksi ditempel di atas angka {r['dari']}."}]
        return img, temuan, {"Producer": "Microsoft: Print To PDF", "Creator": "Adobe Photoshop 25.0", "ModDate": datetime(2026, 9, 1, 22, 5)}

    if jenis == "salin-baris":
        area = []
        for asal, tuju in r["salin"]:
            # Salin mulai kolom tanggal; nomor baris milik lembar, bukan bagian yang disalin.
            a = kotak_akhir(tanpa_nomor(dasar, asal + 1), M)
            t = kotak_akhir(tanpa_nomor(dasar, tuju + 1), M)
            tinggi = min(a[3], t[3])
            img[t[1]:t[1] + tinggi, t[0]:t[0] + a[2]] = img[a[1]:a[1] + tinggi, a[0]:a[0] + a[2]]
            area.append([t[0], t[1], a[2], tinggi])
            tambal(img, kotak_akhir(kotak["lapis"]["tanggal"][f"tgl-{tuju + 1}"], M), rng, pad=(-5, -5))
        img = jpeg(tempel_lapis(img, lapis_png("tanggal"), M), 90)
        asal = " dan ".join(str(a + 1) for a, _ in r["salin"])
        tuju = " dan ".join(str(t + 1) for _, t in r["salin"])
        temuan += [
            {"cek": "copy_paste", "kekuatan": "kuat", "area": area, "region": gabung(area),
             "kalimat": f"Baris {tuju} identik dengan baris {asal}, termasuk paraf terapis dan tanda tangan pasien. Hanya tanggalnya yang berbeda."},
            {"cek": "kecocokan_klaim", "kekuatan": "kuat", "region": gabung(area),
             "kalimat": f"Ditagih {s['ditagih']} sesi. Setelah baris salinan dikeluarkan, berkas hanya mendukung {s['terisi']}."}]
        return img, temuan, {"Producer": "Microsoft: Print To PDF", "Creator": "GIMP 2.10", "ModDate": datetime(2026, 9, 3, 20, 31)}

    if jenis == "sunting-bulan":
        lapis = kotak["lapis"]["bulan"]
        area = [tambal(img, kotak_akhir(kb, M), rng, pad=(3, 3)) for k, kb in dasar.items() if k.startswith("tgl-bulan-")]
        for k, pad in (("periode", (6, 4)), ("tgl-dpjp", (3, 1))):
            area.append(tambal(img, kotak_akhir(gabung([dasar[k], lapis[k]]), M), rng, pad=pad))
        img = jpeg(tempel_lapis(img, lapis_png("bulan"), M), 90)
        temuan.append({"cek": "suntingan", "kekuatan": "sedang", "area": area, "region": gabung(area),
                       "kalimat": "Angka bulan pada delapan tanggal sesi dan tulisan periode ditimpa. Kedelapan angka 08 identik satu sama lain, tidak seperti tulisan tangan."})
        return img, temuan, {"Producer": "Microsoft: Print To PDF", "Creator": "Adobe Photoshop 25.0", "ModDate": datetime(2026, 8, 30, 23, 14)}

    if jenis == "generator-ai":
        if not r.get("tanpaMeta"):
            temuan.append({"cek": "tanda_ai", "kekuatan": "sedang", "region": None,
                           "kalimat": "Metadata berkas menandai gambar dibuat oleh generator AI (IPTC trainedAlgorithmicMedia)."})
        temuan += [
            {"cek": "tanda_ai", "kekuatan": "lemah", "region": None,
             "kalimat": "Tidak ada ciri hasil pindai: tanpa derau sensor, tanpa bayangan tepi kertas, dan halaman lurus sempurna."},
            {"cek": "tanda_ai", "kekuatan": "lemah", "region": kotak_akhir(dasar["kop"], M),
             "kalimat": "Teks kecil di kop dan kepala tabel janggal: \"Rehabilitsai\", \"Kenagna Rya\", \"Tanda Tanagn\"."}]
        return img, temuan, {"Producer": "Microsoft: Print To PDF", "Creator": "Microsoft Photos"}

    if jenis == "aplikasi-desain":
        temuan += [
            {"cek": "copy_paste", "kekuatan": "kuat", "region": ttd_semua(),
             "kalimat": "Delapan tanda tangan pasien identik sampai tingkat piksel. Tangan manusia tidak pernah menulis sepersis ini."},
            {"cek": "tanda_ai", "kekuatan": "sedang", "region": None,
             "kalimat": "Berkas dibuat di aplikasi desain (Producer: Canva), bukan hasil pindai. Tulisan tangannya adalah huruf komputer."}]
        return img, temuan, {"Producer": "Canva", "Creator": "Canva", "Author": "Admin Rehab"}

    return img, temuan, {}


def kualitas_scan(p, img):
    """Scan jelek bukan temuan kecurangan. Hasilnya label Scan ulang."""
    h, w = img.shape[:2]
    alat = p.get("alat", "flatbed")
    if alat == "buram":
        return ({"status": "scan_ulang", "catatan": f"Buram, miring {abs(p['miring']):.1f} derajat, kolom tanda tangan pasien terpotong di tepi kanan."},
                {"cek": "kualitas_scan", "kekuatan": "info", "region": [w - 170, 560, 170, 860],
                 "kalimat": "Kolom tanda tangan pasien terpotong di tepi kanan dan tulisan buram. Minta rumah sakit memindai ulang."})
    if alat == "gelap":
        return ({"status": "scan_ulang", "catatan": "Terlalu gelap dan kontras rendah."},
                {"cek": "kualitas_scan", "kekuatan": "info", "region": None,
                 "kalimat": "Foto terlalu gelap, tanda tangan dan tanggal tidak terbaca. Minta rumah sakit memindai ulang."})
    if p.get("potongBawah"):
        return ({"status": "scan_ulang", "catatan": "Bagian bawah halaman tidak terpindai."},
                {"cek": "kualitas_scan", "kekuatan": "info", "region": [0, h - 90, w, 90],
                 "kalimat": "Bagian bawah halaman tidak ikut terpindai: baris 7 dan 8, jumlah kunjungan, dan tanda tangan DPJP hilang."})
    if alat == "ponsel":
        return {"status": "baik", "catatan": "Foto HP. Perspektif dan bayangan wajar, semua kolom terbaca."}, None
    if p:
        return {"status": "baik", "catatan": f"Terbaca, miring {abs(p.get('miring', 0)):.1f} derajat."}, None
    return {"status": "baik", "catatan": "Berkas digital, bukan hasil pindai."}, None


# ---------------------------------------------------------------- keluaran

PEMINDAI = {"Producer": "Canon iR-ADV C3826 PDF", "Creator": "Canon iR-ADV C3826"}
KAMERA = {"Producer": "Android PDF Writer", "Creator": "Galaxy A15 Kamera"}

METADATA_AI = {
    "Software": "AI image generator",
    "XML:com.adobe.xmp": ('<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
                          '<rdf:Description xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/" '
                          'Iptc4xmpExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"/>'
                          '</rdf:RDF></x:xmpmeta>'),
    "c2pa": "c2pa.actions: c2pa.created (softwareAgent: AI image generator). Tiruan untuk data uji.",
}


def simpan(img, folder, sid, meta_pdf, png_meta):
    os.makedirs(folder, exist_ok=True)
    pil = Image.fromarray(cv2.cvtColor(np.clip(img, 0, 255).astype(np.uint8), cv2.COLOR_BGR2RGB))
    berkas = {"jpg": sid + ".jpg", "pdf": sid + ".pdf"}
    pil.save(os.path.join(folder, berkas["jpg"]), "JPEG", quality=86, optimize=True)
    if png_meta is not None:
        info = PngImagePlugin.PngInfo()
        for k, v in png_meta.items():
            info.add_itxt(k, v)
        pil.save(os.path.join(folder, sid + ".png"), "PNG", pnginfo=info, optimize=True)
        berkas["png"] = sid + ".png"
    dibuat = datetime(2026, 8, 29, 9, 12)
    pil.save(os.path.join(folder, berkas["pdf"]), "PDF", resolution=150, title=sid,
             author=meta_pdf.get("Author", ""), creator=meta_pdf.get("Creator", ""), producer=meta_pdf.get("Producer", ""),
             creationDate=dibuat.timetuple(), modDate=meta_pdf.get("ModDate", dibuat).timetuple())
    return berkas


def rupiah(n):
    return "Rp" + f"{n:,}".replace(",", ".")


def ground_truth(s, img, M, dasar, berkas, temuan, kualitas, meta, p):
    f = s["faskesData"]
    r = s.get("rekayasa") or {}
    h, w = img.shape[:2]
    penting = ("kop", "nama", "sep", "periode", "tabel", "total", "blok-dpjp")
    region = {k: kotak_akhir(v, M) for k, v in dasar.items() if k in penting or k.startswith(("ttd-", "baris-"))}
    return {
        "id": s["id"], "folder": s["folder"], "berkas": berkas, "ukuran": [int(w), int(h)],
        "demo": bool(s.get("demo")), "peran": s.get("peran", "uji"),
        "label_diharapkan": s["label"], "ringkasan": s["ringkas"],
        "klaim": {
            "sep": s["sep"], "peserta": s["pasien"]["nama"], "no_kartu": s["pasien"]["kartu"],
            "faskes": f["nama"], "kode_faskes": f["kode"], "periode": s["periode"],
            "layanan": "Fisioterapi rawat jalan", "sesi_ditagih": s["ditagih"], "tarif_per_sesi": TARIF_SESI,
            "nilai_klaim": s["ditagih"] * TARIF_SESI, "nilai_klaim_teks": rupiah(s["ditagih"] * TARIF_SESI)},
        "isi_lembar": {
            "nama": s["pasien"]["nama"], "tanggal_lahir": s["pasien"]["lahir"], "no_rm": s["pasien"]["rm"],
            "no_kartu": s["pasien"]["kartu"], "no_sep": s["sep"], "diagnosis": s["dxData"]["teks"],
            "icd10": s["dxData"]["icd"], "dpjp": f["dpjp"], "periode": s["periode"],
            "baris_terisi": 8 if r.get("jenis") == "salin-baris" else s["terisi"],
            "baris_asli": s["terisi"],
            "tanggal_sesi": s["tanggal"],
            "jumlah_kunjungan_tertulis": 8 if r.get("jenis") == "salin-baris" else int(r.get("ke") or s["terisi"]),
            "kemiripan_ttd_rerata": s["kemiripanTtd"]},
        "kualitas_scan": kualitas,
        "temuan": temuan,
        "metadata_file": {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in meta.items()},
        "pindai": p or {"alat": "tidak ada, berkas digital"},
        "region_lembar": {k: v for k, v in region.items() if v[0] < w and v[1] < h},
    }


def main():
    spec = json.load(open(os.path.join(OUT, "spec.json")))
    hasil = {}  # id -> (gambar akhir, M), dipakai ulang oleh berkas kembar
    manifest = []

    for s in spec:
        sid = s["id"]
        rng = np.random.default_rng(s["pasien"]["sigSeed"] + len(sid))
        kotak = json.load(open(os.path.join(OUT, sid + ".kotak.json")))
        render = cv2.imread(os.path.join(OUT, sid + ".png"), cv2.IMREAD_COLOR)
        r = s.get("rekayasa") or {}
        p = s.get("pindai") or {}

        if r.get("jenis") == "kembar":
            img, M = hasil[r["sumber"]]
            img = img.copy()
        elif r.get("jenis") == "generator-ai":
            img, M = bersih_ai(render, rng)
        elif r.get("jenis") == "aplikasi-desain":
            img, M = render.astype(np.float32), np.eye(3)
        else:
            img, M = pindai(render, p or {"alat": "flatbed"}, rng)

        img, temuan, meta = manipulasi(s, img, M, kotak, rng, spec)
        kualitas, temuan_kualitas = kualitas_scan(p, img) if r.get("jenis") not in ("generator-ai", "aplikasi-desain") \
            else ({"status": "baik", "catatan": "Berkas digital, bukan hasil pindai."}, None)
        if temuan_kualitas:
            temuan.insert(0, temuan_kualitas)
        if not meta:
            meta = dict(KAMERA if p.get("alat") in ("ponsel", "gelap") else PEMINDAI)

        png_meta = None
        if r.get("jenis") == "generator-ai":
            png_meta = {} if r.get("tanpaMeta") else METADATA_AI

        folder = os.path.join(DATASET, s["folder"])
        berkas = simpan(img, folder, sid, meta, png_meta)
        hasil[sid] = (img, M)

        gt = ground_truth(s, img, M, kotak["dasar"], berkas, temuan, kualitas, meta, p)
        with open(os.path.join(folder, sid + ".json"), "w") as fh:
            json.dump(gt, fh, ensure_ascii=False, indent=1)
        manifest.append(gt)
        print(f"{sid:10} {s['label']:12} {len(temuan)} temuan")

    with open(os.path.join(DATASET, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=1)
    # Salinan untuk prototipe web: dimuat lewat <script>, jadi jalan juga tanpa server.
    with open(os.path.join(DATASET, "manifest.js"), "w") as fh:
        fh.write("/* Dibangkitkan oleh tools/dataset/finish.py. Jangan disunting manual. */\n")
        fh.write("window.VEDIKA_BERKAS = " + json.dumps(manifest, ensure_ascii=False) + ";\n")
    tulis_csv(manifest)


def tulis_csv(manifest):
    """Dua tabel ringkas: data klaim dari E-Klaim, dan label yang diharapkan per berkas."""
    with open(os.path.join(DATASET, "klaim.csv"), "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["id_berkas", "sep", "peserta", "no_kartu", "faskes", "kode_faskes", "periode", "sesi_ditagih", "nilai_klaim"])
        for g in manifest:
            k = g["klaim"]
            w.writerow([g["id"], k["sep"], k["peserta"], k["no_kartu"], k["faskes"], k["kode_faskes"], k["periode"], k["sesi_ditagih"], k["nilai_klaim"]])
    with open(os.path.join(DATASET, "label.csv"), "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["id_berkas", "folder", "berkas_pdf", "label_diharapkan", "cek_terpicu", "baris_terisi", "sesi_ditagih", "ringkasan"])
        for g in manifest:
            cek = sorted({t["cek"] + ":" + t["kekuatan"] for t in g["temuan"]})
            w.writerow([g["id"], g["folder"], g["folder"] + "/" + g["berkas"]["pdf"], g["label_diharapkan"], " ".join(cek),
                        g["isi_lembar"]["baris_terisi"], g["klaim"]["sesi_ditagih"], g["ringkasan"]])


if __name__ == "__main__":
    main()
