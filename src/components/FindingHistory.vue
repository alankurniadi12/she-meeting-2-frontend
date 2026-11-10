<script setup>
import { computed, ref, watch } from 'vue';
import { api } from '../services/api.js';
import { fieldLabels } from '../services/field-labels.js';
const props = defineProps({ id: String, timeZone: String });
const kind = ref('progress'); const page = ref(1); const rows = ref([]); const meta = ref(null);
const loading = ref(false); const error = ref('');
const actions = { CREATED: 'Temuan dicatat', CORRECTED: 'Informasi dikoreksi', PROGRESS_UPDATED: 'Progres diperbarui', CANCELLED: 'Temuan dibatalkan', RESTORED: 'Temuan dipulihkan', DEMO_SEED: 'Fixture data demo' };
const values = { IN_PROGRESS: 'Diproses', ON_HOLD: 'Tertunda', COMPLETED: 'Selesai', LOW: 'Rendah', MEDIUM: 'Sedang', HIGH: 'Tinggi' };
const fields = computed(() => ({ ...fieldLabels, status: 'Status', holdReason: 'Alasan tertunda', completedAt: 'Waktu selesai', cancelledAt: 'Waktu batal', cancellationReason: 'Alasan pembatalan', cancelledBy: 'Dibatalkan oleh' }));
const actor = (value) => value?.source === 'DEMO_SEED' ? 'Seed data demo' : value?.displayName ? `Akun ${value.displayName}` : 'Akun tidak tersedia';
const timestamp = (value) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: props.timeZone || 'Asia/Jakarta' }).format(new Date(value)) : '—';
function format(value, field, snapshots = []) {
  if (value == null || value === '') return 'Kosong';
  const divisionName = (id) => snapshots.find((item) => item.id === id)?.name || id;
  if (field === 'reporterDivisionId') return divisionName(value);
  if (Array.isArray(value)) return value.map(divisionName).join(', ');
  if (field === 'completedAt' || field === 'cancelledAt') return timestamp(value);
  if (field === 'cancelledBy') return actor(value);
  return values[value] || String(value);
}
let request = 0;
async function load() {
  const current = ++request; loading.value = true; error.value = '';
  try {
    const response = await api(`/findings/${props.id}/${kind.value === 'audit' ? 'history' : 'progress'}?page=${page.value}&pageSize=10`);
    if (current === request) { rows.value = response.data; meta.value = response.meta; }
  } catch (failure) { if (current === request) error.value = failure.message; }
  finally { if (current === request) loading.value = false; }
}
watch([() => props.id, kind], () => { page.value = 1; void load(); }, { immediate: true });
watch(page, () => { void load(); });
</script>
<template>
  <section class="panel detail-progress-list">
    <h2>Riwayat temuan</h2>
    <div class="history-tabs" role="group" aria-label="Jenis riwayat"><button type="button" :class="{ active: kind === 'progress' }" @click="kind = 'progress'">Catatan progres</button><button type="button" :class="{ active: kind === 'audit' }" @click="kind = 'audit'">Perubahan data</button></div>
    <p v-if="error" class="connection-alert" role="alert">{{ error }} <button type="button" class="text-button" @click="load">Coba lagi</button></p>
    <p v-if="loading" role="status">Memuat riwayat…</p>
    <template v-else-if="!error"><p v-if="!rows.length" class="heading-description">{{ meta?.total ? 'Halaman ini kosong.' : 'Belum ada catatan.' }}</p>
      <ol v-else class="progress-entries history-entries" :start="((meta?.page || 1) - 1) * 10 + 1"><li v-for="(entry, index) in rows" :key="entry.id || `${entry.revision}-${index}`">
        <template v-if="kind === 'progress'"><p>{{ entry.text }}</p><small>{{ actor(entry.actor) }} · {{ timestamp(entry.timestamp) }} · versi {{ entry.revision || 'awal' }}</small></template>
        <template v-else><strong>{{ actions[entry.action] || entry.action }}</strong><small>{{ actor(entry.actor) }} · {{ timestamp(entry.timestamp) }} · versi {{ entry.revision || 'awal' }}</small>
          <p v-if="entry.action === 'DEMO_SEED'" class="filter-help">Fixture lama tidak memiliki nilai sebelum/sesudah. Ini metadata seed, bukan perubahan akun.</p>
          <dl v-for="field in Object.keys(entry.after || {})" :key="field" class="history-change"><dt>{{ fields[field] || field }}</dt><dd><span>{{ format(entry.before?.[field], field, entry.divisionSnapshots) }}</span><span aria-hidden="true"> → </span><strong>{{ format(entry.after[field], field, entry.divisionSnapshots) }}</strong></dd></dl>
          <p v-if="entry.correctionReason" class="filter-help">Alasan koreksi: {{ entry.correctionReason }}</p><p v-if="entry.progressEntryId" class="filter-help">Catatan progres ditautkan pada versi ini.</p>
          <p v-if="entry.reason" class="filter-help">Alasan {{ entry.action === 'RESTORED' ? 'pemulihan' : 'pembatalan' }}: {{ entry.reason }}</p>
          <p v-if="entry.divisionSnapshots?.length" class="filter-help">Nama divisi saat perubahan: {{ entry.divisionSnapshots.map(item => `${item.name || 'Tidak tersedia'} (${item.code || '—'})`).join(', ') }}</p>
        </template></li></ol>
      <div v-if="meta" class="history-pagination"><span>{{ meta.total }} {{ kind === 'audit' ? 'perubahan' : 'catatan' }} · halaman {{ meta.page }} dari {{ meta.totalPages || 1 }}</span><button type="button" :disabled="loading || page <= 1" @click="page--">Sebelumnya</button><button type="button" :disabled="loading || page >= meta.totalPages" @click="page++">Berikutnya</button></div>
    </template>
  </section>
</template>
