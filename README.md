# SHE Meeting — Frontend

Frontend Vue.js + JavaScript untuk aplikasi internal SHE Meeting.

Status: tahap fondasi lokal D0-01. Halaman sementara memeriksa koneksi backend; login, temuan, dashboard bisnis dan PDF belum tersedia. Belum deployment.

## Menjalankan

Gunakan Node kompatibel (diuji 24.10.0; .nvmrc menargetkan LTS 26).

```sh
npm ci
npm run dev
```

Buka http://127.0.0.1:5173/. Backend diharapkan berjalan pada http://127.0.0.1:4000. Default tanpa .env sudah memadai; jika diperlukan salin .env.example ke .env yang belum ada. DEV_API_TARGET mengubah tujuan proxy development. Jangan menaruh secret dalam VITE_*.

```sh
npm run build
```

Output dist/ diabaikan Git. Vercel nantinya memakai root repo ini, npm run build dan dist; konfigurasi hosting belum diterapkan.

## Branch

- dev: pekerjaan pengembangan sehari-hari dan checkpoint yang diuji.
- prod: kandidat rilis yang dipromosikan dari dev setelah validasi; nama branch bukan bukti siap produksi.

Kedua branch berawal dari fondasi yang sama; bekerja lokal pada dev. Push tidak sama dengan deployment; periksa konfigurasi host sebelum menghubungkan branch.

## Dokumen bersama

Sumber tunggal PRD, konteks, API, UI, backlog dan hasil pengembangan berada di [repo backend, folder docs](https://github.com/alankurniadi12/she-meeting-2-backend/tree/dev/docs). Setiap perubahan frontend yang memengaruhi spesifikasi harus menyelaraskan dokumen tersebut. Backend: https://github.com/alankurniadi12/she-meeting-2-backend.

Jangan commit .env, kredensial, node_modules, dist, database atau unggahan lokal.
