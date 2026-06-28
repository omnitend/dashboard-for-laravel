<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class OrderController extends Controller
{
    public function index()
    {
        return Inertia::render('Orders/Index', [
            'orders' => Order::orderBy('reference')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateOrder($request);

        $order = Order::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Order created successfully',
            'data' => $order,
        ]);
    }

    public function update(Request $request, Order $order)
    {
        $validated = $this->validateOrder($request, $order);

        $order->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Order updated successfully',
            'data' => $order,
        ]);
    }

    /**
     * Validation rules are arranged so a failure lands in a specific tab:
     * `payment_ref` (required when paid) is a Details-tab field, while the
     * `lines.*` rules are Line-items-tab fields. DXForm auto-switches to the
     * first tab containing an error.
     */
    protected function validateOrder(Request $request, ?Order $order = null): array
    {
        return $request->validate([
            'reference' => [
                'required', 'string', 'max:50',
                Rule::unique('orders', 'reference')->ignore($order?->id),
            ],
            'customer_name' => ['required', 'string', 'max:255'],
            'status' => ['required', Rule::in(['pending', 'paid', 'shipped', 'cancelled'])],
            'is_paid' => ['boolean'],
            'payment_ref' => ['nullable', 'required_if:is_paid,true', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'lines' => ['array', 'min:1'],
            'lines.*.description' => ['required', 'string', 'max:255'],
            'lines.*.quantity' => ['required', 'integer', 'min:1'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
        ], [
            'lines.min' => 'Add at least one line item.',
            'payment_ref.required_if' => 'A payment reference is required for paid orders.',
        ]);
    }
}
