import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
// Tests run in a real browser, so the built stylesheet comes in through Vite
// (`?raw`) rather than node:fs — same as icon-font.test.ts.
import stylesheet from '../../dist/style.css?raw';

/**
 * The theme's two typefaces ship WITH the package: Maven Pro (body) and Poppins
 * (the display token, used by h1–h4). Before this the theme named Poppins but
 * declared no `@font-face`, so only a machine with Poppins installed rendered
 * it and everyone else got the generic sans-serif.
 *
 * A check that `font-family` NAMES the font proves nothing: the name resolves
 * whether or not a face exists. These tests ask the browser's FontFaceSet
 * whether each bundled face actually LOADED after text in it was rendered
 * through the real cascade (body text, a heading, the weight utilities).
 */
const familyOf = (face: FontFace) => face.family.replace(/["']/g, '');

const loadedFaces = async (family: string, weight: string) => {
  // Poll: rendering text queues the load, `fonts.ready` settles once nothing
  // is pending, and the polling covers the gap before the load is queued.
  let matching: FontFace[] = [];
  for (let i = 0; i < 150; i++) {
    await document.fonts.ready;
    matching = [...document.fonts].filter(
      (face) => familyOf(face) === family && face.weight === weight,
    );
    if (matching.some((face) => face.status === 'loaded')) break;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return matching;
};

describe('bundled theme fonts actually load', () => {
  it('renders body text, headings and weights in faces the browser loaded', async () => {
    render({
      render: () =>
        h('div', [
          h('p', 'Maven Pro regular body text'),
          h('p', { class: 'fw-medium' }, 'Maven Pro medium'),
          h('p', { class: 'fw-semibold' }, 'Maven Pro semibold'),
          h('p', { class: 'fw-bold' }, 'Maven Pro bold'),
          h('h1', 'Poppins heading'),
          h('p', { style: 'font-family: var(--dx-font-family-display); font-weight: 500' }, 'Poppins medium'),
          h('p', { style: 'font-family: var(--dx-font-family-display); font-weight: 600' }, 'Poppins semibold'),
        ]),
    });

    const expected: Array<[string, string]> = [
      ['Maven Pro', '400'],
      ['Maven Pro', '500'],
      ['Maven Pro', '600'],
      ['Maven Pro', '700'],
      ['Poppins', '500'],
      ['Poppins', '600'],
    ];

    for (const [family, weight] of expected) {
      const faces = await loadedFaces(family, weight);
      expect(faces.length, `no @font-face for ${family} ${weight}`).toBeGreaterThan(0);
      expect(
        faces.map((face) => face.status),
        `${family} ${weight} did not load`,
      ).toContain('loaded');
    }
  });

  it('uses Maven Pro for body text and the Poppins display token for h1', () => {
    const screen = render({ render: () => h('div', [h('p', 'body'), h('h1', 'heading')]) });
    const body = getComputedStyle(screen.container.querySelector('p')!).fontFamily;
    const heading = getComputedStyle(screen.container.querySelector('h1')!).fontFamily;
    expect(body.split(',')[0].replace(/["']/g, '').trim()).toBe('Maven Pro');
    expect(heading.split(',')[0].replace(/["']/g, '').trim()).toBe('Poppins');
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--dx-font-family-display'),
    ).toContain('Poppins');
  });
});

describe('the theme fonts ship as files next to the stylesheet', () => {
  const files = [
    'MavenPro-Regular',
    'MavenPro-Medium',
    'MavenPro-SemiBold',
    'MavenPro-Bold',
    'Poppins-Medium',
    'Poppins-SemiBold',
  ];

  for (const name of files) {
    it(`references ${name} as a real, fetchable woff2 with font-display: swap`, async () => {
      const reference = new RegExp(`url\\(\\./assets/(${name}-[a-f0-9]+\\.woff2)\\)`).exec(
        stylesheet,
      );
      expect(reference, `${name} not referenced from dist/style.css`).not.toBeNull();

      const face = stylesheet
        .split('@font-face')
        .find((block) => block.includes(reference![1]));
      expect(face).toMatch(/font-display:\s*swap/);

      const response = await fetch(new URL(`../../dist/assets/${reference![1]}`, import.meta.url));
      expect(response.ok).toBe(true);
      const bytes = new Uint8Array(await response.arrayBuffer());
      // "wOF2" magic: a real woff2, not an HTML fallback page.
      expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('wOF2');
    });
  }
});
