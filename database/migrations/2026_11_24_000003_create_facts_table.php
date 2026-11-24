<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('facts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('website_id')->constrained()->cascadeOnDelete();
            $table->string('source_type'); // url, file, prompt, manual
            $table->string('source_name')->nullable(); // filename, url, etc.
            $table->string('field_name'); // phone, email, address, business_name, services, etc.
            $table->text('field_value')->nullable();
            $table->float('confidence')->default(1.0);
            $table->boolean('is_confirmed')->default(false);
            $table->boolean('has_conflict')->default(false);
            $table->json('conflict_details')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('facts');
    }
};
