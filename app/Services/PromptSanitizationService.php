<?php

namespace App\Services;

class PromptSanitizationService
{
    /**
     * Patterns that indicate potential prompt injection or jailbreak attempts.
     */
    protected array $injectionPatterns = [
        '/\b(ignore\s+(all\s+)?(previous|prior|above)\s+instructions?)\b/i',
        '/\b(disregard\s+(all\s+)?(previous|prior|above)\s+instructions?)\b/i',
        '/\b(system\s+prompt\s*(reveal|leak|print|show)?)\b/i',
        '/\b(you\s+are\s+now\s+(an?\s+)?(unrestricted|evil|dan|developer\s+mode|jailbroken))\b/i',
        '/\b(bypass\s+(safety|content|filter|policy))\b/i',
        '/\b(do\s+anything\s+now|DAN\s+mode)\b/i',
        '/\b(act\s+as\s+an?\s+unfiltered|uncensored\s+AI)\b/i',
        '/\b(output\s+the\s+entire\s+prompt)\b/i',
        '/\b(new\s+rule:\s*you\s+must)\b/i',
    ];

    /**
     * Strip dangerous HTML/script tags and unescape/escape safely.
     */
    public function stripMaliciousTags(string $text): string
    {
        // Strip script, iframe, object, embed, style, svg, link, form, input tags and dangerous attributes
        $text = preg_replace('/<\s*(script|iframe|object|embed|style|svg|link|form|input|meta|applet)\b[^>]*>.*?<\s*\/\s*\1\s*>/is', '', $text);
        $text = preg_replace('/<\s*(script|iframe|object|embed|style|svg|link|form|input|meta|applet)\b[^>]*\/?>/is', '', $text);
        $text = preg_replace('/(?:\bon\w+\s*=\s*["\'][^"\']*["\'])|(?:\bon\w+\s*=\s*[^>\s]+)/i', '', $text);
        $text = preg_replace('/javascript\s*:\s*/i', '', $text);

        return trim($text);
    }

    /**
     * Inspect text for injection heuristics.
     * Returns ['is_suspicious' => bool, 'flags' => string[], 'sanitized' => string].
     */
    public function inspect(string $text): array
    {
        $flags = [];
        $cleaned = $this->stripMaliciousTags($text);

        foreach ($this->injectionPatterns as $pattern) {
            if (preg_match($pattern, $cleaned, $matches)) {
                $flags[] = "Detected injection pattern: {$matches[0]}";
            }
        }

        // Check for pseudo XML delimiter escaping attempts (like </user_data>, </source_document>)
        if (preg_match('/<\/?(system|user_data|source_document|context|prompt|instruction)>/i', $cleaned)) {
            $flags[] = "Detected reserved delimiter markup in content";
        }

        return [
            'is_suspicious' => !empty($flags),
            'flags' => $flags,
            'sanitized' => $cleaned,
        ];
    }

    /**
     * Frame untrusted text inside strict XML delimiters, escaping internal XML brackets
     * so that the LLM cannot be fooled by internal closing tags.
     */
    public function frameUntrustedContent(string $tagName, string $content, array $attributes = []): string
    {
        $sanitized = $this->stripMaliciousTags($content);

        // Escape delimiter angle brackets to prevent delimiter breakout
        $escaped = htmlspecialchars($sanitized, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        $attrString = '';
        foreach ($attributes as $key => $val) {
            $safeKey = preg_replace('/[^a-zA-Z0-9_\-]/', '', $key);
            $safeVal = htmlspecialchars((string) $val, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            $attrString .= " {$safeKey}=\"{$safeVal}\"";
        }

        return "<{$tagName}{$attrString}>\n{$escaped}\n</{$tagName}>";
    }
}
