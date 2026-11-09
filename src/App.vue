<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { api, setCsrfToken } from './services/api.js';
import { useRoute, useRouter } from 'vue-router';
import { loginDestination } from './services/query.js';
const route = useRoute();
const router = useRouter();

const account = ref(null);
const divisions = ref([]);
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
    const result = await api('/divisions?activeOnly=false');
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
async function login(credentials) {
  sessionEpoch++;
  busy.value = true;
  message.value = '';
  try {
    acceptSession((await api('/auth/login', { method: 'POST', body: credentials })).data);
    await loadDivisions();
  } catch (error) { message.value = error.message; }
  finally { busy.value = false; }
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
const titles = { dashboard: 'Dashboard temuan', findings: 'Daftar temuan', 'finding-new': 'Catat temuan', 'finding-edit': 'Koreksi temuan', 'finding-detail': 'Detail temuan' };
const pageTitle = computed(() => !account.value ? 'Masuk ke ruang kerja.' : titles[route.name] || 'Halaman belum tersedia');
const pageDescription = computed(() => !account.value ? 'Pencatatan dan tindak lanjut kondisi tidak aman untuk rapat lintas divisi.' : String(route.name).startsWith('finding') ? 'Catat kondisi dan ikuti tindak lanjut bersama divisi penanggung jawab.' : `Selamat datang, ${account.value.displayName}. Pantau posisi temuan dan fokus tindak lanjut rapat.`);
watch([() => route.fullPath, checking, account], () => {
  if (checking.value) return;
  if (!account.value && route.meta.requiresAuth) void router.replace({ name: 'login', query: { redirect: route.fullPath } });
  else if (account.value && route.name === 'login') void router.replace(loginDestination(route.query.redirect));
});
watch(() => route.name, (name) => {
  menuOpen.value = false;
  document.title = `SHE Meeting · ${{ login: 'Login', ...titles }[name] || 'Halaman tidak ditemukan'}`;
}, { immediate: true });
function onFocus() { if (account.value) void restoreSession(); }
onMounted(() => { void restoreSession(); window.addEventListener('focus', onFocus); });
onUnmounted(() => { clearTimeout(expiryTimer); window.removeEventListener('focus', onFocus); });
</script>

<template>
  <div class="app-shell">
    <button v-if="menuOpen" class="scrim" aria-label="Tutup navigasi" @click="menuOpen = false"></button>
    <aside class="sidebar" :class="{ open: menuOpen }" aria-label="Navigasi utama">
      <RouterLink class="brand" to="/dashboard" aria-label="SHE Meeting, beranda"><span class="brand-symbol">S<span>+</span></span><span>SHE<span class="brand-subtitle">MEETING</span></span></RouterLink>
      <div class="sidebar-caption">RUANG KERJA</div>
      <template v-if="account">
        <RouterLink class="nav-link" active-class="active" to="/dashboard"><span class="nav-icon">▦</span> Dashboard</RouterLink>
        <RouterLink class="nav-link" :class="{ active: String(route.name).startsWith('finding') }" active-class="active" to="/findings"><span class="nav-icon">≡</span> Daftar temuan</RouterLink>
      </template>
      <RouterLink v-else class="nav-link" active-class="active" to="/login"><span class="nav-icon">▦</span> Masuk</RouterLink>
      <div class="sidebar-caption next-label">TAHAP BERIKUTNYA</div>
      <div class="planned-nav">Kelola akun <span class="soon">Nanti</span></div>
      <div class="sidebar-bottom"><span class="little-mark">SHE</span><div><strong>Demo · data dummy</strong><p>Belum untuk data operasional.</p></div></div>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <div class="header-left"><button class="menu-button" aria-label="Buka navigasi" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">☰</button><RouterLink to="/dashboard">Home</RouterLink><span class="breadcrumb-slash">/</span><span>{{ account ? (String(route.name).startsWith('finding') ? 'Daftar temuan' : 'Dashboard') : 'Masuk' }}</span></div>
        <div class="header-right"><span class="environment-tag">DEMO DUMMY</span><div class="account-state"><span class="avatar">{{ account?.displayName?.slice(0, 1) || 'S' }}</span><div><strong>{{ account?.displayName || 'Belum login' }}</strong><small>{{ account ? (account.role === 'ADMIN' ? 'Administrator' : 'Akun bersama divisi') : 'Akses internal' }}</small></div></div><button v-if="account" class="logout-button" :disabled="busy" @click="logout">{{ busy ? 'Memproses…' : 'Keluar' }}</button></div>
      </header>
      <main>
        <div class="page-heading"><div><p class="eyebrow">SHE MEETING / {{ account ? 'RINGKASAN' : 'AKSES INTERNAL' }}</p><h1>{{ pageTitle }}</h1><p class="heading-description">{{ pageDescription }}</p></div><span class="stage-badge"><span></span> Demo alur rapat</span></div>
        <p v-if="message" class="connection-alert" role="alert">{{ message }}</p>
        <section v-if="checking || (!account && route.meta.requiresAuth)" class="roadmap-panel" role="status">Memeriksa sesi akun…</section>
        <RouterView v-else v-slot="{ Component }"><component :is="Component" :key="route.name + ':' + (route.params.id || '')" :account="account" :busy="busy" :divisions="divisions" :divisions-error="loadError" @login="login" @reload-divisions="loadDivisions" @session-ended="clearSession('Sesi sudah berakhir. Silakan login kembali.')" /></RouterView>
        <footer class="page-footer"><span>SHE Meeting · Demo internal dengan data dummy</span><span>Belum untuk operasional</span></footer>
      </main>
    </div>
  </div>
</template>
