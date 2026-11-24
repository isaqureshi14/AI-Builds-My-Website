<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UploadedSource extends Model
{
    use HasFactory;

    protected $fillable = [
        'website_id',
        'original_name',
        'file_path',
        'mime_type',
        'file_size',
        'extracted_text',
        'sanitization_status',
        'flags',
    ];

    protected $casts = [
        'flags' => 'array',
        'file_size' => 'integer',
    ];

    public function website(): BelongsTo
    {
        return $this->belongsTo(Website::class);
    }
}
