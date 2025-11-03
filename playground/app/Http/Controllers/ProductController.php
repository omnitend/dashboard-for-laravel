<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use OmniTend\LaravelDashboard\Http\Resources\PaginatedResource;
use OmniTend\LaravelDashboard\Traits\HasTableFilters;

class ProductController extends Controller
{
    use HasTableFilters;

    protected array $allowedFilters = [
        'name' => 'like',
        'sku' => 'like',
        'category' => 'exact',
        'price' => 'number',
        'stock' => 'scope:stockLevel',
    ];

    protected array $allowedSortColumns = ['sku', 'name', 'category', 'price', 'stock', 'created_at'];

    protected string $defaultSortColumn = 'created_at';
    protected string $defaultSortOrder = 'desc';
    public function index(Request $request)
    {
        $query = Product::query();
        $this->applyTableQuery($query, $request);

        return $this->tableResponse($query, $request, Product::class, 'Products/Index', 'products');
    }
}
