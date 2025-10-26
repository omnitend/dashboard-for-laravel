/**
 * Astro integration for Pagefind
 * Runs pagefind indexing after the build
 */

import { execSync } from 'child_process';

export default function pagefind() {
  return {
    name: 'pagefind',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        console.log('Running Pagefind indexer...');
        try {
          execSync(`npx pagefind --site "${dir.pathname}"`, {
            stdio: 'inherit',
          });
          console.log('Pagefind indexing complete!');
        } catch (error) {
          console.error('Pagefind indexing failed:', error);
        }
      },
    },
  };
}
