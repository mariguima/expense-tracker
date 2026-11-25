import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { securityHeaders } from './security-headers.js'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss(), {
    name: 'production-content-security-policy',
    transformIndexHtml(html) {
      if (command !== 'build') return html;
      // Static hosting still gets script restrictions; framing requires the HTTP header.
      const policy = securityHeaders()["Content-Security-Policy"].replace("; frame-ancestors 'none'", "");
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" /><meta http-equiv="Content-Security-Policy" content="${policy}" />`);
    },
  }],
  preview: { headers: securityHeaders() },
  optimizeDeps: {
    include: ["recharts"],
  },
  server: {
    headers: securityHeaders(true),
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}))
