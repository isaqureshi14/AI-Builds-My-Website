<?php

use App\Http\Controllers\DisambiguationController;
use App\Http\Controllers\IntakeController;
use App\Http\Controllers\SectionController;
use App\Http\Controllers\WebsiteController;
use Illuminate\Support\Facades\Route;

// Intake endpoints
Route::post('/intake/url', [IntakeController::class, 'scrapeUrl']);
Route::post('/intake/upload', [IntakeController::class, 'uploadFile']);
Route::post('/intake/facts', [IntakeController::class, 'ingestFacts']);

// Disambiguation / Clarification endpoints
Route::get('/websites/{website}/conflicts', [DisambiguationController::class, 'index']);
Route::post('/websites/{website}/facts', [DisambiguationController::class, 'storeFact']);
Route::put('/websites/{website}/facts/{fact}', [DisambiguationController::class, 'resolveFact']);
Route::post('/websites/{website}/conflicts/resolve', [DisambiguationController::class, 'resolveBatch']);

// Website Generation & Management endpoints
Route::post('/websites/generate', [WebsiteController::class, 'generate']);
Route::get('/websites/{website}', [WebsiteController::class, 'show']);
Route::post('/websites', [WebsiteController::class, 'store']);
Route::put('/websites/{website}', [WebsiteController::class, 'update']);
Route::post('/websites/{website}/publish', [WebsiteController::class, 'publish']);
Route::get('/websites/{website}/export', [WebsiteController::class, 'exportZip']);

// Section Editing & Regeneration endpoints
Route::post('/websites/{website}/sections', [SectionController::class, 'store']);
Route::put('/sections/{section}', [SectionController::class, 'update']);
Route::delete('/sections/{section}', [SectionController::class, 'destroy']);
Route::post('/websites/{website}/sections/reorder', [SectionController::class, 'reorder']);
Route::post('/sections/{section}/regenerate', [SectionController::class, 'regenerate']);
