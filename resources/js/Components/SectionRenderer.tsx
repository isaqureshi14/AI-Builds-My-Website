import React, { useState } from 'react';
import {
    Check,
    Star,
    Mail,
    Phone,
    MapPin,
    Clock,
    ArrowRight,
    ChevronDown,
    ExternalLink,
    Shield,
    Sparkles
} from 'lucide-react';
import { Section, ThemeSettings } from '@/types';

interface SectionRendererProps {
    section: Section;
    themeSettings?: ThemeSettings;
    businessName?: string;
    onContactSubmit?: (data: any) => void;
}

export default function SectionRenderer({
    section,
    themeSettings,
    businessName = 'Our Business',
    onContactSubmit,
}: SectionRendererProps) {
    if (!section.is_visible) {
        return null;
    }

    const content = section.content || {};
    const type = section.type;

    return (
        <section
            id={`section-${section.type}`}
            className="w-full py-16 px-6 md:px-12 border-b border-neutral-200 dark:border-neutral-800 transition-colors"
        >
            <div className="max-w-6xl mx-auto">
                {/* Section Header (for non-hero/non-footer sections) */}
                {type !== 'hero' && type !== 'footer' && (
                    <div className="mb-12 text-left space-y-2">
                        <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-neutral-500">
                            <span className="w-2 h-2 bg-neutral-900 dark:bg-white inline-block"></span>
                            <span>{section.type}</span>
                        </div>
                        {section.title && (
                            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight font-mono uppercase text-neutral-900 dark:text-neutral-100">
                                {section.title}
                            </h2>
                        )}
                        {section.subtitle && (
                            <p className="text-sm md:text-base text-neutral-600 dark:text-neutral-400 font-sans max-w-2xl">
                                {section.subtitle}
                            </p>
                        )}
                    </div>
                )}

                {/* Specific Section Type Renderers */}
                {type === 'hero' && <HeroSection section={section} businessName={businessName} />}
                {type === 'about' && <AboutSection section={section} />}
                {(type === 'services' || type === 'products') && <ServicesSection section={section} />}
                {type === 'pricing' && <PricingSection section={section} />}
                {type === 'testimonials' && <TestimonialsSection section={section} />}
                {type === 'faq' && <FaqSection section={section} />}
                {type === 'contact' && <ContactSection section={section} onContactSubmit={onContactSubmit} />}
                {type === 'footer' && <FooterSection section={section} businessName={businessName} />}
                {type === 'gallery' && <GallerySection section={section} />}
            </div>
        </section>
    );
}

