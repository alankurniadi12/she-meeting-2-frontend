<script setup>
import { computed, watch, onUnmounted, ref } from 'vue';
import { api } from '../services/api.js';
import { useRoute, useRouter } from 'vue-router';
import { encodeQuery } from '../services/query.js';
const route = useRoute();
const router = useRouter();

const props = defineProps({
  divisions: { type: Array, default: () => [] },
  divisionsError: { type: String, default: '' },
});
const emit = defineEmits(['session-ended', 'reload-divisions']);
const selectedIds = ref([]);
const selectedMonth = ref('');
const data = ref(null);
const loading = ref(true);
const error = ref('');
let requestNumber = 0;
const number = (value) => new Intl.NumberFormat('id-ID').format(value);
const statusCards = computed(() => data.value ? [
  { label: 'Total temuan', value: data.value.snapshot.totalValid, tone: 'total', symbol: '≡', caption: 'Tidak termasuk data batal' },
  { label: 'Diproses', value: data.value.snapshot.counts.IN_PROGRESS, tone: 'progress', symbol: '↗', caption: 'Pekerjaan sedang ditangani' },
  { label: 'Tertunda', value: data.value.snapshot.counts.ON_HOLD, tone: 'hold', symbol: 'Ⅱ', caption: 'Pekerjaan memiliki kendala' },
  { label: 'Selesai', value: data.value.snapshot.counts.COMPLETED, tone: 'complete', symbol: '✓', caption: 'Status selesai yang dicatat' },
] : []);
const scopeLabel = computed(() => {
  const ids = data.value?.scope.responsibleDivisionIds || [];
  if (!ids.length) return 'Semua divisi';
  return ids.map((id) => props.divisions.find((division) => division.id === id)?.name || 'Divisi tidak tersedia').join(', ');
});
const monthLabel = computed(() => data.value ? new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  .format(new Date(`${data.value.period.month}-01T00:00:00Z`)) : '');
const updatedLabel = computed(() => data.value ? new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: data.value.timeZone,
}).format(new Date(data.value.asOf)) : '');

async function loadDashboard() {
  const request = ++requestNumber;
  loading.value = true;
  error.value = '';
  const params = encodeQuery(route.query);
  try {
    const result = await api(`/dashboard${params ? `?${params}` : ''}`);
    if (request !== requestNumber) return;
    data.value = result.data;
    if (!selectedMonth.value) selectedMonth.value = result.data.period.month;
  } catch (failure) {
    if (request !== requestNumber) return;
    if (failure.status === 401) emit('session-ended');
    else error.value = failure.message;
  } finally { if (request === requestNumber) loading.value = false; }
}
async function navigate(query) {
  const target = { name: 'dashboard', query };
  if (router.resolve(target).fullPath === route.fullPath) await loadDashboard();
  else await router.push(target);
}
function applyFilters() {
  const query = {};
  if (selectedIds.value.length) query.responsibleDivisionIds = selectedIds.value.join(',');
  if (selectedMonth.value) query.month = selectedMonth.value;
  void navigate(query);
}
function resetFilters() { selectedIds.value = []; selectedMonth.value = ''; void navigate({}); }
function refresh() { void loadDashboard(); }
watch(() => route.fullPath, () => {
  if (route.name !== 'dashboard') return;
  selectedIds.value = typeof route.query.responsibleDivisionIds === 'string' ? route.query.responsibleDivisionIds.split(',') : [];
  selectedMonth.value = typeof route.query.month === 'string' ? route.query.month : '';
  void loadDashboard();
}, { immediate: true });
onUnmounted(() => { requestNumber++; });
</script>

