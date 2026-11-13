# Evans Moris Cheahn — portofolio eksekutif

Portofolio statis tentang perjalanan karier, bisnis, dan penampilan publik Evans Moris Cheahn. Situs tersedia dalam Bahasa Indonesia, English, dan 简体中文. Seluruh isi sudah menjadi HTML saat build; navigasi dan pilihan bahasa dapat digunakan tanpa JavaScript di browser.

## Menjalankan secara lokal

Gunakan Node.js 22 atau lebih baru. Tidak ada paket yang perlu diinstal.

```sh
npm run build
npm run check
npm run preview
```

Buka URL yang dicetak oleh perintah preview. Folder `dist/` siap diunggah ke hosting statis.

## Mengubah konten dan SEO

- `content/id.json`, `content/en.json`, `content/zh-Hans.json`: teks, navigasi, slug, judul dan deskripsi tiap bahasa.
- `content/site.json`: domain default, bahasa, dan daftar sumber publik.
- `public/assets/site.css`: tampilan situs, dengan font WOFF2 lokal.
- `scripts/build.mjs`: generator HTML, canonical dan hreflang timbal balik, Open Graph, Twitter Card, JSON-LD, sitemap, robots, dan halaman 404.

Tetapkan `SITE_URL` ke URL publik beserta subpath, misalnya `SITE_URL=https://example.com/ npm run build`, jika pindah domain. Workflow GitHub Pages membaca URL publik dari pengaturan Pages. Pada GitHub Pages dengan subpath, aturan robots yang berlaku ada di akar domain; sitemap situs tetap dapat dikirim langsung melalui Search Console.

Pada Vercel, `vercel.json` menetapkan folder publikasi ke `dist/`. Build menggunakan domain produksi dari `VERCEL_PROJECT_PRODUCTION_URL` untuk metadata dan sitemap, kecuali jika `SITE_URL` ditetapkan.

## Sumber dan kredit

- [Profil LinkedIn Evans Moris Cheahn](https://id.linkedin.com/in/evansmoris21) untuk riwayat dan jabatan.
- [Agenda resmi Exabytes WebDevTalk 2023](https://www.exabytes.co.id/events/acara/indonesia-website-awards-x-webdevtalk-2023-offline-event) untuk penampilan sebagai pembicara dan poster acara.
- [Rilis Kominfo di Komdigi](https://www.komdigi.go.id/berita/siaran-pers/detail/siaran-pers-no-28-hm-kominfo-03-2023-tentang-kembangkan-ekonomi-digital-indonesia-butuh-talenta-digital-berkualitas) untuk konteks acara.
- [Universitas Muhammadiyah Riau](https://informatika.fasilkom.umri.ac.id/page/prestasi-mahasiswa) untuk catatan penghargaan.
- Plus Jakarta Sans dilisensikan dengan SIL Open Font License; salinan lisensi tersedia di folder aset.
