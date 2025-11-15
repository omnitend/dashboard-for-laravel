<?php

use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ProductController;
use Illuminate\Support\Facades\Route;

// Same controllers, auto-detect JSON response via Accept header
Route::get('/products', [ProductController::class, 'index']);
Route::put('/products/{product}', [ProductController::class, 'update']);
Route::get('/categories', [CategoryController::class, 'index']);
