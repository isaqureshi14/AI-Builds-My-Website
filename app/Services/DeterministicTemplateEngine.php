<?php

namespace App\Services;

class DeterministicTemplateEngine
{
    /**
     * Generate a complete, beautifully structured website definition deterministically from facts.
     */
    public function generate(array $facts, array $themePreferences = []): array
    {
        $factMap = [];
        foreach ($facts as $f) {
            $name = strtolower($f['field_name'] ?? '');
            $val = $f['field_value'] ?? '';
            if ($name && $val !== '') {
                $factMap[$name] = $val;
            }
        }

        $bizName = $factMap['business_name'] ?? $factMap['title'] ?? 'Our Business';
        $city = $factMap['city'] ?? $factMap['location'] ?? '';
        $phone = $factMap['phone'] ?? '(555) 234-5678';
        $email = $factMap['email'] ?? 'contact@' . preg_replace('/[^a-z0-9]/', '', strtolower($bizName)) . '.com';
        $address = $factMap['address'] ?? ($city ? "Serving the greater {$city} area" : '100 Main Street');
        $hours = $factMap['hours'] ?? 'Mon - Fri: 8:00 AM - 6:00 PM, Sat: 9:00 AM - 3:00 PM';
        $tagline = $factMap['tagline'] ?? ($city ? "Premier Services & Quality Craftsmanship in {$city}" : "Quality, Integrity, and Excellence You Can Count On");
        $aboutText = $factMap['about'] ?? "At {$bizName}, we take pride in delivering exceptional quality, dedicated customer care, and dependable results" . ($city ? " for residents and businesses across {$city}." : ".");

        // Determine category heuristics (e.g. food/restaurant, salon/beauty, contractor/trades, legal/consulting, health/fitness)
        $category = $this->guessCategory($bizName, $factMap);

        // Curate services and pricing based on category or facts
        $services = $this->resolveServices($factMap, $category, $bizName);
        $pricing = $this->resolvePricing($factMap, $category);
        $faqs = $this->resolveFaqs($bizName, $city, $category);
        $testimonials = $this->resolveTestimonials($bizName, $city);

        $palette = $themePreferences['palette'] ?? $this->pickPaletteForCategory($category);
        $fontHeading = $themePreferences['font_heading'] ?? 'Plus Jakarta Sans';
        $fontBody = $themePreferences['font_body'] ?? 'Inter';

        $sections = [
            // 1. Hero
            [
                'type' => 'hero',
                'title' => 'Welcome to ' . $bizName,
                'subtitle' => $tagline,
                'order' => 1,
                'is_visible' => true,
                'content' => [
                    'headline' => $bizName . ($city ? " — {$city}'s Trusted Choice" : ""),
                    'subheadline' => $tagline,
                    'badge' => $city ? "★ Top Rated in {$city}" : "★ Dedicated to Customer Excellence",
                    'cta_primary_text' => 'Get in Touch',
                    'cta_primary_link' => '#contact',
                    'cta_secondary_text' => 'Explore Services',
                    'cta_secondary_link' => '#services',
                ],
            ],

            // 2. About
            [
                'type' => 'about',
                'title' => 'About ' . $bizName,
                'subtitle' => 'Our Passion, Experience & Commitment',
                'order' => 2,
                'is_visible' => true,
                'content' => [
                    'story' => $aboutText,
                    'mission' => "Our mission is simple: provide honest, high-caliber solutions tailored to each client's unique needs without compromise.",
                    'highlights' => [
                        'Licensed, insured, and verified professionals',
                        'Transparent, honest pricing with zero hidden fees',
                        'Prompt, courteous, and dependable service',
                        'Satisfaction guaranteed on every project',
                    ],
                    'stats' => [
                        ['label' => 'Happy Clients', 'value' => '1,200+'],
                        ['label' => 'Client Satisfaction', 'value' => '99%'],
                        ['label' => 'Years in Business', 'value' => '10+'],
                    ],
                ],
            ],

            // 3. Services
            [
                'type' => 'services',
                'title' => 'Our Core Services',
                'subtitle' => 'Expert solutions crafted with attention to detail and care',
                'order' => 3,
                'is_visible' => true,
                'content' => [
                    'items' => $services,
                ],
            ],

            // 4. Pricing / Packages
            [
                'type' => 'pricing',
                'title' => 'Transparent Pricing & Packages',
                'subtitle' => 'Clear options designed to give you maximum value and peace of mind',
                'order' => 4,
                'is_visible' => true,
                'content' => [
                    'tiers' => $pricing,
                ],
            ],

            // 5. Testimonials
            [
                'type' => 'testimonials',
                'title' => 'What Our Clients Say',
                'subtitle' => 'Real reviews from members of our community',
                'order' => 5,
                'is_visible' => true,
                'content' => [
                    'items' => $testimonials,
                ],
            ],

            // 6. FAQ
            [
                'type' => 'faq',
                'title' => 'Frequently Asked Questions',
                'subtitle' => 'Find quick answers to common questions',
                'order' => 6,
                'is_visible' => true,
                'content' => [
                    'items' => $faqs,
                ],
            ],

            // 7. Contact
            [
                'type' => 'contact',
                'title' => 'Contact Us Today',
                'subtitle' => 'Ready to get started? We look forward to hearing from you.',
                'order' => 7,
                'is_visible' => true,
                'content' => [
                    'phone' => $phone,
                    'email' => $email,
                    'address' => $address,
                    'hours' => $hours,
                    'show_form' => true,
                    'form_title' => 'Send us a message',
                ],
            ],

            // 8. Footer
            [
                'type' => 'footer',
                'title' => 'Footer',
                'subtitle' => null,
                'order' => 8,
                'is_visible' => true,
                'content' => [
                    'business_name' => $bizName,
                    'tagline' => $tagline,
                    'copyright' => '© ' . date('Y') . " {$bizName}. All rights reserved.",
                    'quick_links' => [
                        ['label' => 'About', 'url' => '#about'],
                        ['label' => 'Services', 'url' => '#services'],
                        ['label' => 'Pricing', 'url' => '#pricing'],
                        ['label' => 'FAQ', 'url' => '#faq'],
                        ['label' => 'Contact', 'url' => '#contact'],
                    ],
                ],
            ],
        ];

        return [
            'title' => "{$bizName} | " . ($city ? "Official Site - {$city}" : "Official Website"),
            'tagline' => $tagline,
            'business_name' => $bizName,
            'city' => $city,
            'theme' => [
                'palette' => $palette,
                'font_heading' => $fontHeading,
                'font_body' => $fontBody,
                'style' => 'clean',
            ],
            'sections' => $sections,
        ];
    }

