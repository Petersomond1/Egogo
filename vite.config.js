// filepath: /c:/Users/peter/ReactProjects/Egogo/chatclient/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // You can change this to another port if needed
  },
});