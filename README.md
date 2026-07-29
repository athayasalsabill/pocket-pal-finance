# Pocket Pal Finance

buatkan aplikasi finance tracker berbasis web yang disimpan di github. bYang bisa dilakukan:

🏠 Home – total saldo semua akun, tambah akun (cash/bank/e-wallet), tap akun untuk lihat history-nya

➕ Add – catat expense (dengan kategori), income (dengan sumber), transfer antar akun, atau debt (utang/piutang)

💳 Debts – lihat siapa yang kamu utangi dan siapa yang berutang ke kamu, dengan progress bar & tombol "record payment"

🕐 History – semua transaksi dikelompokkan per bulan, bisa expand/collapse

📊 Stats – pilih bulan, lihat total income/expense/debt paid, plus pie chart kategori expense, sumber income, dan status debt

Karena aku nggak mau bayar, solusi yang paling masuk akal dan benar-benar gratis 100% adalah bikin ini jadi PWA (Progressive Web App):

Buka linknya sekali di Safari iPhone → tombol Share → "Add to Home Screen"

Muncul icon di homescreen, buka fullscreen kayak app asli (nggak ada address bar)

Datanya disimpan di HP kamu sendiri (localStorage), bukan di server — jadi tetap ada walau internet mati

Setelah dibuka sekali, app-nya bisa jalan offline karena di-cache lewat service worker

Bagaimana web bisa nyimpen data di HP:

Browser (Safari) punya fitur namanya localStorage — semacam "kotak penyimpanan kecil" yang khusus dikasih ke tiap website/app, tersimpan langsung di storage iPhone kamu

Waktu kamu isi data (expense, income, dll), JavaScript di app ini nulis data itu ke localStorage, bukan ngirim ke internet

Kalau app dibuka lagi, dia baca ulang dari situ — makanya bisa jalan walau nggak ada sinyal sama sekali

tambahin fitur export/import backup — tombol untuk simpan semua data jadi 1 file .json (bisa kamu simpan di Files app atau kirim ke diri sendiri), dan tombol import untuk mengembalikan data itu kapan-kapan (misal kalau pindah HP atau data ke-clear).

aku ingin tema dan warnanya seperti gambar berikut.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d0fa847b-dd8c-4471-ba47-6b31d2169b06).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
