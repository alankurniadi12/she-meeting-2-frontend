<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { onBeforeRouteLeave, useRoute } from 'vue-router';
import { api } from '../services/api.js';
import { fieldLabels } from '../services/field-labels.js';
import { findingReturnPath } from '../services/query.js';
import { getDraft, forgetDraft, pendingMutation, failedMutation, takeSavedNotice } from '../services/drafts.js';
import FindingHistory from '../components/FindingHistory.vue';
import { rebaseFields } from '../services/conflict.js';
const props = defineProps({ account: Object });
const emit = defineEmits(['session-ended']);
const route = useRoute(); const row = ref(null); const loading = ref(true); const saving = ref(false);
const error = ref(''); const fields = ref({}); const message = ref(takeSavedNotice(`${props.account.id}:${route.params.id}`)); const conflict = ref(false);
const key = `${props.account.id}:progress:${route.params.id}`;
const blank = () => ({ form: null, version: null, initial: '', pending: null, uncertain: false, baseStatus: null });
const state = ref(getDraft(key, blank));
const returnPath = computed(() => findingReturnPath(route.query.returnTo));
const statuses = { IN_PROGRESS: 'Diproses', ON_HOLD: 'Tertunda', COMPLETED: 'Selesai' };
const priorities = { LOW: 'Rendah', MEDIUM: 'Sedang', HIGH: 'Tinggi' };
const dirty = computed(() => state.value.form && JSON.stringify(state.value.form) !== state.value.initial);
const locked = computed(() => saving.value || conflict.value || state.value.uncertain || row.value?.cancelledAt);
const timestamp = (value) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: row.value?.timeZone || 'Asia/Jakarta' }).format(new Date(value)) : '—';
const date = (value) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`)) : 'Belum ditentukan';
const actor = (value) => value?.source === 'DEMO_SEED' ? 'Seed data demo' : value?.displayName ? `Akun ${value.displayName}` : 'Akun tidak tersedia';
const conflictValue = (value) => statuses[value] || priorities[value] || value || 'Kosong';
const conflictFields = computed(() => {
  if (!conflict.value || !row.value || !state.value.form) return [];
  const original = JSON.parse(state.value.initial || '{}');
  const latest = { status: row.value.status, holdReason: row.value.holdReason || '', priority: row.value.priority || '', targetDate: row.value.targetDate || '' };
  return Object.keys(latest).filter((key) => JSON.stringify(original[key]) !== JSON.stringify(latest[key]) || JSON.stringify(original[key]) !== JSON.stringify(state.value.form[key]))
    .map((key) => ({ key, label: { status: 'Status', holdReason: 'Alasan tertunda', priority: 'Prioritas', targetDate: 'Target' }[key], before: conflictValue(original[key]), draft: conflictValue(state.value.form[key]), latest: conflictValue(latest[key]) }));
});
async function reviewConflict() { await load(); }
function rebaseDraft() {
  if (!row.value || row.value.version <= state.value.version || state.value.uncertain) return;
  const latest = { status: row.value.status, holdReason: row.value.holdReason || '', priority: row.value.priority || '', targetDate: row.value.targetDate || '' };
  state.value.form = rebaseFields(state.value.form, state.value.initial, latest);
  state.value.version = row.value.version; state.value.baseStatus = row.value.status;
  state.value.initial = JSON.stringify({ text: '', ...latest, correctionReason: '', confirmComplete: false });
  state.value.pending = null; conflict.value = false; error.value = '';
}
async function load() {
  loading.value = true; error.value = '';
  try {
    row.value = (await api(`/findings/${route.params.id}`)).data;
    if (!state.value.form || (!dirty.value && !state.value.uncertain && !state.value.pending)) {
      state.value.form = { text: '', status: row.value.status, holdReason: row.value.holdReason || '', priority: row.value.priority || '', targetDate: row.value.targetDate || '', correctionReason: '', confirmComplete: false };
      state.value.version = row.value.version; state.value.baseStatus = row.value.status; state.value.initial = JSON.stringify(state.value.form);
    }
    conflict.value = state.value.version !== row.value.version && !state.value.uncertain;
  } catch (failure) { if (failure.status === 401) emit('session-ended'); else error.value = failure.message; }
  finally { loading.value = false; }
}
async function discardAndReload() {
  if (!window.confirm('Buang draf progres dan muat data terbaru? Salin catatan yang masih dibutuhkan terlebih dahulu.')) return;
  forgetDraft(key); state.value = getDraft(key, blank); conflict.value = false; await load();
}
async function save() {
  if (saving.value || conflict.value || row.value.cancelledAt) return;
  saving.value = true; error.value = ''; fields.value = {}; message.value = '';
  const form = state.value.form;
  const body = { version: state.value.version, text: form.text, status: form.status, holdReason: form.status === 'ON_HOLD' ? form.holdReason : null,
    priority: form.priority || null, targetDate: form.targetDate || null, ...(form.correctionReason ? { correctionReason: form.correctionReason } : {}) };
  try {
    await api(`/findings/${route.params.id}/progress`, { method: 'POST', body: pendingMutation(state.value, body) });
    message.value = 'Pembaruan berhasil disimpan.';
    forgetDraft(key); state.value = getDraft(key, blank); conflict.value = false;
    row.value = null;
    await load();
  } catch (failure) {
    failedMutation(state.value, failure);
    if (failure.status === 401) emit('session-ended');
    else { error.value = failure.message; fields.value = failure.fields || {}; conflict.value = failure.code === 'VERSION_CONFLICT'; if (conflict.value) await reviewConflict(); }
  } finally { saving.value = false; }
}
function unload(event) { if (dirty.value || state.value.uncertain || saving.value) { event.preventDefault(); event.returnValue = ''; } }
onBeforeRouteLeave(() => !saving.value && ((!dirty.value && !state.value.uncertain) || window.confirm('Ada draf progres belum disimpan. Tinggalkan halaman? Draf hanya sementara di memori tab ini.')));
onMounted(() => { void load(); window.addEventListener('beforeunload', unload); });
onUnmounted(() => window.removeEventListener('beforeunload', unload));
</script>
<template>
  <div class="finding-detail"><div class="detail-navigation"><RouterLink class="text-button" :to="returnPath">← Kembali ke daftar</RouterLink><RouterLink v-if="row && !row.cancelledAt" class="refresh-button" :to="{ name: 'finding-edit', params: { id: row.id }, query: { returnTo: returnPath } }">Koreksi informasi</RouterLink></div>
    <p v-if="message" class="success-notice" role="status">{{ message }}</p>
    <div v-if="error" class="connection-alert" role="alert">{{ error }}<ul v-if="Object.keys(fields).length"><li v-for="(value, field) in fields" :key="field"><strong>{{ fieldLabels[field] || 'Isian' }}:</strong> {{ value }}</li></ul><button v-if="!row" class="text-button" @click="load">Coba muat detail</button></div>
    <section v-if="loading" class="panel dashboard-state" role="status">Memuat detail temuan…</section>
    <template v-else-if="row">
      <section class="panel detail-overview"><div class="detail-top"><div><p class="finding-reference">{{ row.reference }}</p><h2>{{ row.location }}</h2></div><div class="finding-badges"><span class="finding-status" :class="row.status">{{ statuses[row.status] }}</span><span v-if="row.cancelledAt" class="finding-badge cancelled-badge">Dibatalkan</span><span v-if="row.isNew && !row.cancelledAt" class="finding-badge new-badge">Baru</span><span v-if="row.isOverdue" class="finding-badge overdue-badge">Terlambat</span></div></div>
        <p class="detail-description">{{ row.description }}</p>
        <dl class="detail-grid"><div><dt>Tanggal laporan</dt><dd>{{ date(row.reportedDate) }}</dd></div><div><dt>Pelapor</dt><dd>{{ row.reporterName }} · {{ row.reporterDivision.name || 'Divisi tidak tersedia' }}</dd></div><div><dt>Penanggung jawab</dt><dd>{{ row.responsibleDivisions.map(division => division.name || 'Divisi tidak tersedia').join(', ') }}</dd></div><div><dt>Prioritas</dt><dd>{{ priorities[row.priority] || 'Belum dinilai' }}</dd></div><div><dt>Target penyelesaian</dt><dd>{{ date(row.targetDate) }}</dd></div><div><dt>Dicatat selesai</dt><dd>{{ timestamp(row.completedAt) }}</dd></div><div><dt>Dicatat oleh</dt><dd>{{ actor(row.createdBy) }}<small>{{ timestamp(row.createdAt) }}</small></dd></div><div><dt>Pembaruan terakhir</dt><dd>{{ actor(row.updatedBy) }}<small>{{ timestamp(row.updatedAt) }}</small></dd></div></dl>
        <p v-if="row.status === 'ON_HOLD'" class="hold-note"><strong>Alasan tertunda:</strong> {{ row.holdReason }}</p><p v-if="row.cancelledAt" class="connection-alert">Dibatalkan: {{ row.cancellationReason }}. Data hanya dapat dibaca.</p>
        <p class="filter-help">{{ row.attachmentCount ? `${row.attachmentCount} metadata foto tercatat; akses foto belum tersedia.` : 'Tanpa foto. Foto tidak wajib untuk pencatatan atau status Selesai.' }}</p>
      </section>
      <div class="detail-columns"><FindingHistory :id="row.id" :time-zone="row.timeZone" />
      <section class="panel detail-progress-form"><h2>Perbarui progres</h2><div v-if="conflict" class="connection-alert" role="alert">Data berubah pada server. Tinjau perbedaan sebelum memakai versi terbaru.<p>Dasar draf: versi {{ state.version }} · terbaru: versi {{ row.version }}</p><div v-for="item in conflictFields" :key="item.key" class="conflict-comparison"><strong>{{ item.label }}</strong><span>Semula: {{ item.before }}</span><span>Draf: {{ item.draft }}</span><span>Terbaru: {{ item.latest }}</span></div><p v-if="state.form?.text" class="conflict-draft">Draf catatan: {{ state.form.text }}</p><button type="button" class="text-button" :disabled="row.version <= state.version" @click="rebaseDraft">Gunakan versi terbaru, pertahankan perubahan draf</button><button type="button" class="text-button" @click="discardAndReload">Buang draf dan muat ulang</button></div><div v-if="state.uncertain" class="connection-alert" role="alert">Hasil simpan belum dapat dipastikan. Coba simpan kembali; request yang sama tidak akan menggandakan catatan.</div>
        <form v-if="!row.cancelledAt && state.form" @submit.prevent="save"><fieldset :disabled="locked"><div class="filter-field"><label for="progress-text">Catatan progres (opsional bila ada perubahan status/target/prioritas)</label><textarea id="progress-text" v-model="state.form.text" maxlength="2000" rows="4"></textarea></div><div class="edit-grid"><div class="filter-field"><label for="progress-status">Status pekerjaan</label><select id="progress-status" v-model="state.form.status"><option value="IN_PROGRESS">Diproses</option><option value="ON_HOLD">Tertunda</option><option value="COMPLETED">Selesai</option></select></div><div class="filter-field"><label for="progress-priority">Prioritas</label><select id="progress-priority" v-model="state.form.priority"><option value="">Belum dinilai</option><option value="LOW">Rendah</option><option value="MEDIUM">Sedang</option><option value="HIGH">Tinggi</option></select></div><div class="filter-field full-field"><label for="progress-target">Target penyelesaian (opsional)</label><input id="progress-target" v-model="state.form.targetDate" type="date" :min="row.reportedDate" max="9999-12-31" /></div></div>
        <div v-if="state.form.status === 'ON_HOLD'" class="filter-field"><label for="hold-reason">Alasan tertunda *</label><textarea id="hold-reason" v-model="state.form.holdReason" required maxlength="2000" rows="3"></textarea></div>
        <div v-if="state.baseStatus === 'COMPLETED' && state.form.status !== 'COMPLETED'" class="filter-field"><label for="correction-reason">Alasan koreksi status selesai *</label><textarea id="correction-reason" v-model="state.form.correctionReason" required maxlength="2000" rows="3"></textarea><p class="filter-help">Hanya untuk salah input. Bila masalah muncul kembali, buat temuan baru.</p></div>
        <label v-if="state.form.status === 'COMPLETED' && state.baseStatus !== 'COMPLETED'" class="completion-confirm"><input v-model="state.form.confirmComplete" type="checkbox" required /><span>Saya mencatat pekerjaan selesai untuk seluruh divisi penanggung jawab pada temuan ini. Tidak memerlukan foto atau persetujuan dalam aplikasi.</span></label>
        </fieldset><div class="form-actions"><button class="primary-button" type="submit" :disabled="saving || conflict">{{ saving ? 'Menyimpan…' : state.uncertain ? 'Coba simpan kembali' : 'Simpan pembaruan' }}</button></div></form><p v-else class="heading-description">Pembaruan pada temuan batal tidak tersedia.</p>
      </section></div>
    </template>
  </div>
</template>
