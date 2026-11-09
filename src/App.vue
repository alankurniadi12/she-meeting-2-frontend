<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { api, setCsrfToken } from './services/api.js';

const account = ref(null);
const divisions = ref([]);
const username = ref('');
const password = ref('');
const checking = ref(true);
const busy = ref(false);
const message = ref('');
const loadError = ref('');
const menuOpen = ref(false);
let expiryTimer;
let checkingSession = false;
let sessionEpoch = 0;

function clearSession(notice = '') {
  sessionEpoch++;
  clearTimeout(expiryTimer);
  setCsrfToken(null);
  account.value = null;
  divisions.value = [];
  menuOpen.value = false;
  message.value = notice;
}
function acceptSession(data) {
  setCsrfToken(data.csrfToken);
  account.value = data.account;
  clearTimeout(expiryTimer);
  expiryTimer = setTimeout(() => clearSession('Sesi sudah berakhir. Silakan login kembali.'), Math.max(0, Date.parse(data.expiresAt) - Date.now()));
}
async function loadDivisions() {
  const epoch = sessionEpoch;
  loadError.value = '';
  try {
    const result = await api('/divisions');
    if (epoch === sessionEpoch && account.value) divisions.value = result.data;
  }
  catch (error) {
    if (epoch !== sessionEpoch) return;
    if (error.status === 401) clearSession('Sesi sudah berakhir. Silakan login kembali.');
    else loadError.value = error.message;
  }
}
async function restoreSession() {
  if (checkingSession || busy.value) return;
  checkingSession = true;
  const epoch = sessionEpoch;
  try {
    const result = await api('/auth/me');
    if (epoch !== sessionEpoch) return;
    acceptSession(result.data);
    message.value = '';
    await loadDivisions();
  } catch (error) {
    if (epoch !== sessionEpoch) return;
    if (error.status === 401) clearSession(account.value ? 'Sesi sudah berakhir. Silakan login kembali.' : '');
    else message.value = error.message;
  } finally { checking.value = false; checkingSession = false; }
}
async function login() {
  sessionEpoch++;
  busy.value = true;
  message.value = '';
  try {
    acceptSession((await api('/auth/login', { method: 'POST', body: { username: username.value, password: password.value } })).data);
    await loadDivisions();
  } catch (error) { message.value = error.message; }
  finally { password.value = ''; busy.value = false; }
}
async function logout() {
  busy.value = true;
  message.value = '';
  try { await api('/auth/logout', { method: 'POST' }); clearSession('Anda sudah keluar dari akun.'); }
  catch (error) {
    if (error.status === 401) clearSession('Sesi sudah berakhir. Silakan login kembali.');
    else message.value = error.message;
  } finally { busy.value = false; }
}
function onFocus() { if (account.value) void restoreSession(); }
onMounted(() => { void restoreSession(); window.addEventListener('focus', onFocus); });
onUnmounted(() => { clearTimeout(expiryTimer); window.removeEventListener('focus', onFocus); });
</script>

