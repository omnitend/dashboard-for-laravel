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

export const sampleUser = {
  name: 'John Smith',
  email: 'john.smith@example.com',
};
