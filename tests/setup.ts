/**
 * Vitest Browser Mode Setup
 *
 * This file runs before all tests to set up the testing environment
 */

// Import Bootstrap CSS for proper component styling in tests
import 'bootstrap/dist/css/bootstrap.css';
import '../dist/style.css';

/*
 * bootstrap-vue-next's BAutocomplete throws a benign async error while it is
 * being torn down: Vue's unmount reads `parentNode` of an already-detached
 * (teleported) list node and gets null. It fires AFTER the test's assertions
 * have passed, as an UNHANDLED REJECTION — which makes vitest exit non-zero
 * even though every test passes, so CI goes red on a green suite (#126).
 *
 * Swallow ONLY this one exact, known-benign signature; re-throw anything else
 * so a real unhandled error still fails the run. This is deliberately narrow —
 * not `dangerouslyIgnoreUnhandledErrors` (which would hide real bugs). Remove it
 * if bvn fixes the teardown upstream (the DAutocomplete empty-value test tracks
 * that regression).
 */
const BENIGN_BVN_TEARDOWN = "Cannot read properties of null (reading 'parentNode')";
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason: unknown = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    if (message.includes(BENIGN_BVN_TEARDOWN)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

// Global test utilities can be added here
