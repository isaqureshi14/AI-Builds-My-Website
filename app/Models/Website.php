<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Website extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'slug',
        'business_name',
        'city',
        'tagline',
        'status',
        'theme_settings',
        'published_at',
    ];

    protected $casts = [
        'theme_settings' => 'array',
        'published_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sections(): HasMany
    {
        return $this->hasMany(Section::class)->orderBy('order', 'asc');
    }

    public function facts(): HasMany
    {
        return $this->hasMany(Fact::class);
    }

    public function uploadedSources(): HasMany
    {
        return $this->hasMany(UploadedSource::class);
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(SiteRevision::class)->latest();
    }
}