    protected function guessCategory(string $name, array $facts): string
    {
        $haystack = strtolower($name . ' ' . implode(' ', array_values($facts)));

        if (preg_match('/(cafe|coffee|restaurant|bistro|bakery|diner|pizza|grill|burger|cuisine|taco|kitchen)/i', $haystack)) {
            return 'food';
        }
        if (preg_match('/(salon|spa|barber|hair|nails|beauty|skincare|wellness|massage)/i', $haystack)) {
            return 'beauty';
        }
        if (preg_match('/(plumb|roof|electric|clean|paint|contractor|hvac|landscap|remodel|repair)/i', $haystack)) {
            return 'trades';
        }
        if (preg_match('/(fit|gym|yoga|crossfit|trainer|workout|pilates|athletics)/i', $haystack)) {
            return 'fitness';
        }
        if (preg_match('/(law|attorney|legal|account|tax|consult|advisory|finance|invest)/i', $haystack)) {
            return 'professional';
        }
        if (preg_match('/(dental|dentist|clinic|chiro|medical|physio|health|care|therapy)/i', $haystack)) {
            return 'medical';
        }

        return 'general';
    }

    protected function pickPaletteForCategory(string $category): string
    {
        return match ($category) {
            'food' => 'warm-amber',
            'beauty' => 'rose-elegance',
            'trades' => 'dark-luxury',
            'fitness' => 'emerald-nature',
            'professional' => 'modern-slate',
            'medical' => 'ocean-blue',
            default => 'ocean-blue',
        };
    }

