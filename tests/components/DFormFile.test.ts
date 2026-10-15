import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { page, userEvent } from 'vitest/browser';
import { h, ref } from 'vue';
import DFormFile from '../../resources/js/components/base/DFormFile.vue';
import DFormInput from '../../resources/js/components/base/DFormInput.vue';
import DFormGroup from '../../resources/js/components/base/DFormGroup.vue';
import DFormInvalidFeedback from '../../resources/js/components/base/DFormInvalidFeedback.vue';
import DInputGroup from '../../resources/js/components/base/DInputGroup.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const settle = () => new Promise((resolve) => setTimeout(resolve, 250));

const hiddenInput = (container: Element) =>
  container.querySelector('input[type="file"]') as HTMLInputElement;

const pdf = () => new File(['%PDF'], 'invoice.pdf', { type: 'application/pdf' });
const jpg = () => new File(['jpg'], 'photo.jpg', { type: 'image/jpeg' });

describe('DFormFile', () => {
  it('renders the browse button, the file-name text and a file input', async () => {
    const screen = render(DFormFile, { props: { browseText: 'Choose' } });
    await flush();
    expect(screen.container.querySelector('button.b-form-file-button')?.textContent?.trim()).toBe(
      'Choose'
    );
    expect(screen.container.querySelector('.b-form-file-text')?.textContent).toContain(
      'No file chosen'
    );
    expect(hiddenInput(screen.container)).toBeTruthy();
  });

  it('forwards attributes onto the native file input', async () => {
    const screen = render(DFormFile, {
      props: { accept: 'image/*,.pdf', multiple: true, name: 'attachments' },
      attrs: { 'data-testid': 'upload' },
    });
    await flush();
    const input = hiddenInput(screen.container);
    expect(input.getAttribute('accept')).toBe('image/*,.pdf');
    expect(input.multiple).toBe(true);
    expect(input.name).toBe('attachments');
    expect(input.getAttribute('data-testid')).toBe('upload');
  });

  it('updates v-model with a File, or a File[] when multiple', async () => {
    const single = ref<File | null>(null);
    const many = ref<File[] | null>(null);
    const screen = render({
      render: () =>
        h('div', [
          h(DFormFile, {
            class: 'single',
            modelValue: single.value,
            'onUpdate:modelValue': (value: File | null) => (single.value = value),
          }),
          h(DFormFile, {
            class: 'many',
            multiple: true,
            modelValue: many.value,
            'onUpdate:modelValue': (value: File[] | null) => (many.value = value),
          }),
        ]),
    });
    await flush();

    await userEvent.upload(hiddenInput(screen.container.querySelector('.single')!), pdf());
    await userEvent.upload(hiddenInput(screen.container.querySelector('.many')!), [pdf(), jpg()]);
    await flush();

    expect(single.value).toBeInstanceOf(File);
    expect(single.value?.name).toBe('invoice.pdf');
    expect(many.value?.map((file) => file.name)).toEqual(['invoice.pdf', 'photo.jpg']);
    expect(screen.container.querySelector('.single .b-form-file-text')?.textContent).toContain(
      'invoice.pdf'
    );
  });

  it('forwards a named slot with its slot props (file-name: files, names)', async () => {
    const screen = render(DFormFile, {
      props: { multiple: true, showFileNames: true },
      slots: {
        'file-name': ({ files, names }: { files: readonly File[]; names: string[] }) =>
          h('ul', { class: 'picked' }, [
            h('li', { class: 'count' }, String(files.length)),
            ...names.map((name) => h('li', { class: 'picked-name' }, name)),
          ]),
      },
    });
    await flush();
    await userEvent.upload(hiddenInput(screen.container), [pdf(), jpg()]);
    await flush();

    const names = Array.from(screen.container.querySelectorAll('.b-form-file-display .picked-name'));
    expect(names.map((item) => item.textContent)).toEqual(['invoice.pdf', 'photo.jpg']);
    expect(screen.container.querySelector('.b-form-file-display .count')?.textContent).toBe('2');
  });

  it('exposes reset(), which clears the selection and the model', async () => {
    const model = ref<File | null>(null);
    const fileRef = ref<InstanceType<typeof DFormFile> | null>(null);
    const screen = render({
      render: () =>
        h(DFormFile, {
          ref: fileRef,
          modelValue: model.value,
          'onUpdate:modelValue': (value: File | null) => (model.value = value),
        }),
    });
    await flush();
    await userEvent.upload(hiddenInput(screen.container), pdf());
    await flush();
    expect(model.value?.name).toBe('invoice.pdf');
    // `element` is the Browse button, read through the wrapper's ref.
    expect((fileRef.value?.element as HTMLElement | null)?.tagName).toBe('BUTTON');

    fileRef.value?.reset();
    await flush();
    expect(model.value).toBeNull();
    expect(screen.container.querySelector('.b-form-file-text')?.textContent).toContain(
      'No file chosen'
    );
  });

  it('marks state=false as invalid', async () => {
    const screen = render(DFormFile, { props: { state: false } });
    await flush();
    expect(screen.container.querySelector('.b-form-file-control')?.classList).toContain(
      'is-invalid'
    );
  });
});

