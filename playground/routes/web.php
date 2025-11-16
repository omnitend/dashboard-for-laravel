<?php

use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ProductController;
use Illuminate\Support\Facades\Route;

Route::get('/', [ProductController::class, 'index'])->name('products.index');
Route::get('/categories', [CategoryController::class, 'index'])->name('categories.index');
Route::get('/toasts', function () {
    return inertia('Toasts/Index');
})->name('toasts.index');
