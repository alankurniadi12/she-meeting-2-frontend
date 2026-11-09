import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [vue()],
    server: {
      host: '127.0.0.1', port: 5173, strictPort: true,
      proxy: Object.fromEntries(['/health', '/api'].map((path) => [path, { target: env.DEV_API_TARGET || 'http://127.0.0.1:4000' }])),
    },
    preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  };
});
