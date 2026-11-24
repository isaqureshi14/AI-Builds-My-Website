<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SiteRevision extends Model
{
    use HasFactory;

    protected $fillable = [
        'website_id',
        'snapshot',
        'note',
    ];

    protected $casts = [
        'snapshot' => 'array',
    ];

    public function website(): BelongsTo
    {
        return $this->belongsTo(Website::class);
    }
}
