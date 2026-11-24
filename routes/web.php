<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\WebsiteController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Public published site view
Route::get('/sites/{slug}', [WebsiteController::class, 'viewPublicSite'])->name('sites.public');
Route::get('/sites/{website}/export', [WebsiteController::class, 'exportZip'])->name('sites.export');

// Website Builder Studio & Visual Editor
Route::get('/', [WebsiteController::class, 'studio'])->name('home');
Route::get('/studio', [WebsiteController::class, 'studio'])->name('studio.index');
Route::get('/editor/{website}', [WebsiteController::class, 'editor'])->name('studio.editor');

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
