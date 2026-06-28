<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'reference',
        'customer_name',
        'status',
        'is_paid',
        'payment_ref',
        'notes',
        'lines',
    ];

    protected $casts = [
        'is_paid' => 'boolean',
        'lines' => 'array',
    ];
}
