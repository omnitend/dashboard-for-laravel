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

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'sku' => 'required|string|max:50',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'category' => 'required|string|max:100',
            'stock' => 'required|integer|min:0',
        ]);

        $product->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Product updated successfully',
            'data' => $product,
        ]);
    }

    public function destroy(Product $product)
    {
        $product->delete();

        return response()->json([
            'success' => true,
            'message' => 'Product deleted successfully',
        ]);
    }
}
