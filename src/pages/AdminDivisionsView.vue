<script setup>
import { onMounted, ref } from 'vue';
import { api } from '../services/api.js';
const props = defineProps({ account: Object });
const emit = defineEmits(['session-ended', 'reload-divisions']);
const rows = ref([]); const loading = ref(false); const busy = ref(false);
const error = ref(''); const notice = ref('');
const form = ref({ code: '', name: '' }); const createPending = ref(null);
const edit = ref(null); const updatePending = ref(null);
async function load() {
  loading.value = true; error.value = '';
  try { rows.value = (await api('/admin/divisions')).data; }
  catch (failure) { if (failure.status === 401) emit('session-ended'); else error.value = failure.message; }
  finally { loading.value = false; }
}
async function refresh() { await load(); emit('reload-divisions'); }
async function create() {
  if (busy.value) return;
  busy.value = true; error.value = ''; notice.value = '';
  if (!createPending.value) createPending.value = { code: form.value.code, name: form.value.name, mutationId: crypto.randomUUID() };
  try {
    await api('/admin/divisions', { method: 'POST', body: createPending.value });
    createPending.value = null; form.value = { code: '', name: '' };
    notice.value = 'Divisi dibuat.'; await refresh();
  } catch (failure) {
    if (failure.status === 401) emit('session-ended');
    else { error.value = failure.message; if (failure.status && failure.status < 500) createPending.value = null; }
  } finally { busy.value = false; }
}
function openEdit(row) { edit.value = { id: row.id, name: row.name, version: row.version }; updatePending.value = null; error.value = ''; }
async function update(row, active) {
  if (busy.value) return;
  busy.value = true; error.value = ''; notice.value = '';
  if (!updatePending.value) updatePending.value = { id: row.id, body: { version: row.version, mutationId: crypto.randomUUID(), ...(active === undefined ? { name: edit.value.name } : { active }) } };
  try {
    await api(`/admin/divisions/${updatePending.value.id}`, { method: 'PATCH', body: updatePending.value.body });
    updatePending.value = null; edit.value = null;
    notice.value = active === undefined ? 'Nama divisi diperbarui.' : active ? 'Divisi diaktifkan.' : 'Divisi dinonaktifkan.';
    await refresh();
  } catch (failure) {
    if (failure.status === 401) emit('session-ended');
    else {
      error.value = failure.code === 'DIVISION_HAS_ACTIVE_ACCOUNT' ? 'Nonaktifkan akun divisi terkait di halaman Kelola akun terlebih dahulu.' : failure.message;
      if (failure.status && failure.status < 500) { updatePending.value = null; if (failure.status === 409) await load(); }
    }
  } finally { busy.value = false; }
}
onMounted(load);
</script>
<template>
  <div v-if="props.account?.role === 'ADMIN'" class="admin-accounts">
    <p v-if="notice" class="success-notice" role="status">{{ notice }}</p>
    <p v-if="error" class="connection-alert" role="alert">{{ error }} <RouterLink v-if="error.includes('Kelola akun')" to="/admin/accounts">Kelola akun</RouterLink></p>
    <section class="panel admin-account-list">
      <div class="admin-panel-heading"><h2>Master divisi</h2><button type="button" class="text-button" :disabled="loading || busy" @click="refresh">Perbarui</button></div>
      <p class="filter-help">Kode divisi tetap; nama dapat diubah. Divisi dinonaktifkan tanpa menghapus riwayat temuan.</p>
      <p v-if="loading" role="status">Memuat divisi…</p><p v-else-if="!rows.length">Belum ada divisi.</p>
      <ul v-else class="admin-account-rows"><li v-for="row in rows" :key="row.id"><div><strong>{{ row.name }}</strong><small>{{ row.code }} · {{ row.active ? 'Aktif' : 'Nonaktif' }}</small></div><div class="admin-row-actions"><button type="button" class="text-button" :disabled="busy || !!updatePending" @click="openEdit(row)">Ubah nama</button><button type="button" class="text-button" :disabled="busy || (updatePending && (updatePending.id !== row.id || updatePending.body.name !== undefined))" @click="update(row, !row.active)">{{ updatePending?.id === row.id && updatePending.body.active !== undefined ? 'Coba lagi' : row.active ? 'Nonaktifkan' : 'Aktifkan' }}</button></div></li></ul>
    </section>
    <section v-if="edit" class="panel admin-account-form"><h2>Ubah nama divisi</h2><form @submit.prevent="update(edit)"><fieldset :disabled="busy || !!updatePending"><label for="division-edit-name">Nama</label><input id="division-edit-name" v-model="edit.name" required maxlength="80" /></fieldset><p v-if="updatePending" class="connection-alert">Hasil operasi belum pasti. Coba lagi dengan isian yang sama.</p><button type="submit" class="primary-button" :disabled="busy">{{ updatePending ? 'Coba lagi' : 'Simpan nama' }}</button><button type="button" class="text-button" :disabled="busy" @click="edit = null; updatePending = null">Batal</button></form></section>
    <section class="panel admin-account-form"><h2>Tambah divisi</h2><form @submit.prevent="create"><fieldset :disabled="busy || !!createPending"><label for="division-code">Kode (2–20 huruf, angka, - atau _)</label><input id="division-code" v-model="form.code" pattern="[A-Za-z0-9_-]{2,20}" required maxlength="20" /><label for="division-name">Nama</label><input id="division-name" v-model="form.name" required maxlength="80" /></fieldset><p v-if="createPending" class="connection-alert">Hasil pembuatan belum pasti. Coba lagi dengan isian yang sama.</p><button type="submit" class="primary-button" :disabled="busy">{{ createPending ? 'Coba buat kembali' : 'Tambah divisi' }}</button></form></section>
  </div>
</template>
