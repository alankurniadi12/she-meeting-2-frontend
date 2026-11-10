<script setup>
import { computed, onMounted, ref } from 'vue';
import { api } from '../services/api.js';
const props = defineProps({ account: Object, divisions: { type: Array, default: () => [] } });
const emit = defineEmits(['session-ended']);
const rows = ref([]); const page = ref(1); const total = ref(0); const loading = ref(false); const error = ref(''); const notice = ref('');
const createForm = ref({ username: '', displayName: '', divisionId: '', initialPassword: '' });
const createPending = ref(null); const createUncertain = ref(false); const createBusy = ref(false); const issuedPassword = ref('');
const resetForm = ref(null); const resetBusy = ref(false); const togglePending = ref(null);
const activeDivisions = computed(() => props.divisions.filter((item) => item.active));
const pages = computed(() => Math.max(1, Math.ceil(total.value / 20)));
const newPassword = () => crypto.randomUUID().replaceAll('-', '');
async function load() {
  loading.value = true; error.value = '';
  try { const response = await api(`/admin/accounts?page=${page.value}&pageSize=20`); rows.value = response.data; total.value = response.meta.total; }
  catch (failure) { if (failure.status === 401) emit('session-ended'); else error.value = failure.message; }
  finally { loading.value = false; }
}
async function create() {
  if (createBusy.value || !createForm.value.divisionId) return;
  createBusy.value = true; error.value = ''; notice.value = '';
  if (!createPending.value) createPending.value = { ...createForm.value, role: 'DIVISION', mutationId: crypto.randomUUID() };
  try {
    await api('/admin/accounts', { method: 'POST', body: createPending.value });
    issuedPassword.value = createPending.value.initialPassword;
    createPending.value = null; createUncertain.value = false;
    createForm.value = { username: '', displayName: '', divisionId: '', initialPassword: '' };
    notice.value = 'Akun divisi berhasil dibuat. Salin kata sandi yang tampil sekali di bawah.';
    page.value = 1; await load();
  } catch (failure) {
    if (failure.status === 401) emit('session-ended');
    else { error.value = failure.message; createUncertain.value = !failure.status || failure.status >= 500;
      if (!createUncertain.value) createPending.value = null; }
  } finally { createBusy.value = false; }
}
function openReset(row) { resetForm.value = { id: row.id, version: row.version, password: newPassword(), pending: null, uncertain: false }; error.value = ''; }
async function resetPassword() {
  const draft = resetForm.value; if (!draft || resetBusy.value) return;
  resetBusy.value = true; error.value = ''; notice.value = '';
  if (!draft.pending) draft.pending = { version: draft.version, mutationId: crypto.randomUUID(), newPassword: draft.password };
  try {
    await api(`/admin/accounts/${draft.id}/reset-password`, { method: 'POST', body: draft.pending });
    issuedPassword.value = draft.password; resetForm.value = null;
    notice.value = 'Kata sandi baru tersimpan. Semua sesi akun itu dicabut. Salin kata sandi yang tampil sekali di bawah.';
    await load();
  } catch (failure) {
    if (failure.status === 401) emit('session-ended');
    else { error.value = failure.message; draft.uncertain = !failure.status || failure.status >= 500;
      if (!draft.uncertain) draft.pending = null; if (failure.code === 'VERSION_CONFLICT') await load(); }
  } finally { resetBusy.value = false; }
}
async function toggle(row) {
  if (togglePending.value && togglePending.value.id !== row.id) return;
  if (!togglePending.value) togglePending.value = { id: row.id, body: { version: row.version, mutationId: crypto.randomUUID(), active: !row.active } };
  error.value = ''; notice.value = '';
  try { await api(`/admin/accounts/${row.id}`, { method: 'PATCH', body: togglePending.value.body });
    togglePending.value = null; notice.value = row.active ? 'Akun dinonaktifkan; semua sesinya dicabut.' : 'Akun diaktifkan kembali.'; await load(); }
  catch (failure) { if (failure.status === 401) emit('session-ended');
    else { error.value = failure.message; if (failure.status && failure.status < 500) { togglePending.value = null; await load(); } } }
}
onMounted(load);
</script>
<template>
  <div class="admin-accounts" v-if="account?.role === 'ADMIN'">
    <p v-if="notice" class="success-notice" role="status">{{ notice }}</p>
    <p v-if="issuedPassword" class="connection-alert"><strong>Kata sandi sementara (salin sekarang):</strong> <code>{{ issuedPassword }}</code> <button type="button" class="text-button" @click="issuedPassword = ''">Sembunyikan</button></p>
    <p v-if="error" class="connection-alert" role="alert">{{ error }}</p>
    <section class="panel admin-account-list"><div class="admin-panel-heading"><h2>Akun dan hak akses</h2><button type="button" class="text-button" @click="load">Perbarui</button></div>
      <p class="filter-help">Admin ICT mengelola akun bersama per divisi. Akun divisi dapat mencatat temuan lintas divisi, tetapi tidak dapat membuka halaman ini.</p>
      <p v-if="loading" role="status">Memuat akun…</p><p v-else-if="!rows.length">Belum ada akun.</p>
      <ul v-else class="admin-account-rows"><li v-for="row in rows" :key="row.id"><div><strong>{{ row.displayName }}</strong><small>@{{ row.username }} · {{ row.role === 'ADMIN' ? 'Admin ICT' : row.division?.name || 'Divisi tidak tersedia' }} · {{ row.active ? 'Aktif' : 'Nonaktif' }}</small></div><div v-if="row.role === 'DIVISION'" class="admin-row-actions"><button type="button" class="text-button" @click="openReset(row)">Reset sandi</button><button type="button" class="text-button" @click="toggle(row)">{{ togglePending?.id === row.id ? 'Coba lagi' : row.active ? 'Nonaktifkan' : 'Aktifkan' }}</button></div></li></ul>
      <div class="history-pagination"><span>{{ total }} akun · halaman {{ page }} dari {{ pages }}</span><button type="button" :disabled="page <= 1" @click="page--; load()">Sebelumnya</button><button type="button" :disabled="page >= pages" @click="page++; load()">Berikutnya</button></div>
    </section>
    <section v-if="resetForm" class="panel admin-account-form"><h2>Reset kata sandi akun</h2><form @submit.prevent="resetPassword"><fieldset :disabled="resetBusy || resetForm.uncertain"><label for="reset-password">Kata sandi baru (minimal 12 karakter)</label><input id="reset-password" v-model="resetForm.password" type="text" minlength="12" maxlength="128" required autocomplete="off" /><button type="button" class="text-button" @click="resetForm.password = newPassword()">Buat acak</button></fieldset><p v-if="resetForm.uncertain" class="connection-alert">Hasil reset belum pasti. Coba lagi dengan operasi yang sama.</p><button type="submit" class="primary-button">{{ resetForm.uncertain ? 'Coba reset kembali' : 'Simpan sandi baru' }}</button><button type="button" class="text-button" @click="resetForm = null">Batal</button></form></section>
    <section class="panel admin-account-form"><h2>Buat akun divisi</h2><p class="filter-help">Satu akun divisi aktif per divisi. Kata sandi tampil sekali setelah berhasil dibuat.</p><form @submit.prevent="create"><fieldset :disabled="createBusy || createUncertain"><label for="admin-username">Username</label><input id="admin-username" v-model="createForm.username" pattern="[a-z0-9._-]{3,64}" required maxlength="64" autocomplete="off" /><label for="admin-display">Nama tampilan akun</label><input id="admin-display" v-model="createForm.displayName" required maxlength="120" /><label for="admin-division">Divisi</label><select id="admin-division" v-model="createForm.divisionId" required><option value="" disabled>Pilih divisi</option><option v-for="division in activeDivisions" :key="division.id" :value="division.id">{{ division.name }}</option></select><label for="admin-password">Kata sandi sementara</label><input id="admin-password" v-model="createForm.initialPassword" type="text" minlength="12" maxlength="128" required autocomplete="off" /><button type="button" class="text-button" @click="createForm.initialPassword = newPassword()">Buat acak</button></fieldset><p v-if="createUncertain" class="connection-alert">Hasil pembuatan belum pasti. Coba lagi dengan isian yang sama.</p><button type="submit" class="primary-button">{{ createUncertain ? 'Coba buat kembali' : 'Buat akun divisi' }}</button></form></section>
  </div>
</template>
