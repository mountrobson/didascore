import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' lets the build run from any static host or sub-path (GitHub Pages, Netlify, a phone's home screen).
export default defineConfig({
  plugins: [react()],
  base: './',
});