<template>
  <div class="dashboard-view">
    <section class="dashboard-filter panel" aria-labelledby="filter-title">
      <form @submit.prevent="applyFilters">
        <fieldset :disabled="loading">
          <legend id="filter-title">Cakupan ringkasan</legend>
          <div class="filter-heading"><p>Pilih divisi penanggung jawab. Tanpa pilihan berarti semua divisi.</p><button class="text-button" type="button" @click="resetFilters">Reset filter</button></div>
          <div v-if="divisionsError" class="connection-alert" role="alert">{{ divisionsError }} <button class="text-button" type="button" @click="emit('reload-divisions')">Coba muat divisi</button></div>
          <div class="dashboard-filter-row">
            <div class="division-options" role="group" aria-label="Divisi penanggung jawab">
              <label v-for="division in divisions" :key="division.id" class="division-option"><input v-model="selectedIds" type="checkbox" :value="division.id" /><span>{{ division.name }}<small v-if="!division.active"> · nonaktif</small></span></label>
            </div>
            <div class="month-filter"><label for="dashboard-month">Bulan indikator</label><input id="dashboard-month" v-model="selectedMonth" name="month" type="month" min="1000-01" max="9999-12" aria-describedby="month-help" /></div>
            <button class="primary-button" type="submit">Terapkan filter</button>
          </div>
          <p id="month-help" class="filter-help">Pilihan bulan hanya mengubah angka masuk dan selesai bulanan. Kartu status tetap mencakup semua tanggal.</p>
        </fieldset>
      </form>
    </section>
    <div class="dashboard-section-heading"><div><h2>Posisi temuan saat ini</h2><p v-if="data && !error && !loading">{{ scopeLabel }} · semua tanggal · data batal dikecualikan</p></div><button class="refresh-button" :disabled="loading" @click="refresh"><span aria-hidden="true">↻</span>{{ loading ? 'Memuat…' : 'Perbarui data' }}</button></div>
    <div v-if="loading" class="panel dashboard-state" role="status" aria-live="polite"><span class="loading-dot" aria-hidden="true"></span>Memuat ringkasan dari server…</div>
    <div v-else-if="error" class="panel dashboard-state error-state" role="alert"><h3>Ringkasan belum dapat dimuat</h3><p>{{ error }}</p><button class="refresh-button" @click="loadDashboard()">Coba lagi</button></div>
    <template v-else-if="data">
      <div class="dashboard-cards" aria-label="Ringkasan status temuan">
        <article v-for="card in statusCards" :key="card.tone" class="metric-card" :class="card.tone"><div class="metric-heading"><h3>{{ card.label }}</h3><span class="metric-symbol" aria-hidden="true">{{ card.symbol }}</span></div><strong class="metric-value">{{ number(card.value) }}</strong><p>{{ card.caption }}</p></article>
      </div>
      <div v-if="data.snapshot.totalValid === 0" class="panel empty-dashboard" role="status"><h3>Belum ada temuan dalam cakupan ini.</h3><p>Coba cakupan semua divisi. Pencatatan temuan baru tersedia pada tahap berikutnya.</p></div>
      <section class="attention-panel" aria-labelledby="attention-title"><div class="attention-intro"><span class="panel-kicker">TINDAK LANJUT</span><h2 id="attention-title">Pekerjaan yang masih terbuka</h2><p>Gunakan ringkasan ini untuk menentukan fokus pembahasan rapat.</p></div><div class="attention-metric"><strong>{{ number(data.snapshot.open) }}</strong><span>Temuan terbuka</span><small>Diproses + Tertunda</small></div><div class="attention-metric overdue-metric"><strong>{{ number(data.snapshot.overdue) }}</strong><span>Melewati target</span><small>Target sebelum hari ini, belum selesai</small></div></section>
      <section class="monthly-section" aria-labelledby="monthly-title"><div class="dashboard-section-heading"><div><h2 id="monthly-title">Aktivitas {{ monthLabel }}</h2><p>{{ scopeLabel }} · dihitung menggunakan {{ data.timeZone }}</p></div><span class="period-label">{{ monthLabel }}</span></div><div class="monthly-cards"><article class="panel monthly-card"><div class="monthly-icon" aria-hidden="true">↓</div><div><h3>Laporan masuk</h3><p>Berdasarkan tanggal laporan.</p></div><strong>{{ number(data.period.reported) }}</strong></article><article class="panel monthly-card"><div class="monthly-icon complete-icon" aria-hidden="true">✓</div><div><h3>Dicatat selesai</h3><p>Status kini Selesai, berdasarkan waktu pencatatan selesai.</p></div><strong>{{ number(data.period.completed) }}</strong></article></div></section>
      <div class="dashboard-footnote"><span>Data dimuat {{ updatedLabel }} · {{ data.timeZone }}</span><span>Perbarui data untuk melihat perubahan terbaru.</span></div>
      <aside class="dashboard-note"><strong>Data demo untuk mencoba alur rapat.</strong><p>Temuan bersama beberapa divisi dihitung satu kali. Status Selesai merupakan catatan pengguna; bukan bukti inspeksi independen. Pencatatan dan perubahan temuan sedang dikembangkan.</p></aside>
    </template>
  </div>
</template>
