import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { h, ref } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DAutocomplete from '../../resources/js/components/base/DAutocomplete.vue';
import type { AutocompleteProvider } from '../../resources/js/components/base/DAutocomplete.vue';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const CATALOGUE = [
  { value: 77, text: 'Ales' },
  { value: 78, text: 'Alcopop' },
  { value: 79, text: 'Cider' },
];

const optionTexts = () =>
  [...document.querySelectorAll('[role="option"]')].map((o) => o.textContent?.trim());

const statusText = () =>
  document.querySelector('.d-autocomplete__status')?.textContent?.trim() ?? null;

/** A provider over the catalogue, with every call's term and signal recorded. */
const makeProvider = (delayMs = 0) => {
  const calls: Array<{ term: string; signal: AbortSignal }> = [];
  const provider: AutocompleteProvider = async (term, signal) => {
    calls.push({ term, signal });
    if (delayMs > 0) await wait(delayMs);
    return CATALOGUE.filter((option) => option.text.toLowerCase().includes(term.toLowerCase()));
  };
  return { provider, calls };
};

/**
 * 0.48.0. A `provider` asks a server for the options matching the typed text
 * instead of filtering a preloaded list. The debounce is short here so the
 * tests run quickly; the default is 250 ms.
 */
describe('DAutocomplete provider', () => {
  const mountWith = (props: Record<string, unknown> = {}) => {
    const model = ref<unknown>(props.modelValue ?? null);
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DAutocomplete, {
            providerDebounce: 40,
            openOnFocus: true,
            ...props,
            modelValue: model.value,
            'onUpdate:modelValue': (value: unknown) => {
              model.value = value;
            },
          }),
        ),
    });
    const input = () => screen.container.querySelector('input') as HTMLInputElement;
    return { screen, model, input };
  };

  it('calls the provider once with the term after the debounce, lists its results, and selecting one sets the model', async () => {
    const { provider, calls } = makeProvider();
    const { input, model } = mountWith({ provider });
    await userEvent.click(input());
    await userEvent.fill(input(), 'al');
    // Control: nothing is asked for before typing has paused.
    expect(calls).toHaveLength(0);
    await wait(120);
    expect(calls.map((call) => call.term)).toEqual(['al']);
    expect(optionTexts()).toEqual(['Ales', 'Alcopop']);

    const alcopop = [...document.querySelectorAll('[role="option"]')].find(
      (option) => option.textContent?.trim() === 'Alcopop',
    ) as HTMLElement;
    await userEvent.click(alcopop);
    await wait(80);
    expect(model.value).toBe(78);
    expect(input().value).toBe('Alcopop');
    // Writing the chosen label into the input is not a search.
    await wait(120);
    expect(calls.map((call) => call.term)).toEqual(['al']);
  });

  it('keeps one call for a burst of typing, with the final text', async () => {
    const { provider, calls } = makeProvider();
    const { input } = mountWith({ provider });
    await userEvent.click(input());
    await userEvent.type(input(), 'cid');
    await wait(120);
    expect(calls.map((call) => call.term)).toEqual(['cid']);
    expect(optionTexts()).toEqual(['Cider']);
  });

  it('an empty term asks for nothing and the list says so', async () => {
    const { provider, calls } = makeProvider();
    const { input } = mountWith({ provider });
    await userEvent.click(input());
    await wait(120);
    expect(calls).toHaveLength(0);
    expect(statusText()).toBe('Type to search');

    // Positive control: a term does search, and clearing it empties the list again.
    await userEvent.fill(input(), 'ci');
    await wait(120);
    expect(optionTexts()).toEqual(['Cider']);
    await userEvent.clear(input());
    await wait(120);
    expect(calls).toHaveLength(1);
    expect(optionTexts()).toEqual([]);
    expect(statusText()).toBe('Type to search');
  });

  it('applies only the latest call: a slow earlier response is dropped and its signal aborted', async () => {
    const pending: Array<{ term: string; signal: AbortSignal; resolve: (o: unknown[]) => void }> = [];
    const provider: AutocompleteProvider = (term, signal) =>
      new Promise((resolve) => {
        pending.push({ term, signal, resolve: resolve as (o: unknown[]) => void });
      });
    const { input } = mountWith({ provider });
    await userEvent.click(input());
    await userEvent.fill(input(), 'a');
    await wait(120);
    expect(pending.map((call) => call.term)).toEqual(['a']);
    expect(statusText()).toBe('Searching…');

    await userEvent.fill(input(), 'al');
    await wait(120);
    expect(pending.map((call) => call.term)).toEqual(['a', 'al']);
    expect(pending[0].signal.aborted).toBe(true);
    expect(pending[1].signal.aborted).toBe(false);

    pending[1].resolve([{ value: 78, text: 'Alcopop' }]);
    await wait(40);
    expect(optionTexts()).toEqual(['Alcopop']);

    // The first call resolves late, with more rows: ignored.
    pending[0].resolve(CATALOGUE);
    await wait(40);
    expect(optionTexts()).toEqual(['Alcopop']);
  });

  it('a rejected provider reads as Search failed, and the next search recovers', async () => {
    let shouldFail = true;
    const provider: AutocompleteProvider = async (term) => {
      if (shouldFail) throw new Error('offline');
      return CATALOGUE.filter((option) => option.text.toLowerCase().includes(term));
    };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const { input } = mountWith({ provider });
      await userEvent.click(input());
      await userEvent.fill(input(), 'ci');
      await wait(120);
      expect(statusText()).toBe('Search failed');
      expect(optionTexts()).toEqual([]);
      expect(consoleError).toHaveBeenCalledTimes(1);

      shouldFail = false;
      await userEvent.fill(input(), 'cid');
      await wait(120);
      expect(optionTexts()).toEqual(['Cider']);
    } finally {
      consoleError.mockRestore();
    }
  });

  it('a result with no rows reads as No matches', async () => {
    const { provider } = makeProvider();
    const { input } = mountWith({ provider });
    await userEvent.click(input());
    await userEvent.fill(input(), 'zzz');
    await wait(120);
    expect(optionTexts()).toEqual([]);
    expect(statusText()).toBe('No matches');
  });

  it('a seed option labels a value bound before any search, and is not listed twice', async () => {
    const { provider, calls } = makeProvider();
    const { input } = mountWith({
      provider,
      modelValue: 78,
      options: [{ value: 78, text: 'Alcopop' }],
    });
    await wait(80);
    expect(input().value).toBe('Alcopop');
    expect(calls).toHaveLength(0);

    await userEvent.click(input());
    await userEvent.fill(input(), 'al');
    await wait(120);
    // Alcopop is in the results and the seed: listed once, results first.
    expect(optionTexts()).toEqual(['Ales', 'Alcopop']);
  });

  it('null-option stays pinned above the results', async () => {
    const { provider } = makeProvider();
    const { input, model } = mountWith({ provider, nullOption: 'No product', modelValue: 79 });
    await userEvent.click(input());
    await userEvent.fill(input(), 'al');
    await wait(120);
    expect(optionTexts()).toEqual(['No product', 'Ales', 'Alcopop']);
    const none = [...document.querySelectorAll('[role="option"]')].find(
      (option) => option.textContent?.trim() === 'No product',
    ) as HTMLElement;
    await userEvent.click(none);
    await wait(80);
    expect(model.value).toBeNull();
  });
});
