import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  // ⚠️ 注意：base 必须匹配你的 GitHub 仓库名称
  // 例如仓库是 https://github.com/username/test-go
  // 这里就应该是 '/test-go/'
  const repoName = '/test-go/';

  return {
    base: repoName,
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      // 构建时清空输出目录
      emptyOutDir: true,
      sourcemap: false
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve('.'),
      }
    }
  };
});