<?php

namespace App\Http\Controllers;

use App\Models\Fact;
use App\Models\Section;
use App\Models\SiteRevision;
use App\Models\Website;
use App\Services\DeterministicTemplateEngine;
use App\Services\GeminiAiService;
use App\Services\PromptSanitizationService;
use App\Services\WebsiteExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Throwable;

class WebsiteController extends Controller
{
    public function __construct(
        protected GeminiAiService $gemini,
        protected DeterministicTemplateEngine $deterministicEngine,
        protected WebsiteExportService $exportService,
        protected PromptSanitizationService $sanitizer
    ) {}

    /**
     * Main Inertia UI application entry point.
     */
    public function studio(Request $request)
    {
        $websites = Website::where('user_id', Auth::id())
            ->orWhereNull('user_id')
            ->latest()
            ->take(20)
            ->get();

        return Inertia::render('Studio/Index', [
            'websites' => $websites,
            'hasGeminiEnv' => !empty(config('services.gemini.key') ?? env('GEMINI_API_KEY')),
        ]);
    }

    /**
     * Get a website with sections, facts, and revisions.
     */
    public function show(Website $website): JsonResponse
    {
        $website->load(['sections', 'facts', 'revisions' => function ($q) {
            $q->latest()->take(10);
        }]);

        return response()->json([
            'success' => true,
            'website' => $website,
        ]);
    }

