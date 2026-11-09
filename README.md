# SHE Meeting — Frontend

Frontend Vue.js + JavaScript untuk aplikasi internal SHE Meeting.

Status: D0-02 selesai diuji lokal. Route / menampilkan login atau identitas akun/peran dan daftar divisi backend, dengan logout dan pemulihan sesi setelah refresh. Dashboard bisnis, temuan, kelola akun dan PDF belum tersedia. Belum deployment.

## Menjalankan

Gunakan Node kompatibel (diuji 24.10.0; .nvmrc menargetkan LTS 26).

```sh
npm ci
npm run dev
```

Buka http://127.0.0.1:5173/. Backend diharapkan berjalan pada http://127.0.0.1:4000. Jalankan MongoDB dan `npm run seed:demo` di repo backend untuk membuat akun dummy. Kredensial `camp`, `transport`, `ict`, `admin.ict` tersimpan privat di `.local/demo-accounts.json` backend; jangan menaruhnya di source atau VITE_*. Default tanpa .env sudah memadai; jika diperlukan salin .env.example ke .env yang belum ada. DEV_API_TARGET mengubah tujuan proxy development. Jangan menaruh secret dalam VITE_*.

```sh
npm run build
```

Proxy development meneruskan /api dan /health. Fetch memakai credentials; token CSRF hanya di memori, cookie sesi HttpOnly. Reload/fokus mengambil identitas lewat /api/v1/auth/me, sesi habis/401 kembali ke login. Build/preview tidak otomatis mem-proxy API; atur VITE_SERVER_BASE_URL dan origin CORS untuk host build. Cookie lintas subdomain HTTPS belum diuji sampai hosting dikonfigurasi.

Validasi tahap 02: build lulus, login salah/benar Camp, refresh/logout, login Admin ICT via Enter dan drawer pada HP 390px diperiksa; tanpa overflow horizontal. Tes akses server ada di backend.

Output dist/ diabaikan Git. Vercel nantinya memakai root repo ini, npm run build dan dist; konfigurasi hosting belum diterapkan.

## Branch

- dev: pekerjaan pengembangan sehari-hari dan checkpoint yang diuji.
- prod: kandidat rilis yang dipromosikan dari dev setelah validasi; nama branch bukan bukti siap produksi.

Kedua branch berawal dari fondasi yang sama; bekerja lokal pada dev. Push tidak sama dengan deployment; periksa konfigurasi host sebelum menghubungkan branch.

## Dokumen bersama

Sumber tunggal PRD, konteks, API, UI, backlog dan hasil pengembangan berada di [repo backend, folder docs](https://github.com/alankurniadi12/she-meeting-2-backend/tree/dev/docs). Setiap perubahan frontend yang memengaruhi spesifikasi harus menyelaraskan dokumen tersebut. Backend: https://github.com/alankurniadi12/she-meeting-2-backend.

Jangan commit .env, kredensial, node_modules, dist, database atau unggahan lokal.
