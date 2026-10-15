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

  // Must run before anything in this file renders a 700 digit (the faces'
  // load state is per page). Without a 600 face, font matching answers a 600
  // request with the 700 face (CSS Fonts 4 §5.2), so `fw-semibold` digits
  // came out bold and the 700 face was the one that loaded.
  it('sets a semibold tabular run in the 600 DX Figures face, not the 700 one', async () => {
    const before700 = [...document.fonts].filter(
      (face) => familyOf(face) === 'DX Figures' && face.weight === '700',
    );
    expect(before700.length, 'no DX Figures 700 face').toBeGreaterThan(0);
    expect(before700.map((face) => face.status), '700 already loaded').not.toContain('loaded');

    const screen = render({
      render: () => h('p', { class: 'dx-tabular fw-semibold' }, '£1,234.56'),
    });
    const semibold = await loadedFaces('DX Figures', '600');
    expect(semibold.length, 'no @font-face for DX Figures 600').toBeGreaterThan(0);
    expect(semibold.map((face) => face.status)).toContain('loaded');
    await document.fonts.ready;
    await new Promise((resolve) => setTimeout(resolve, 100));
    const bold = [...document.fonts].filter(
      (face) => familyOf(face) === 'DX Figures' && face.weight === '700',
    );
    expect(bold.map((face) => face.status), 'the 600 run used the 700 face').not.toContain('loaded');
    screen.unmount();
  });

  it('loads the DX Figures face (IBM Plex Sans digits) at 400, 500, 600 and 700 for tabular digits', async () => {
    // The face is digits-only (unicode-range), so it loads only once digits
    // render in it; the letter-only paragraph alone would leave it unloaded.
    render({
      render: () =>
        h('div', [
          h('p', { class: 'dx-tabular' }, '£1,234.56'),
          h('p', { class: 'dx-tabular fw-medium' }, '£1,234.56'),
          h('p', { class: 'dx-tabular fw-semibold' }, '£1,234.56'),
          h('p', { class: 'dx-tabular fw-bold' }, '£1,234.56'),
        ]),
    });

    for (const weight of ['400', '500', '600', '700']) {
      const faces = await loadedFaces('DX Figures', weight);
      expect(faces.length, `no @font-face for DX Figures ${weight}`).toBeGreaterThan(0);
      expect(
        faces.map((face) => face.status),
        `DX Figures ${weight} did not load`,
      ).toContain('loaded');
      expect(faces[0]!.unicodeRange.toUpperCase()).toBe('U+30-39');
    }
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--dx-font-family-figures'),
    ).toContain('DX Figures');
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
    'IBMPlexSans-Regular-Latin1',
    'IBMPlexSans-Medium-Latin1',
    'IBMPlexSans-SemiBold-Latin1',
    'IBMPlexSans-Bold-Latin1',
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

/**
 * "Plex" is a Reserved Font Name under the OFL, so the bundled IBM Plex Sans
 * files must stay byte-identical to IBM's (@ibm/plex-sans 1.1.0,
 * fonts/split/woff2/; resources/fonts/ibm-plex-sans/SOURCE.txt). Both the
 * source copy and the file the build ships are hashed against the upstream
 * checksums, so a re-encode anywhere fails here.
 */
describe('the IBM Plex Sans files are the unmodified upstream files', () => {
  const upstream: Record<string, string> = {
    'IBMPlexSans-Regular-Latin1': 'b5ad7bd39f996144915f0ad9849a90183b27d8c28ad97ed98af5b1bebc51f6b1',
    'IBMPlexSans-Medium-Latin1': 'b5610af04d0d4b5a14a621d96d974b993e945a065db1a8861918f69ef9321934',
    'IBMPlexSans-SemiBold-Latin1': 'fff0ab3a88b0b4aa0b693e4f0201359a15183b08e3fa5696d1918d8f0ade8ad5',
    'IBMPlexSans-Bold-Latin1': '914f1400f363e636b6f9cc7965aa807ff01e93586e1437617525cba0a62aa78d',
  };

  const sha256 = async (url: URL) => {
    const response = await fetch(url);
    expect(response.ok, `${url} not fetchable`).toBe(true);
    const digest = await crypto.subtle.digest('SHA-256', await response.arrayBuffer());
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  };

  for (const [name, expected] of Object.entries(upstream)) {
    it(`${name}: source and shipped copies match the upstream sha256`, async () => {
      expect(await sha256(new URL(`../../resources/fonts/ibm-plex-sans/${name}.woff2`, import.meta.url))).toBe(
        expected,
      );
      const shipped = new RegExp(`url\\(\\./assets/(${name}-[a-f0-9]+\\.woff2)\\)`).exec(stylesheet);
      expect(shipped, `${name} not referenced from dist/style.css`).not.toBeNull();
      expect(await sha256(new URL(`../../dist/assets/${shipped![1]}`, import.meta.url))).toBe(expected);
    });
  }
});
