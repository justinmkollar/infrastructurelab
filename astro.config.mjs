import { defineConfig } from 'astro/config';

const site = process.env.SITE_URL || 'https://justinmkollar.github.io';
const base = process.env.BASE_PATH ?? '/infrastructurelab';

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory'
  }
});
