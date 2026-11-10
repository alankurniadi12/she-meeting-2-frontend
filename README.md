# SHE Meeting — Frontend

Frontend Vue.js + JavaScript untuk aplikasi internal SHE Meeting.

Status: D0-01 sampai D0-07, M-02, M-03, M-04 dan M-06 selesai untuk demo lokal. Login, dashboard lengkap dengan tren/status per divisi/lima tindak lanjut, serta daftar rapat dengan pencarian/filter/status/badge/pagination tersedia. Route /login, /dashboard dan /findings memakai Vue Router 4.6.4 yang kompatibel dengan Node 24.10 lokal; / mengarah ke dashboard. Tambah/detail/koreksi/progres temuan tersedia di /findings/new, /findings/:id dan /findings/:id/edit. PDF M-05 belum tersedia; kelola akun dan master divisi khusus admin tersedia. Belum deployment.

## Menjalankan

Gunakan Node kompatibel (diuji 24.10.0; .nvmrc menargetkan LTS 26).

```sh
npm ci
npm run dev
```

Buka http://127.0.0.1:5173/. Backend diharapkan berjalan pada http://127.0.0.1:4000. Jalankan MongoDB dan `npm run seed:demo` di repo backend untuk membuat akun dan 18 temuan dummy (seed ulang tidak mereset data/sandi). Kredensial `camp`, `transport`, `ict`, `admin.ict` tersimpan privat di `.local/demo-accounts.json` backend; jangan menaruhnya di source atau VITE_*. Default tanpa .env sudah memadai; jika diperlukan salin .env.example ke .env yang belum ada. DEV_API_TARGET mengubah tujuan proxy development. Jangan menaruh secret dalam VITE_*.

```sh
npm test
npm run build
```

Proxy development meneruskan /api dan /health. Fetch memakai credentials; token CSRF hanya di memori, cookie sesi HttpOnly. Reload/fokus mengambil identitas lewat /api/v1/auth/me, sesi habis/401 kembali ke login. Build/preview tidak otomatis mem-proxy API; atur VITE_SERVER_BASE_URL dan origin CORS untuk host build. Cookie lintas subdomain HTTPS belum diuji sampai hosting dikonfigurasi.

Dashboard mengambil angka dari GET /api/v1/dashboard, bukan konstanta frontend. Pilih checkbox divisi dan bulan lalu Terapkan filter; tanpa divisi terpilih berarti semua. Bulan hanya memengaruhi indikator periodik, kartu status semua tanggal. Filter sukses tersimpan di query URL dan pulih setelah refresh. Perbarui data memakai scope yang ditampilkan; loading/kosong/galat dibedakan. Dashboard kini di /dashboard. Route lama / mengarah ke dashboard dengan query yang sama. Navigasi router mengembalikan filter melalui Back/Forward/refresh; 401 kembali /login dan login berhasil mengembalikan tujuan internal yang sah. Tujuan eksternal tidak diterima. Deep link Vite lokal diuji; hosting nantinya memerlukan SPA fallback/rewrite, belum dikonfigurasi di Vercel pada tahap ini.

Daftar /findings mengambil baris dan ringkasan dari satu GET /api/v1/findings. Pilih divisi/pencarian/status, buka Filter lanjutan & urutan untuk prioritas, divisi pelapor, dasar/rentang tanggal, pembatalan, sort dan baris per halaman; lalu Terapkan filter. Kartu menghitung seluruh hasil sebelum pagination, data batal terpisah. Perubahan filter mulai page 1, Reset juga menghapus draf belum diterapkan. Tambah temuan dan link Buka detail sekarang berfungsi. Detail menyediakan Koreksi informasi dan form progres; PDF masih belum tersedia; foto privat tersedia pada detail.

D0-05: isi form tanpa target/foto bila belum ditentukan, simpan sebagai Diproses, lalu perbarui detail/progres/status. Tertunda wajib alasan; Selesai meminta pemahaman status untuk semua penanggung jawab, tanpa foto/approval. Koreksi dari Selesai ke aktif wajib alasan, kejadian berulang dibuat baru. Riwayat progres dan audit before/after tersedia 10 item per halaman.

