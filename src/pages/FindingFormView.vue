<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { api } from '../services/api.js';
import { fieldLabels } from '../services/field-labels.js';
import { findingReturnPath } from '../services/query.js';
import { getDraft, forgetDraft, pendingMutation, failedMutation, savedNotice } from '../services/drafts.js';
import { rebaseFields } from '../services/conflict.js';
const props = defineProps({ account: Object, divisions: { type: Array, default: () => [] }, divisionsError: String });
const emit = defineEmits(['session-ended', 'reload-divisions']);
const route = useRoute(); const router = useRouter();
const editing = route.name === 'finding-edit';
const key = `${props.account.id}:${editing ? `edit:${route.params.id}` : 'new'}`;
const blank = () => ({ form: null, initial: '', version: null, pending: null, uncertain: false });
const state = ref(getDraft(key, blank));
const loading = ref(true); const saving = ref(false); const error = ref(''); const fields = ref({});
const latest = ref(null); const conflict = ref(false); const saved = ref(false); const today = ref('');
const returnPath = computed(() => findingReturnPath(route.query.returnTo));
const dirty = computed(() => state.value.form && JSON.stringify(state.value.form) !== state.value.initial);
const locked = computed(() => saving.value || state.value.uncertain || latest.value?.cancelledAt);
const activeDivisions = computed(() => props.divisions.filter((division) => division.active || state.value.form?.responsibleDivisionIds.includes(division.id) || state.value.form?.reporterDivisionId === division.id));
function core(row) { return { reportedDate: row.reportedDate, description: row.description, location: row.location, reporterName: row.reporterName,
  reporterDivisionId: row.reporterDivisionId, responsibleDivisionIds: [...row.responsibleDivisionIds], priority: row.priority || '', targetDate: row.targetDate || '' }; }
