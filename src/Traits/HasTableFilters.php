<?php

namespace OmniTend\LaravelDashboard\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

trait HasTableFilters
{
    /**
     * Filter configuration
     *
     * Define this in your controller:
     * protected array $allowedFilters = ['name' => 'like', 'status' => 'exact', 'stock' => 'scope:stockLevel'];
     *
     * Types: 'like', 'exact', 'number', 'date', 'boolean', 'scope:methodName'
     */

    /**
     * Sortable columns whitelist
     *
     * Define this in your controller:
     * protected array $allowedSortColumns = ['name', 'email', 'created_at'];
     */

    /**
     * Default sort column (optional)
     *
     * Define this in your controller:
     * protected string $defaultSortColumn = 'created_at';
     */

    /**
     * Default sort order (optional)
     *
     * Define this in your controller:
     * protected string $defaultSortOrder = 'desc';
     */

    /**
     * Apply filters, sorting to a query
     *
     * @deprecated Since 0.4.8. Do NOT call this before tableResponse() - it now handles filtering internally.
     * This method is now called automatically inside tableResponse() to ensure proper unfiltered counts.
     * Calling it manually will cause filters/sorting to be applied twice.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Database\Eloquent\Builder
     */
    protected function applyTableQuery(Builder $query, Request $request): Builder
    {
        $allowedFilters = $this->allowedFilters ?? [];
        $allowedSortColumns = $this->allowedSortColumns ?? [];
        $defaultSortColumn = $this->defaultSortColumn ?? 'created_at';
        $defaultSortOrder = $this->defaultSortOrder ?? 'desc';

        // Apply filters
        $filters = $request->input('filters', []);
        foreach ($filters as $field => $value) {
            // Check if filter is allowed and value is not null/empty string
            // Note: We use !== '' instead of !empty() because empty('0') returns true
            if (isset($allowedFilters[$field]) && $value !== null && $value !== '') {
                $this->applyFilter($query, $field, $value, $allowedFilters[$field]);
            }
        }

        // Apply sorting
        $sortBy = $request->input('sortBy', $defaultSortColumn);
        $sortOrder = $request->input('sortOrder', $defaultSortOrder);

        // Validate sort order
        if (!in_array(strtolower($sortOrder), ['asc', 'desc'])) {
            $sortOrder = $defaultSortOrder;
        }

        // Apply sorting if column is allowed
        if (in_array($sortBy, $allowedSortColumns)) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            // Fallback to default
            $query->orderBy($defaultSortColumn, $defaultSortOrder);
        }

        return $query;
    }

    /**
     * Apply a single filter to the query
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $field
     * @param mixed $value
     * @param string $type
     * @return void
     */
    protected function applyFilter(Builder $query, string $field, mixed $value, string $type): void
    {
        // Check if it's a scope filter (format: "scope:methodName")
        if (str_starts_with($type, 'scope:')) {
            $scopeName = substr($type, 6); // Remove "scope:" prefix
            if (method_exists($query->getModel(), 'scope' . ucfirst($scopeName))) {
                $query->{$scopeName}($value);
                return;
            }
        }

        // Standard filter types
        match($type) {
            'like' => $query->where($field, 'LIKE', '%' . $value . '%'),
            'exact' => $query->where($field, '=', $value),
            'number' => $query->where($field, '=', $value),
            'date' => $query->whereDate($field, '=', $value),
            'boolean' => $query->where($field, '=', $value === '1' || $value === 1 || $value === true ? 1 : 0),
            default => null,
        };
    }

    /**
     * Get distinct values for filter dropdowns
     *
     * @param \Illuminate\Database\Eloquent\Builder $query The scoped query to use
     * @param array $requestedFilters Array of field names to get values for
     * @return array<string, array>
     */
    protected function getFilterValues(Builder $query, array $requestedFilters): array
    {
        $allowedFilters = $this->allowedFilters ?? [];
        $filterValues = [];

        foreach ($requestedFilters as $field) {
            // Only return values for allowed filters with 'exact' type (selects)
            if (isset($allowedFilters[$field]) && $allowedFilters[$field] === 'exact') {
                // Use cloned scoped query to respect tenant/auth constraints
                $filterValues[$field] = (clone $query)->distinct()
                    ->pluck($field)
                    ->filter() // Remove nulls
                    ->sort()
                    ->values()
                    ->toArray();
            }
        }

        return $filterValues;
    }

    /**
     * Generate table response (auto-detects Inertia vs API)
     *
     * IMPORTANT: Pass the BASE QUERY before calling applyTableQuery()
     * The filtering will be applied internally to ensure proper unfiltered counts.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query Base query BEFORE filters
     * @param \Illuminate\Http\Request $request
     * @param string $modelClass
     * @param string $componentName Inertia component name (e.g., 'Products/Index')
     * @param string $dataKey Key for the paginated data (e.g., 'products')
     * @return \Illuminate\Http\Response|\Inertia\Response
     */
    protected function tableResponse(
        Builder $query,
        Request $request,
        string $modelClass,
        string $componentName,
        string $dataKey = 'items'
    ) {
        // Validate and get perPage
        $perPage = $request->input('perPage', 10);
        $allowedPerPage = [10, 25, 50, 100];
        if (!in_array($perPage, $allowedPerPage)) {
            $perPage = 10;
        }

        // Clone base query BEFORE applying filters (for unfiltered count and filter values)
        $baseQuery = clone $query;

        // Check if filters are active
        $filters = $request->input('filters', []);
        $hasFilters = !empty(array_filter($filters, fn($v) => $v !== null && $v !== ''));
        $totalUnfiltered = null;

        if ($hasFilters) {
            // Get unfiltered count from base query (respects tenant/auth scopes)
            $totalUnfiltered = $baseQuery->count();
        }

        // NOW apply filters and sorting to the main query
        $this->applyTableQuery($query, $request);

        // Paginate filtered results
        $paginated = $query->paginate($perPage, ['*'], 'page', $request->input('page', 1));

        // Get filter values from base query (before filters applied)
        $allowedFilters = $this->allowedFilters ?? [];
        $fieldsNeedingValues = array_keys(array_filter($allowedFilters, fn($type) => $type === 'exact'));
        $filterValues = $this->getFilterValues($baseQuery, $fieldsNeedingValues);

        // Check if it's an API request
        if ($request->wantsJson() || $request->is('api/*')) {
            $paginationData = [
                'current_page' => $paginated->currentPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
                'from' => $paginated->firstItem(),
                'to' => $paginated->lastItem(),
                'last_page' => $paginated->lastPage(),
            ];

            // Add total_unfiltered only if filters are active
            if ($totalUnfiltered !== null) {
                $paginationData['total_unfiltered'] = $totalUnfiltered;
            }

            return response()->json([
                'data' => $paginated->items(),
                'pagination' => $paginationData,
                'filterValues' => $filterValues,
            ]);
        }

        // Inertia response
        $paginatedResource = new \OmniTend\LaravelDashboard\Http\Resources\PaginatedResource($paginated);

        // Add total_unfiltered to the pagination data if filters are active
        if ($totalUnfiltered !== null) {
            $paginatedResource->total_unfiltered = $totalUnfiltered;
        }

        return \Inertia\Inertia::render($componentName, [
            $dataKey => $paginatedResource,
            'filterValues' => $filterValues,
        ]);
    }
}
