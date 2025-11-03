<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use OmniTend\LaravelDashboard\Http\Resources\PaginatedResource;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->input('perPage', 10);

        // Sorting parameters
        $sortBy = $request->input('sortBy', 'created_at');
        $sortOrder = $request->input('sortOrder', 'desc');

        // Whitelist of allowed sort columns for security
        $allowedSortColumns = ['sku', 'name', 'category', 'price', 'stock', 'created_at'];

        // Validate sort column
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'created_at';
        }

        // Validate sort order
        if (!in_array(strtolower($sortOrder), ['asc', 'desc'])) {
            $sortOrder = 'desc';
        }

        $products = Product::orderBy($sortBy, $sortOrder)->paginate($perPage);

        return Inertia::render('Products/Index', [
            'products' => new PaginatedResource($products),
            'sortBy' => $sortBy,
            'sortOrder' => $sortOrder,
        ]);
    }

    public function apiIndex(Request $request)
    {
        $page = $request->input('page', 1);
        $perPage = $request->input('perPage', 10);
        $sortBy = $request->input('sortBy', 'created_at');
        $sortOrder = $request->input('sortOrder', 'desc');

        // Whitelist of allowed sort columns for security
        $allowedSortColumns = ['sku', 'name', 'category', 'price', 'stock', 'created_at'];

        // Validate sort column
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'created_at';
        }

        // Validate sort order
        if (!in_array(strtolower($sortOrder), ['asc', 'desc'])) {
            $sortOrder = 'desc';
        }

        $products = Product::orderBy($sortBy, $sortOrder)
            ->paginate($perPage, ['*'], 'page', $page);

        // Return data in provider-compatible format
        return response()->json([
            'data' => $products->items(),
            'pagination' => [
                'current_page' => $products->currentPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
                'from' => $products->firstItem(),
                'to' => $products->lastItem(),
                'last_page' => $products->lastPage(),
            ],
        ]);
    }
}