const compare = (value, field) => field === 'responsibleDivisionIds' ? (value || []).map((id) => props.divisions.find((item) => item.id === id)?.name || id).join(', ') || 'Kosong' : field === 'reporterDivisionId' ? props.divisions.find((item) => item.id === value)?.name || value || 'Kosong' : value || 'Kosong';
const conflictFields = computed(() => {
  if (!conflict.value || !latest.value || !state.value.form) return [];
  const original = JSON.parse(state.value.initial || '{}'); const current = core(latest.value);
  return Object.keys(current).filter((field) => JSON.stringify(original[field]) !== JSON.stringify(current[field]) || JSON.stringify(original[field]) !== JSON.stringify(state.value.form[field]))
    .map((field) => ({ field, label: fieldLabels[field] || field, before: compare(original[field], field), draft: compare(state.value.form[field], field), latest: compare(current[field], field) }));
});
function rebaseDraft() {
  if (!latest.value || latest.value.version <= state.value.version || state.value.uncertain) return;
  const current = core(latest.value);
  state.value.form = rebaseFields(state.value.form, state.value.initial, current);
  state.value.version = latest.value.version; state.value.initial = JSON.stringify(current);
  state.value.pending = null; conflict.value = false; error.value = '';
}
async function boot() {
  loading.value = true; error.value = '';
  try {
    const data = (await api(editing ? `/findings/${route.params.id}` : '/dashboard')).data;
    today.value = data.today; latest.value = editing ? data : null;
    if (!state.value.form || (editing && !dirty.value && !state.value.uncertain && !state.value.pending)) {
      state.value.form = editing ? core(data) : { reportedDate: data.today, description: '', location: '', reporterName: '', reporterDivisionId: '', responsibleDivisionIds: [], priority: '', targetDate: '' };
      state.value.version = editing ? data.version : null;
      state.value.initial = JSON.stringify(state.value.form);
    }
    conflict.value = editing && state.value.version !== data.version && !state.value.uncertain;
  } catch (failure) { if (failure.status === 401) emit('session-ended'); else error.value = failure.message; }
  finally { loading.value = false; }
}
async function discardAndReload() {
  if (!window.confirm('Buang draf koreksi dan muat data terbaru? Salin isian yang masih dibutuhkan terlebih dahulu.')) return;
  forgetDraft(key); state.value = getDraft(key, blank); conflict.value = false; await boot();
}
async function save() {
  if (saving.value || conflict.value || latest.value?.cancelledAt) return;
  error.value = ''; fields.value = {}; saving.value = true;
  const form = state.value.form;
  const body = { ...form, responsibleDivisionIds: [...form.responsibleDivisionIds], priority: form.priority || null, targetDate: form.targetDate || null,
    ...(editing ? { version: state.value.version } : {}) };
  try {
    const response = await api(editing ? `/findings/${route.params.id}` : '/findings', { method: editing ? 'PATCH' : 'POST', body: pendingMutation(state.value, body) });
    saved.value = true; forgetDraft(key); state.value.pending = null; state.value.uncertain = false;
    savedNotice(`${props.account.id}:${response.data.id}`, 'Temuan berhasil disimpan.');
    await router.push({ name: 'finding-detail', params: { id: response.data.id }, query: { returnTo: returnPath.value } });
  } catch (failure) {
    failedMutation(state.value, failure);
    if (failure.status === 401) emit('session-ended');
    else { error.value = failure.message; fields.value = failure.fields || {}; conflict.value = failure.code === 'VERSION_CONFLICT'; if (conflict.value) await boot(); }
  } finally { saving.value = false; }
}
function unload(event) { if ((dirty.value || state.value.uncertain || saving.value) && !saved.value) { event.preventDefault(); event.returnValue = ''; } }
onBeforeRouteLeave(() => saved.value || (!saving.value && ((!dirty.value && !state.value.uncertain) || window.confirm('Draf belum disimpan ke server. Tinggalkan halaman? Draf tetap sementara di tab ini; refresh atau menutup tab akan menghapusnya.'))));
onMounted(() => { void boot(); window.addEventListener('beforeunload', unload); });
onUnmounted(() => { window.removeEventListener('beforeunload', unload); });
</script>
<template>
  <div class="finding-editor"><RouterLink class="text-button" :to="returnPath">← Kembali ke daftar</RouterLink>
    <section v-if="loading" class="panel dashboard-state" role="status">Memuat formulir…</section>
    <template v-else>
      <div v-if="error" class="connection-alert" role="alert">{{ error }}<ul v-if="Object.keys(fields).length"><li v-for="(message, field) in fields" :key="field"><strong>{{ fieldLabels[field] || 'Isian' }}:</strong> {{ message }}</li></ul><button v-if="!state.form" class="text-button" @click="boot">Coba muat formulir</button></div>
      <div v-if="conflict" class="connection-alert" role="alert">Data berubah pada server. Tinjau perbedaan sebelum menyimpan lagi.<p>Dasar draf: versi {{ state.version }} · terbaru: versi {{ latest?.version }}</p><div v-for="item in conflictFields" :key="item.field" class="conflict-comparison"><strong>{{ item.label }}</strong><span>Semula: {{ item.before }}</span><span>Draf: {{ item.draft }}</span><span>Terbaru: {{ item.latest }}</span></div><button type="button" class="text-button" :disabled="latest?.version <= state.version" @click="rebaseDraft">Gunakan versi terbaru, pertahankan perubahan draf</button><button type="button" class="text-button" @click="discardAndReload">Buang draf dan muat ulang</button></div>
      <div v-if="state.uncertain" class="connection-alert" role="alert">Hasil penyimpanan belum dapat dipastikan. Isian dikunci sementara; coba simpan kembali dengan isian yang sama agar tidak menggandakan temuan.</div>
      <div v-if="latest?.cancelledAt" class="connection-alert">Temuan dibatalkan. Koreksi tidak tersedia.</div>
      <div v-if="divisionsError" class="connection-alert" role="alert">{{ divisionsError }} <button class="text-button" @click="emit('reload-divisions')">Muat ulang divisi</button></div>
      <form v-if="state.form" class="panel finding-edit-form" @submit.prevent="save"><fieldset :disabled="locked || conflict"><legend>{{ editing ? 'Koreksi informasi temuan' : 'Catat temuan baru' }}</legend>
        <p class="form-intro">{{ editing ? 'Koreksi informasi dasar. Perubahan status dan progres dilakukan dari halaman detail.' : 'Temuan baru tersimpan sebagai Diproses. Foto dan target tidak wajib.' }}</p>
        <div class="edit-grid"><div class="filter-field"><label for="reported-date">Tanggal laporan *</label><input id="reported-date" v-model="state.form.reportedDate" type="date" required min="1000-01-01" :max="today" /></div><div class="filter-field"><label for="finding-location">Lokasi *</label><input id="finding-location" v-model="state.form.location" required maxlength="200" /></div>
        <div class="filter-field full-field"><label for="description">Kondisi / uraian temuan *</label><textarea id="description" v-model="state.form.description" required minlength="5" maxlength="3000" rows="5"></textarea></div>
        <div class="filter-field"><label for="reporter-name">Nama pelapor *</label><input id="reporter-name" v-model="state.form.reporterName" required maxlength="120" /></div><div class="filter-field"><label for="reporter-origin">Divisi asal pelapor *</label><select id="reporter-origin" v-model="state.form.reporterDivisionId" required><option disabled value="">Pilih divisi pelapor</option><option v-for="division in activeDivisions" :key="division.id" :value="division.id" :disabled="!division.active && division.id !== latest?.reporterDivisionId">{{ division.name }}{{ division.active ? '' : ' · nonaktif' }}</option></select></div>
        <div class="full-field"><p class="field-label">Divisi penanggung jawab * (boleh lebih dari satu)</p><div class="division-options" role="group" aria-label="Divisi penanggung jawab"><label v-for="division in activeDivisions" :key="division.id" class="division-option"><input v-model="state.form.responsibleDivisionIds" type="checkbox" :value="division.id" /><span>{{ division.name }}{{ division.active ? '' : ' · nonaktif' }}</span></label></div><p class="filter-help">Satu status pekerjaan berlaku untuk seluruh divisi pada temuan ini.</p></div>
        <div class="filter-field"><label for="priority">Prioritas</label><select id="priority" v-model="state.form.priority"><option value="">Belum dinilai</option><option value="LOW">Rendah</option><option value="MEDIUM">Sedang</option><option value="HIGH">Tinggi</option></select></div><div class="filter-field"><label for="target-date">Target penyelesaian (opsional)</label><input id="target-date" v-model="state.form.targetDate" type="date" :min="state.form.reportedDate" max="9999-12-31" /><small>Kosong berarti Belum ditentukan.</small></div></div>
        </fieldset><div class="form-actions"><button class="primary-button" type="submit" :disabled="saving || conflict || latest?.cancelledAt">{{ saving ? 'Menyimpan…' : state.uncertain ? 'Coba simpan kembali' : 'Simpan temuan' }}</button><span>Draf hanya disimpan sementara di memori tab sampai berhasil.</span></div>
      </form>
    </template>
  </div>
</template>
