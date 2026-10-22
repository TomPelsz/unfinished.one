import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://unfinished.one',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
});
