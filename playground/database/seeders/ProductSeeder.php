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
        $faker = \Faker\Factory::create();

        // Category-specific product templates
        $productTemplates = [
            'Electronics' => [
                'Wireless Bluetooth Headphones',
                'USB-C Charging Cable',
                '4K Ultra HD Monitor',
                'Mechanical Gaming Keyboard',
                'Wireless Mouse',
                'Portable SSD Drive',
                'Smartphone Stand',
                'Laptop Cooling Pad',
                'Webcam HD 1080p',
                'Power Bank 20000mAh',
            ],
            'Clothing' => [
                'Cotton T-Shirt',
                'Denim Jeans',
                'Hoodie Sweatshirt',
                'Running Shoes',
                'Winter Jacket',
                'Baseball Cap',
                'Leather Belt',
                'Casual Sneakers',
                'Dress Shirt',
                'Yoga Pants',
            ],
            'Home & Garden' => [
                'LED Table Lamp',
                'Ceramic Plant Pot',
                'Storage Basket',
                'Wall Clock',
                'Throw Pillow',
                'Garden Hose',
                'Picture Frame',
                'Area Rug',
                'Kitchen Knife Set',
                'Coffee Maker',
            ],
            'Sports' => [
                'Yoga Mat',
                'Dumbbell Set',
                'Resistance Bands',
                'Water Bottle',
                'Tennis Racket',
                'Basketball',
                'Jump Rope',
                'Foam Roller',
                'Running Belt',
                'Sports Towel',
            ],
            'Books' => [
                'Programming Guide',
                'Mystery Novel',
                'Cookbook Collection',
                'Science Fiction Anthology',
                'Biography',
                'Self-Help Book',
                'Graphic Novel',
                'Poetry Collection',
                'Travel Guide',
                'History Book',
            ],
            'Toys' => [
                'Building Blocks Set',
                'Remote Control Car',
                'Puzzle Game',
                'Action Figure',
                'Board Game',
                'Stuffed Animal',
                'Art Supply Kit',
                'Educational Toy',
                'Play-Doh Set',
                'LEGO Set',
            ],
        ];

        $index = 1;
        foreach ($productTemplates as $category => $products) {
            foreach ($products as $productName) {
                Product::create([
                    'sku' => 'PRD-' . str_pad($index, 5, '0', STR_PAD_LEFT),
                    'name' => $productName,
                    'description' => $faker->sentence(rand(10, 20)),
                    'price' => $faker->randomFloat(2, 5, 500),
                    'category' => $category,
                    'stock' => $faker->numberBetween(0, 100),
                ]);
                $index++;
            }
        }
    }
}
