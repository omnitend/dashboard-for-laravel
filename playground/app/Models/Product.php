<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'sku',
        'name',
        'description',
        'price',
        'category',
        'stock',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'stock' => 'integer',
    ];

    /**
     * Scope to filter by stock level
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $level 'low', 'medium', or 'good'
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeStockLevel($query, string $level)
    {
        return match($level) {
            'low' => $query->where('stock', '<=', 10),
            'medium' => $query->whereBetween('stock', [11, 50]),
            'good' => $query->where('stock', '>', 50),
            default => $query,
        };
    }
}