describe('DFormFile keyboard and labelling', () => {
  it('is labelled by a DFormGroup label and reached by Tab', async () => {
    const screen = render({
      render: () =>
        h('div', [
          h(DFormInput, { class: 'before' }),
          h(DFormGroup, { label: 'Attachment', labelFor: 'attachment' }, () =>
            h(DFormFile, { id: 'attachment' })
          ),
        ]),
    });
    await flush();

    await expect.element(page.getByRole('button', { name: 'Attachment' })).toBeInTheDocument();

    (screen.container.querySelector('input.before') as HTMLInputElement).focus();
    await userEvent.tab();
    expect(document.activeElement?.id).toBe('attachment');
    expect(document.activeElement?.tagName).toBe('BUTTON');
  });

  it('opens the file picker on Enter and on Space', async () => {
    const screen = render(DFormFile, { props: { id: 'picker' } });
    await flush();
    const input = hiddenInput(screen.container);
    let opened = 0;
    input.addEventListener('click', (event) => {
      opened += 1;
      event.preventDefault(); // keep the real chooser shut
    });

    (screen.container.querySelector('#picker') as HTMLElement).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(opened).toBe(2);
  });
});

// The theme fixes in theme.scss: the control must look like a DFormInput in
// every state, since bvn draws it outside `.form-control`.
describe('DFormFile matches DFormInput in the theme', () => {
  const renderPair = async (state: boolean | null) => {
    await page.viewport(900, 600);
    const screen = render({
      render: () =>
        h('div', { style: 'width: 480px' }, [
          h(DFormInput, { class: 'pair-input', state }),
          h(DFormFile, { id: 'pair-file', state }),
        ]),
    });
    await flush();
    const input = screen.container.querySelector('input.pair-input') as HTMLInputElement;
    const control = screen.container.querySelector('.b-form-file-control') as HTMLElement;
    const button = screen.container.querySelector('#pair-file') as HTMLElement;
    return { input, control, button };
  };

  it('shares the input height, border colour and text inset', async () => {
    const { input, control } = await renderPair(null);
    const text = control.querySelector('.b-form-file-text') as HTMLElement;
    expect(control.getBoundingClientRect().height).toBeCloseTo(
      input.getBoundingClientRect().height,
      0
    );
    expect(getComputedStyle(control).borderTopColor).toBe(getComputedStyle(input).borderTopColor);
    expect(getComputedStyle(text).paddingLeft).toBe(getComputedStyle(input).paddingLeft);
  });

  it('shares the input height at sm and lg', async () => {
    await page.viewport(900, 600);
    const screen = render({
      render: () =>
        h('div', { style: 'width: 480px' }, [
          h(DFormInput, { class: 'size-sm', size: 'sm' }),
          h(DFormFile, { class: 'file-sm', size: 'sm' }),
          h(DFormInput, { class: 'size-lg', size: 'lg' }),
          h(DFormFile, { class: 'file-lg', size: 'lg' }),
        ]),
    });
    await flush();
    const height = (selector: string) =>
      (screen.container.querySelector(selector) as HTMLElement).getBoundingClientRect().height;
    expect(height('.file-sm .b-form-file-control')).toBeCloseTo(height('input.size-sm'), 0);
    expect(height('.file-lg .b-form-file-control')).toBeCloseTo(height('input.size-lg'), 0);
  });

  it('shows the input focus ring when the browse button has focus', async () => {
    const { input, control, button } = await renderPair(null);
    input.focus();
    await settle();
    const inputFocus = getComputedStyle(input);
    const expected = { shadow: inputFocus.boxShadow, border: inputFocus.borderTopColor };
    button.focus();
    await settle();
    expect(getComputedStyle(control).boxShadow).not.toBe('none');
    expect(getComputedStyle(control).boxShadow).toBe(expected.shadow);
    expect(getComputedStyle(control).borderTopColor).toBe(expected.border);
  });

  // state=false is the theme's crimson border and icon; true is the valid set.
  it.each([
    ['invalid', false],
    ['valid', true],
  ])('matches the input when %s, focused or not', async (_label, state) => {
    const { input, control, button } = await renderPair(state);
    expect(getComputedStyle(control).borderTopColor).toBe(getComputedStyle(input).borderTopColor);
    expect(getComputedStyle(control).backgroundImage).toBe(getComputedStyle(input).backgroundImage);

    input.focus();
    await settle();
    const inputFocus = getComputedStyle(input);
    const expected = { shadow: inputFocus.boxShadow, border: inputFocus.borderTopColor };
    button.focus();
    await settle();
    expect(getComputedStyle(control).boxShadow).toBe(expected.shadow);
    expect(getComputedStyle(control).borderTopColor).toBe(expected.border);
  });
});

