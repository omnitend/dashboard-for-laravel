<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            ['name' => 'Electronics', 'description' => 'Electronic devices and accessories', 'is_active' => true],
            ['name' => 'Clothing', 'description' => 'Apparel and fashion items', 'is_active' => true],
            ['name' => 'Home & Garden', 'description' => 'Home decor and garden supplies', 'is_active' => true],
            ['name' => 'Sports', 'description' => 'Sports and fitness equipment', 'is_active' => true],
            ['name' => 'Books', 'description' => 'Books and reading materials', 'is_active' => true],
            ['name' => 'Toys', 'description' => 'Toys and games for all ages', 'is_active' => false],
        ];

        foreach ($categories as $categoryData) {
            $category = Category::create([
                'name' => $categoryData['name'],
                'slug' => Str::slug($categoryData['name']),
                'description' => $categoryData['description'],
                'is_active' => $categoryData['is_active'],
                'product_count' => Product::where('category', $categoryData['name'])->count(),
            ]);
        }
    }
}
