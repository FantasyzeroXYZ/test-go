import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/test-go/',   // ⚠️ 必填！否则 GitHub Pages 页面空白
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        // 在 ESM 模块(Vite默认)中，__dirname 不可用，使用 path.resolve('.') 指向项目根目录
        '@': path.resolve('.'),
      }
    }
  };
});