Draft hanya memori tab per akun/resource, tidak localStorage. Konflik menjaga draft, menampilkan nilai semula/draft/terbaru, lalu rebase manual atau buang draft secara eksplisit. Network/5xx tidak pasti mengunci isian untuk retry mutationId/payload yang sama. Navigasi dicegah saat menyimpan; refresh/menutup tab dapat menghapus draft dan diberi peringatan. Setelah sukses, detail dibaca ulang dan draft dibersihkan. Notice sukses tidak berasal dari URL. Belum pemulihan tahan refresh/offline atau merge otomatis perubahan pada field yang sama.

Validasi D0-05: 5 tes frontend (URL/tujuan login, cache draft/retry dan notice), build, serta 62 tes backend MongoDB nyata lulus. Browser membuat temuan tanpa target/foto, koreksi, tunda/lanjut/Selesai, refresh, konflik dua tab tanpa hilang teks draft, native validasi alasan dan form/detail HP 390px serta desktop 1440px diperiksa. Daftar terfilter membaca hasil baru. M-04 kemudian diuji terpisah dengan 67 tes backend, 7 frontend/build dan filter dashboard Chrome lokal; bagian MVP lain belum seluruhnya selesai.

Output dist/ diabaikan Git. Vercel nantinya memakai root repo ini, npm run build dan dist; konfigurasi hosting belum diterapkan.

## Branch

- dev: pekerjaan pengembangan sehari-hari dan checkpoint yang diuji.
- prod: kandidat rilis yang dipromosikan dari dev setelah validasi; nama branch bukan bukti siap produksi.

Kedua branch berawal dari fondasi yang sama; bekerja lokal pada dev. Push tidak sama dengan deployment; periksa konfigurasi host sebelum menghubungkan branch.

## Dokumen bersama

Sumber tunggal PRD, konteks, API, UI, backlog dan hasil pengembangan berada di [repo backend, folder docs](https://github.com/alankurniadi12/she-meeting-2-backend/tree/dev/docs). Setiap perubahan frontend yang memengaruhi spesifikasi harus menyelaraskan dokumen tersebut. Backend: https://github.com/alankurniadi12/she-meeting-2-backend.

Jangan commit .env, kredensial, node_modules, dist, database atau unggahan lokal.

D0-06: 6 tes frontend dan build lulus; endpoint riwayat diuji pada 63 tes backend dengan MongoDB test. Pada checkpoint D0-06, alur browser belum diverifikasi; D0-07 mengujinya. Perangkat kantor tetap belum diuji.

D0-07: alur dashboard/filter/create/status/riwayat dua halaman dan konflik dua tab diuji di browser lokal. Bug rebase proxy Vue diperbaiki dan diuji ulang. Browser uji tetap 841 px walau override 390/1440 dicoba; tidak mengklaim uji layar HP/proyektor pada D0-07. Fitur D1, HTTPS dan presentasi leader belum selesai.

## Pembatalan M-03

Pada detail, akun login dapat membatalkan temuan dengan alasan wajib. Data batal tetap dapat dibuka melalui filter Batal, tetapi koreksi/progres hanya dibaca. Admin dapat memulihkan dengan alasan; riwayat menunjukkan kedua aksi dan before/after. Draf alasan dipertahankan saat konflik versi atau hasil jaringan tidak pasti. Validasi lokal: 7 tes frontend, build, 64 tes backend MongoDB dan alur browser dummy batal/pulih. Belum deployment.

## Foto opsional M-02

Detail temuan menyediakan galeri foto privat dan unggah satu foto JPEG/PNG/WebP maksimal 5 MiB pada temuan aktif. Pilih jenis awal/progres/penyelesaian; maksimal 10 foto. Foto hanya dapat dibaca akun login dan tetap tampak saat batal. File yang dipilih/draf retry hanya hidup selama tab terbuka; laporan teks dan status Selesai tetap tanpa foto. Backend menyimpan WebP di folder privat, default `.local/uploads`; belum ada deployment atau uji volume/backup.

## Admin ICT — M-06 sebagian

Admin ICT melihat menu Kelola akun ke `/admin/accounts`; akun divisi tidak. Halaman ini menampilkan akun, membuat akun DIVISION, mereset sandi, serta aktif/nonaktif. Sandi baru hanya tampil sementara setelah berhasil disimpan; salurkan melalui kanal internal. Server tetap menjaga semua aksi admin. Halaman `/admin/divisions` menampilkan, menambah, mengganti nama dan mengaktifkan/nonaktifkan master divisi. Kode tetap; nonaktif perlu menonaktifkan akun divisi terkait dahulu. Akun ADMIN sendiri belum dapat diubah.