    protected function resolveServices(array $facts, string $category, string $bizName): array
    {
        // If facts explicitly list services, parse them
        if (!empty($facts['services'])) {
            $raw = $facts['services'];
            $items = is_array($raw) ? $raw : preg_split('/[,\n;]+/', (string) $raw);
            $parsed = [];
            foreach ($items as $item) {
                $clean = trim($item);
                if ($clean) {
                    $parsed[] = [
                        'title' => $clean,
                        'description' => "Professional {$clean} performed with exceptional care and quality standards.",
                        'icon' => 'check',
                    ];
                }
            }
            if (count($parsed) >= 2) {
                return array_slice($parsed, 0, 6);
            }
        }

        return match ($category) {
            'food' => [
                ['title' => 'Signature Dining Experience', 'description' => 'Fresh seasonal ingredients prepared daily by passionate culinary experts.', 'icon' => 'star'],
                ['title' => 'Private Events & Catering', 'description' => 'Custom curated menus tailored for celebrations, family gatherings, and corporate events.', 'icon' => 'heart'],
                ['title' => 'Fast Pickup & Delivery', 'description' => 'Hot, carefully packaged meals delivered promptly to your home or office.', 'icon' => 'zap'],
            ],
            'beauty' => [
                ['title' => 'Custom Hair & Styling', 'description' => 'Personalized cuts, vibrant coloring, and styling tailored to your aesthetic.', 'icon' => 'star'],
                ['title' => 'Rejuvenating Treatments', 'description' => 'Nourishing botanical therapies designed to restore radiance and health.', 'icon' => 'heart'],
                ['title' => 'Express Pampering Sessions', 'description' => 'Quick luxury touch-ups for busy professionals and special occasions.', 'icon' => 'shield'],
            ],
            'trades' => [
                ['title' => 'Emergency Repairs & Diagnostics', 'description' => 'Prompt on-site troubleshooting and reliable fixes when you need them most.', 'icon' => 'zap'],
                ['title' => 'Scheduled Maintenance', 'description' => 'Preventative inspections and tuning to protect your property and extend equipment lifespan.', 'icon' => 'shield'],
                ['title' => 'Full Upgrades & Installation', 'description' => 'High-efficiency modern replacements backed by our comprehensive warranty.', 'icon' => 'star'],
            ],
            'fitness' => [
                ['title' => 'Personal 1-on-1 Coaching', 'description' => 'Goal-driven programming designed around your unique biomechanics and lifestyle.', 'icon' => 'star'],
                ['title' => 'High-Energy Group Classes', 'description' => 'Inspiring community workouts that keep you motivated, strong, and energized.', 'icon' => 'zap'],
                ['title' => 'Nutrition & Recovery Guidance', 'description' => 'Sustainable meal strategies and active recovery protocols to optimize results.', 'icon' => 'heart'],
            ],
            default => [
                ['title' => 'Tailored Consultations', 'description' => 'In-depth assessment of your requirements to create an actionable, strategic plan.', 'icon' => 'star'],
                ['title' => 'Full Implementation', 'description' => 'End-to-end execution carried out by certified specialists with rigorous attention to detail.', 'icon' => 'shield'],
                ['title' => 'Ongoing Support & Care', 'description' => 'Responsive long-term assistance ensuring continuous reliability and peace of mind.', 'icon' => 'zap'],
            ],
        };
    }

    protected function resolvePricing(array $facts, string $category): array
    {
        return [
            [
                'name' => 'Essential Package',
                'price' => '$79',
                'period' => 'per visit',
                'description' => 'Great for routine needs and first-time appointments.',
                'features' => ['Core service delivery', 'Comprehensive inspection', 'Standard warranty & guarantee', 'Friendly local customer care'],
                'is_popular' => false,
                'cta_text' => 'Choose Essential',
            ],
            [
                'name' => 'Complete Care',
                'price' => '$149',
                'period' => 'most popular',
                'description' => 'Our all-inclusive package designed for maximum performance.',
                'features' => ['All Essential features included', 'Priority fast scheduling', 'Premium materials and extended coverage', 'Dedicated account lead'],
                'is_popular' => true,
                'cta_text' => 'Get Started Today',
            ],
            [
                'name' => 'VIP / Custom Plan',
                'price' => 'Custom',
                'period' => 'custom quote',
                'description' => 'Tailored solutions designed for bespoke or comprehensive requirements.',
                'features' => ['Custom scope & on-demand service', 'Direct direct line support', 'Quarterly reviews & audits', 'Multi-property / group discounts'],
                'is_popular' => false,
                'cta_text' => 'Request Quote',
            ],
        ];
    }

    protected function resolveFaqs(string $bizName, string $city, string $category): array
    {
        return [
            [
                'question' => "How do I schedule an appointment with {$bizName}?",
                'answer' => "You can easily schedule by calling our direct phone number, emailing us, or submitting the contact form on this page. We typically respond within minutes during business hours.",
            ],
            [
                'question' => "What areas do you serve?",
                'answer' => $city ? "We proudly serve {$city} and all surrounding communities within a 25-mile radius." : "We serve all local and regional clients throughout the area.",
            ],
            [
                'question' => "What forms of payment do you accept?",
                'answer' => "We accept all major credit cards (Visa, MasterCard, Amex), debit cards, electronic bank transfers, and cash.",
            ],
            [
                'question' => "Do you provide guarantees on your work?",
                'answer' => "Yes! We stand behind every service with our 100% satisfaction guarantee. If anything does not meet your expectations, let us know and we will promptly make it right.",
            ],
        ];
    }

    protected function resolveTestimonials(string $bizName, string $city): array
    {
        $loc = $city ? " in {$city}" : "";
        return [
            [
                'quote' => "Hands down the best experience I have had{$loc}. Professional, prompt, and thoroughly exceeded our expectations!",
                'author' => 'Sarah M.',
                'role' => 'Verified Client',
                'rating' => 5,
            ],
            [
                'quote' => "Clear communication from day one. Fair pricing and wonderful attention to detail. I highly recommend {$bizName} to everyone.",
                'author' => 'David R.',
                'role' => 'Local Homeowner',
                'rating' => 5,
            ],
            [
                'quote' => "Reliable, transparent, and friendly team. They made the entire process completely effortless for us.",
                'author' => 'Elena P.',
                'role' => 'Repeat Customer',
                'rating' => 5,
            ],
        ];
    }
}
