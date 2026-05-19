import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Includes node_modules* to catch stray Finder-copied duplicates like "node_modules 2"
  globalIgnores(['dist', 'node_modules', 'node_modules*/**', '**/node_modules*/**']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // react-hooks v7 made this an error by default, but the patterns in
      // useSessionData and Dashboard are intentional. Surface in CI as a warning
      // rather than blocking the build.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
