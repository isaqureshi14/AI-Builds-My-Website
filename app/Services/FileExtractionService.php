<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Smalot\PdfParser\Parser;
use Throwable;

class FileExtractionService
{
    public function __construct(
        protected PromptSanitizationService $sanitizationService
    ) {}

    /**
     * Extract text and metadata from an uploaded file or file on disk.
     */
    public function extract(string $filePath, ?string $originalName = null, ?string $mimeType = null): array
    {
        if (!file_exists($filePath)) {
            return [
                'success' => false,
                'error' => 'File does not exist: ' . $filePath,
                'extracted_text' => '',
                'sanitization_status' => 'clean',
                'flags' => [],
            ];
        }

        $extension = strtolower(pathinfo($originalName ?? $filePath, PATHINFO_EXTENSION));
        $fileSize = filesize($filePath);
        $text = '';
        $meta = [];

        try {
            switch ($extension) {
                case 'pdf':
                    $text = $this->extractPdf($filePath);
                    break;

                case 'csv':
                case 'tsv':
                    $extracted = $this->extractCsv($filePath, $extension === 'tsv' ? "\t" : ",");
                    $text = $extracted['text'];
                    $meta['items_count'] = $extracted['count'];
                    break;

                case 'txt':
                case 'md':
                case 'json':
                case 'log':
                    $text = (string) file_get_contents($filePath);
                    break;

                case 'png':
                case 'jpg':
                case 'jpeg':
                case 'webp':
                    $extractedImg = $this->extractImageInfo($filePath);
                    $text = $extractedImg['description'];
                    $meta = $extractedImg['meta'];
                    break;

                default:
                    // Attempt plain text read if printable
                    $raw = (string) @file_get_contents($filePath);
                    if (ctype_print(substr($raw, 0, 500))) {
                        $text = $raw;
                    } else {
                        $text = "Binary file uploaded: " . ($originalName ?? basename($filePath));
                    }
                    break;
            }
        } catch (Throwable $e) {
            Log::warning("File extraction failed for {$filePath}: {$e->getMessage()}");
            $text = "Error extracting text: " . $e->getMessage();
        }

        // Inspect for prompt injection / dangerous payloads
        $inspection = $this->sanitizationService->inspect($text);

        return [
            'success' => true,
            'original_name' => $originalName ?? basename($filePath),
            'mime_type' => $mimeType ?? mime_content_type($filePath) ?: 'application/octet-stream',
            'file_size' => $fileSize,
            'extracted_text' => $inspection['sanitized'],
            'sanitization_status' => $inspection['is_suspicious'] ? 'flagged' : 'clean',
            'flags' => $inspection['flags'],
            'meta' => $meta,
        ];
    }

    /**
     * Extract text from PDF file.
     */
    protected function extractPdf(string $filePath): string
    {
        try {
            $parser = new Parser();
            $pdf = $parser->parseFile($filePath);
            $text = $pdf->getText();
            return trim($text);
        } catch (Throwable $e) {
            // Fallback: extract printable strings from raw pdf
            $raw = (string) @file_get_contents($filePath);
            preg_match_all('/(?<=\()([a-zA-Z0-9\s.,!?:;@\'"-]{3,})(?=\))/', $raw, $matches);
            if (!empty($matches[1])) {
                return implode(' ', $matches[1]);
            }
            throw $e;
        }
    }

    /**
     * Extract CSV / price list and format into human-and-AI-friendly structured rows.
     */
    protected function extractCsv(string $filePath, string $delimiter = ","): array
    {
        $handle = fopen($filePath, 'r');
        if (!$handle) {
            return ['text' => '', 'count' => 0];
        }

        $lines = [];
        $header = null;
        $rowCount = 0;

        while (($row = fgetcsv($handle, 4096, $delimiter)) !== false) {
            // Filter empty items
            $cleanRow = array_map('trim', $row);
            if (empty(array_filter($cleanRow))) {
                continue;
            }

            if ($header === null) {
                $header = $cleanRow;
                $lines[] = 'Columns: ' . implode(' | ', $header);
            } else {
                $rowCount++;
                $itemDetails = [];
                foreach ($cleanRow as $idx => $val) {
                    $colName = $header[$idx] ?? "Col #{$idx}";
                    if ($val !== '') {
                        $itemDetails[] = "{$colName}: {$val}";
                    }
                }
                $lines[] = "- " . implode(', ', $itemDetails);
            }
        }
        fclose($handle);

        return [
            'text' => implode("\n", $lines),
            'count' => $rowCount,
        ];
    }

    /**
     * Extract image metadata and prepare image description for vision or offline ingestion.
     */
    protected function extractImageInfo(string $filePath): array
    {
        $info = @getimagesize($filePath);
        $width = $info[0] ?? 0;
        $height = $info[1] ?? 0;
        $mime = $info['mime'] ?? 'image/jpeg';

        $description = "Image file: " . basename($filePath) . " ({$width}x{$height}, {$mime}).";

        return [
            'description' => $description,
            'meta' => [
                'width' => $width,
                'height' => $height,
                'mime' => $mime,
            ],
        ];
    }
}
