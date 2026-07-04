import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import DXStatCard from '../../resources/js/components/extended/DXStatCard.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('DXStatCard', () => {
  it('renders the title and a currency-formatted value', async () => {
    const screen = render(DXStatCard, {
      props: { title: 'Revenue', value: 6480.55, format: 'currency' },
    });
    await flush();

    expect(screen.container.textContent).toContain('Revenue');
    expect(
      screen.container.querySelector('.dx-stat-card__value')?.textContent?.trim(),
    ).toBe('£6,480.55');
  });

  it('formats number and percent values', async () => {
    const num = render(DXStatCard, { props: { title: 'Users', value: 2543 } });
    await flush();
    expect(num.container.querySelector('.dx-stat-card__value')?.textContent?.trim()).toBe('2,543');

    const pct = render(DXStatCard, {
      props: { title: 'Rate', value: 87, format: 'percent' },
    });
    await flush();
    expect(pct.container.querySelector('.dx-stat-card__value')?.textContent?.trim()).toBe('87%');
  });

  it('passes a string value through unformatted', async () => {
    const screen = render(DXStatCard, {
      props: { title: 'Status', value: 'Healthy', format: 'currency' },
    });
    await flush();
    expect(screen.container.querySelector('.dx-stat-card__value')?.textContent?.trim()).toBe('Healthy');
  });

  it('shows a down delta as danger with a down arrow, magnitude only', async () => {
    const screen = render(DXStatCard, {
      props: {
        title: 'Revenue',
        value: 6480,
        format: 'currency',
        delta: -61,
        deltaLabel: 'vs last week',
      },
    });
    await flush();

    const badge = screen.container.querySelector('.dx-stat-card__delta');
    expect(badge).toBeTruthy();
    expect(badge?.className).toContain('text-bg-danger');
    expect(badge?.textContent).toContain('▼');
    expect(badge?.textContent).toContain('61%');
    expect(badge?.textContent).not.toContain('-61');
    expect(screen.container.textContent).toContain('vs last week');
  });

  it('shows an up delta as success with an up arrow', async () => {
    const screen = render(DXStatCard, {
      props: { title: 'Signups', value: 120, delta: 12 },
    });
    await flush();

    const badge = screen.container.querySelector('.dx-stat-card__delta');
    expect(badge?.className).toContain('text-bg-success');
    expect(badge?.textContent).toContain('▲');
  });

  it('inverts the delta colour when invertDelta is set (down is good)', async () => {
    const screen = render(DXStatCard, {
      props: { title: 'Bounce rate', value: 30, format: 'percent', delta: -5, invertDelta: true },
    });
    await flush();

    const badge = screen.container.querySelector('.dx-stat-card__delta');
    // Down arrow, but green because down is good here.
    expect(badge?.textContent).toContain('▼');
    expect(badge?.className).toContain('text-bg-success');
  });

  it('renders no delta badge when delta is absent', async () => {
    const screen = render(DXStatCard, { props: { title: 'Total', value: 10 } });
    await flush();
    expect(screen.container.querySelector('.dx-stat-card__delta')).toBeNull();
  });

  it('supports a custom value slot', async () => {
    const screen = render(DXStatCard, {
      props: { title: 'Revenue', value: 6480.55, format: 'currency' },
      slots: {
        value: `<template #value="{ formatted }"><span class="custom-val">{{ formatted }}!</span></template>`,
      },
    });
    await flush();
    expect(screen.container.querySelector('.custom-val')?.textContent).toBe('£6,480.55!');
  });
});
