import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Node >= 25 bật Web Storage sẵn và cảnh báo khi thiếu --localstorage-file; jsdom tự cung cấp localStorage.
const nodeMajor = Number(process.versions.node.split('.')[0]);
const execArgv = nodeMajor >= 22 ? ['--no-experimental-webstorage'] : [];

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**'],
    restoreMocks: true,
    poolOptions: { forks: { execArgv } },
    unstubEnvs: true,
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      VITE_HUB_URL: 'https://hub.fptsx.space',
    },
  },
});
