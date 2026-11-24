<?php

namespace App\Http\Controllers;

use App\Models\Fact;
use App\Models\Website;
use App\Services\ConflictDetectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DisambiguationController extends Controller
{
    public function __construct(
        protected ConflictDetectionService $conflictDetector
    ) {}

    /**
     * Get facts and conflict analysis for a website.
     */
    public function index(Website $website): JsonResponse
    {
        $facts = $website->facts()->get();
        $conflictAnalysis = $this->conflictDetector->detectAndFlagConflicts($website);

        return response()->json([
            'success' => true,
            'facts' => $facts,
            'has_conflicts' => $conflictAnalysis['has_conflicts'],
            'conflicts' => $conflictAnalysis['conflicts'],
        ]);
    }

    /**
     * Add a single new fact manually.
     */
    public function storeFact(Request $request, Website $website): JsonResponse
    {
        $validated = $request->validate([
            'field_name' => ['required', 'string', 'max:100'],
            'field_value' => ['required', 'string'],
            'source_name' => ['nullable', 'string', 'max:255'],
        ]);

        $fact = Fact::create([
            'website_id' => $website->id,
            'source_type' => 'manual',
            'source_name' => $validated['source_name'] ?? 'User Clarification',
            'field_name' => strtolower($validated['field_name']),
            'field_value' => $validated['field_value'],
            'confidence' => 1.0,
            'is_confirmed' => true,
        ]);

        $this->conflictDetector->detectAndFlagConflicts($website);

        return response()->json([
            'success' => true,
            'fact' => $fact,
        ]);
    }

    /**
     * Resolve a single fact (confirm or edit).
     */
    public function resolveFact(Request $request, Website $website, Fact $fact): JsonResponse
    {
        if ($fact->website_id !== $website->id) {
            return response()->json(['error' => 'Fact does not belong to website.'], 403);
        }

        $validated = $request->validate([
            'field_value' => ['nullable', 'string'],
            'is_confirmed' => ['nullable', 'boolean'],
        ]);

        if (isset($validated['field_value'])) {
            $fact->field_value = $validated['field_value'];
        }

        $fact->is_confirmed = $validated['is_confirmed'] ?? true;
        $fact->has_conflict = false;
        $fact->conflict_details = null;
        $fact->save();

        // Re-run conflict detection
        $analysis = $this->conflictDetector->detectAndFlagConflicts($website);

        return response()->json([
            'success' => true,
            'fact' => $fact,
            'remaining_conflicts' => $analysis['conflicts'],
        ]);
    }

    /**
     * Resolve all field conflicts at once with chosen values.
     */
    public function resolveBatch(Request $request, Website $website): JsonResponse
    {
        $validated = $request->validate([
            'resolutions' => ['required', 'array'], // [ 'phone' => '555-0199', 'address' => '...' ]
        ]);

        foreach ($validated['resolutions'] as $field => $selectedValue) {
            $cleanField = strtolower($field);

            // Update matching facts: set selected value as confirmed, mark other duplicates as unconfirmed or archive
            $existing = $website->facts()->where('field_name', $cleanField)->get();
            if ($existing->isNotEmpty()) {
                $primary = $existing->first();
                $primary->update([
                    'field_value' => $selectedValue,
                    'is_confirmed' => true,
                    'has_conflict' => false,
                    'conflict_details' => null,
                ]);

                // Clear other conflicting records for this field
                $existing->skip(1)->each(function (Fact $f) {
                    $f->delete();
                });
            } else {
                Fact::create([
                    'website_id' => $website->id,
                    'source_type' => 'manual',
                    'source_name' => 'Disambiguation',
                    'field_name' => $cleanField,
                    'field_value' => $selectedValue,
                    'confidence' => 1.0,
                    'is_confirmed' => true,
                ]);
            }
        }

        $analysis = $this->conflictDetector->detectAndFlagConflicts($website);

        return response()->json([
            'success' => true,
            'facts' => $website->facts()->get(),
            'conflicts' => $analysis['conflicts'],
        ]);
    }
}
