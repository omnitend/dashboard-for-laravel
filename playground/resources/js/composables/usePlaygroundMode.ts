import { ref, watch } from 'vue';

export type PlaygroundMode = 'api' | 'inertia';

const STORAGE_KEY = 'playground-mode';

// Shared state across all components
const mode = ref<PlaygroundMode>('api');

// Initialize from localStorage
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'api' || stored === 'inertia') {
    mode.value = stored;
  }
}

// Watch for changes and save to localStorage
watch(mode, (newMode) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, newMode);
  }
});

export function usePlaygroundMode() {
  const toggleMode = () => {
    mode.value = mode.value === 'api' ? 'inertia' : 'api';
  };

  const setMode = (newMode: PlaygroundMode) => {
    mode.value = newMode;
  };

  return {
    mode,
    toggleMode,
    setMode,
  };
}
