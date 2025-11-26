<template>
  <div class="search-container" ref="searchContainer">
    <div class="search-input-wrapper">
      <input
        ref="searchInput"
        type="text"
        class="search-input"
        placeholder="Search documentation..."
        v-model="query"
        @input="handleSearch"
        @focus="showResults = true"
        @keydown.escape="close"
        @keydown.down.prevent="selectNext"
        @keydown.up.prevent="selectPrevious"
        @keydown.enter.prevent="navigateToSelected"
      />
      <svg
        v-if="!query"
        class="search-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        viewBox="0 0 16 16"
      >
        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
      </svg>
      <button
        v-if="query"
        class="search-clear"
        @click="clear"
        aria-label="Clear search"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          viewBox="0 0 16 16"
        >
          <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
        </svg>
      </button>
    </div>

    <div v-if="showResults && query" class="search-results">
      <div v-if="loading" class="search-loading">Searching...</div>
      <div v-else-if="results.length === 0" class="search-no-results">
        No results found
      </div>
      <div v-else class="search-results-list">
        <a
          v-for="(result, index) in results"
          :key="result.id"
          :href="result.url"
          class="search-result"
          :class="{ 'search-result-selected': index === selectedIndex }"
          @mouseenter="selectedIndex = index"
        >
          <div class="search-result-title" v-html="result.meta.title"></div>
          <div class="search-result-excerpt" v-html="result.excerpt"></div>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

interface Props {
  baseUrl?: string;
}

const props = withDefaults(defineProps<Props>(), {
  baseUrl: '/',
});

const query = ref('');
const results = ref<any[]>([]);
const loading = ref(false);
const showResults = ref(false);
const selectedIndex = ref(0);
const searchContainer = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);

let pagefind: any = null;
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

// Ensure baseUrl ends with a slash
const normalizedBase = props.baseUrl.replace(/\/?$/, '/');

onMounted(async () => {
  // Load Pagefind (only available after build)
  // Check if we're in the browser and if pagefind exists
  if (typeof window !== 'undefined') {
    try {
      // Try to fetch the pagefind script first to see if it exists
      const pagefindUrl = `${normalizedBase}pagefind/pagefind.js`;
      const response = await fetch(pagefindUrl, { method: 'HEAD' });
      if (response.ok) {
        // Use runtime-constructed path to avoid build-time resolution
        // @ts-ignore - Dynamic import with runtime path
        const pagefindModule = await import(/* @vite-ignore */ pagefindUrl);
        pagefind = pagefindModule;
      }
    } catch (error) {
      // Pagefind is only available after running a build
      // In dev mode, search will show "no results"
    }
  }

  // Close on click outside
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
  if (searchTimeout) clearTimeout(searchTimeout);
});

const handleSearch = async () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  if (!query.value) {
    results.value = [];
    return;
  }

  loading.value = true;
  selectedIndex.value = 0;

  // Debounce search
  searchTimeout = setTimeout(async () => {
    if (!pagefind) {
      loading.value = false;
      return;
    }

    try {
      const search = await pagefind.search(query.value);
      const resultsData = await Promise.all(
        search.results.slice(0, 10).map((r: any) => r.data())
      );
      results.value = resultsData;
    } catch (error) {
      console.error('Search error:', error);
      results.value = [];
    } finally {
      loading.value = false;
    }
  }, 300);
};

const clear = () => {
  query.value = '';
  results.value = [];
  showResults.value = false;
  selectedIndex.value = 0;
};

const close = () => {
  showResults.value = false;
  searchInput.value?.blur();
};

const selectNext = () => {
  if (selectedIndex.value < results.value.length - 1) {
    selectedIndex.value++;
  }
};

const selectPrevious = () => {
  if (selectedIndex.value > 0) {
    selectedIndex.value--;
  }
};

const navigateToSelected = () => {
  if (results.value[selectedIndex.value]) {
    window.location.href = results.value[selectedIndex.value].url;
  }
};

const handleClickOutside = (event: MouseEvent) => {
  if (searchContainer.value && !searchContainer.value.contains(event.target as Node)) {
    showResults.value = false;
  }
};
</script>

<style scoped>
.search-container {
  position: relative;
  width: 100%;
  max-width: 400px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 0.5rem 2.5rem 0.5rem 2.5rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.25);
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  color: var(--bs-secondary);
  pointer-events: none;
}

.search-clear {
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: var(--bs-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.search-clear:hover {
  color: var(--bs-dark);
}

.search-results {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  width: 600px;
  max-width: 90vw;
  background: var(--bs-white);
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
}

.search-loading,
.search-no-results {
  padding: 1rem;
  text-align: center;
  color: var(--bs-secondary);
  font-size: 0.875rem;
}

.search-results-list {
  padding: 0.5rem 0;
}

.search-result {
  display: block;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--bs-border-color);
  text-decoration: none;
  color: inherit;
  transition: background-color 0.2s ease;
}

.search-result:last-child {
  border-bottom: none;
}

.search-result:hover,
.search-result-selected {
  background-color: var(--bs-light);
}

.search-result-title {
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
  color: var(--bs-dark);
}

.search-result-excerpt {
  font-size: 0.75rem;
  color: var(--bs-secondary);
  line-height: 1.4;
}

.search-result-excerpt :deep(mark) {
  background-color: rgba(var(--bs-warning-rgb), 0.3);
  font-weight: 600;
  padding: 0 0.2em;
}
</style>
