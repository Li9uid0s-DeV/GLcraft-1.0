import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

const ROOT_DIR = import.meta.dirname;

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(ROOT_DIR, 'dist');
          const srcAssets = path.resolve(ROOT_DIR, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
          // Also populate public/gh-pages-bundle.{js,css} so GitHub Pages "Deploy from a branch (main)"
          // works immediately even if the user hasn't switched GitHub Pages source to GitHub Actions.
          const assetsDir = path.resolve(distDir, 'assets');
          const pubDir = path.resolve(ROOT_DIR, 'public');
          if (fs.existsSync(assetsDir) && fs.existsSync(pubDir)) {
            const files = fs.readdirSync(assetsDir);
            const jsFile = files.find((f) => f.endsWith('.js'));
            const cssFile = files.find((f) => f.endsWith('.css'));
            if (jsFile) {
              fs.copyFileSync(
                path.resolve(assetsDir, jsFile),
                path.resolve(pubDir, 'gh-pages-bundle.js')
              );
            }
            if (cssFile) {
              fs.copyFileSync(
                path.resolve(assetsDir, cssFile),
                path.resolve(pubDir, 'gh-pages-bundle.css')
              );
            }
          }
          // Do not ship duplicate gh-pages-bundle.* copies inside dist/ (dist/index.html uses ./assets/*)
          for (const extra of ['gh-pages-bundle.js', 'gh-pages-bundle.css']) {
            const p = path.resolve(distDir, extra);
            if (fs.existsSync(p)) {
              fs.rmSync(p, {force: true});
            }
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(ROOT_DIR, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
