# Membangunkan WES

## [WES GitHub Repository](#new-wes-github-repository)

- **Sebelum:** [https://github.com/hatiolab/operato-wms-ui](https://github.com/hatiolab/operato-wms-ui)
- **Selepas:** [https://github.com/hatiolab/operato-app](https://github.com/hatiolab/operato-app)

## [Pasang & Bina](#install--build)

1. **Pasang Awal**

   Selepas checkout repositori buat kali pertama, pasang persekitaran pembangunan dan modul kebergantungan.

   ```bash
   $ yarn install
   ```

2. **Membina Semua Modul**

   Bina modul-modul yang dibangunkan dalam projek.

   Semua modul berada di bawah folder `operato-app/packages/`.

   - Maksud bina: Kompil sumber klien dan pelayan untuk menghasilkan (atau mengemas kini) dist-xxxx.

     `/client` => `/dist-client`

     `/server` => `/dist-server`

   ```bash
   $ yarn build
   ```

3. **Membina Setiap Modul**

   Jika hanya modul yang diubah yang perlu dibina, anda boleh membina hanya modul-modul tersebut.

   Rujuk kepada sifat name dalam package.json setiap modul untuk nama modul.

   Berikut adalah nama-nama 6 modul yang sedang dibangunkan dalam projek ini.

   - @operato-app/metapage
   - @operato-app/mfg-warehouse
   - @operato-app/operato-logis-system-ui
   - @operato-app/operato-wes
   - @operato-app/operato-mes
   - @operato-app/operatofill

   ```bash
   // Bina hanya bahagian klien
   $ yarn workspace {{module name}} build:client

   // Bina hanya bahagian pelayan
   $ yarn workspace {{module name}} build:server

   // Bina kedua-dua bahagian klien dan pelayan
   $ yarn workspace {{module name}} build

   // Contoh
   $ yarn workspace @operato-app/mfg-warehouse build
   ```

4. **Bina Bersih**

   Pasang semula semua modul npm dan bina semula semua modul.

   - Hapus semua folder node_modules dan pasang semula.
   - Hapus semua dist-xxxx dan bina semula.

     - Apabila things-factory atau operato dinaik taraf, anda boleh mencerminkannya dengan menjalankan bina bersih.

   ```bash
   $ yarn build:clean
   ```

## [Konfigurasi Aplikasi](#configure-application)

Modul untuk menjalankan aplikasi WES dalam projek operato-apps adalah modul @operato-app/operato-wes.

Anda boleh menetapkan konfigurasi pelaksanaan dalam fail config.development.js dan config.production.js di folder packages/operato-wes/config.

[Klik pautan ini untuk merujuk kepada kaedah penyediaan konfigurasi](../config/index.md)

Fail-fail ini dianggap sebagai sumber, jadi jangan sertakan maklumat pelayan sensitif dan maklumat pengesahan.

Oleh itu, tetapkan konfigurasi pelaksanaan dalam fail config.development.js dan config.production.js yang diperibadikan di folder packages/operato-wes.

## [Jalankan Aplikasi - Pembangunan](#run-application---development)

Modul untuk menjalankan aplikasi dalam projek operato-apps adalah modul @operato-app/operato-wes.

```bash
// Dalam kes ini, config.development.js digunakan
$ yarn workspace @operato-app/operato-wes serve:dev
```

## [Jalankan Aplikasi - Pengeluaran](#run-application---production)

```bash
// Buat imej aplikasi akhir di folder dist-app
$ yarn workspace @operato-app/operato-wes build:app

// Jalankan dist-app
// Dalam kes ini, config.production.js digunakan
$ yarn workspace @operato-app/operato-wes serve
```

---

## [Jana Halaman Baru](#generate-new-page)

```bash
$ yarn generate
```

```bash
$ yarn generate
yarn run v1.22.22
$ plop
? [PLOP] Please choose a generator.
  module - Create a new module from the scratch
  service - Generate service from the scratch
❯ page - Generate client page from the scratch
  help - Generate inline help page
  docs - Generate root repo documentation
```

```bash
$ plop
? [PLOP] Please choose a generator. page - Generate client page from the scratch
? What is target package's name? e.g. mfg-warehouse mfg-warehouse
? What should this pages's name be? e.g. sample-page my-page
? Select the type of page you want to generate: List Page
✔  ++ /packages/mfg-warehouse/client/pages/my-page.ts
✔  +- /packages/mfg-warehouse/client/route.ts
✔  +- /packages/mfg-warehouse/things-factory.config.js
✨  Done in 109.17s.
```

```bash
// Oleh kerana sumber klien telah diubah, bina semula.
$ yarn workspace @operato-app/mfg-warehouse build:client
```

![generate-page-01]
![generate-page-03]
![generate-page-03]
![generate-page-04]

---

## [Debugging - Bahagian Pelayan](#debugging-server)

Jalankan aplikasi dengan debugger VSCode.

![server-debugging]

## [Debugging - Bahagian Klien](#debugging-client)

Buka fail sumber dalam tab Source alat pembangun Chrome.

![client-debugging-01]
![client-debugging-02]

[Nota] Oleh kerana halaman yang ditakrifkan dalam laluan setiap modul klien dimuat secara dinamik, penyahpepijatan boleh dilakukan selepas memuatkan halaman yang berkenaan.

[server-debugging]: ./images/server-debugging.png
[client-debugging-01]: ./images/client-debugging-01.png
[client-debugging-02]: ./images/client-debugging-02.png
[generate-page-01]: ./images/generate-page-01.png
[generate-page-02]: ./images/generate-page-02.png
[generate-page-03]: ./images/generate-page-03.png
[generate-page-04]: ./images/generate-page-04.png
