<?php

namespace App\Services;

use App\Models\Website;
use ZipArchive;

class WebsiteExportService
{
    /**
     * Generate a downloadable ZIP archive containing the full static HTML site.
     *
     * @return string Path to temporary zip file
     */
    public function generateZip(Website $website): string
    {
        $website->load('sections');

        $zipPath = tempnam(sys_get_temp_dir(), 'site_zip_');
        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        $html = $this->renderStaticHtml($website);
        $zip->addFromString('index.html', $html);
        $zip->addFromString('data/site.json', json_encode([
            'id' => $website->id,
            'title' => $website->title,
            'slug' => $website->slug,
            'business_name' => $website->business_name,
            'city' => $website->city,
            'tagline' => $website->tagline,
            'theme_settings' => $website->theme_settings,
            'sections' => $website->sections->toArray(),
        ], JSON_PRETTY_PRINT));

        // Readme
        $readme = "# {$website->business_name} - Static Website Export\n\n"
            . "Exported from AI Builds My Website.\n"
            . "To view locally, open `index.html` in any modern web browser or deploy to Netlify, Vercel, or GitHub Pages.\n";
        $zip->addFromString('README.md', $readme);

        $zip->close();

        return $zipPath;
    }

    /**
     * Render a self-contained static HTML page for the website.
     */
    public function renderStaticHtml(Website $website): string
    {
        $theme = $website->theme_settings ?? [];
        $palette = $theme['palette'] ?? 'ocean-blue';
        $fontHeading = $theme['font_heading'] ?? 'Plus Jakarta Sans';
        $fontBody = $theme['font_body'] ?? 'Inter';

        $colorStyles = $this->getPaletteStyles($palette);

        $sectionsHtml = '';
        foreach ($website->sections as $section) {
            if (!$section->is_visible) continue;
            $sectionsHtml .= $this->renderSectionHtml($section);
        }

        $bizName = htmlspecialchars($website->business_name);
        $title = htmlspecialchars($website->title ?: $bizName);
        $tagline = htmlspecialchars($website->tagline ?: '');

        return <<<HTML
<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{$title}</title>
    <meta name="description" content="{$tagline}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        heading: ['{$fontHeading}', 'sans-serif'],
                        body: ['{$fontBody}', 'sans-serif'],
                    },
                    colors: {
                        brand: {
                            50: '{$colorStyles['50']}',
                            100: '{$colorStyles['100']}',
                            500: '{$colorStyles['500']}',
                            600: '{$colorStyles['600']}',
                            700: '{$colorStyles['700']}',
                            900: '{$colorStyles['900']}',
                        }
                    }
                }
            }
        }
    </script>
    <style>
        body { font-family: '{$fontBody}', sans-serif; }
        h1, h2, h3, h4, h5, h6 { font-family: '{$fontHeading}', sans-serif; }
    </style>
</head>
<body class="bg-gray-50 text-gray-800 antialiased selection:bg-brand-500 selection:text-white">
    <!-- Header / Navbar -->
    <header class="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <a href="#" class="flex items-center space-x-3">
                <span class="w-10 h-10 rounded-xl bg-brand-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-brand-500/20">
                    {$bizName[0]}
                </span>
                <span class="font-bold text-xl text-gray-900 tracking-tight">{$bizName}</span>
            </a>
            <nav class="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-600">
                <a href="#about" class="hover:text-brand-600 transition">About</a>
                <a href="#services" class="hover:text-brand-600 transition">Services</a>
                <a href="#pricing" class="hover:text-brand-600 transition">Pricing</a>
                <a href="#testimonials" class="hover:text-brand-600 transition">Reviews</a>
                <a href="#faq" class="hover:text-brand-600 transition">FAQ</a>
                <a href="#contact" class="px-5 py-2.5 rounded-full bg-brand-600 text-white font-semibold hover:bg-brand-700 transition shadow-sm hover:shadow">
                    Contact Us
                </a>
            </nav>
        </div>
    </header>

    <main>
        {$sectionsHtml}
    </main>
