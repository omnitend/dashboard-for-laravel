# Component Testing with Vitest Browser Mode

This directory contains component tests using **Vitest Browser Mode**, which runs tests in a real browser with visual output.

## Running Tests

```bash
# Watch mode - browser window opens, tests run as you edit
npm test

# UI mode - web-based test runner interface
npm run test:ui

# Headless mode - for CI/automated testing
npm run test:headless
```

## Visual + Programmatic Testing

Tests provide both visual and programmatic verification:

**Visual:** Watch components render in the browser as tests run
**Programmatic:** Assert correct behavior with `expect()` statements

## Example Test

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from 'vitest-browser-vue';
import { userEvent } from '@vitest/browser/context';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

describe('DXTable', () => {
  it('renders and handles pagination', async () => {
    const { container, emitted } = render(DXTable, {
      props: {
        items: customerData,
        fields: customerFields,
        pagination: { currentPage: 1, perPage: 10, total: 25 },
      },
    });

    // Visual: See table rendered in browser
    // Programmatic: Assert structure
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(customerData.length);

    // Visual: See pagination click
    // Programmatic: Assert event fired
    const page2 = await screen.getByRole('button', { name: '2' });
    await userEvent.click(page2);
    expect(emitted()['page-change'][0]).toEqual([2]);
  });
});
```

## Test Structure

```
tests/
├── components/           # Component test files
│   └── DXTable.test.ts
├── fixtures/            # Reusable test data
│   └── tableData.ts
├── setup.ts             # Global test setup
└── README.md            # This file
```

## Writing Tests

### 1. Import Testing Utilities

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from 'vitest-browser-vue';
import { userEvent } from '@vitest/browser/context';
```

### 2. Render Component

```typescript
const { container, emitted, rerender } = render(MyComponent, {
  props: { /* ... */ },
  slots: { default: 'Slot content' },
});
```

### 3. Query Elements

```typescript
// Preferred: Accessibility-focused queries
const button = await screen.getByRole('button', { name: 'Submit' });
const heading = await screen.getByText('Customer List');

// Alternative: Direct DOM queries
const table = container.querySelector('table');
const rows = container.querySelectorAll('tbody tr');
```

### 4. Interact with Elements

```typescript
await userEvent.click(button);
await userEvent.type(input, 'test value');
await userEvent.clear(input);
```

### 5. Assert Behavior

```typescript
// Element exists
expect(element).toBeInTheDocument();

// Element has class
expect(element.classList.contains('active')).toBe(true);

// Event was emitted
expect(emitted()['page-change']).toBeTruthy();
expect(emitted()['page-change'][0]).toEqual([2]);

// Count elements
expect(rows.length).toBe(5);
```

## Test Fixtures

Reusable test data lives in `tests/fixtures/`. Example:

```typescript
// tests/fixtures/tableData.ts
export const customerData = [
  { id: 1, name: 'John Smith', email: 'john@example.com', status: 'active' },
  { id: 2, name: 'Jane Doe', email: 'jane@example.com', status: 'inactive' },
];

export const customerFields = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: false },
  { key: 'status', label: 'Status', sortable: true },
];
```

## Debugging Tests

1. **Use `headless: false` in vitest.config.ts** - Browser window stays open
2. **Add console.log** in components to trace execution
3. **Use browser DevTools** - Right-click → Inspect during test runs
4. **Pause on failures** - Tests wait when assertions fail, letting you inspect state

## CI/CD

For automated testing (GitHub Actions, etc.), use headless mode:

```yaml
- name: Run tests
  run: npm run test:headless
```

## Resources

- [Vitest Browser Mode](https://vitest.dev/guide/browser/)
- [vitest-browser-vue](https://github.com/vitest-dev/vitest-browser-vue)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
