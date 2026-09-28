import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/.expo/**'] },
  js.configs.recommended, ...ts.configs.recommended,
  { languageOptions: { globals: { process: 'readonly', console: 'readonly', fetch: 'readonly', URL: 'readonly', Buffer: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', AbortController: 'readonly', __dirname: 'readonly', document: 'readonly', window: 'readonly' } } },
);
