<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'is_active',
        'product_count',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'product_count' => 'integer',
    ];
}
