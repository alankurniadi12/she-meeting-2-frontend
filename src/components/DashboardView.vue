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
const monthName = (value) => new Intl.DateTimeFormat('id-ID', { month: 'short', year: '2-digit', timeZone: 'UTC' })
  .format(new Date(`${value}-01T00:00:00Z`));
const chartMax = computed(() => Math.max(1, ...(data.value?.trend || []).flatMap((row) => [row.reported, row.completed])));
const divisionMax = computed(() => Math.max(1, ...(data.value?.byDivision || []).map((row) => row.total)));
const formatDate = (value) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)) : 'Belum ditentukan';
const formatUpdate = (value) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: data.value?.timeZone }).format(new Date(value)) : 'Belum ada';
const findingsQuery = computed(() => data.value?.scope.responsibleDivisionIds.length
  ? { responsibleDivisionIds: data.value.scope.responsibleDivisionIds.join(',') } : {});

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
          <p id="month-help" class="filter-help">Pilihan bulan mengubah angka bulanan dan akhir tren enam bulan. Kartu status tetap mencakup semua tanggal.</p>
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
      <div v-if="data.snapshot.totalValid === 0" class="panel empty-dashboard" role="status"><h3>Belum ada temuan dalam cakupan ini.</h3><p>Coba cakupan semua divisi. Buka Daftar temuan untuk mencatat temuan baru.</p></div>
      <section class="attention-panel" aria-labelledby="attention-title"><div class="attention-intro"><span class="panel-kicker">TINDAK LANJUT</span><h2 id="attention-title">Pekerjaan yang masih terbuka</h2><p>Gunakan ringkasan ini untuk menentukan fokus pembahasan rapat.</p></div><div class="attention-metric"><strong>{{ number(data.snapshot.open) }}</strong><span>Temuan terbuka</span><small>Diproses + Tertunda</small></div><div class="attention-metric overdue-metric"><strong>{{ number(data.snapshot.overdue) }}</strong><span>Melewati target</span><small>Target sebelum hari ini, belum selesai</small></div></section>
      <section class="monthly-section" aria-labelledby="monthly-title"><div class="dashboard-section-heading"><div><h2 id="monthly-title">Aktivitas {{ monthLabel }}</h2><p>{{ scopeLabel }} · dihitung menggunakan {{ data.timeZone }}</p></div><span class="period-label">{{ monthLabel }}</span></div><div class="monthly-cards"><article class="panel monthly-card"><div class="monthly-icon" aria-hidden="true">↓</div><div><h3>Laporan masuk</h3><p>Berdasarkan tanggal laporan.</p></div><strong>{{ number(data.period.reported) }}</strong></article><article class="panel monthly-card"><div class="monthly-icon complete-icon" aria-hidden="true">✓</div><div><h3>Dicatat selesai</h3><p>Status kini Selesai, berdasarkan waktu pencatatan selesai.</p></div><strong>{{ number(data.period.completed) }}</strong></article></div></section>
      <section class="panel dashboard-chart-section" aria-labelledby="trend-title"><div class="dashboard-section-heading"><div><h2 id="trend-title">Tren enam bulan sampai {{ monthLabel }}</h2><p>{{ scopeLabel }} · laporan masuk menurut tanggal laporan; selesai menurut waktu pencatatan selesai</p></div></div>
        <div class="dashboard-legend"><span><i class="legend-reported"></i> Laporan masuk</span><span><i class="legend-completed"></i> Dicatat selesai</span></div>
        <div class="trend-chart" role="img" :aria-label="`Tren enam bulan: ${data.trend.map(row => `${monthName(row.month)} masuk ${row.reported}, selesai ${row.completed}`).join('; ')}`">
          <div v-for="row in data.trend" :key="row.month" class="trend-column"><div class="trend-bars"><span class="trend-bar reported-bar" :style="{ height: `${row.reported ? Math.max(4, row.reported / chartMax * 100) : 0}%` }" :title="`${monthName(row.month)}: ${row.reported} laporan masuk`"></span><span class="trend-bar completed-bar" :style="{ height: `${row.completed ? Math.max(4, row.completed / chartMax * 100) : 0}%` }" :title="`${monthName(row.month)}: ${row.completed} dicatat selesai`"></span></div><strong>{{ monthName(row.month) }}</strong><small>{{ row.reported }} / {{ row.completed }}</small></div>
        </div><p class="chart-note">Angka selesai mengikuti status kini. Koreksi status dapat mengubah hitungan bulan sebelumnya.</p></section>
      <section class="panel dashboard-chart-section" aria-labelledby="division-title"><div class="dashboard-section-heading"><div><h2 id="division-title">Status per divisi penanggung jawab</h2><p>Kontribusi tiap divisi pada posisi saat ini · semua tanggal</p></div></div>
        <p v-if="!data.byDivision.length" class="chart-note">Belum ada temuan pada divisi yang dipilih.</p>
        <div v-for="row in data.byDivision" :key="row.id" class="division-chart-row"><strong>{{ row.name }}</strong><div class="division-chart-track" :aria-label="`${row.name}: ${row.total} temuan; ${row.counts.IN_PROGRESS} diproses, ${row.counts.ON_HOLD} tertunda, ${row.counts.COMPLETED} selesai`" role="img"><span class="segment-progress" :style="{ width: `${row.counts.IN_PROGRESS / divisionMax * 100}%` }"></span><span class="segment-hold" :style="{ width: `${row.counts.ON_HOLD / divisionMax * 100}%` }"></span><span class="segment-complete" :style="{ width: `${row.counts.COMPLETED / divisionMax * 100}%` }"></span></div><span>{{ row.total }} · {{ row.counts.IN_PROGRESS }}/{{ row.counts.ON_HOLD }}/{{ row.counts.COMPLETED }}</span></div>
        <p class="chart-note">Urutan angka: Diproses / Tertunda / Selesai. Temuan dengan beberapa penanggung jawab muncul pada setiap divisi terkait; total kartu tetap menghitungnya sekali.</p></section>
      <section class="panel dashboard-chart-section" aria-labelledby="followup-title"><div class="dashboard-section-heading"><div><h2 id="followup-title">Perlu tindak lanjut</h2><p>Maksimal lima temuan terbuka; yang terlambat dan tertunda didahulukan</p></div><router-link :to="{ name: 'findings', query: findingsQuery }">Buka daftar</router-link></div>
        <p v-if="!data.followUps.length" class="chart-note">Tidak ada temuan terbuka pada cakupan ini.</p>
        <ul v-else class="followup-list"><li v-for="row in data.followUps" :key="row.id"><div><router-link :to="{ name: 'finding-detail', params: { id: row.id } }">{{ row.reference }}</router-link><span>{{ row.location || 'Lokasi belum ada' }} · dilaporkan {{ formatDate(row.reportedDate) }}</span></div><div><strong>{{ row.isOverdue ? 'Terlambat' : row.status === 'ON_HOLD' ? 'Tertunda' : 'Diproses' }}</strong><span>Target {{ formatDate(row.targetDate) }} · update {{ formatUpdate(row.updatedAt) }}</span></div></li></ul>
      </section>
      <div class="dashboard-footnote"><span>Data dimuat {{ updatedLabel }} · {{ data.timeZone }}</span><span>Perbarui data untuk melihat perubahan terbaru.</span></div>
      <aside class="dashboard-note"><strong>Data demo untuk mencoba alur rapat.</strong><p>Temuan bersama beberapa divisi dihitung satu kali. Status Selesai merupakan catatan pengguna; bukan bukti inspeksi independen. Pencatatan, riwayat, dan foto opsional tersedia melalui Daftar temuan. PDF belum tersedia.</p></aside>
    </template>
  </div>
</template>
