<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Toys'];
        $faker = \Faker\Factory::create();

        for ($i = 1; $i <= 50; $i++) {
            Product::create([
                'sku' => 'PRD-' . str_pad($i, 5, '0', STR_PAD_LEFT),
                'name' => $faker->words(rand(2, 4), true),
                'description' => $faker->sentence(rand(10, 20)),
                'price' => $faker->randomFloat(2, 5, 500),
                'category' => $faker->randomElement($categories),
                'stock' => $faker->numberBetween(0, 100),
            ]);
        }
    }
}
