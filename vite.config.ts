import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/proxy/met': {
        target: 'https://collectionapi.metmuseum.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/met/, ''),
      },
      '/proxy/chicago-iiif': {
        target: 'https://www.artic.edu',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/chicago-iiif/, ''),
      },
      '/proxy/chicago': {
        target: 'https://api.artic.edu',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/chicago/, ''),
      },
      '/proxy/cleveland': {
        target: 'https://openaccess-api.clevelandart.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/cleveland/, ''),
      },
      '/proxy/vam': {
        target: 'https://api.vam.ac.uk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/vam/, ''),
      },
    },
  },
});