<template>
  <div class="app-shell">
    <button v-if="menuOpen" class="scrim" aria-label="Tutup navigasi" @click="menuOpen = false"></button>
    <aside class="sidebar" :class="{ open: menuOpen }" aria-label="Navigasi utama">
      <a class="brand" href="/" aria-label="SHE Meeting, beranda"><span class="brand-symbol">S<span>+</span></span><span>SHE<span class="brand-subtitle">MEETING</span></span></a>
      <div class="sidebar-caption">RUANG KERJA</div>
      <a class="nav-link active" href="/" aria-current="page"><span class="nav-icon">▦</span> Akses akun <span class="nav-indicator"></span></a>
      <div class="sidebar-caption next-label">TAHAP BERIKUTNYA</div>
      <div class="planned-nav">Dashboard <span class="soon">Nanti</span></div>
      <div class="planned-nav">Daftar temuan <span class="soon">Nanti</span></div>
      <div class="planned-nav">Kelola akun <span class="soon">Nanti</span></div>
      <div class="sidebar-bottom"><span class="little-mark">SHE</span><div><strong>Demo · data dummy</strong><p>Belum untuk data operasional.</p></div></div>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <div class="header-left"><button class="menu-button" aria-label="Buka navigasi" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">☰</button><a href="/">Home</a><span class="breadcrumb-slash">/</span><span>Akses akun</span></div>
        <div class="header-right"><span class="environment-tag">DEMO DUMMY</span><div class="account-state"><span class="avatar">{{ account?.displayName?.slice(0, 1) || 'S' }}</span><div><strong>{{ account?.displayName || 'Belum login' }}</strong><small>{{ account ? (account.role === 'ADMIN' ? 'Administrator' : 'Akun bersama divisi') : 'Akses internal' }}</small></div></div></div>
      </header>
      <main>
        <div class="page-heading"><div><p class="eyebrow">SHE MEETING / AKSES INTERNAL</p><h1>{{ account ? `Selamat datang, ${account.displayName}` : 'Masuk ke ruang kerja.' }}</h1><p class="heading-description">Pencatatan dan tindak lanjut kondisi tidak aman untuk rapat lintas divisi.</p></div><span class="stage-badge"><span></span> Tahap 02 — Akun</span></div>
        <p v-if="message" class="connection-alert" role="alert">{{ message }}</p>
        <section v-if="checking" class="roadmap-panel" role="status">Memeriksa sesi akun…</section>
        <section v-else-if="!account" class="intro-panel login-panel" aria-labelledby="login-title">
          <div class="intro-copy"><div class="panel-kicker"><span class="kicker-line"></span> SATU AKUN BERSAMA PER DIVISI</div><h2 id="login-title">Mulai dari<br />akun divisi Anda.</h2><p>Gunakan akun yang disediakan Admin ICT. Riwayat perubahan nantinya menunjukkan akun divisi yang digunakan.</p><div class="intro-note"><span>DEMO</span> Gunakan kredensial dummy lokal.</div></div>
          <form class="login-form" @submit.prevent="login">
            <h3>Login SHE Meeting</h3>
            <label for="username">Username</label><input id="username" v-model="username" name="username" autocomplete="username" autocapitalize="none" :spellcheck="false" required minlength="3" maxlength="64" :disabled="busy" />
            <label for="password">Kata sandi</label><input id="password" v-model="password" name="password" type="password" autocomplete="current-password" required maxlength="128" :disabled="busy" />
            <button class="primary-button" type="submit" :disabled="busy">{{ busy ? 'Memproses…' : 'Masuk' }}</button>
            <p>Belum punya akses atau lupa kata sandi? Hubungi Admin ICT.</p>
          </form>
        </section>
        <template v-else>
          <section class="roadmap-panel account-panel" aria-labelledby="account-title">
            <div><p class="eyebrow">SESI AKTIF</p><h2 id="account-title">{{ account.displayName }}</h2><p class="heading-description">{{ account.role === 'ADMIN' ? 'Admin ICT · akun pengelola terpisah dari akun divisi ICT.' : `Akun bersama divisi ${account.division?.name || account.displayName}.` }}</p><p class="heading-description">{{ account.role === 'ADMIN' ? 'Pengelolaan akun melalui antarmuka akan tersedia pada tahap berikutnya.' : 'Akun divisi dapat bekerja lintas divisi saat fitur temuan tersedia.' }}</p></div>
            <button class="refresh-button" :disabled="busy" @click="logout">{{ busy ? 'Memproses…' : 'Keluar akun' }}</button>
          </section>
          <section class="connection-section" aria-labelledby="division-title"><div class="section-heading"><div><h2 id="division-title">Divisi demo</h2><p>Daftar divisi aktif dari server.</p></div><button class="refresh-button" :disabled="busy" @click="loadDivisions">Muat ulang</button></div>
            <div v-if="loadError" class="connection-alert" role="alert">{{ loadError }}</div>
            <ul v-else-if="divisions.length" class="division-list"><li v-for="division in divisions" :key="division.id"><span class="avatar">{{ division.name.slice(0, 1) }}</span><div><strong>{{ division.name }}</strong><small>{{ division.code }}</small></div></li></ul>
            <p v-else class="heading-description">Belum ada divisi aktif.</p>
          </section>
          <section class="roadmap-panel"><h2>Tahap berikutnya: dashboard dan temuan</h2><p class="heading-description">Login dan akses akun sudah tersedia. Dashboard, pencatatan, progres, foto, dan PDF masih dalam pengembangan.</p></section>
        </template>
        <footer class="page-footer"><span>SHE Meeting · Demo internal dengan data dummy</span><span>Belum untuk operasional</span></footer>
      </main>
    </div>
  </div>
</template>
