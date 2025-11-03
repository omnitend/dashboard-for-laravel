/**
 * Generic interface for paginated data from Laravel PaginatedResource
 */
export interface PaginatedData<T> {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
  last_page: number;
}

/**
 * Generic props for Inertia pages with paginated data
 */
export interface PaginatedProps<T> {
  [key: string]: PaginatedData<T>;
  sortBy?: string;
  sortOrder?: string;
}
