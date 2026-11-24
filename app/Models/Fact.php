<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Fact extends Model
{
    use HasFactory;

    protected $fillable = [
        'website_id',
        'source_type',
        'source_name',
        'field_name',
        'field_value',
        'confidence',
        'is_confirmed',
        'has_conflict',
        'conflict_details',
    ];

    protected $casts = [
        'confidence' => 'float',
        'is_confirmed' => 'boolean',
        'has_conflict' => 'boolean',
        'conflict_details' => 'array',
    ];

    public function website(): BelongsTo
    {
        return $this->belongsTo(Website::class);
    }
}
