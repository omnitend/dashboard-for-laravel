<?php

namespace OmniTend\LaravelDashboard\Http\Resources;

use Illuminate\Http\Resources\Json\ResourceCollection;

/**
 * Resource collection for paginated data that works seamlessly
 * with the DataTable component.
 */
class PaginatedResource extends ResourceCollection
{
    /**
     * Total unfiltered count (optional, set when filters are active)
     */
    public ?int $total_unfiltered = null;

    /**
     * Transform the resource collection into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request): array
    {
        $data = [
            'data' => $this->collection,
            'current_page' => $this->currentPage(),
            'per_page' => $this->perPage(),
            'total' => $this->total(),
            'from' => $this->firstItem(),
            'to' => $this->lastItem(),
            'last_page' => $this->lastPage(),
        ];

        // Add total_unfiltered only if it's set
        if ($this->total_unfiltered !== null) {
            $data['total_unfiltered'] = $this->total_unfiltered;
        }

        return $data;
    }
}
