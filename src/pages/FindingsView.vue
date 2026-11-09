<script setup>
import { computed, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../services/api.js';
import { encodeQuery } from '../services/query.js';

defineProps({ divisions: { type: Array, default: () => [] }, divisionsError: { type: String, default: '' } });
const emit = defineEmits(['session-ended', 'reload-divisions']);
const route = useRoute();
const router = useRouter();
const result = ref(null);
const loading = ref(true);
const error = ref('');
const defaultFilters = () => ({ ids: [], q: '', status: '', priority: '', reporterDivisionId: '', from: '', to: '', dateBasis: 'reported', cancellation: 'active', sort: 'reportedDate:desc', pageSize: '20' });
const draft = reactive(defaultFilters());
let requestNumber = 0;
const statusLabel = { IN_PROGRESS: 'Diproses', ON_HOLD: 'Tertunda', COMPLETED: 'Selesai' };
const priorityLabel = { LOW: 'Rendah', MEDIUM: 'Sedang', HIGH: 'Tinggi' };
const number = (value) => new Intl.NumberFormat('id-ID').format(value);
const date = (value) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`)) : 'Belum ditentukan';
const timestamp = (value) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: result.value?.meta.timeZone || 'Asia/Jakarta' }).format(new Date(value)) : '—';
const cards = computed(() => result.value ? [
  { label: 'Total tidak batal', value: result.value.meta.summary.totalValid, tone: 'total' },
  { label: 'Diproses', value: result.value.meta.summary.counts.IN_PROGRESS, tone: 'progress' },
  { label: 'Tertunda', value: result.value.meta.summary.counts.ON_HOLD, tone: 'hold' },
  { label: 'Selesai', value: result.value.meta.summary.counts.COMPLETED, tone: 'complete' },
] : []);
const rangeLabel = computed(() => {
  if (!result.value) return '';
  const { page, pageSize, total } = result.value.meta;
  return result.value.data.length ? `${number((page - 1) * pageSize + 1)}–${number((page - 1) * pageSize + result.value.data.length)} dari ${number(total)} temuan` : `0 dari ${number(total)} temuan`;
});
async function load() {
  const request = ++requestNumber;
  loading.value = true;
  error.value = '';
  try {
    const query = encodeQuery(route.query);
    const response = await api(`/findings${query ? `?${query}` : ''}`);
    if (request === requestNumber) result.value = response;
  } catch (failure) {
    if (request !== requestNumber) return;
    if (failure.status === 401) emit('session-ended');
    else error.value = failure.message;
  } finally { if (request === requestNumber) loading.value = false; }
}
async function navigate(query) {
  const target = { name: 'findings', query };
  if (router.resolve(target).fullPath === route.fullPath) await load();
  else await router.push(target);
}
function applyFilters() {
  const query = {};
  if (draft.ids.length) query.responsibleDivisionIds = draft.ids.join(',');
  for (const key of ['q', 'status', 'priority', 'reporterDivisionId', 'from', 'to']) if (draft[key].trim()) query[key] = draft[key].trim();
  if (draft.dateBasis !== 'reported') query.dateBasis = draft.dateBasis;
  if (draft.cancellation !== 'active') query.cancellation = draft.cancellation;
  if (draft.sort !== 'reportedDate:desc') query.sort = draft.sort;
  if (draft.pageSize !== '20') query.pageSize = draft.pageSize;
  void navigate(query); // A new search always starts at page 1.
}
function pageTo(page) { void navigate({ ...route.query, page: String(page) }); }
function resetFilters() { Object.assign(draft, defaultFilters()); void navigate({}); }
watch(() => route.fullPath, () => {
  if (route.name !== 'findings') return;
  const scalar = (key, fallback = '') => typeof route.query[key] === 'string' ? route.query[key] : fallback;
  draft.ids = scalar('responsibleDivisionIds') ? scalar('responsibleDivisionIds').split(',') : [];
  for (const key of ['q', 'status', 'priority', 'reporterDivisionId', 'from', 'to']) draft[key] = scalar(key);
  draft.dateBasis = scalar('dateBasis', 'reported'); draft.cancellation = scalar('cancellation', 'active');
  draft.sort = scalar('sort', 'reportedDate:desc'); draft.pageSize = scalar('pageSize', '20');
  void load();
}, { immediate: true });
onUnmounted(() => { requestNumber++; });
</script>

<template>
  <div class="findings-view">
    <section class="panel findings-filter" aria-labelledby="findings-filter-title">
      <form @submit.prevent="applyFilters"><fieldset :disabled="loading">
        <legend id="findings-filter-title">Filter bahan rapat</legend>
        <div class="filter-heading"><p>Pilih satu atau beberapa divisi penanggung jawab. Tanpa pilihan berarti semua divisi.</p><button class="text-button" type="button" @click="resetFilters">Reset filter</button></div>
        <div v-if="divisionsError" class="connection-alert" role="alert">{{ divisionsError }} <button class="text-button" type="button" @click="emit('reload-divisions')">Coba muat divisi</button></div>
        <div class="division-options" role="group" aria-label="Divisi penanggung jawab"><label v-for="division in divisions" :key="division.id" class="division-option"><input v-model="draft.ids" type="checkbox" :value="division.id" /><span>{{ division.name }}<small v-if="!division.active"> · nonaktif</small></span></label></div>
        <div class="findings-search-row"><div class="filter-field search-field"><label for="finding-search">Cari temuan</label><input id="finding-search" v-model="draft.q" type="search" maxlength="100" placeholder="Kondisi, lokasi, pelapor, atau referensi" /></div><div class="filter-field"><label for="finding-status">Status pekerjaan</label><select id="finding-status" v-model="draft.status"><option value="">Semua status</option><option value="IN_PROGRESS">Diproses</option><option value="ON_HOLD">Tertunda</option><option value="COMPLETED">Selesai</option></select></div><button class="primary-button" type="submit">Terapkan filter</button></div>
        <details class="advanced-filters"><summary>Filter lanjutan & urutan</summary><div class="advanced-filter-grid">
          <div class="filter-field"><label for="finding-priority">Prioritas</label><select id="finding-priority" v-model="draft.priority"><option value="">Semua prioritas</option><option value="UNASSESSED">Belum dinilai</option><option value="LOW">Rendah</option><option value="MEDIUM">Sedang</option><option value="HIGH">Tinggi</option></select></div>
          <div class="filter-field"><label for="reporter-division">Divisi pelapor</label><select id="reporter-division" v-model="draft.reporterDivisionId"><option value="">Semua divisi pelapor</option><option v-for="division in divisions" :key="division.id" :value="division.id">{{ division.name }}{{ division.active ? '' : ' · nonaktif' }}</option></select></div>
          <div class="filter-field"><label for="finding-basis">Dasar tanggal</label><select id="finding-basis" v-model="draft.dateBasis"><option value="reported">Tanggal laporan</option><option value="completed">Tanggal dicatat selesai</option></select></div>
          <div class="filter-field"><label for="finding-from">Dari tanggal</label><input id="finding-from" v-model="draft.from" type="date" min="1000-01-01" max="9999-12-31" /></div>
          <div class="filter-field"><label for="finding-to">Sampai tanggal</label><input id="finding-to" v-model="draft.to" type="date" min="1000-01-01" max="9999-12-31" /></div>
          <div class="filter-field"><label for="finding-cancellation">Data pembatalan</label><select id="finding-cancellation" v-model="draft.cancellation"><option value="active">Tidak dibatalkan</option><option value="cancelled">Dibatalkan saja</option><option value="all">Semua, termasuk batal</option></select></div>
          <div class="filter-field"><label for="finding-sort">Urutkan</label><select id="finding-sort" v-model="draft.sort"><option value="reportedDate:desc">Laporan terbaru</option><option value="reportedDate:asc">Laporan terlama</option><option value="updatedAt:desc">Pembaruan terbaru</option><option value="updatedAt:asc">Pembaruan terlama</option></select></div>
          <div class="filter-field"><label for="finding-page-size">Baris per halaman</label><select id="finding-page-size" v-model="draft.pageSize"><option value="5">5</option><option value="10">10</option><option value="20">20</option><option value="50">50</option><option value="100">100</option></select></div>
        </div><p class="filter-help">Rentang tanggal mencakup kedua tanggal. Dasar tanggal selesai hanya menampilkan temuan yang kini Selesai.</p></details>
      </fieldset></form>
    </section>
    <div class="list-actions"><RouterLink class="primary-button" :to="{ name: 'finding-new', query: { returnTo: route.fullPath } }">Tambah temuan</RouterLink><span>Foto opsional · status awal Diproses</span></div><div class="dashboard-section-heading"><div><h2>Temuan untuk pembahasan</h2><p>Ringkasan mengikuti seluruh hasil filter, sebelum pembagian halaman.</p></div><button class="refresh-button" :disabled="loading" @click="load"><span aria-hidden="true">↻</span>{{ loading ? 'Memuat…' : 'Perbarui data' }}</button></div>
    <section v-if="loading" class="panel dashboard-state" role="status">Memuat daftar dan ringkasan dari server…</section>
    <section v-else-if="error" class="panel dashboard-state error-state" role="alert"><h3>Daftar belum dapat dimuat</h3><p>{{ error }}</p><button class="refresh-button" @click="load">Coba lagi</button></section>
    <template v-else-if="result">
      <div class="dashboard-cards finding-summary" aria-label="Ringkasan seluruh hasil filter"><article v-for="card in cards" :key="card.tone" class="metric-card" :class="card.tone"><div class="metric-heading"><h3>{{ card.label }}</h3></div><strong class="metric-value">{{ number(card.value) }}</strong><p>Seluruh hasil filter</p></article></div>
      <div class="list-summary-line"><span><strong>{{ number(result.meta.summary.open) }}</strong> terbuka · <strong>{{ number(result.meta.summary.overdue) }}</strong> terlambat</span><span>{{ number(result.meta.summary.cancelled) }} data batal dalam hasil filter</span></div>
      <section v-if="!result.data.length" class="panel dashboard-state"><h3>{{ result.meta.total ? 'Halaman ini tidak memiliki baris.' : 'Belum ada temuan yang sesuai.' }}</h3><p>{{ result.meta.total ? 'Hasil masih tersedia pada halaman lain.' : 'Sesuaikan pencarian atau reset filter untuk melihat data lainnya.' }}</p><button v-if="result.meta.total" class="refresh-button" @click="pageTo(1)">Ke halaman pertama</button><button v-else class="refresh-button" @click="resetFilters">Lihat semua temuan</button></section>
      <div v-else class="panel findings-table-wrap"><table class="findings-table"><caption class="sr-only">Daftar temuan sesuai filter. Data demo, belum untuk operasional.</caption><thead><tr><th scope="col">Temuan & lokasi</th><th scope="col">Pelapor</th><th scope="col">Penanggung jawab</th><th scope="col">Prioritas & target</th><th scope="col">Status</th><th scope="col">Pembaruan</th></tr></thead><tbody><tr v-for="finding in result.data" :key="finding.id" :class="{ 'cancelled-row': finding.cancelledAt }">
        <td class="finding-main"><RouterLink class="finding-reference" :to="{ name: 'finding-detail', params: { id: finding.id }, query: { returnTo: route.fullPath } }">{{ finding.reference }} · Buka detail</RouterLink><span class="finding-date">{{ date(finding.reportedDate) }}</span><p class="finding-description">{{ finding.descriptionExcerpt }}{{ finding.descriptionTruncated ? '…' : '' }}</p><span class="finding-location">{{ finding.location }}</span></td>
        <td><span class="mobile-field-label">Pelapor</span><strong>{{ finding.reporterName }}</strong><small>{{ finding.reporterDivision.name || 'Divisi tidak tersedia' }}</small></td>
        <td><span class="mobile-field-label">Penanggung jawab</span><div class="finding-divisions"><span v-for="division in finding.responsibleDivisions" :key="division.id">{{ division.name || 'Divisi tidak tersedia' }}</span></div></td>
        <td><span class="mobile-field-label">Prioritas & target</span><strong>{{ priorityLabel[finding.priority] || 'Belum dinilai' }}</strong><small>{{ date(finding.targetDate) }}</small></td>
        <td><span class="mobile-field-label">Status</span><div class="finding-badges"><span class="finding-status" :class="finding.status">{{ statusLabel[finding.status] }}</span><span v-if="finding.cancelledAt" class="finding-badge cancelled-badge">Dibatalkan</span><template v-else><span v-if="finding.isNew" class="finding-badge new-badge">Baru</span><span v-if="finding.isOverdue" class="finding-badge overdue-badge">Terlambat</span></template></div></td>
        <td><span class="mobile-field-label">Pembaruan</span><span>{{ timestamp(finding.updatedAt) }}</span><small>{{ finding.updatedBy.source === 'DEMO_SEED' ? 'Seed data demo' : finding.updatedBy.displayName ? `Akun ${finding.updatedBy.displayName}` : 'Akun tidak tersedia' }}</small></td>
      </tr></tbody></table></div>
      <nav v-if="result.meta.total > 0" class="findings-pagination" aria-label="Pagination daftar temuan"><span>{{ rangeLabel }}</span><div><button class="refresh-button" :disabled="result.meta.page <= 1" @click="pageTo(result.meta.page - 1)">Sebelumnya</button><span>Halaman {{ number(result.meta.page) }} / {{ number(result.meta.totalPages) }}</span><button class="refresh-button" :disabled="result.meta.page >= result.meta.totalPages" @click="pageTo(result.meta.page + 1)">Berikutnya</button></div></nav>
      <div class="dashboard-footnote"><span>Data dimuat {{ timestamp(result.meta.asOf) }} · {{ result.meta.timeZone }}</span><span>Data batal dikecualikan dari kartu status.</span></div>
      <aside class="dashboard-note"><strong>Daftar demo untuk rapat.</strong><p>Temuan bersama dihitung satu kali. Baru adalah label usia tujuh hari, bukan status pekerjaan. Buka detail untuk koreksi, progres, dan riwayat perubahan. Foto serta PDF belum tersedia.</p></aside>
    </template>
  </div>
</template>
