import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://120.46.56.244:12000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 将React相关库分离
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // 将图表库分离
          'chart-vendor': ['recharts'],
          // 将图标库分离
          'icon-vendor': ['lucide-react'],
          // 将工具库分离
          'utils-vendor': ['axios', 'date-fns']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false, // 生产环境不生成sourcemap
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 移除console.log
        drop_debugger: true
      }
    }
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios', 'recharts', 'lucide-react', 'date-fns']
  }
})
