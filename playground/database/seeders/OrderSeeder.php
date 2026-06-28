<?php

namespace Database\Seeders;

use App\Models\Order;
use Illuminate\Database\Seeder;

class OrderSeeder extends Seeder
{
    public function run(): void
    {
        // Idempotent: clear and reseed so re-running doesn't duplicate.
        Order::query()->delete();

        $orders = [
            [
                'reference' => 'ORD-1001',
                'customer_name' => 'Acme Industries',
                'status' => 'paid',
                'is_paid' => true,
                'payment_ref' => 'PAY-88213',
                'notes' => 'Leave at reception.',
                'lines' => [
                    ['description' => 'Widget, large', 'quantity' => 4, 'unit_price' => 19.99],
                    ['description' => 'Mounting bracket', 'quantity' => 4, 'unit_price' => 3.50],
                ],
            ],
            [
                'reference' => 'ORD-1002',
                'customer_name' => 'Beech & Co',
                'status' => 'pending',
                'is_paid' => false,
                'payment_ref' => null,
                'notes' => null,
                'lines' => [
                    ['description' => 'Annual support plan', 'quantity' => 1, 'unit_price' => 480.00],
                ],
            ],
            [
                'reference' => 'ORD-1003',
                'customer_name' => 'Carter Logistics',
                'status' => 'shipped',
                'is_paid' => true,
                'payment_ref' => 'PAY-90455',
                'notes' => 'Split delivery across two sites.',
                'lines' => [
                    ['description' => 'Pallet wrap (roll)', 'quantity' => 12, 'unit_price' => 8.25],
                    ['description' => 'Shipping labels (1000)', 'quantity' => 3, 'unit_price' => 14.00],
                    ['description' => 'Express handling', 'quantity' => 1, 'unit_price' => 35.00],
                ],
            ],
        ];

        foreach ($orders as $order) {
            Order::create($order);
        }
    }
}
