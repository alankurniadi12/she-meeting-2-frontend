<script setup>
import { ref } from 'vue';
defineProps({ busy: Boolean });
const emit = defineEmits(['login']);
const username = ref('');
const password = ref('');
function submit() {
  emit('login', { username: username.value, password: password.value });
  password.value = '';
}
</script>
<template>
  <section class="intro-panel login-panel" aria-labelledby="login-title">
    <div class="intro-copy"><div class="panel-kicker"><span class="kicker-line"></span> SATU AKUN BERSAMA PER DIVISI</div><h2 id="login-title">Mulai dari<br />akun divisi Anda.</h2><p>Gunakan akun yang disediakan Admin ICT. Riwayat perubahan nantinya menunjukkan akun divisi yang digunakan.</p><div class="intro-note"><span>DEMO</span> Gunakan kredensial dummy lokal.</div></div>
    <form class="login-form" @submit.prevent="submit"><h3>Login SHE Meeting</h3>
      <label for="username">Username</label><input id="username" v-model="username" name="username" autocomplete="username" autocapitalize="none" :spellcheck="false" required minlength="3" maxlength="64" :disabled="busy" />
      <label for="password">Kata sandi</label><input id="password" v-model="password" name="password" type="password" autocomplete="current-password" required maxlength="128" :disabled="busy" />
      <button class="primary-button" type="submit" :disabled="busy">{{ busy ? 'Memproses…' : 'Masuk' }}</button><p>Belum punya akses atau lupa kata sandi? Hubungi Admin ICT.</p>
    </form>
  </section>
</template>