// 1. Hero
function HeroSection({ section, businessName }: { section: Section; businessName: string }) {
    const c = section.content || {};
    return (
        <div className="py-8 md:py-16 text-left space-y-6">
            {c.badge && (
                <div className="inline-flex items-center gap-2 px-3 py-1 border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 text-xs font-mono uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{c.badge}</span>
                </div>
            )}

            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight font-mono uppercase text-neutral-900 dark:text-white leading-tight break-words">
                {c.headline || section.title || businessName}
            </h1>

            <p className="text-base md:text-xl text-neutral-600 dark:text-neutral-400 font-sans max-w-3xl leading-relaxed">
                {c.subheadline || section.subtitle || 'Delivering high-caliber precision and professional service.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
                {c.primary_cta && (
                    <a
                        href={c.primary_cta_link || '#section-contact'}
                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-mono text-xs uppercase font-bold tracking-wider hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors rounded-none"
                    >
                        <span>{c.primary_cta}</span>
                        <ArrowRight className="w-4 h-4" />
                    </a>
                )}
                {c.secondary_cta && (
                    <a
                        href={c.secondary_cta_link || '#section-services'}
                        className="inline-flex items-center gap-2 px-8 py-3.5 border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-neutral-100 font-mono text-xs uppercase font-bold tracking-wider hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors rounded-none"
                    >
                        <span>{c.secondary_cta}</span>
                    </a>
                )}
            </div>
        </div>
    );
}

// 2. About
function AboutSection({ section }: { section: Section }) {
    const c = section.content || {};
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
                {c.story && (
                    <p className="text-neutral-700 dark:text-neutral-300 text-sm md:text-base leading-relaxed">
                        {c.story}
                    </p>
                )}
                {c.mission && (
                    <div className="p-4 border-l-2 border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-900">
                        <span className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1">Our Mission</span>
                        <p className="text-sm font-semibold italic text-neutral-900 dark:text-neutral-100">
                            "{c.mission}"
                        </p>
                    </div>
                )}
            </div>

            {c.bullets && Array.isArray(c.bullets) && c.bullets.length > 0 && (
                <div className="border border-neutral-200 dark:border-neutral-800 p-6 space-y-3 bg-neutral-50/50 dark:bg-neutral-950/50">
                    <span className="text-xs font-mono uppercase tracking-wider text-neutral-500 font-bold block">
                        Core Principles & Standards
                    </span>
                    <ul className="space-y-2.5">
                        {c.bullets.map((bullet: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs font-mono text-neutral-800 dark:text-neutral-200">
                                <span className="w-1.5 h-1.5 bg-neutral-900 dark:bg-white mt-1.5 shrink-0" />
                                <span>{bullet}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

// 3. Services / Products
function ServicesSection({ section }: { section: Section }) {
    const c = section.content || {};
    const items = c.services || c.items || c.plans || [];

    if (!Array.isArray(items) || items.length === 0) {
        return (
            <div className="text-xs font-mono text-neutral-500 p-4 border border-dashed border-neutral-300 dark:border-neutral-700">
                No items listed yet.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item: any, idx: number) => (
                <div
                    key={idx}
                    className="border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900/60 flex flex-col justify-between hover:border-neutral-900 dark:hover:border-neutral-400 transition-colors"
                >
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                                {(idx + 1).toString().padStart(2, '0')}
                            </span>
                            {item.price && (
                                <span className="text-xs font-mono font-bold text-neutral-900 dark:text-white px-2 py-0.5 border border-neutral-200 dark:border-neutral-700">
                                    {item.price}
                                </span>
                            )}
                        </div>
                        <h3 className="text-base font-bold font-mono uppercase text-neutral-900 dark:text-neutral-100">
                            {item.title || item.name}
                        </h3>
                        {item.description && (
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-sans">
                                {item.description}
                            </p>
                        )}
                    </div>

                    {item.features && Array.isArray(item.features) && (
                        <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5">
                            {item.features.map((feat: string, fIdx: number) => (
                                <div key={fIdx} className="flex items-center gap-2 text-[11px] font-mono text-neutral-500">
                                    <Check className="w-3 h-3 text-neutral-900 dark:text-white shrink-0" />
                                    <span>{feat}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// 4. Pricing
function PricingSection({ section }: { section: Section }) {
    const c = section.content || {};
    const plans = c.plans || c.items || c.services || [];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan: any, idx: number) => {
                const isPopular = plan.popular || idx === 1;
                return (
                    <div
                        key={idx}
                        className={`p-6 border flex flex-col justify-between ${
                            isPopular
                                ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-900 shadow-md'
                                : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950'
                        }`}
                    >
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-mono uppercase tracking-wider font-bold text-neutral-900 dark:text-neutral-100">
                                    {plan.name || plan.title}
                                </span>
                                {isPopular && (
                                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold">
                                        Popular
                                    </span>
                                )}
                            </div>

                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-mono font-black text-neutral-900 dark:text-white">
                                    {plan.price}
                                </span>
                                {plan.period && (
                                    <span className="text-xs font-mono text-neutral-500">
                                        /{plan.period}
                                    </span>
                                )}
                            </div>

                            {plan.description && (
                                <p className="text-xs text-neutral-600 dark:text-neutral-400 font-sans">
                                    {plan.description}
                                </p>
                            )}

                            {plan.features && Array.isArray(plan.features) && (
                                <ul className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
                                    {plan.features.map((feat: string, fIdx: number) => (
                                        <li key={fIdx} className="flex items-center gap-2 text-xs font-mono text-neutral-700 dark:text-neutral-300">
                                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                            <span>{feat}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="pt-6">
                            <a
                                href="#section-contact"
                                className={`w-full block text-center py-2.5 text-xs font-mono uppercase tracking-wider font-bold transition-colors ${
                                    isPopular
                                        ? 'bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-900'
                                        : 'border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100'
                                }`}
                            >
                                Select Plan
                            </a>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// 5. Testimonials
function TestimonialsSection({ section }: { section: Section }) {
    const c = section.content || {};
    const items = c.testimonials || c.items || [];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {items.map((t: any, idx: number) => (
                <div
                    key={idx}
                    className="border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 flex flex-col justify-between space-y-4"
                >
                    <div className="space-y-3">
                        <div className="flex gap-1 text-amber-500">
                            {[...Array(t.rating || 5)].map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 fill-current" />
                            ))}
                        </div>
                        <p className="text-xs md:text-sm text-neutral-700 dark:text-neutral-300 italic font-sans leading-relaxed">
                            "{t.quote || t.content || t.text}"
                        </p>
                    </div>

                    <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-mono font-bold text-neutral-900 dark:text-neutral-100">
                                {t.author || t.name}
                            </div>
                            {(t.role || t.company) && (
                                <div className="text-[10px] font-mono text-neutral-500">
                                    {t.role}{t.company ? `, ${t.company}` : ''}
                                </div>
                            )}
                        </div>
                        <Shield className="w-4 h-4 text-neutral-400" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// 6. FAQ
function FaqSection({ section }: { section: Section }) {
    const c = section.content || {};
    const items = c.items || [];
    const [openIdx, setOpenIdx] = useState<number | null>(0);

    return (
        <div className="max-w-3xl mx-auto space-y-3">
            {items.map((faq: any, idx: number) => {
                const isOpen = openIdx === idx;
                return (
                    <div
                        key={idx}
                        className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"
                    >
                        <button
                            type="button"
                            onClick={() => setOpenIdx(isOpen ? null : idx)}
                            className="w-full p-4 flex items-center justify-between text-left text-xs md:text-sm font-mono uppercase font-bold text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                        >
                            <span>{faq.question}</span>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen && (
                            <div className="px-4 pb-4 text-xs font-sans text-neutral-600 dark:text-neutral-400 border-t border-neutral-100 dark:border-neutral-900 pt-3 leading-relaxed">
                                {faq.answer}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// 7. Contact
function ContactSection({ section, onContactSubmit }: { section: Section; onContactSubmit?: (data: any) => void }) {
    const c = section.content || {};
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [sent, setSent] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSent(true);
        if (onContactSubmit) {
            onContactSubmit({ name, email, message });
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 font-sans">
                    Reach out directly for inquiries, appointment bookings, or confidential consultations.
                </p>

                <div className="space-y-4 font-mono text-xs">
                    {c.phone && (
                        <div className="flex items-center gap-3 text-neutral-800 dark:text-neutral-200">
                            <Phone className="w-4 h-4 text-neutral-500" />
                            <span>{c.phone}</span>
                        </div>
                    )}
                    {c.email && (
                        <div className="flex items-center gap-3 text-neutral-800 dark:text-neutral-200">
                            <Mail className="w-4 h-4 text-neutral-500" />
                            <span>{c.email}</span>
                        </div>
                    )}
                    {c.address && (
                        <div className="flex items-center gap-3 text-neutral-800 dark:text-neutral-200">
                            <MapPin className="w-4 h-4 text-neutral-500" />
                            <span>{c.address}</span>
                        </div>
                    )}
                    {c.hours && (
                        <div className="flex items-center gap-3 text-neutral-800 dark:text-neutral-200">
                            <Clock className="w-4 h-4 text-neutral-500" />
                            <span>{c.hours}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Interactive Form */}
            <div className="border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900/60">
                {sent ? (
                    <div className="text-center py-8 space-y-2 font-mono">
                        <Check className="w-8 h-8 text-emerald-500 mx-auto" />
                        <h4 className="text-xs uppercase font-bold text-neutral-900 dark:text-white">Message Dispatched</h4>
                        <p className="text-[11px] text-neutral-500">Thank you. We will respond promptly.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
                        <div>
                            <label className="block uppercase text-neutral-700 dark:text-neutral-300 mb-1">Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your Name"
                                className="w-full p-2.5 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white rounded-none"
                            />
                        </div>
                        <div>
                            <label className="block uppercase text-neutral-700 dark:text-neutral-300 mb-1">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@domain.com"
                                className="w-full p-2.5 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white rounded-none"
                            />
                        </div>
                        <div>
                            <label className="block uppercase text-neutral-700 dark:text-neutral-300 mb-1">Message</label>
                            <textarea
                                required
                                rows={3}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="How can we assist you?"
                                className="w-full p-2.5 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white rounded-none"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-900 uppercase font-bold tracking-wider transition-colors rounded-none"
                        >
                            Submit Inquiry
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

// 8. Gallery
function GallerySection({ section }: { section: Section }) {
    const c = section.content || {};
    const items = c.items || [];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {items.map((item: any, idx: number) => (
                <div
                    key={idx}
                    className="border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 aspect-square flex flex-col justify-end p-4 relative group"
                >
                    <div className="absolute inset-0 bg-neutral-900/10 dark:bg-white/5" />
                    <span className="relative z-10 text-[10px] font-mono uppercase text-neutral-500">
                        {item.title || `Asset ${(idx + 1).toString().padStart(2, '0')}`}
                    </span>
                </div>
            ))}
        </div>
    );
}

// 9. Footer
function FooterSection({ section, businessName }: { section: Section; businessName: string }) {
    const c = section.content || {};
    return (
        <footer className="pt-8 pb-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-neutral-500">
            <div>
                <span className="font-bold uppercase text-neutral-900 dark:text-neutral-100">{businessName}</span>
                <span className="ml-2">
                    {c.copyright || `© ${new Date().getFullYear()} All Rights Reserved.`}
                </span>
            </div>

            <div className="flex items-center gap-4">
                {c.links && Array.isArray(c.links) ? (
                    c.links.map((link: any, i: number) => (
                        <a key={i} href={link.href} className="hover:underline">
                            {link.label}
                        </a>
                    ))
                ) : (
                    <>
                        <a href="#section-hero" className="hover:underline">Top</a>
                        <a href="#section-services" className="hover:underline">Services</a>
                        <a href="#section-contact" className="hover:underline">Contact</a>
                    </>
                )}
            </div>
        </footer>
    );
}
