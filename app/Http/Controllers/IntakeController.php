<?php

namespace App\Http\Controllers;

use App\Models\Fact;
use App\Models\UploadedSource;
use App\Models\Website;
use App\Services\ConflictDetectionService;
use App\Services\FileExtractionService;
use App\Services\GeminiAiService;
use App\Services\PromptSanitizationService;
use App\Services\WebScrapingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class IntakeController extends Controller
{
    public function __construct(
        protected WebScrapingService $scraper,
        protected FileExtractionService $extractor,
        protected ConflictDetectionService $conflictDetector,
        protected PromptSanitizationService $sanitizer,
        protected GeminiAiService $gemini
    ) {}

    /**
     * Scrape a business URL for facts with SSRF protection.
     */
    public function scrapeUrl(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'url' => ['required', 'string', 'url', 'max:1000'],
            'website_id' => ['nullable', 'exists:websites,id'],
        ]);

        $result = $this->scraper->scrape($validated['url']);

        if (!$result['success']) {
            return response()->json($result, 422);
        }

        // If website_id is provided, auto-create facts from scraped info
        $websiteId = $validated['website_id'] ?? null;
        $createdFacts = [];

        if ($websiteId) {
            $website = Website::find($websiteId);
            if ($website) {
                if (!empty($result['title'])) {
                    $createdFacts[] = Fact::create([
                        'website_id' => $website->id,
                        'source_type' => 'url',
                        'source_name' => $validated['url'],
                        'field_name' => 'business_name',
                        'field_value' => $result['title'],
                        'confidence' => 0.85,
                    ]);
                }

                if (!empty($result['meta_description'])) {
                    $createdFacts[] = Fact::create([
                        'website_id' => $website->id,
                        'source_type' => 'url',
                        'source_name' => $validated['url'],
                        'field_name' => 'tagline',
                        'field_value' => $result['meta_description'],
                        'confidence' => 0.80,
                    ]);
                }

                foreach ($result['extracted_contacts']['phones'] ?? [] as $phone) {
                    $createdFacts[] = Fact::create([
                        'website_id' => $website->id,
                        'source_type' => 'url',
                        'source_name' => $validated['url'],
                        'field_name' => 'phone',
                        'field_value' => $phone,
                        'confidence' => 0.90,
                    ]);
                }

                foreach ($result['extracted_contacts']['emails'] ?? [] as $email) {
                    $createdFacts[] = Fact::create([
                        'website_id' => $website->id,
                        'source_type' => 'url',
                        'source_name' => $validated['url'],
                        'field_name' => 'email',
                        'field_value' => $email,
                        'confidence' => 0.90,
                    ]);
                }

                // Check conflicts after storing
                $this->conflictDetector->detectAndFlagConflicts($website);
            }
        }

        return response()->json([
            'success' => true,
            'data' => $result,
            'created_facts' => $createdFacts,
        ]);
    }

    /**
     * Handle document / file upload (PDF, CSV, images, text).
     */
    public function uploadFile(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:20480'], // max 20MB
            'website_id' => ['nullable', 'exists:websites,id'],
        ]);

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $mimeType = $file->getClientMimeType();
        $fileSize = $file->getSize();

        $path = $file->store('sources', 'local');
        $fullPath = Storage::disk('local')->path($path);

        $extraction = $this->extractor->extract($fullPath, $originalName, $mimeType);

        $uploadedSource = UploadedSource::create([
            'website_id' => $request->input('website_id'),
            'original_name' => $originalName,
            'file_path' => $path,
            'mime_type' => $mimeType,
            'file_size' => $fileSize,
            'extracted_text' => $extraction['extracted_text'],
            'sanitization_status' => $extraction['sanitization_status'],
            'flags' => $extraction['flags'],
        ]);

        return response()->json([
            'success' => true,
            'source' => $uploadedSource,
            'extraction' => $extraction,
        ]);
    }

    /**
     * Ingest batch facts or raw unstructured text and parse into structured facts.
     */
    public function ingestFacts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'website_id' => ['nullable', 'exists:websites,id'],
            'raw_text' => ['nullable', 'string'],
            'facts' => ['nullable', 'array'],
            'api_key' => ['nullable', 'string'],
        ]);

        $website = null;
        if (!empty($validated['website_id'])) {
            $website = Website::find($validated['website_id']);
        }

        // If raw text is provided and AI is available, use Gemini to parse facts; otherwise extract key-values heuristically
        $parsedFacts = [];
        if (!empty($validated['raw_text'])) {
            $cleanText = $this->sanitizer->stripMaliciousTags($validated['raw_text']);
            $userKey = $validated['api_key'] ?? null;

            if ($this->gemini->isAvailable($userKey)) {
                try {
                    $aiExtraction = $this->gemini->extractFacts($cleanText, $userKey);
                    $parsedFacts = $aiExtraction['facts'] ?? [];
                } catch (Throwable $e) {
                    // Fallback to heuristic extraction
                    $parsedFacts = $this->extractHeuristicFacts($cleanText);
                }
            } else {
                $parsedFacts = $this->extractHeuristicFacts($cleanText);
            }
        }

        if (!empty($validated['facts'])) {
            $parsedFacts = array_merge($parsedFacts, $validated['facts']);
        }

        $savedFacts = [];
        if ($website) {
            foreach ($parsedFacts as $pf) {
                if (empty($pf['field_name']) || !isset($pf['field_value'])) continue;

                $savedFacts[] = Fact::create([
                    'website_id' => $website->id,
                    'source_type' => $pf['source_type'] ?? 'prompt',
                    'source_name' => $pf['source_name'] ?? 'User Intake',
                    'field_name' => strtolower($pf['field_name']),
                    'field_value' => is_array($pf['field_value']) ? json_encode($pf['field_value']) : (string) $pf['field_value'],
                    'confidence' => $pf['confidence'] ?? 0.9,
                    'is_confirmed' => $pf['is_confirmed'] ?? false,
                ]);
            }

            // Run conflict detector
            $conflictAnalysis = $this->conflictDetector->detectAndFlagConflicts($website);
        } else {
            $conflictAnalysis = $this->conflictDetector->analyzeFacts($parsedFacts);
        }

        return response()->json([
            'success' => true,
            'facts' => $website ? $website->facts()->get() : $parsedFacts,
            'conflicts' => $conflictAnalysis,
        ]);
    }

    /**
     * Fallback heuristic facts extractor from raw text lines.
     */
    protected function extractHeuristicFacts(string $text): array
    {
        $facts = [];
        $lines = explode("\n", $text);

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) continue;

            if (preg_match('/^(name|business|company)[\s:]+(.+)$/i', $line, $m)) {
                $facts[] = ['field_name' => 'business_name', 'field_value' => trim($m[2]), 'confidence' => 0.9];
            } elseif (preg_match('/^(city|location)[\s:]+(.+)$/i', $line, $m)) {
                $facts[] = ['field_name' => 'city', 'field_value' => trim($m[2]), 'confidence' => 0.9];
            } elseif (preg_match('/^(tagline|slogan)[\s:]+(.+)$/i', $line, $m)) {
                $facts[] = ['field_name' => 'tagline', 'field_value' => trim($m[2]), 'confidence' => 0.9];
            } elseif (preg_match('/^(phone|tel)[\s:]+(.+)$/i', $line, $m)) {
                $facts[] = ['field_name' => 'phone', 'field_value' => trim($m[2]), 'confidence' => 0.95];
            } elseif (preg_match('/^(email)[\s:]+(.+)$/i', $line, $m)) {
                $facts[] = ['field_name' => 'email', 'field_value' => trim($m[2]), 'confidence' => 0.95];
            } elseif (preg_match('/^(address)[\s:]+(.+)$/i', $line, $m)) {
                $facts[] = ['field_name' => 'address', 'field_value' => trim($m[2]), 'confidence' => 0.9];
            } elseif (preg_match('/^(hours)[\s:]+(.+)$/i', $line, $m)) {
                $facts[] = ['field_name' => 'hours', 'field_value' => trim($m[2]), 'confidence' => 0.9];
            } elseif (preg_match('/^(services?)[\s:]+(.+)$/i', $line, $m)) {
                $facts[] = ['field_name' => 'services', 'field_value' => trim($m[2]), 'confidence' => 0.85];
            }
        }

        // If no explicit labels found, try general phone & email regex
        if (empty($facts)) {
            if (preg_match('/(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})\b/', $text, $pMatch)) {
                $facts[] = ['field_name' => 'phone', 'field_value' => trim($pMatch[0]), 'confidence' => 0.85];
            }
            if (preg_match('/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/', $text, $eMatch)) {
                $facts[] = ['field_name' => 'email', 'field_value' => trim($eMatch[0]), 'confidence' => 0.85];
            }
            // First line could be business name
            $firstLine = trim($lines[0] ?? '');
            if ($firstLine && strlen($firstLine) < 80) {
                $facts[] = ['field_name' => 'business_name', 'field_value' => $firstLine, 'confidence' => 0.7];
            }
        }

        return $facts;
    }
}
