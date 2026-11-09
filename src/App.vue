<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const connection = ref('checking');
const checkedAt = ref(null);
const isChecking = ref(false);
const menuOpen = ref(false);
let controller;
const connectionLabel = computed(() => ({ checking: 'Memeriksa koneksi', connected: 'Terhubung', disconnected: 'Belum terhubung' })[connection.value]);
const checkedTime = computed(() => checkedAt.value?.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) || '—');
async function checkConnection() {
  if (isChecking.value) return;
  isChecking.value = true;
  controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const base = (import.meta.env.VITE_SERVER_BASE_URL || '').replace(/\/$/, '');
    const response = await fetch(`${base}/health`, { signal: controller.signal, cache: 'no-store' });
    const result = await response.json();
    connection.value = response.ok && result.data?.status === 'ok' && result.data?.service === 'she-meeting-api' ? 'connected' : 'disconnected';
  } catch { connection.value = 'disconnected'; }
  finally { clearTimeout(timeout); checkedAt.value = new Date(); isChecking.value = false; }
}
onMounted(checkConnection);
onUnmounted(() => controller?.abort());
</script>

<template>
  <div class="app-shell">
    <button v-if="menuOpen" class="scrim" aria-label="Tutup navigasi" @click="menuOpen = false"></button>
    <aside class="sidebar" :class="{ open: menuOpen }" aria-label="Navigasi utama">
      <a class="brand" href="/" aria-label="SHE Meeting, beranda">
        <span class="brand-symbol">S<span>+</span></span>
        <span>SHE<span class="brand-subtitle">MEETING</span></span>
      </a>
      <div class="sidebar-caption">RUANG KERJA</div>
      <a class="nav-link active" href="/" aria-current="page"><span class="nav-icon">▦</span> Ringkasan <span class="nav-indicator"></span></a>
      <div class="sidebar-caption next-label">TAHAP BERIKUTNYA</div>
      <div class="planned-nav"><span class="nav-icon">≡</span> Daftar temuan <span class="soon">Nanti</span></div>
      <div class="planned-nav"><span class="nav-icon">⊞</span> Akun divisi <span class="soon">Nanti</span></div>
      <div class="sidebar-bottom"><span class="little-mark">SHE</span><div><strong>Lingkungan pengembangan</strong><p>Data operasional belum digunakan.</p></div></div>
    </aside>

    <div class="workspace">
      <header class="topbar">
        <div class="header-left"><button class="menu-button" aria-label="Buka navigasi" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">☰</button><a href="/">Home</a><span class="breadcrumb-slash">/</span><span>Ringkasan proyek</span></div>
        <div class="header-right"><span class="environment-tag">DEVELOPMENT</span><div class="account-state"><span class="avatar">S</span><div><strong>Belum login</strong><small>Akun divisi · tahap berikutnya</small></div></div></div>
      </header>
      <main>
        <div class="page-heading"><div><p class="eyebrow">SHE MEETING / PENGEMBANGAN MVP</p><h1>Fondasi yang jelas.<br class="mobile-break" /> Rapat yang lebih terarah.</h1><p class="heading-description">Satu tempat untuk mencatat kondisi tidak aman dan mengikuti tindak lanjutnya.</p></div><span class="stage-badge"><span></span> Tahap 01 — Fondasi</span></div>

        <section class="intro-panel" aria-labelledby="intro-title">
          <div class="intro-copy"><div class="panel-kicker"><span class="kicker-line"></span> DIMULAI DARI ALUR YANG SEDERHANA</div><h2 id="intro-title">Dari temuan,<br />menuju tindak lanjut.</h2><p>Kerangka aplikasi mulai disiapkan. Berikutnya: akun divisi, pencatatan temuan, dan daftar yang membantu pembahasan saat rapat.</p><div class="intro-note"><span>01</span> Fondasi frontend & backend</div></div>
          <div class="flow-illustration" aria-label="Alur pekerjaan: Diproses, Tertunda, Selesai"><div class="flow-label">ALUR TINDAK LANJUT</div><div class="flow-row"><span class="flow-dot blue"></span><div><strong>Diproses</strong><small>Pekerjaan mulai ditangani</small></div><span class="flow-number">01</span></div><div class="flow-row"><span class="flow-dot amber"></span><div><strong>Tertunda</strong><small>Alasan kendala tetap tercatat</small></div><span class="flow-number">02</span></div><div class="flow-row"><span class="flow-dot green"></span><div><strong>Selesai</strong><small>Satu status untuk satu temuan</small></div><span class="flow-number">03</span></div><p class="flow-footnote">Ilustrasi alur · belum ada data temuan</p></div>
        </section>

        <section class="connection-section" aria-labelledby="connection-title"><div class="section-heading"><div><h2 id="connection-title">Status fondasi</h2><p>Koneksi layanan diperiksa langsung, tanpa data contoh yang menyerupai hasil rapat.</p></div><button class="refresh-button" :disabled="isChecking" @click="checkConnection"><span :class="{ spinning: isChecking }">↻</span> {{ isChecking ? 'Memeriksa…' : 'Periksa koneksi' }}</button></div>
          <div class="status-grid"><article class="status-card"><div class="card-topline"><span class="card-icon vue-icon">V</span><span class="status-pill success"><i></i> Aktif</span></div><h3>Antarmuka aplikasi</h3><p>Vue.js + JavaScript</p><div class="card-footer">Kerangka tampilan siap dikembangkan <span>↗</span></div></article>
          <article class="status-card"><div class="card-topline"><span class="card-icon api-icon">{ }</span><span class="status-pill" :class="connection === 'connected' ? 'success' : connection === 'disconnected' ? 'warning' : ''" role="status"><i></i>{{ connectionLabel }}</span></div><h3>Layanan backend</h3><p>Express.js · health endpoint</p><div class="card-footer">Diperiksa pukul {{ checkedTime }} <span>↗</span></div></article>
          <article class="status-card"><div class="card-topline"><span class="card-icon data-icon">≋</span><span class="status-pill neutral"><i></i> Belum diisi</span></div><h3>Data temuan</h3><p>Penyimpanan MongoDB</p><div class="card-footer">Seed data dummy pada tahap berikutnya <span>↗</span></div></article></div>
          <div v-if="connection === 'disconnected'" class="connection-alert" role="alert">Backend belum merespons. Jalankan MongoDB development dan backend sesuai README, kemudian periksa kembali. Halaman ini tetap bisa dibuka saat backend belum aktif.</div>
        </section>

        <section class="roadmap-panel" aria-labelledby="roadmap-title"><div class="section-heading"><div><p class="eyebrow">DIKERJAKAN BERTAHAP</p><h2 id="roadmap-title">Langkah menuju demo pertama</h2></div><span class="text-label">Mengikuti backlog proyek</span></div><div class="roadmap"><article class="roadmap-item current"><span class="step-number">01</span><div><span class="step-state">TAHAP INI</span><h3>Fondasi aplikasi</h3><p>Struktur proyek, koneksi layanan, dan konfigurasi lokal.</p></div></article><article class="roadmap-item"><span class="step-number">02</span><div><span class="step-state">BERIKUTNYA</span><h3>Akun & data dummy</h3><p>Login bersama per divisi dan pembatasan akses di server.</p></div></article><article class="roadmap-item"><span class="step-number">03</span><div><span class="step-state">DIRENCANAKAN</span><h3>Temuan & rapat</h3><p>Catat, filter divisi, ubah progres, dan lihat riwayat.</p></div></article></div></section>
        <footer class="page-footer"><span>SHE Meeting <span class="footer-dot">·</span> MVP internal perusahaan</span><span>Fondasi pengembangan · belum untuk operasional</span></footer>
      </main>
    </div>
  </div>
</template>
