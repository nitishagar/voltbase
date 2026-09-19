import tseslint from 'typescript-eslint';

/**
 * ESLint flat config (S1). Conservative default: typescript-eslint recommended
 * (non-type-checked, fast) over the whole tree. Build/vendor artifacts are
 * ignored. No `fetch` ban yet (S3 wires the allowlist + capping fetcher with
 * its own lint seam).
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      'site/dist/',
      '**/coverage/',
      '.wrangler/',
      '**/.astro/',
    ],
  },
  ...tseslint.configs.recommended,
);
