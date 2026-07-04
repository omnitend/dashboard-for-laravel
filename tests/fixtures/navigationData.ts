import type { Navigation } from '../../resources/js/types/navigation';

export const sampleNavigation: Navigation = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', url: '/dashboard' },
      { label: 'Customers', url: '/customers' },
      { label: 'Orders', url: '/orders' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Profile', url: '/settings/profile' },
      { label: 'Security', url: '/settings/security' },
    ],
  },
];

// A navigation with several groups, used to exercise collapsible-group behaviour.
export const manyGroupsNavigation: Navigation = [
  {
    label: 'Accounting',
    items: [
      { label: 'Invoices', url: '/accounting/invoices' },
      { label: 'Payments', url: '/accounting/payments' },
    ],
  },
  {
    label: 'Staff',
    items: [
      { label: 'Employees', url: '/staff/employees' },
      { label: 'Rotas', url: '/staff/rotas' },
      { label: 'Training', url: '/staff/training' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Profile', url: '/settings/profile' },
      { label: 'Security', url: '/settings/security' },
    ],
  },
];

export const sampleUser = {
  name: 'John Smith',
  email: 'john.smith@example.com',
};
