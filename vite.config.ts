import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function copyFleetAssets(): Plugin {
  return {
    name: 'copy-uniq-fleet-assets',
    apply: 'build',
    async closeBundle() {
      const source = path.resolve('assets');
      const target = path.resolve('dist/assets');
      await mkdir(target, { recursive: true });
      await cp(source, target, { recursive: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), copyFleetAssets()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2022',
  },
});
