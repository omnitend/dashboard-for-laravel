<template>
  <div class="component-example">
    <!-- Live Preview Area -->
    <div class="example-preview">
      <slot />
    </div>

    <!-- Code Toggle Button -->
    <div class="example-controls">
      <button
        class="btn-toggle"
        @click="showCode = !showCode"
        aria-label="Toggle code"
      >
        <svg
          v-if="!showCode"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          viewBox="0 0 16 16"
        >
          <path d="M10.478 1.647a.5.5 0 1 0-.956-.294l-4 13a.5.5 0 0 0 .956.294zM4.854 4.146a.5.5 0 0 1 0 .708L1.707 8l3.147 3.146a.5.5 0 0 1-.708.708l-3.5-3.5a.5.5 0 0 1 0-.708l3.5-3.5a.5.5 0 0 1 .708 0m6.292 0a.5.5 0 0 0 0 .708L14.293 8l-3.147 3.146a.5.5 0 0 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 0 0-.708 0"/>
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          viewBox="0 0 16 16"
        >
          <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
        </svg>
        {{ showCode ? 'Hide' : 'Show' }} Code
      </button>
      <button
        v-if="showCode"
        class="btn-copy"
        @click="copyCode"
        :aria-label="copied ? 'Copied!' : 'Copy code'"
      >
        <svg
          v-if="!copied"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          viewBox="0 0 16 16"
        >
          <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>
          <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/>
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          viewBox="0 0 16 16"
        >
          <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/>
        </svg>
        {{ copied ? 'Copied!' : 'Copy' }}
      </button>
    </div>

    <!-- Source Code Display -->
    <div v-if="showCode" class="example-code">
      <pre><code ref="codeElement" class="language-vue">{{ code }}</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import hljs from 'highlight.js/lib/core';
import vue from 'highlight.js/lib/languages/xml'; // XML covers Vue templates
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import css from 'highlight.js/lib/languages/css';
import 'highlight.js/styles/atom-one-dark.css';

// Register languages
hljs.registerLanguage('vue', vue);
hljs.registerLanguage('xml', vue);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('css', css);

interface Props {
  code: string;
  language?: string;
}

const props = withDefaults(defineProps<Props>(), {
  language: 'vue',
});

const showCode = ref(false);
const copied = ref(false);
const codeElement = ref<HTMLElement | null>(null);

const highlightCode = async () => {
  await nextTick();
  if (codeElement.value && showCode.value) {
    hljs.highlightElement(codeElement.value);
  }
};

onMounted(() => {
  if (showCode.value) {
    highlightCode();
  }
});

watch(showCode, async (newValue) => {
  if (newValue) {
    await highlightCode();
  }
});

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(props.code);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (error) {
    console.error('Failed to copy code:', error);
  }
};
</script>

<style scoped>
.component-example {
  margin-bottom: 2rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  overflow: hidden;
}

.example-preview {
  padding: 2rem;
  background-color: var(--bs-white);
  border-bottom: 1px solid var(--bs-border-color);
}

.example-controls {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: var(--bs-light);
  border-bottom: 1px solid var(--bs-border-color);
}

.btn-toggle,
.btn-copy {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--bs-dark);
  background: var(--bs-white);
  border: 1px solid var(--bs-border-color);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-toggle:hover,
.btn-copy:hover {
  background-color: var(--bs-primary);
  color: var(--bs-white);
  border-color: var(--bs-primary);
}

.btn-copy {
  margin-left: auto;
}

.example-code {
  background-color: #2d2d2d;
  overflow-x: auto;
}

.example-code pre {
  margin: 0;
  padding: 1.5rem;
  background: transparent;
}

.example-code code {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}

/* Scrollbar styling for code blocks */
.example-code::-webkit-scrollbar {
  height: 8px;
}

.example-code::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.example-code::-webkit-scrollbar-thumb {
  background: #4a4a4a;
  border-radius: 4px;
}

.example-code::-webkit-scrollbar-thumb:hover {
  background: #5a5a5a;
}
</style>