</body>
</html>
HTML;
    }

    protected function renderSectionHtml($section): string
    {
        $type = $section->type;
        $content = $section->content ?? [];
        $title = htmlspecialchars($section->title ?? '');
        $subtitle = htmlspecialchars($section->subtitle ?? '');

        return match ($type) {
            'hero' => $this->renderHero($title, $subtitle, $content),
            'about' => $this->renderAbout($title, $subtitle, $content),
            'services' => $this->renderServices($title, $subtitle, $content),
            'pricing' => $this->renderPricing($title, $subtitle, $content),
            'testimonials' => $this->renderTestimonials($title, $subtitle, $content),
            'faq' => $this->renderFaq($title, $subtitle, $content),
            'contact' => $this->renderContact($title, $subtitle, $content),
            'footer' => $this->renderFooter($content),
            default => "<section id=\"{$type}\" class=\"py-16 px-4 max-w-7xl mx-auto\"><h2 class=\"text-3xl font-bold mb-4\">{$title}</h2><p class=\"text-gray-600\">{$subtitle}</p></section>",
        };
    }

    protected function renderHero(string $title, string $subtitle, array $content): string
    {
        $badge = htmlspecialchars($content['badge'] ?? '★ Premier Local Quality');
        $headline = htmlspecialchars($content['headline'] ?? $title);
        $sub = htmlspecialchars($content['subheadline'] ?? $subtitle);
        $cta1Text = htmlspecialchars($content['cta_primary_text'] ?? 'Get in Touch');
        $cta1Link = htmlspecialchars($content['cta_primary_link'] ?? '#contact');
        $cta2Text = htmlspecialchars($content['cta_secondary_text'] ?? 'Our Services');
        $cta2Link = htmlspecialchars($content['cta_secondary_link'] ?? '#services');

        return <<<HTML
<section id="hero" class="relative py-24 lg:py-32 overflow-hidden bg-gradient-to-b from-brand-50/50 to-white">
    <div class="max-w-5xl mx-auto px-4 text-center">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-100 text-brand-700 text-sm font-semibold mb-8 shadow-sm">
            <span>{$badge}</span>
        </div>
        <h1 class="text-4xl sm:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.15] mb-6">
            {$headline}
        </h1>
        <p class="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto font-normal leading-relaxed mb-10">
            {$sub}
        </p>
        <div class="flex flex-wrap items-center justify-center gap-4">
            <a href="{$cta1Link}" class="px-8 py-4 rounded-xl bg-brand-600 text-white font-semibold text-lg hover:bg-brand-700 transition shadow-lg shadow-brand-500/25">
                {$cta1Text}
            </a>
            <a href="{$cta2Link}" class="px-8 py-4 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold text-lg hover:bg-gray-50 transition shadow-sm">
                {$cta2Text}
            </a>
        </div>
    </div>
</section>
HTML;
    }

    protected function renderAbout(string $title, string $subtitle, array $content): string
    {
        $story = htmlspecialchars($content['story'] ?? '');
        $mission = htmlspecialchars($content['mission'] ?? '');
        $highlights = $content['highlights'] ?? [];
        $stats = $content['stats'] ?? [];

        $highlightsHtml = '';
        foreach ($highlights as $h) {
            $highlightsHtml .= '<li class="flex items-center gap-3 text-gray-700"><span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">✓</span> ' . htmlspecialchars($h) . '</li>';
        }

        $statsHtml = '';
        foreach ($stats as $s) {
            $statsHtml .= '<div class="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm text-center">'
                . '<div class="text-3xl font-extrabold text-brand-600 mb-1">' . htmlspecialchars($s['value'] ?? '') . '</div>'
                . '<div class="text-sm font-medium text-gray-500">' . htmlspecialchars($s['label'] ?? '') . '</div>'
                . '</div>';
        }

        return <<<HTML
<section id="about" class="py-20 bg-gray-50 border-t border-gray-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
                <span class="text-sm font-bold uppercase tracking-wider text-brand-600">Our Story</span>
                <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 mt-2 mb-6">{$title}</h2>
                <p class="text-lg text-gray-600 leading-relaxed mb-6">{$story}</p>
                <p class="text-base text-gray-500 italic mb-8 border-l-4 border-brand-500 pl-4">"{$mission}"</p>
                <ul class="space-y-3">{$highlightsHtml}</ul>
            </div>
            <div class="grid grid-cols-2 gap-4">
                {$statsHtml}
            </div>
        </div>
    </div>
</section>
HTML;
    }

    protected function renderServices(string $title, string $subtitle, array $content): string
    {
        $items = $content['items'] ?? [];
        $cards = '';
        foreach ($items as $item) {
            $iTitle = htmlspecialchars($item['title'] ?? '');
            $iDesc = htmlspecialchars($item['description'] ?? '');
            $cards .= <<<HTML
<div class="p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition">
    <div class="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-6 font-bold text-xl">★</div>
    <h3 class="text-xl font-bold text-gray-900 mb-3">{$iTitle}</h3>
    <p class="text-gray-600 leading-relaxed">{$iDesc}</p>
</div>
HTML;
        }

        return <<<HTML
<section id="services" class="py-20 bg-white border-t border-gray-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-3xl mx-auto mb-16">
            <span class="text-sm font-bold uppercase tracking-wider text-brand-600">What We Do</span>
            <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 mt-2 mb-4">{$title}</h2>
            <p class="text-lg text-gray-600">{$subtitle}</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {$cards}
        </div>
    </div>
</section>
HTML;
    }

    protected function renderPricing(string $title, string $subtitle, array $content): string
    {
        $tiers = $content['tiers'] ?? [];
        $cards = '';
        foreach ($tiers as $t) {
            $name = htmlspecialchars($t['name'] ?? '');
            $price = htmlspecialchars($t['price'] ?? '');
            $period = htmlspecialchars($t['period'] ?? '');
            $desc = htmlspecialchars($t['description'] ?? '');
            $isPop = !empty($t['is_popular']);
            $btnText = htmlspecialchars($t['cta_text'] ?? 'Get Started');

            $feats = '';
            foreach ($t['features'] ?? [] as $f) {
                $feats .= '<li class="flex items-center gap-3 text-sm text-gray-600"><span class="text-brand-600 font-bold">✓</span> ' . htmlspecialchars($f) . '</li>';
            }

            $badge = $isPop ? '<span class="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-600 text-white mb-4">Most Popular</span>' : '';
            $border = $isPop ? 'border-2 border-brand-600 shadow-xl' : 'border border-gray-200';

            $cards .= <<<HTML
<div class="rounded-2xl bg-white p-8 {$border} flex flex-col justify-between">
    <div>
        {$badge}
        <h3 class="text-2xl font-bold text-gray-900">{$name}</h3>
        <p class="text-gray-500 text-sm mt-1 mb-6">{$desc}</p>
        <div class="flex items-baseline gap-2 mb-6">
            <span class="text-4xl font-extrabold text-gray-900">{$price}</span>
            <span class="text-gray-500 text-sm">{$period}</span>
        </div>
        <ul class="space-y-3 mb-8">{$feats}</ul>
    </div>
    <a href="#contact" class="w-full text-center py-3 rounded-xl font-semibold transition {$this->getBtnClass($isPop)}">{$btnText}</a>
</div>
HTML;
        }

        return <<<HTML
<section id="pricing" class="py-20 bg-gray-50 border-t border-gray-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-3xl mx-auto mb-16">
            <span class="text-sm font-bold uppercase tracking-wider text-brand-600">Investment</span>
            <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 mt-2 mb-4">{$title}</h2>
            <p class="text-lg text-gray-600">{$subtitle}</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            {$cards}
        </div>
    </div>
</section>
HTML;
    }

    protected function getBtnClass(bool $isPop): string
    {
        return $isPop
            ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-md shadow-brand-500/20'
            : 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }

    protected function renderTestimonials(string $title, string $subtitle, array $content): string
    {
        $items = $content['items'] ?? [];
        $cards = '';
        foreach ($items as $item) {
            $quote = htmlspecialchars($item['quote'] ?? '');
            $author = htmlspecialchars($item['author'] ?? '');
            $role = htmlspecialchars($item['role'] ?? '');

            $cards .= <<<HTML
<div class="p-8 rounded-2xl bg-white border border-gray-100 shadow-sm">
    <div class="flex text-amber-400 mb-4 text-sm">★★★★★</div>
    <p class="text-gray-700 italic leading-relaxed mb-6">"{$quote}"</p>
    <div class="font-bold text-gray-900">{$author}</div>
    <div class="text-xs text-gray-500">{$role}</div>
</div>
HTML;
        }

        return <<<HTML
<section id="testimonials" class="py-20 bg-white border-t border-gray-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-3xl mx-auto mb-16">
            <span class="text-sm font-bold uppercase tracking-wider text-brand-600">Testimonials</span>
            <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 mt-2 mb-4">{$title}</h2>
            <p class="text-lg text-gray-600">{$subtitle}</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            {$cards}
        </div>
    </div>
</section>
HTML;
    }

    protected function renderFaq(string $title, string $subtitle, array $content): string
    {
        $items = $content['items'] ?? [];
        $cards = '';
        foreach ($items as $item) {
            $q = htmlspecialchars($item['question'] ?? '');
            $a = htmlspecialchars($item['answer'] ?? '');
            $cards .= <<<HTML
<div class="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
    <h3 class="text-lg font-bold text-gray-900 mb-2">{$q}</h3>
    <p class="text-gray-600 leading-relaxed">{$a}</p>
</div>
HTML;
        }

        return <<<HTML
<section id="faq" class="py-20 bg-gray-50 border-t border-gray-100">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
            <span class="text-sm font-bold uppercase tracking-wider text-brand-600">Questions</span>
            <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 mt-2 mb-4">{$title}</h2>
            <p class="text-lg text-gray-600">{$subtitle}</p>
        </div>
        <div class="space-y-4">
            {$cards}
        </div>
    </div>
</section>
HTML;
    }

    protected function renderContact(string $title, string $subtitle, array $content): string
    {
        $phone = htmlspecialchars($content['phone'] ?? '');
        $email = htmlspecialchars($content['email'] ?? '');
        $address = htmlspecialchars($content['address'] ?? '');
        $hours = htmlspecialchars($content['hours'] ?? '');

        return <<<HTML
<section id="contact" class="py-20 bg-white border-t border-gray-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
                <span class="text-sm font-bold uppercase tracking-wider text-brand-600">Get In Touch</span>
                <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 mt-2 mb-4">{$title}</h2>
                <p class="text-lg text-gray-600 mb-8">{$subtitle}</p>

                <div class="space-y-6">
                    <div class="flex items-start gap-4">
                        <div class="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">📞</div>
                        <div>
                            <div class="font-semibold text-gray-900">Phone</div>
                            <div class="text-gray-600">{$phone}</div>
                        </div>
                    </div>
                    <div class="flex items-start gap-4">
                        <div class="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">✉️</div>
                        <div>
                            <div class="font-semibold text-gray-900">Email</div>
                            <div class="text-gray-600">{$email}</div>
                        </div>
                    </div>
                    <div class="flex items-start gap-4">
                        <div class="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">📍</div>
                        <div>
                            <div class="font-semibold text-gray-900">Address</div>
                            <div class="text-gray-600">{$address}</div>
                        </div>
                    </div>
                    <div class="flex items-start gap-4">
                        <div class="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">🕒</div>
                        <div>
                            <div class="font-semibold text-gray-900">Hours</div>
                            <div class="text-gray-600">{$hours}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-gray-50 p-8 rounded-3xl border border-gray-100 shadow-sm">
                <h3 class="text-2xl font-bold text-gray-900 mb-6">Send Us a Message</h3>
                <form onsubmit="event.preventDefault(); alert('Thank you for reaching out! In the live website, this form submits directly to your email or inbox.');" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                        <input type="text" required class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" placeholder="Jane Doe">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input type="email" required class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" placeholder="jane@example.com">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Message</label>
                        <textarea rows="4" required class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" placeholder="How can we help you?"></textarea>
                    </div>
                    <button type="submit" class="w-full py-3.5 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition shadow-md shadow-brand-500/25">
                        Submit Message
                    </button>
                </form>
            </div>
        </div>
    </div>
</section>
HTML;
    }

    protected function renderFooter(array $content): string
    {
        $biz = htmlspecialchars($content['business_name'] ?? '');
        $copy = htmlspecialchars($content['copyright'] ?? "© " . date('Y') . " {$biz}. All rights reserved.");

        return <<<HTML
<footer class="py-12 bg-gray-900 text-gray-400 border-t border-gray-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:flex sm:justify-between sm:items-center">
        <div class="font-bold text-white text-lg mb-4 sm:mb-0">{$biz}</div>
        <div class="text-sm">{$copy}</div>
    </div>
</footer>
HTML;
    }

    protected function getPaletteStyles(string $palette): array
    {
        return match ($palette) {
            'warm-amber' => [
                '50' => '#fffbeb',
                '100' => '#fef3c7',
                '500' => '#f59e0b',
                '600' => '#d97706',
                '700' => '#b45309',
                '900' => '#78350f',
            ],
            'emerald-nature' => [
                '50' => '#ecfdf5',
                '100' => '#d1fae5',
                '500' => '#10b981',
                '600' => '#059669',
                '700' => '#047857',
                '900' => '#064e3b',
            ],
            'rose-elegance' => [
                '50' => '#fff1f2',
                '100' => '#ffe4e6',
                '500' => '#f43f5e',
                '600' => '#e11d48',
                '700' => '#be123c',
                '900' => '#881337',
            ],
            'dark-luxury' => [
                '50' => '#f8fafc',
                '100' => '#f1f5f9',
                '500' => '#334155',
                '600' => '#1e293b',
                '700' => '#0f172a',
                '900' => '#020617',
            ],
            'modern-slate' => [
                '50' => '#f8fafc',
                '100' => '#f1f5f9',
                '500' => '#64748b',
                '600' => '#475569',
                '700' => '#334155',
                '900' => '#0f172a',
            ],
            default => [ // ocean-blue
                '50' => '#eff6ff',
                '100' => '#dbeafe',
                '500' => '#3b82f6',
                '600' => '#2563eb',
                '700' => '#1d4ed8',
                '900' => '#1e3a8a',
            ],
        };
    }
}
