import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/.expo/**', 'apps/mobile/android/**', 'apps/mobile/ios/**'] },
  js.configs.recommended, ...ts.configs.recommended,
  { files: ['apps/mobile/plugins/*.cjs'], languageOptions: { sourceType: 'commonjs', globals: { require: 'readonly', module: 'readonly' } }, rules: { '@typescript-eslint/no-require-imports': 'off' } },
  { files: ['**/*.test.{ts,tsx,mjs}', '**/*.spec.mjs'], rules: { 'no-restricted-syntax': ['error', { selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='only']", message: 'Focused tests are forbidden in the quality gate.' }] } },
  { languageOptions: { globals: { process: 'readonly', console: 'readonly', fetch: 'readonly', URL: 'readonly', Buffer: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', AbortController: 'readonly', __dirname: 'readonly', document: 'readonly', window: 'readonly' } } },
);
