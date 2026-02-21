import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { join } from 'path';

const certsDir = join(process.cwd(), 'certs');

const httpsConfig = {
  key: readFileSync(join(certsDir, 'file.key')),
  cert: readFileSync(join(certsDir, 'file.cert')),
  ca: readFileSync(join(certsDir, 'file.ca-bundle')),
};

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    https: httpsConfig,
  },
  preview: {
    port: 4173,
    host: '0.0.0.0',
    https: httpsConfig,
  },
});
