import nextPlugin from 'eslint-config-next';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...nextPlugin,
  {
    ignores: ['.next/**', 'node_modules/**', 'supabase/functions/**'],
  },
];
