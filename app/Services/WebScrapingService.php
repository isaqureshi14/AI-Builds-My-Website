<?php

namespace App\Services;

use DOMDocument;
use DOMXPath;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class WebScrapingService
{
    public function __construct(
        protected SsrfProtectionService $ssrfService,
        protected PromptSanitizationService $sanitizationService
    ) {}

    /**
     * Scrape a URL with SSRF protection, metadata parsing, and login-wall detection.
     */
    public function scrape(string $url): array
    {
        // 1. SSRF Validation
        try {
            $safeUrl = $this->ssrfService->validateUrl($url);
        } catch (Throwable $e) {
            return [
                'success' => false,
                'status' => 'ssrf_blocked',
                'error' => $e->getMessage(),
                'url' => $url,
            ];
        }

        // 2. Pre-check for known social login domains
        $host = strtolower(parse_url($safeUrl, PHP_URL_HOST) ?? '');
        if ($this->isKnownSocialHost($host)) {
            return $this->handleKnownSocialWall($safeUrl, $host);
        }

        // 3. Perform HTTP request with strict timeouts and redirect handling
        try {
            $response = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AI-Website-Builder/1.0',
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language' => 'en-US,en;q=0.9',
            ])->timeout(12)
              ->connectTimeout(5)
              ->get($safeUrl);

            // Re-validate final URL after potential redirects
            $finalUrl = (string) $response->effectiveUri();
            if ($finalUrl && $finalUrl !== $safeUrl) {
                if (!$this->ssrfService->isSafe($finalUrl)) {
                    return [
                        'success' => false,
                        'status' => 'ssrf_blocked',
                        'error' => 'Redirected to an unsafe or private destination.',
                        'url' => $finalUrl,
                    ];
                }
            }

            if (!$response->successful()) {
                return [
                    'success' => false,
                    'status' => 'http_error',
                    'error' => "HTTP request failed with status {$response->status()}",
                    'status_code' => $response->status(),
                    'url' => $safeUrl,
                ];
            }

            $html = $response->body();

            // 4. Check for in-page social login wall
            $wallDetection = $this->detectInPageLoginWall($safeUrl, $html);
            if ($wallDetection !== null) {
                return $wallDetection;
            }

            // 5. Parse HTML content, meta tags, and structured data
            $parsed = $this->parseHtml($html, $safeUrl);

            return [
                'success' => true,
                'status' => 'scraped',
                'url' => $safeUrl,
                'title' => $parsed['title'],
                'meta_description' => $parsed['meta_description'],
                'open_graph' => $parsed['open_graph'],
                'json_ld' => $parsed['json_ld'],
                'text_content' => $parsed['text_content'],
                'extracted_contacts' => $parsed['extracted_contacts'],
                'sanitization' => $this->sanitizationService->inspect($parsed['text_content']),
            ];

        } catch (Throwable $e) {
            Log::warning("WebScrapingService failed for {$url}: {$e->getMessage()}");
            return [
                'success' => false,
                'status' => 'connection_error',
                'error' => 'Could not connect to URL: ' . $e->getMessage(),
                'url' => $url,
            ];
        }
    }

    protected function isKnownSocialHost(string $host): bool
    {
        $socialHosts = ['instagram.com', 'www.instagram.com', 'facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.com', 'tiktok.com', 'www.tiktok.com'];
        foreach ($socialHosts as $sh) {
            if ($host === $sh || str_ends_with($host, '.' . $sh)) {
                return true;
            }
        }
        return false;
    }

    protected function handleKnownSocialWall(string $url, string $host): array
    {
        $platform = 'Social Media';
        if (str_contains($host, 'instagram')) $platform = 'Instagram';
        if (str_contains($host, 'facebook') || str_contains($host, 'fb.com')) $platform = 'Facebook';
        if (str_contains($host, 'tiktok')) $platform = 'TikTok';

        return [
            'success' => false,
            'status' => 'login_wall',
            'platform' => $platform,
            'url' => $url,
            'message' => "{$platform} requires authentication and blocks automated scraping. Please copy and paste business info, bio, or upload files directly.",
        ];
    }

    protected function detectInPageLoginWall(string $url, string $html): ?array
    {
        $lower = strtolower($html);
        if (str_contains($lower, 'login • instagram') || str_contains($lower, 'accounts/login/?next=')) {
            return [
                'success' => false,
                'status' => 'login_wall',
                'platform' => 'Instagram',
                'url' => $url,
                'message' => 'Instagram login wall detected. Please provide details manually or upload a screenshot/menu.',
            ];
        }

        if (str_contains($lower, 'log into facebook') || str_contains($lower, 'facebook.com/login')) {
            return [
                'success' => false,
                'status' => 'login_wall',
                'platform' => 'Facebook',
                'url' => $url,
                'message' => 'Facebook login wall detected. Please provide details manually or upload a document.',
            ];
        }

        return null;
    }

    /**
     * Parse HTML for titles, meta tags, json-ld schemas, contacts, and visible text.
     */
    protected function parseHtml(string $html, string $url): array
    {
        $doc = new DOMDocument();
        // Suppress warnings from imperfect HTML
        @$doc->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_NONET);

        $xpath = new DOMXPath($doc);

        // Title
        $title = '';
        $titleNodes = $xpath->query('//title');
        if ($titleNodes && $titleNodes->length > 0) {
            $title = trim($titleNodes->item(0)->textContent);
        }

        // Meta tags & OG tags
        $metaDescription = '';
        $openGraph = [];
        $metaNodes = $xpath->query('//meta');
        if ($metaNodes) {
            foreach ($metaNodes as $meta) {
                $name = strtolower($meta->getAttribute('name'));
                $prop = strtolower($meta->getAttribute('property'));
                $content = $meta->getAttribute('content');

                if ($name === 'description') {
                    $metaDescription = $content;
                }
                if (str_starts_with($prop, 'og:')) {
                    $openGraph[substr($prop, 3)] = $content;
                }
                if (str_starts_with($name, 'twitter:')) {
                    $openGraph['twitter_' . substr($name, 8)] = $content;
                }
            }
        }

        // JSON-LD structured data
        $jsonLd = [];
        $scriptNodes = $xpath->query('//script[@type="application/ld+json"]');
        if ($scriptNodes) {
            foreach ($scriptNodes as $script) {
                $rawJson = trim($script->textContent);
                $decoded = json_decode($rawJson, true);
                if ($decoded) {
                    $jsonLd[] = $decoded;
                }
            }
        }

        // Clean text content: remove script, style, noscript, svg, nav, footer duplicates
        $removeTags = ['script', 'style', 'noscript', 'svg', 'iframe'];
        foreach ($removeTags as $tag) {
            $elements = $doc->getElementsByTagName($tag);
            while ($elements->length > 0) {
                $element = $elements->item(0);
                $element->parentNode->removeChild($element);
            }
        }

        $bodyText = '';
        $bodyNodes = $doc->getElementsByTagName('body');
        if ($bodyNodes->length > 0) {
            $bodyText = $bodyNodes->item(0)->textContent;
        } else {
            $bodyText = $doc->textContent;
        }

        // Normalize whitespace
        $bodyText = preg_replace('/\s+/', ' ', $bodyText);
        $bodyText = trim($bodyText);
        // Truncate to reasonable size (e.g. 15000 chars) for prompt context
        if (mb_strlen($bodyText) > 15000) {
            $bodyText = mb_substr($bodyText, 0, 15000) . '... [truncated]';
        }

        // Extract contacts with regex heuristics
        $contacts = $this->extractContactHeuristics($bodyText);

        return [
            'title' => $title,
            'meta_description' => $metaDescription,
            'open_graph' => $openGraph,
            'json_ld' => $jsonLd,
            'text_content' => $bodyText,
            'extracted_contacts' => $contacts,
        ];
    }

    protected function extractContactHeuristics(string $text): array
    {
        $phones = [];
        $emails = [];

        // Phone regex (e.g. (123) 456-7890, +1-800-555-0199, 123-456-7890)
        if (preg_match_all('/(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\b/', $text, $pMatches)) {
            foreach ($pMatches[0] as $match) {
                $clean = trim($match);
                if (strlen(preg_replace('/\D/', '', $clean)) >= 10) {
                    $phones[] = $clean;
                }
            }
        }

        // Email regex
        if (preg_match_all('/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/', $text, $eMatches)) {
            foreach ($eMatches[0] as $match) {
                $clean = strtolower(trim($match));
                if (!str_ends_with($clean, '.png') && !str_ends_with($clean, '.jpg')) {
                    $emails[] = $clean;
                }
            }
        }

        return [
            'phones' => array_values(array_unique(array_slice($phones, 0, 5))),
            'emails' => array_values(array_unique(array_slice($emails, 0, 5))),
        ];
    }
}
