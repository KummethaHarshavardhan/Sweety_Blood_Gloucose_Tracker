import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// strictPort keeps the app on 5173, which the backend CLIENT_URL expects for CORS and cookies
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
});
