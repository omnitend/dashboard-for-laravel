import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Vitest global setup (runs once, in Node, before the browser suite).
 *
 * `tests/docs/llms-txt.test.ts` (#136) reads `docs/public/llms.txt` through
 * Vite's `?raw`, but that file is GENERATED and gitignored (regenerated at
 * release). CI's test job builds `dist` but not the docs, and this Mac's
 * `ignore-scripts` disables the pre-test hooks — so without this the guard
 * reads a stale or absent file and flakes CI vs local. Regenerating it here
 * (fast: ~0.6s) makes the test self-contained everywhere. Keep it in step with
 * the `docs:generate:ai` pipeline if the generator entry point moves.
 */
export default function setup() {
    const here = dirname(fileURLToPath(import.meta.url));
    const generator = resolve(here, '..', 'scripts', 'generate-llms-txt.mjs');
    execFileSync('node', [generator], { stdio: 'inherit' });
}
