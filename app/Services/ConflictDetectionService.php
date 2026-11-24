<?php

namespace App\Services;

use App\Models\Fact;
use App\Models\Website;
use Illuminate\Support\Collection;

class ConflictDetectionService
{
    /**
     * Inspect all facts for a website, flag conflicting records, and return the detected conflicts.
     */
    public function detectAndFlagConflicts(Website $website): array
    {
        $facts = $website->facts()->get();
        return $this->analyzeFacts($facts, true);
    }

    /**
     * Analyze a collection or array of facts for conflicts.
     *
     * @param Collection|array $facts
     * @param bool $persistToDatabase
     * @return array
     */
    public function analyzeFacts($facts, bool $persistToDatabase = false): array
    {
        $grouped = [];

        foreach ($facts as $fact) {
            $field = strtolower($fact instanceof Fact ? $fact->field_name : ($fact['field_name'] ?? ''));
            if (!$field) continue;

            $grouped[$field][] = $fact;
        }

        $conflicts = [];
        $monitoredFields = ['phone', 'email', 'address', 'city', 'business_name', 'postal_code'];

        foreach ($grouped as $field => $items) {
            $isMonitored = in_array($field, $monitoredFields, true);
            if (!$isMonitored && count($items) <= 1) {
                continue;
            }

            // Normalize values for comparison
            $valueMap = [];
            foreach ($items as $item) {
                $rawVal = $item instanceof Fact ? $item->field_value : ($item['field_value'] ?? '');
                $source = $item instanceof Fact ? ($item->source_name ?: $item->source_type) : ($item['source_name'] ?? 'unknown');
                $normVal = $this->normalizeValue($field, $rawVal);

                if (!empty($normVal)) {
                    $valueMap[$normVal][] = [
                        'raw' => $rawVal,
                        'source' => $source,
                        'fact_id' => $item instanceof Fact ? $item->id : null,
                    ];
                }
            }

            // If there is more than 1 distinct normalized value for phone, email, address, etc. -> CONFLICT!
            if (count($valueMap) > 1) {
                $conflictEntry = [
                    'field' => $field,
                    'message' => "Conflicting values found for {$field}.",
                    'variants' => [],
                ];

                foreach ($valueMap as $normVal => $sources) {
                    $conflictEntry['variants'][] = [
                        'value' => $sources[0]['raw'],
                        'sources' => array_column($sources, 'source'),
                        'fact_ids' => array_filter(array_column($sources, 'fact_id')),
                    ];
                }

                $conflicts[] = $conflictEntry;

                // Persist flag to Fact models if requested
                if ($persistToDatabase) {
                    foreach ($items as $item) {
                        if ($item instanceof Fact) {
                            $item->update([
                                'has_conflict' => true,
                                'conflict_details' => $conflictEntry,
                            ]);
                        }
                    }
                }
            } else {
                // No conflict for this field; clear any previous conflict flag if persisting
                if ($persistToDatabase) {
                    foreach ($items as $item) {
                        if ($item instanceof Fact && $item->has_conflict) {
                            $item->update([
                                'has_conflict' => false,
                                'conflict_details' => null,
                            ]);
                        }
                    }
                }
            }
        }

        return [
            'has_conflicts' => !empty($conflicts),
            'count' => count($conflicts),
            'conflicts' => $conflicts,
        ];
    }

    /**
     * Normalize values for comparison.
     */
    protected function normalizeValue(string $field, ?string $value): string
    {
        if ($value === null) {
            return '';
        }

        $val = trim($value);

        if ($field === 'phone') {
            // Strip everything except digits and leading +
            $digits = preg_replace('/[^\d]/', '', $val);
            // Ignore country code prefix difference like 1-800 vs 800 if ends in last 10 digits
            if (strlen($digits) > 10) {
                $digits = substr($digits, -10);
            }
            return $digits;
        }

        if ($field === 'email') {
            return strtolower($val);
        }

        if ($field === 'address') {
            // Normalize street abbreviations and lower case
            $norm = strtolower($val);
            $norm = preg_replace('/[,\.#]/', ' ', $norm);
            $norm = preg_replace('/\bstreet\b/', 'st', $norm);
            $norm = preg_replace('/\bavenue\b/', 'ave', $norm);
            $norm = preg_replace('/\bboulevard\b/', 'blvd', $norm);
            $norm = preg_replace('/\s+/', ' ', $norm);
            return trim($norm);
        }

        if ($field === 'city' || $field === 'business_name') {
            return strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $val));
        }

        return strtolower(trim($val));
    }
}
