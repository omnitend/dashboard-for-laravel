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
     * Transform the resource collection into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request): array
    {
        return [
            'data' => $this->collection,
            'current_page' => $this->currentPage(),
            'per_page' => $this->perPage(),
            'total' => $this->total(),
            'from' => $this->firstItem(),
            'to' => $this->lastItem(),
            'last_page' => $this->lastPage(),
        ];
    }
}
