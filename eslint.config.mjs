import parser from '@typescript-eslint/parser'
import vue from 'eslint-plugin-vue'
import uniProcessor from './scripts/quality/uni-processor.mjs'

// Correctness checks for previously unchecked packages; formatting and types run separately.
// This is not a claim that legacy any/unused-variable debt has been eliminated.
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/unpackage/**',
      '**/.workbook-test/**',
      '**/assets/**',
      '**/*.d.ts',
      'packages/admin-pc/**',
      'native/**',
    ],
  },
  {
    files: ['**/*.{ts,js,mjs,cjs,vue}'],
    languageOptions: { parser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module' } },
    rules: {
      'constructor-super': 'error',
      'for-direction': 'error',
      'getter-return': 'error',
      'no-async-promise-executor': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-dupe-args': 'error',
      'no-dupe-else-if': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-ex-assign': 'error',
      'no-fallthrough': 'error',
      'no-invalid-regexp': 'error',
      'no-loss-of-precision': 'error',
      'no-promise-executor-return': 'error',
      'no-self-assign': 'error',
      'no-sparse-arrays': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-unsafe-optional-chaining': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
    },
  },
  ...vue.configs['flat/essential'].map((config) => ({ ...config, files: ['**/*.vue'] })),
  // uni-app route filenames and legacy component names are a compatibility contract.
  { files: ['**/*.vue'], rules: { 'vue/multi-word-component-names': 'off' } },
  {
    files: ['**/src/**/*.{ts,vue}'],
    processor: uniProcessor,
  },
  { files: ['**/*.vue'], languageOptions: { parserOptions: { parser } } },
]
