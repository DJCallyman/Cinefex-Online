import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    publicDir: 'public',
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'covers/**/*', 'fonts/**/*', 'issues_full.json'],
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,jpg,otf,woff,woff2,json}'],
            },
        }),
    ],
    css: {
        devSourcemap: true,
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                },
            },
        },
    },
});
