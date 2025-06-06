import { includeIgnoreFile } from '@eslint/compat';
import svelte from 'eslint-plugin-svelte';
import tsEslint from 'typescript-eslint';
import { fileURLToPath } from 'node:url';
import stylistic from '@stylistic/eslint-plugin';
import svelteConfig from './svelte.config.js';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default [
  ...svelte.configs.recommended,
  includeIgnoreFile(gitignorePath),
  {
    plugins: {
      '@stylistic': stylistic
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.svelte'],
        parser: tsEslint.parser,
        svelteConfig
      }
    }
  },
  {
    rules: {
      '@stylistic/indent': ['error', 2],
      'svelte/indent': ['error', { indent: 2 }],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/comma-dangle': ['error', 'never'],
      'svelte/no-spaces-around-equal-signs-in-attribute': 'error',
      'svelte/spaced-html-comment': ['error', 'always'],
      'svelte/sort-attributes': 'error',
      'svelte/first-attribute-linebreak': ['error'],
      'svelte/no-at-html-tags': 'off'
    }
  },
  {
    files: ['*.svelte'],
    rules: {
      '@stylistic/indent': 'off'
    }
  }
];
