import type { TableField, PaginationData } from '../../resources/js/components/extended/DXTable.vue';

export interface Customer {
  id: number;
  name: string;
  email: string;
  company: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export const customerFields: TableField[] = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', label: 'Customer Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'company', label: 'Company', sortable: false },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'created_at', label: 'Created', sortable: true },
];

export const customerData: Customer[] = [
  {
    id: 1,
    name: 'John Smith',
    email: 'john.smith@example.com',
    company: 'Acme Corp',
    status: 'active',
    created_at: '2024-01-15',
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    email: 'sarah.j@example.com',
    company: 'Tech Solutions Ltd',
    status: 'active',
    created_at: '2024-02-20',
  },
  {
    id: 3,
    name: 'Michael Brown',
    email: 'mbrown@example.com',
    company: 'Global Industries',
    status: 'inactive',
    created_at: '2024-03-10',
  },
  {
    id: 4,
    name: 'Emily Davis',
    email: 'emily.davis@example.com',
    company: 'Innovation Hub',
    status: 'active',
    created_at: '2024-04-05',
  },
  {
    id: 5,
    name: 'David Wilson',
    email: 'd.wilson@example.com',
    company: 'Startup Ventures',
    status: 'active',
    created_at: '2024-05-12',
  },
];

export const paginationData: PaginationData = {
  current_page: 1,
  per_page: 10,
  total: 5,
  from: 1,
  to: 5,
};

export const largePaginationData: PaginationData = {
  current_page: 1,
  per_page: 10,
  total: 25,
  from: 1,
  to: 10,
};
