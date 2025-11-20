<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use OmniTend\LaravelDashboard\Traits\HasTableFilters;

class CategoryController extends Controller
{
    use HasTableFilters;

    protected array $allowedFilters = [
        'name' => 'like',
        'is_active' => 'boolean',
    ];

    protected array $allowedSortColumns = ['name', 'slug', 'product_count', 'is_active', 'created_at'];

    protected string $defaultSortColumn = 'name';
    protected string $defaultSortOrder = 'asc';

    public function index(Request $request)
    {
        $query = Category::query();
        $this->applyTableQuery($query, $request);

        return $this->tableResponse($query, $request, Category::class, 'Categories/Index', 'categories');
    }

    public function update(Request $request, Category $category)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $category->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Category updated successfully',
            'data' => $category,
        ]);
    }

    public function destroy(Category $category)
    {
        // Check if category has products
        if ($category->product_count > 0) {
            return response()->json([
                'message' => "Cannot delete {$category->name}. This category has {$category->product_count} associated products. Please delete all products for this category first.",
                'error' => 'Category has associated products',
            ], 422);
        }

        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Category deleted successfully',
        ]);
    }
}
