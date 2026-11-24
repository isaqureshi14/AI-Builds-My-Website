<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class GeminiAiService
{
    protected string $defaultModel = 'gemini-1.5-flash';

    public function __construct(
        protected PromptSanitizationService $sanitizer
    ) {}

    /**
     * Resolve the effective API key (UI override first, then env).
     */
    public function resolveApiKey(?string $userKey = null): ?string
    {
        $key = trim($userKey ?? '');
        if (!empty($key)) {
            return $key;
        }

        $envKey = config('services.gemini.key') ?? env('GEMINI_API_KEY');
        if (!empty($envKey)) {
            return trim($envKey);
        }

        return null;
    }

    /**
     * Check if a valid API key is present.
     */
    public function isAvailable(?string $userKey = null): bool
    {
        return !empty($this->resolveApiKey($userKey));
    }

    /**
     * Call Gemini API with JSON structured response schema.
     */
    public function generateStructuredJson(string $systemPrompt, string $userPrompt, ?string $userKey = null, ?string $model = null): array
    {
        $apiKey = $this->resolveApiKey($userKey);
        if (empty($apiKey)) {
            throw new Exception('Gemini API key is not configured. Falling back to deterministic engine.');
        }

        $modelName = $model ?: env('GEMINI_MODEL', $this->defaultModel);
        $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$modelName}:generateContent";

        $payload = [
            'contents' => [
                [
                    'role' => 'user',
                    'parts' => [
                        ['text' => $userPrompt]
                    ]
                ]
            ],
            'systemInstruction' => [
                'parts' => [
                    ['text' => $systemPrompt]
                ]
            ],
            'generationConfig' => [
                'responseMimeType' => 'application/json',
                'temperature' => 0.4,
            ]
        ];

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'x-goog-api-key' => $apiKey,
            ])->timeout(30)->post($endpoint, $payload);

            if (!$response->successful()) {
                $status = $response->status();
                $errBody = $response->json();
                $errMsg = $errBody['error']['message'] ?? $response->body();
                Log::warning("Gemini API call failed [{$status}]: {$errMsg}");
                throw new Exception("Gemini API error [{$status}]: {$errMsg}");
            }

            $data = $response->json();
            $rawText = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
            $decoded = json_decode($rawText, true);

            if (!is_array($decoded)) {
                // If wrapped in ```json ... ```, strip it
                $clean = preg_replace('/^```(?:json)?\s*/i', '', trim($rawText));
                $clean = preg_replace('/\s*```$/i', '', $clean);
                $decoded = json_decode($clean, true);
            }

            if (!is_array($decoded)) {
                throw new Exception('Gemini response could not be parsed as valid JSON.');
            }

            return $decoded;

        } catch (Throwable $e) {
            Log::error("GeminiAiService exception: {$e->getMessage()}");
            throw $e;
        }
    }

    /**
     * Extract structured business facts from ingested text/sources using Gemini.
     */
    public function extractFacts(string $sourceContext, ?string $userKey = null): array
    {
        $systemPrompt = <<<PROMPT
You are an expert business information extractor for a website builder.
Analyze the provided user input, uploaded files, and scraped text.
Extract verified business facts into a structured JSON array of objects.
Each object must have:
- "field_name": string (e.g. "business_name", "tagline", "city", "address", "phone", "email", "hours", "services", "products", "pricing", "testimonials", "faqs", "about")
- "field_value": string or json string
- "confidence": number (between 0.0 and 1.0)
- "source_summary": short note on where it was found

Ensure you output ONLY valid JSON matching:
{
  "business_name": "...",
  "city": "...",
  "tagline": "...",
  "facts": [
    { "field_name": "...", "field_value": "...", "confidence": 0.95 }
  ]
}
PROMPT;

        $framedContext = $this->sanitizer->frameUntrustedContent('business_data_sources', $sourceContext);

        return $this->generateStructuredJson($systemPrompt, $framedContext, $userKey);
    }

    /**
     * Generate complete website sections from confirmed facts.
     */
    public function generateWebsiteSections(array $facts, array $themePreferences = [], ?string $userKey = null): array
    {
        $systemPrompt = <<<PROMPT
You are a world-class landing page copywriter and web designer.
Generate a high-converting, modern, cohesive website structure for this business.
Return a JSON object with:
- "title": "Main Site Browser Title",
- "tagline": "Punchy memorable tagline",
- "theme": {
    "palette": "modern-slate" | "ocean-blue" | "emerald-nature" | "warm-amber" | "rose-elegance" | "dark-luxury",
    "font_heading": "Inter" | "Playfair Display" | "Plus Jakarta Sans" | "Outfit",
    "font_body": "Inter" | "Open Sans" | "Roboto",
    "style": "clean" | "minimal" | "bold" | "playful"
  },
- "sections": [
    {
      "type": "hero" | "about" | "services" | "products" | "pricing" | "gallery" | "testimonials" | "contact" | "faq" | "footer",
      "title": "Section Title",
      "subtitle": "Section Subtitle or lead text",
      "order": 1,
      "is_visible": true,
      "content": { ... structured data specific to section type ... }
    }
  ]

Section content rules:
- hero: { "headline": "...", "subheadline": "...", "cta_primary_text": "...", "cta_primary_link": "#contact", "cta_secondary_text": "...", "cta_secondary_link": "#services", "badge": "..." }
- about: { "story": "...", "mission": "...", "highlights": ["...", "..."], "stats": [{"label": "Years Experience", "value": "10+"}] }
- services: { "items": [{"title": "...", "description": "...", "icon": "star"|"shield"|"zap"|"heart"|"check"}] }
- products: { "items": [{"name": "...", "description": "...", "price": "...", "category": "..."}] }
- pricing: { "tiers": [{"name": "Standard", "price": "$99", "features": ["..."], "is_popular": true, "cta_text": "Get Started"}] }
- gallery: { "images": [{"caption": "...", "category": "..."}] }
- testimonials: { "items": [{"quote": "...", "author": "...", "role": "Local Customer", "rating": 5}] }
- faq: { "items": [{"question": "...", "answer": "..."}] }
- contact: { "phone": "...", "email": "...", "address": "...", "hours": "...", "show_form": true }
- footer: { "copyright": "...", "social_links": [{"platform": "Instagram", "url": "#"}], "quick_links": [{"label": "Services", "url": "#services"}] }
PROMPT;

        $userPrompt = "Business facts and context:\n" . json_encode($facts, JSON_PRETTY_PRINT);
        if (!empty($themePreferences)) {
            $userPrompt .= "\nTheme preferences:\n" . json_encode($themePreferences);
        }

        return $this->generateStructuredJson($systemPrompt, $userPrompt, $userKey);
    }

    /**
     * Regenerate or refine a single section based on user feedback.
     */
    public function regenerateSection(string $type, array $currentSection, string $instructions, array $siteContext, ?string $userKey = null): array
    {
        $systemPrompt = <<<PROMPT
You are editing and regenerating a specific section of a business website.
Section type: {$type}
Return ONLY a valid JSON object matching the section structure:
{
  "type": "{$type}",
  "title": "Updated Section Title",
  "subtitle": "Updated Subtitle",
  "content": { ... }
}
Apply the user's specific instructions faithfully while preserving business accuracy.
PROMPT;

        $userPrompt = "Site Context:\n" . json_encode($siteContext) . "\n\nCurrent Section Data:\n" . json_encode($currentSection) . "\n\nUser Instructions:\n" . $this->sanitizer->stripMaliciousTags($instructions);

        return $this->generateStructuredJson($systemPrompt, $userPrompt, $userKey);
    }
}
