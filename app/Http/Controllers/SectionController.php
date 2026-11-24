<?php

namespace App\Http\Controllers;

use App\Models\Section;
use App\Models\SiteRevision;
use App\Models\Website;
use App\Services\GeminiAiService;
use App\Services\PromptSanitizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class SectionController extends Controller
{
    public function __construct(
        protected GeminiAiService $gemini,
        protected PromptSanitizationService $sanitizer
    ) {}

    /**
     * Add a new section to a website.
     */
    public function store(Request $request, Website $website): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'string', 'in:hero,about,services,products,pricing,gallery,testimonials,contact,faq,footer'],
            'title' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string'],
            'content' => ['nullable', 'array'],
            'order' => ['nullable', 'integer'],
        ]);

        $maxOrder = $website->sections()->max('order') ?? 0;

        $section = Section::create([
            'website_id' => $website->id,
            'type' => $validated['type'],
            'title' => $validated['title'],
            'subtitle' => $validated['subtitle'] ?? null,
            'content' => $validated['content'] ?? [],
            'order' => $validated['order'] ?? ($maxOrder + 1),
            'is_visible' => true,
        ]);

        return response()->json([
            'success' => true,
            'section' => $section,
        ]);
    }

    /**
     * Update an existing section's content or visibility.
     */
    public function update(Request $request, Section $section): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string'],
            'content' => ['nullable', 'array'],
            'is_visible' => ['nullable', 'boolean'],
            'order' => ['nullable', 'integer'],
        ]);

        $section->update(array_filter($validated, fn($val) => $val !== null));

        return response()->json([
            'success' => true,
            'section' => $section->fresh(),
        ]);
    }

    /**
     * Delete a section.
     */
    public function destroy(Section $section): JsonResponse
    {
        $section->delete();

        return response()->json([
            'success' => true,
            'message' => 'Section deleted successfully.',
        ]);
    }

    /**
     * Reorder sections for a website.
     */
    public function reorder(Request $request, Website $website): JsonResponse
    {
        $validated = $request->validate([
            'orders' => ['required', 'array'],
            'orders.*.id' => ['required', 'exists:sections,id'],
            'orders.*.order' => ['required', 'integer'],
        ]);

        foreach ($validated['orders'] as $item) {
            Section::where('id', $item['id'])
                ->where('website_id', $website->id)
                ->update(['order' => $item['order']]);
        }

        return response()->json([
            'success' => true,
            'sections' => $website->sections()->get(),
        ]);
    }

    /**
     * Regenerate / refine a single section using Gemini AI or deterministic rule.
     */
    public function regenerate(Request $request, Section $section): JsonResponse
    {
        $validated = $request->validate([
            'instructions' => ['required', 'string', 'max:2000'],
            'api_key' => ['nullable', 'string'],
        ]);

        $website = $section->website;

        // Snapshot revision before regeneration
        SiteRevision::create([
            'website_id' => $website->id,
            'snapshot' => [
                'section_id' => $section->id,
                'type' => $section->type,
                'title' => $section->title,
                'subtitle' => $section->subtitle,
                'content' => $section->content,
            ],
            'note' => "Before regenerating {$section->type} section",
        ]);

        $userKey = $validated['api_key'] ?? null;
        $instructions = $this->sanitizer->stripMaliciousTags($validated['instructions']);

        $siteContext = [
            'business_name' => $website->business_name,
            'city' => $website->city,
            'tagline' => $website->tagline,
            'theme' => $website->theme_settings,
        ];

        $mode = 'deterministic_refine';
        $updatedData = null;

        if ($this->gemini->isAvailable($userKey)) {
            try {
                $updatedData = $this->gemini->regenerateSection(
                    $section->type,
                    $section->toArray(),
                    $instructions,
                    $siteContext,
                    $userKey
                );
                $mode = 'gemini';
            } catch (Throwable $e) {
                $updatedData = $this->fallbackSectionRefine($section, $instructions);
            }
        } else {
            $updatedData = $this->fallbackSectionRefine($section, $instructions);
        }

        if (!empty($updatedData['title'])) {
            $section->title = $updatedData['title'];
        }
        if (isset($updatedData['subtitle'])) {
            $section->subtitle = $updatedData['subtitle'];
        }
        if (!empty($updatedData['content'])) {
            $section->content = array_merge($section->content ?? [], $updatedData['content']);
        }

        $section->save();

        return response()->json([
            'success' => true,
            'mode' => $mode,
            'section' => $section->fresh(),
        ]);
    }

    /**
     * Fallback section refinement heuristics when offline.
     */
    protected function fallbackSectionRefine(Section $section, string $instructions): array
    {
        $lower = strtolower($instructions);
        $content = $section->content ?? [];

        // Modify headline or subtitle if requested
        if (str_contains($lower, 'short') || str_contains($lower, 'concise')) {
            $title = $section->title;
            $subtitle = substr($section->subtitle ?? '', 0, 80);
            if (!empty($content['subheadline'])) {
                $content['subheadline'] = substr($content['subheadline'], 0, 80);
            }
        } elseif (str_contains($lower, 'friendly') || str_contains($lower, 'welcoming')) {
            $title = "Friendly & Reliable " . $section->title;
            $subtitle = "We warmly welcome you and look forward to serving you with dedicated care.";
        } else {
            $title = $section->title . " (Refined)";
            $subtitle = $section->subtitle ? $section->subtitle . " — tailored to your specifications." : "Tailored to your specifications.";
        }

        return [
            'title' => $title,
            'subtitle' => $subtitle,
            'content' => $content,
        ];
    }
}
