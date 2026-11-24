<?php

namespace Tests\Feature;

use App\Models\Fact;
use App\Models\Section;
use App\Models\Website;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WebsiteBuilderApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_ingest_facts_and_detect_conflicts(): void
    {
        $website = Website::create([
            'business_name' => 'Metro Plumbing',
            'slug' => 'metro-plumbing',
            'title' => 'Metro Plumbing',
        ]);

        $response = $this->postJson('/api/intake/facts', [
            'website_id' => $website->id,
            'facts' => [
                ['field_name' => 'phone', 'field_value' => '555-0100', 'source_name' => 'Google Map'],
                ['field_name' => 'phone', 'field_value' => '555-0199', 'source_name' => 'Invoice PDF'],
                ['field_name' => 'city', 'field_value' => 'Atlanta', 'source_name' => 'User Input'],
            ]
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
        $response->assertJsonPath('conflicts.has_conflicts', true);
        $response->assertJsonPath('conflicts.count', 1);

        $this->assertDatabaseHas('facts', [
            'website_id' => $website->id,
            'field_name' => 'phone',
            'has_conflict' => true,
        ]);
    }

    public function test_disambiguation_resolves_conflict(): void
    {
        $website = Website::create([
            'business_name' => 'Metro Plumbing',
            'slug' => 'metro-plumbing',
            'title' => 'Metro Plumbing',
        ]);

        $fact1 = Fact::create([
            'website_id' => $website->id,
            'source_type' => 'manual',
            'field_name' => 'phone',
            'field_value' => '555-0100',
            'has_conflict' => true,
        ]);

        $fact2 = Fact::create([
            'website_id' => $website->id,
            'source_type' => 'manual',
            'field_name' => 'phone',
            'field_value' => '555-0199',
            'has_conflict' => true,
        ]);

        $response = $this->postJson("/api/websites/{$website->id}/conflicts/resolve", [
            'resolutions' => [
                'phone' => '555-0100'
            ]
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
        $response->assertJsonPath('conflicts', []);

        $this->assertDatabaseHas('facts', [
            'website_id' => $website->id,
            'field_name' => 'phone',
            'field_value' => '555-0100',
            'is_confirmed' => true,
            'has_conflict' => false,
        ]);
    }

    public function test_generate_website_creates_sections_and_revision(): void
    {
        $response = $this->postJson('/api/websites/generate', [
            'business_name' => 'Lumina Dental Studio',
            'city' => 'Austin',
            'tagline' => 'Gentle Modern Dentistry',
            'theme_settings' => [
                'palette' => 'ocean-blue',
                'font_heading' => 'Plus Jakarta Sans',
            ],
            'facts' => [
                ['field_name' => 'services', 'field_value' => 'Teeth Whitening, Dental Implants, Invisalign'],
                ['field_name' => 'phone', 'field_value' => '(512) 555-0123'],
                ['field_name' => 'email', 'field_value' => 'hello@luminadental.com'],
            ]
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
        $response->assertJsonStructure([
            'website' => ['id', 'title', 'slug', 'sections']
        ]);

        $websiteId = $response->json('website.id');
        $this->assertDatabaseHas('websites', ['id' => $websiteId, 'business_name' => 'Lumina Dental Studio']);
        $this->assertDatabaseHas('sections', ['website_id' => $websiteId, 'type' => 'hero']);
        $this->assertDatabaseHas('sections', ['website_id' => $websiteId, 'type' => 'services']);
        $this->assertDatabaseHas('site_revisions', ['website_id' => $websiteId]);
    }

    public function test_section_update_and_regeneration(): void
    {
        $website = Website::create([
            'business_name' => 'Aura Spa',
            'slug' => 'aura-spa',
            'title' => 'Aura Spa',
        ]);

        $section = Section::create([
            'website_id' => $website->id,
            'type' => 'hero',
            'title' => 'Original Title',
            'subtitle' => 'Original Subtitle',
            'order' => 1,
            'is_visible' => true,
        ]);

        // Test update
        $updateResp = $this->putJson("/api/sections/{$section->id}", [
            'title' => 'Updated Custom Title',
            'is_visible' => false,
        ]);
        $updateResp->assertStatus(200);
        $this->assertDatabaseHas('sections', [
            'id' => $section->id,
            'title' => 'Updated Custom Title',
            'is_visible' => false,
        ]);

        // Test regenerate
        $regenResp = $this->postJson("/api/sections/{$section->id}/regenerate", [
            'instructions' => 'Make the tone friendly and concise',
        ]);
        $regenResp->assertStatus(200);
        $regenResp->assertJson(['success' => true]);

        // Verify revision was taken before regeneration
        $this->assertDatabaseHas('site_revisions', ['website_id' => $website->id]);
    }

    public function test_publish_and_public_site_view(): void
    {
        $website = Website::create([
            'business_name' => 'Sol Cafe',
            'slug' => 'sol-cafe',
            'title' => 'Sol Cafe - Artisanal Coffee & Pastries',
            'status' => 'draft',
        ]);

        Section::create([
            'website_id' => $website->id,
            'type' => 'hero',
            'title' => 'Welcome to Sol Cafe',
            'subtitle' => 'Handcrafted coffee and freshly baked morning goods.',
            'order' => 1,
            'is_visible' => true,
        ]);

        // Publish
        $pubResp = $this->postJson("/api/websites/{$website->id}/publish");
        $pubResp->assertStatus(200);
        $pubResp->assertJson(['status' => 'published']);

        $this->assertDatabaseHas('websites', [
            'id' => $website->id,
            'status' => 'published',
        ]);

        // View public site
        $viewResp = $this->get("/sites/{$website->slug}");
        $viewResp->assertStatus(200);
        $viewResp->assertSee('Sol Cafe');
        $viewResp->assertSee('Handcrafted coffee');
    }

    public function test_static_zip_export(): void
    {
        $website = Website::create([
            'business_name' => 'Nordic Woodworks',
            'slug' => 'nordic-woodworks',
            'title' => 'Nordic Woodworks',
        ]);

        Section::create([
            'website_id' => $website->id,
            'type' => 'hero',
            'title' => 'Custom Handcrafted Furniture',
            'order' => 1,
            'is_visible' => true,
        ]);

        $exportResp = $this->get("/api/websites/{$website->id}/export");
        $exportResp->assertStatus(200);
        $exportResp->assertHeader('content-type', 'application/zip');
    }
}