// Validation feedback, v-model null, dark mode, disabled fieldsets and
// input groups.
describe('DFormFile beside feedback, in groups and themes', () => {
  // `.is-invalid` sits deep inside `.b-form-file-root`, so Bootstrap's
  // `.is-invalid ~ .invalid-feedback` never reached a sibling feedback.
  it.each([
    ['custom', false],
    ['plain', true],
  ])('shows a sibling DFormInvalidFeedback when state=false (%s)', async (_mode, plain) => {
    const state = ref<boolean | null>(null);
    const screen = render({
      render: () =>
        h('div', [
          h(DFormFile, { state: state.value, plain }),
          h(DFormInvalidFeedback, { class: 'file-feedback' }, () => 'Choose a file.'),
        ]),
    });
    await flush();
    const feedback = screen.container.querySelector('.file-feedback') as HTMLElement;
    // Positive control: hidden while the state is neutral.
    expect(getComputedStyle(feedback).display).toBe('none');
    state.value = false;
    await flush();
    expect(getComputedStyle(feedback).display).toBe('block');
  });

  it('clears the native input when v-model is set to null', async () => {
    const model = ref<File | null>(null);
    const screen = render({
      render: () =>
        h(DFormFile, {
          name: 'attachment',
          modelValue: model.value,
          'onUpdate:modelValue': (value: File | null) => (model.value = value),
        }),
    });
    await flush();
    await userEvent.upload(hiddenInput(screen.container), pdf());
    await flush();
    expect(model.value?.name).toBe('invoice.pdf');
    expect(hiddenInput(screen.container).files?.length).toBe(1);

    model.value = null;
    await flush();
    expect(hiddenInput(screen.container).files?.length).toBe(0);
    expect(screen.container.querySelector('.b-form-file-text')?.textContent).toContain(
      'No file chosen'
    );
  });

  // The drag overlay text and border were the brand navy on a near-black
  // overlay in dark mode (about 1.07:1).
  const luminance = (rgb: number[]) => {
    const [red, green, blue] = rgb.map((channel) => {
      const value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const channels = (colour: string) => (colour.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const contrast = (first: string, second: string) => {
    const [high, low] = [luminance(channels(first)), luminance(channels(second))].sort(
      (a, b) => b - a
    );
    return (high + 0.05) / (low + 0.05);
  };

  it.each(['light', 'dark'])('keeps the drag overlay readable in %s mode', async (theme) => {
    const screen = render({
      render: () => h('div', { 'data-bs-theme': theme }, [h(DFormFile, { multiple: true })]),
    });
    await flush();
    const zone = screen.container.querySelector('.b-form-file-wrapper') as HTMLElement;
    const transfer = new DataTransfer();
    transfer.items.add(pdf());
    zone.dispatchEvent(new DragEvent('dragenter', { bubbles: true, dataTransfer: transfer }));
    zone.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: transfer }));
    await settle();

    const overlay = screen.container.querySelector('.b-form-file-drag-overlay') as HTMLElement;
    expect(overlay).toBeTruthy();
    const text = overlay.querySelector('.b-form-file-drag-text') as HTMLElement;
    const background = getComputedStyle(overlay).backgroundColor;
    expect(contrast(getComputedStyle(text).color, background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(getComputedStyle(overlay).borderTopColor, background)).toBeGreaterThanOrEqual(
      3
    );
    const control = screen.container.querySelector('.b-form-file-control') as HTMLElement;
    expect(contrast(getComputedStyle(control).borderTopColor, background)).toBeGreaterThanOrEqual(
      3
    );
    if (theme === 'light') {
      // Light mode keeps the brand navy it had before.
      expect(getComputedStyle(text).color).toBe('rgb(21, 30, 45)');
    }
  });

  it('looks disabled inside a disabled fieldset, like a DFormInput', async () => {
    await page.viewport(900, 600);
    const screen = render({
      render: () =>
        h('fieldset', { disabled: true }, [
          h(DFormInput, { class: 'fs-input' }),
          h(DFormFile, { class: 'fs-file' }),
        ]),
    });
    await flush();
    const input = screen.container.querySelector('input.fs-input') as HTMLElement;
    const control = screen.container.querySelector('.fs-file .b-form-file-control') as HTMLElement;
    expect(getComputedStyle(control).backgroundColor).toBe(getComputedStyle(input).backgroundColor);
    expect(getComputedStyle(control).cursor).not.toBe('pointer');
  });

  it('squares the corners that meet an input-group addon', async () => {
    await page.viewport(900, 600);
    const screen = render({
      render: () =>
        h('div', [
          h(DInputGroup, { class: 'ig-prepend', prepend: 'Upload' }, () => h(DFormFile)),
          h(DInputGroup, { class: 'ig-append', append: '.pdf' }, () => h(DFormFile)),
        ]),
    });
    await flush();
    const radii = (selector: string) => {
      const control = screen.container.querySelector(`${selector} .b-form-file-control`)!;
      const button = screen.container.querySelector(`${selector} .b-form-file-button`)!;
      const style = getComputedStyle(control);
      return {
        topLeft: style.borderTopLeftRadius,
        bottomLeft: style.borderBottomLeftRadius,
        topRight: style.borderTopRightRadius,
        bottomRight: style.borderBottomRightRadius,
        buttonLeft: getComputedStyle(button).borderTopLeftRadius,
      };
    };
    const prepended = radii('.ig-prepend');
    expect(prepended.topLeft).toBe('0px');
    expect(prepended.bottomLeft).toBe('0px');
    expect(prepended.buttonLeft).toBe('0px');
    expect(prepended.topRight).not.toBe('0px');

    const appended = radii('.ig-append');
    expect(appended.topRight).toBe('0px');
    expect(appended.bottomRight).toBe('0px');
    expect(appended.topLeft).not.toBe('0px');
    expect(appended.buttonLeft).not.toBe('0px');
  });
});
