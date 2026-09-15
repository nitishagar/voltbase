import { defineConfig } from 'astro/config';

// Pages project site under https://nitishagar.github.io/voltbase/ — every URL
// carries the /voltbase base. Static output only: the site fetches nothing
// at runtime (IS-08). S1 builds via node ./build.mjs (static emit); S5
// switches this config to a full `astro build` + pagefind index.
export default defineConfig({
  site: 'https://nitishagar.github.io',
  base: '/voltbase',
  output: 'static',
  build: { assets: 'assets' },
});