    /**
     * Create or initialize a website draft.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'business_name' => ['required', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:150'],
            'tagline' => ['nullable', 'string', 'max:255'],
            'title' => ['nullable', 'string', 'max:255'],
        ]);

        $title = $validated['title'] ?? ($validated['business_name'] . ($validated['city'] ? " - {$validated['city']}" : ""));
        $slug = $this->generateUniqueSlug($validated['business_name']);

        $website = Website::create([
            'user_id' => Auth::id(),
            'business_name' => $validated['business_name'],
            'city' => $validated['city'] ?? null,
            'tagline' => $validated['tagline'] ?? null,
            'title' => $title,
            'slug' => $slug,
            'status' => 'draft',
            'theme_settings' => [
                'palette' => 'ocean-blue',
                'font_heading' => 'Plus Jakarta Sans',
                'font_body' => 'Inter',
                'style' => 'clean',
            ],
        ]);

        // Seed initial business_name and city facts
        Fact::create([
            'website_id' => $website->id,
            'source_type' => 'manual',
            'source_name' => 'Initial Intake',
            'field_name' => 'business_name',
            'field_value' => $validated['business_name'],
            'confidence' => 1.0,
            'is_confirmed' => true,
        ]);

        if (!empty($validated['city'])) {
            Fact::create([
                'website_id' => $website->id,
                'source_type' => 'manual',
                'source_name' => 'Initial Intake',
                'field_name' => 'city',
                'field_value' => $validated['city'],
                'confidence' => 1.0,
                'is_confirmed' => true,
            ]);
        }

        return response()->json([
            'success' => true,
            'website' => $website,
        ]);
    }

    /**
     * Update website metadata or theme settings.
     */
    public function update(Request $request, Website $website): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:websites,slug,' . $website->id],
            'business_name' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:150'],
            'tagline' => ['nullable', 'string', 'max:255'],
            'theme_settings' => ['nullable', 'array'],
        ]);

        $website->update(array_filter($validated, fn($val) => $val !== null));

        return response()->json([
            'success' => true,
            'website' => $website->fresh(),
        ]);
    }

    /**
     * Core generation pipeline: synthesizes facts into sections using Gemini AI or Deterministic Fallback.
     */
    public function generate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'website_id' => ['nullable', 'exists:websites,id'],
            'business_name' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:150'],
            'tagline' => ['nullable', 'string', 'max:255'],
            'theme_settings' => ['nullable', 'array'],
            'api_key' => ['nullable', 'string'],
            'facts' => ['nullable', 'array'],
        ]);

        // Retrieve or instantiate website
        $website = null;
        if (!empty($validated['website_id'])) {
            $website = Website::find($validated['website_id']);
        }

        if (!$website) {
            $bizName = $validated['business_name'] ?? 'Premier Business';
            $city = $validated['city'] ?? null;
            $slug = $this->generateUniqueSlug($bizName);

            $website = Website::create([
                'user_id' => Auth::id(),
                'business_name' => $bizName,
                'city' => $city,
                'tagline' => $validated['tagline'] ?? null,
                'title' => $bizName . ($city ? " - {$city}" : ""),
                'slug' => $slug,
                'status' => 'draft',
                'theme_settings' => $validated['theme_settings'] ?? [
                    'palette' => 'ocean-blue',
                    'font_heading' => 'Plus Jakarta Sans',
                    'font_body' => 'Inter',
                    'style' => 'clean',
                ],
            ]);
        }

        // Collect facts from database
        $dbFacts = $website->facts()->get()->map(fn($f) => [
            'field_name' => $f->field_name,
            'field_value' => $f->field_value,
            'confidence' => $f->confidence,
            'source_type' => $f->source_type,
        ])->toArray();

        // Merge any directly supplied facts
        $allFacts = array_merge($dbFacts, $validated['facts'] ?? []);
        if (empty($allFacts)) {
            $allFacts = [
                ['field_name' => 'business_name', 'field_value' => $website->business_name],
                ['field_name' => 'city', 'field_value' => $website->city ?? ''],
                ['field_name' => 'tagline', 'field_value' => $website->tagline ?? 'Quality & Excellence'],
            ];
        }

        $themePreferences = $validated['theme_settings'] ?? $website->theme_settings ?? [];
        $userKey = $validated['api_key'] ?? null;

        $generatedData = null;
        $generatorMode = 'deterministic';

        // Attempt Gemini AI if key is present
        if ($this->gemini->isAvailable($userKey)) {
            try {
                $generatedData = $this->gemini->generateWebsiteSections($allFacts, $themePreferences, $userKey);
                $generatorMode = 'gemini';
            } catch (Throwable $e) {
                // Fallback seamlessly to deterministic engine
                $generatedData = $this->deterministicEngine->generate($allFacts, $themePreferences);
                $generatorMode = 'deterministic_fallback';
            }
        } else {
            $generatedData = $this->deterministicEngine->generate($allFacts, $themePreferences);
            $generatorMode = 'deterministic';
        }

        // Apply generated title, tagline, and theme to website
        if (!empty($generatedData['title'])) {
            $website->title = $generatedData['title'];
        }
        if (!empty($generatedData['tagline'])) {
            $website->tagline = $generatedData['tagline'];
        }
        if (!empty($generatedData['theme'])) {
            $website->theme_settings = array_merge($website->theme_settings ?? [], $generatedData['theme']);
        }
        $website->save();

        // Take snapshot before replacing sections
        $existingSections = $website->sections()->get()->toArray();
        if (!empty($existingSections)) {
            SiteRevision::create([
                'website_id' => $website->id,
                'snapshot' => [
                    'website' => $website->toArray(),
                    'sections' => $existingSections,
                ],
                'note' => 'Prior revision before regeneration',
            ]);
        }

        // Clear previous sections and insert new ones
        $website->sections()->delete();

        $savedSections = [];
        $order = 1;
        foreach ($generatedData['sections'] ?? [] as $sec) {
            $savedSections[] = Section::create([
                'website_id' => $website->id,
                'type' => $sec['type'] ?? 'about',
                'title' => $sec['title'] ?? null,
                'subtitle' => $sec['subtitle'] ?? null,
                'content' => $sec['content'] ?? [],
                'order' => $sec['order'] ?? $order++,
                'is_visible' => $sec['is_visible'] ?? true,
            ]);
        }

        // Create new revision record for generated version
        SiteRevision::create([
            'website_id' => $website->id,
            'snapshot' => [
                'website' => $website->toArray(),
                'sections' => $savedSections,
            ],
            'note' => "Generated via {$generatorMode}",
        ]);

        return response()->json([
            'success' => true,
            'generator_mode' => $generatorMode,
            'website' => $website->fresh(['sections', 'facts']),
        ]);
    }

    /**
     * Publish website and make it live at /sites/{slug}.
     */
    public function publish(Website $website): JsonResponse
    {
        $website->update([
            'status' => 'published',
            'published_at' => now(),
        ]);

        $publicUrl = url("/sites/{$website->slug}");

        return response()->json([
            'success' => true,
            'status' => 'published',
            'public_url' => $publicUrl,
            'published_at' => $website->published_at,
        ]);
    }

    /**
     * Public page view for /sites/{slug}.
     */
    public function viewPublicSite(string $slug): Response
    {
        $website = Website::where('slug', $slug)->firstOrFail();

        // Render full responsive static HTML
        $html = $this->exportService->renderStaticHtml($website);

        return response($html)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    /**
     * Download website as standalone static ZIP export.
     */
    public function exportZip(Website $website)
    {
        $zipPath = $this->exportService->generateZip($website);
        $fileName = Str::slug($website->business_name ?: 'website') . '-export.zip';

        return response()->download($zipPath, $fileName)->deleteFileAfterSend(true);
    }

    /**
     * Generate unique slug for website.
     */
    protected function generateUniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        if (empty($base)) {
            $base = 'my-site';
        }

        $slug = $base;
        $counter = 1;

        while (Website::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }
}
