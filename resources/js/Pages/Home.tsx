import React, { useState, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
    Sparkles,
    UploadCloud,
    Globe,
    FileText,
    ArrowRight,
    CheckCircle,
    AlertCircle,
    Building2,
    MapPin,
    Shield,
    Key,
    Layers,
    FileCheck,
    X,
    ExternalLink,
    Clock,
    RefreshCw,
    Terminal
} from 'lucide-react';
import ThemeToggle from '@/Components/ThemeToggle';
import DisambiguationModal from '@/Components/DisambiguationModal';
import ApiKeyModal from '@/Components/ApiKeyModal';
import { Website, ConflictItem } from '@/types';

interface HomeProps {
    websites?: Website[];
    hasGeminiEnv?: boolean;
}

interface DemoPreset {
    label: string;
    name: string;
    city: string;
    tagline: string;
    url?: string;
    social?: string;
    facts: { field_name: string; field_value: string; source_name?: string }[];
}

const DEMO_PRESETS: DemoPreset[] = [
    {
        label: 'Artisan Bakery',
        name: 'Le Petit Levain Artisan Bakery',
        city: 'Portland, Oregon',
        tagline: 'Naturally Leavened Sourdough & Handcrafted French Viennoiserie',
        url: 'https://petitlevain.example.com',
        social: 'https://instagram.com/petitlevain.bakery',
        facts: [
            { field_name: 'phone', field_value: '(503) 555-0182', source_name: 'Storefront Sign' },
            { field_name: 'email', field_value: 'hello@petitlevain.com', source_name: 'Invoice' },
            { field_name: 'address', field_value: '1422 NW 23rd Ave, Portland, OR 97210', source_name: 'Google Maps' },
            { field_name: 'hours', field_value: 'Wed-Sun: 7am - 2pm', source_name: 'Store Hours' },
            { field_name: 'services', field_value: 'Artisan Sourdough Loaves, Croissants, Morning Buns, Specialty Espresso', source_name: 'Menu' },
        ]
    },
    {
        label: 'Apex Law Firm',
        name: 'Apex Litigation & Corporate Counsel',
        city: 'Chicago, Illinois',
        tagline: 'Strategic Advocacy in Complex Commercial Disputes & M&A',
        url: 'https://apexlitigation.example.com',
        social: 'https://linkedin.com/company/apex-litigation',
        facts: [
            { field_name: 'phone', field_value: '(312) 555-0144', source_name: 'Directory' },
            { field_name: 'email', field_value: 'counsel@apexlitigation.com', source_name: 'Business Card' },
            { field_name: 'address', field_value: '200 W Madison St, Suite 3400, Chicago, IL 60606', source_name: 'Bar Registry' },
            { field_name: 'services', field_value: 'Commercial Litigation, White-Collar Defense, IP Portfolio, Cross-Border M&A', source_name: 'Practice Areas' },
        ]
    },
    {
        label: 'Zenith Fitness',
        name: 'Zenith Performance & Strength Club',
        city: 'Austin, Texas',
        tagline: 'Elite Biomechanical Conditioning & High-Performance Athletic Training',
        url: 'https://zenithstrength.example.com',
        social: 'https://instagram.com/zenithstrength',
        facts: [
            { field_name: 'phone', field_value: '(512) 555-0199', source_name: 'Instagram Bio' },
            { field_name: 'email', field_value: 'train@zenithperformance.com', source_name: 'Website' },
            { field_name: 'address', field_value: '814 E 5th St, Austin, TX 78702', source_name: 'Google Profile' },
            { field_name: 'services', field_value: '1-on-1 Biomechanics, Olympic Weightlifting, Cold Plunge & Infrared Sauna, Small Group Classes', source_name: 'Program Guide' },
        ]
    }
];

export default function Home({ websites = [], hasGeminiEnv = false }: HomeProps) {
    // Form inputs
    const [businessName, setBusinessName] = useState('');
    const [city, setCity] = useState('');
    const [tagline, setTagline] = useState('');
    const [webUrl, setWebUrl] = useState('');
    const [socialUrl, setSocialUrl] = useState('');

    // Files state
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [extractedFacts, setExtractedFacts] = useState<any[]>([]);
    const [sourceFlags, setSourceFlags] = useState<any[]>([]);
    const [socialWallInfo, setSocialWallInfo] = useState<any | null>(null);

    // Conflict & Disambiguation Modal
    const [isDisambiguationOpen, setIsDisambiguationOpen] = useState(false);
    const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
    const [workingWebsiteId, setWorkingWebsiteId] = useState<number | null>(null);

    // API Key Modal
    const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
    const [userApiKey, setUserApiKey] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('gemini_custom_key') || '';
        }
        return '';
    });

    // Loading & Generation Status
    const [isExtracting, setIsExtracting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Save custom key
    const handleSaveKey = (key: string) => {
        setUserApiKey(key);
        if (typeof window !== 'undefined') {
            localStorage.setItem('gemini_custom_key', key);
        }
    };

    // Apply quick demo preset
    const handleApplyPreset = (preset: DemoPreset) => {
        setBusinessName(preset.name);
        setCity(preset.city);
        setTagline(preset.tagline);
        setWebUrl(preset.url || '');
        setSocialUrl(preset.social || '');
        setExtractedFacts(preset.facts);
        setSourceFlags([]);
        setConflicts([]);
        setStatusMessage(`Preset "${preset.label}" loaded with ${preset.facts.length} verified facts.`);
    };

    // Test conflict preset to demonstrate Disambiguation modal
    const handleTriggerConflictDemo = () => {
        setBusinessName('Northstar Medical Group');
        setCity('Seattle, Washington');
        setTagline('Comprehensive Family Medicine & Urgent Care');
        setWebUrl('https://northstarmedical.example.com');
        setSocialUrl('https://instagram.com/northstarmedical');
        
        const conflictingFacts = [
            { field_name: 'phone', field_value: '(206) 555-0100', source_name: 'Google Business Profile', confidence: 0.95 },
            { field_name: 'phone', field_value: '(206) 555-0199', source_name: 'Billing Invoice PDF', confidence: 0.88 },
            { field_name: 'address', field_value: '1100 Olive Way, Suite 800, Seattle, WA 98101', source_name: 'Website Footer', confidence: 0.92 },
            { field_name: 'address', field_value: '720 Stewart St, Seattle, WA 98101', source_name: 'Old Directory', confidence: 0.65 },
            { field_name: 'email', field_value: 'care@northstarmedical.com', source_name: 'Google Listing', confidence: 0.9 },
            { field_name: 'email', field_value: 'billing@northstarurgent.com', source_name: 'Claims PDF', confidence: 0.82 },
        ];

        setExtractedFacts(conflictingFacts);
        setSourceFlags([
            { flag: 'PROMPT_INJECTION_DEFENSE', details: 'Sanitized malicious markdown comments discovered in uploaded brochure.' },
            { flag: 'SSRF_SHIELD', details: 'Verified external metadata endpoint within RFC compliance.' }
        ]);
        setSocialWallInfo({
            platform: 'Instagram',
            url: 'https://instagram.com/northstarmedical'
        });

        // Set conflict items structure
        setConflicts([
            {
                field_name: 'phone',
                fact_ids: [1, 2],
                values: [
                    { id: 1, source_type: 'web', source_name: 'Google Business Profile', field_value: '(206) 555-0100', confidence: 0.95 },
                    { id: 2, source_type: 'upload', source_name: 'Billing Invoice PDF', field_value: '(206) 555-0199', confidence: 0.88 }
                ]
            },
            {
                field_name: 'address',
                fact_ids: [3, 4],
                values: [
                    { id: 3, source_type: 'web', source_name: 'Website Footer', field_value: '1100 Olive Way, Suite 800, Seattle, WA 98101', confidence: 0.92 },
                    { id: 4, source_type: 'directory', source_name: 'Old Directory Record', field_value: '720 Stewart St, Seattle, WA 98101', confidence: 0.65 }
                ]
            },
            {
                field_name: 'email',
                fact_ids: [5, 6],
                values: [
                    { id: 5, source_type: 'web', source_name: 'Google Listing', field_value: 'care@northstarmedical.com', confidence: 0.90 },
                    { id: 6, source_type: 'upload', source_name: 'Claims PDF', field_value: 'billing@northstarurgent.com', confidence: 0.82 }
                ]
            }
        ]);

        setIsDisambiguationOpen(true);
    };

    // Handle file selection and immediate ingest
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const newFiles = Array.from(e.target.files);
        setUploadedFiles((prev) => [...prev, ...newFiles]);

        // Upload and extract files
        setIsExtracting(true);
        setStatusMessage('Extracting structured facts and checking security vectors...');

        for (const file of newFiles) {
            const formData = new FormData();
            formData.append('file', file);
            if (workingWebsiteId) {
                formData.append('website_id', workingWebsiteId.toString());
            }

            try {
                const response = await axios.post('/api/intake/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                            setUploadProgress(percent);
                        }
                    }
                });

                if (response.data.success) {
                    const newFacts = response.data.extracted_facts || [];
                    setExtractedFacts((prev) => [...prev, ...newFacts]);
                    if (response.data.flags && response.data.flags.length > 0) {
                        setSourceFlags((prev) => [...prev, ...response.data.flags]);
                    }
                    if (response.data.website_id && !workingWebsiteId) {
                        setWorkingWebsiteId(response.data.website_id);
                    }
                }
            } catch (err: any) {
                console.error('File upload error:', err);
                setStatusMessage('File parsing error, falling back to manual entry.');
            }
        }

        setIsExtracting(false);
        setUploadProgress(null);
        setStatusMessage('Documents ingested and sanitized.');
    };

    // Ingest URL scraping
    const handleScrapeUrl = async () => {
        if (!webUrl && !socialUrl) return;
        setIsExtracting(true);
        setStatusMessage('Scraping public web listing with SSRF protection...');

        const targetUrl = webUrl || socialUrl;

        try {
            const response = await axios.post('/api/intake/url', {
                url: targetUrl,
                website_id: workingWebsiteId,
            });

            if (response.data.success) {
                const newFacts = response.data.extracted_facts || [];
                setExtractedFacts((prev) => [...prev, ...newFacts]);
                if (response.data.flags) {
                    setSourceFlags((prev) => [...prev, ...response.data.flags]);
                }
                if (response.data.is_social_wall) {
                    setSocialWallInfo({
                        platform: 'Social Network',
                        url: targetUrl
                    });
                }
                setStatusMessage(`Extracted ${newFacts.length} facts from ${targetUrl}`);
            }
        } catch (err: any) {
            console.error('URL scrape error:', err);
            const msg = err.response?.data?.message || 'Could not parse URL';
            setStatusMessage(`Notice: ${msg}`);
        } finally {
            setIsExtracting(false);
        }
    };

    // Primary generate action
    const handleStartGeneration = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!businessName.trim()) {
            alert('Please provide a business name.');
            return;
        }

        setIsGenerating(true);
        setStatusMessage('Analyzing knowledge base and validating fact consistency...');

        try {
            // First ingest current state of facts to detect any conflicts
            const compiledFacts = [
                { field_name: 'business_name', field_value: businessName, source_name: 'Form Input' },
                ...(city ? [{ field_name: 'city', field_value: city, source_name: 'Form Input' }] : []),
                ...(tagline ? [{ field_name: 'tagline', field_value: tagline, source_name: 'Form Input' }] : []),
                ...(webUrl ? [{ field_name: 'website_url', field_value: webUrl, source_name: 'Form Input' }] : []),
                ...extractedFacts,
            ];

            // Trigger conflict detection endpoint
            const factsResponse = await axios.post('/api/intake/facts', {
                website_id: workingWebsiteId,
                facts: compiledFacts,
            });

            const siteId = factsResponse.data.website_id || workingWebsiteId;
            setWorkingWebsiteId(siteId);

            // Check if backend flagged any conflicting fields
            if (factsResponse.data.conflicts?.has_conflicts) {
                // Fetch full conflict details
                const conflictsRes = await axios.get(`/api/websites/${siteId}/conflicts`);
                if (conflictsRes.data.conflicts && conflictsRes.data.conflicts.length > 0) {
                    setConflicts(conflictsRes.data.conflicts);
                    setIsGenerating(false);
                    setIsDisambiguationOpen(true);
                    return;
                }
            }

            // No conflicts: proceed directly to website generation!
            setStatusMessage('Synthesizing structured layout, hero, pricing, and services...');
            const genRes = await axios.post('/api/websites/generate', {
                website_id: siteId,
                business_name: businessName,
                city: city,
                tagline: tagline,
                api_key: userApiKey || undefined,
                facts: compiledFacts,
            });

            if (genRes.data.success && genRes.data.website) {
                setStatusMessage('Generation complete! Launching visual editor...');
                router.visit(`/editor/${genRes.data.website.id}`);
            }
        } catch (err: any) {
            console.error('Generation error:', err);
            setIsGenerating(false);
            const errDetail = err.response?.data?.message || err.message || 'Error occurred';
            setStatusMessage(`Generation notice: ${errDetail}`);
        }
    };

    // Disambiguation resolved callback
    const handleResolveConflictsAndGenerate = async (resolutions: Record<string, string>, manualBio?: string) => {
        setIsGenerating(true);
        setIsDisambiguationOpen(false);
        setStatusMessage('Committing resolved truth ontology...');

        try {
            if (workingWebsiteId) {
                // Submit batch resolutions
                await axios.post(`/api/websites/${workingWebsiteId}/conflicts/resolve`, {
                    resolutions,
                });
            }

            // Combine facts
            const updatedFacts = [
                { field_name: 'business_name', field_value: businessName, source_name: 'Form Input' },
                ...(city ? [{ field_name: 'city', field_value: city, source_name: 'Form Input' }] : []),
                ...(tagline ? [{ field_name: 'tagline', field_value: tagline, source_name: 'Form Input' }] : []),
                ...(manualBio ? [{ field_name: 'about', field_value: manualBio, source_name: 'User Clarification' }] : []),
                ...Object.entries(resolutions).map(([k, v]) => ({
                    field_name: k,
                    field_value: v,
                    source_name: 'Disambiguation Resolved'
                }))
            ];

            setStatusMessage('Generating responsive sections from verified facts...');
            const genRes = await axios.post('/api/websites/generate', {
                website_id: workingWebsiteId,
                business_name: businessName,
                city: city,
                tagline: tagline,
                api_key: userApiKey || undefined,
                facts: updatedFacts,
            });

            if (genRes.data.success && genRes.data.website) {
                router.visit(`/editor/${genRes.data.website.id}`);
            }
        } catch (err: any) {
            console.error('Resolution generation error:', err);
            setIsGenerating(false);
            setStatusMessage('Error synthesizing sections after resolution.');
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans transition-colors duration-150">
            <Head title="AI Builds My Website | Swiss Minimalist Generator" />

            {/* Top Navigation Bar */}
            <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-neutral-900 dark:bg-white flex items-center justify-center font-mono font-black text-white dark:text-neutral-900 text-sm">
                            AI
                        </div>
                        <div className="flex flex-col">
                            <span className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                                AI Builds My Website
                            </span>
                            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                                Autonomous Web Architect
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsApiKeyOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300 transition-colors"
                        >
                            <Key className="w-3.5 h-3.5 text-neutral-500" />
                            <span>{userApiKey ? 'Custom Key Set' : hasGeminiEnv ? 'API Key Active' : 'Configure API Key'}</span>
                        </button>

                        <ThemeToggle />
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 bg-grid-pattern relative">
                {/* Hero Section */}
                <section className="border-b border-neutral-200 dark:border-neutral-800 py-16 px-6">
                    <div className="max-w-4xl mx-auto text-center space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-[11px] font-mono uppercase tracking-widest text-neutral-600 dark:text-neutral-300">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Multi-Source Ingestion & SSRF Protection
                        </div>

                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-neutral-900 dark:text-white uppercase font-mono">
                            Create a stunning website in seconds powered by AI
                        </h1>

                        <p className="text-base md:text-lg text-neutral-600 dark:text-neutral-400 font-sans max-w-2xl mx-auto leading-relaxed">
                            Feed raw business links, Google listings, or price sheets. Our verified fact engine resolves conflicts, neutralizes injection vectors, and crafts a bespoke static site instantly.
                        </p>

                        {/* Quick Presets Bar */}
                        <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
                            <span className="text-xs font-mono uppercase tracking-wider text-neutral-500 mr-2 flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                Instant Presets:
                            </span>
                            {DEMO_PRESETS.map((preset) => (
                                <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => handleApplyPreset(preset)}
                                    className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors shadow-sm"
                                >
                                    {preset.label}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={handleTriggerConflictDemo}
                                className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider border border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                            >
                                Test Disambiguation Demo
                            </button>
                        </div>
                    </div>
                </section>

                {/* Intake Form Section */}
                <section className="max-w-4xl mx-auto px-6 py-12">
                    <form onSubmit={handleStartGeneration} className="space-y-8">
                        {/* Step 1: Core Business Identity */}
                        <div className="border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-5">
                            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-mono font-bold flex items-center justify-center">
                                        01
                                    </span>
                                    <h2 className="text-sm font-mono uppercase tracking-wider font-bold text-neutral-900 dark:text-neutral-100">
                                        Business Identity
                                    </h2>
                                </div>
                                <span className="text-[11px] font-mono text-neutral-500 uppercase">Primary Entity</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-mono uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                                        Business Name <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Building2 className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
                                        <input
                                            type="text"
                                            required
                                            value={businessName}
                                            onChange={(e) => setBusinessName(e.target.value)}
                                            placeholder="e.g. Apex Law Firm"
                                            className="w-full text-xs font-mono pl-9 pr-3 py-2.5 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white rounded-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-mono uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                                        City / Operating Location
                                    </label>
                                    <div className="relative">
                                        <MapPin className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
                                        <input
                                            type="text"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            placeholder="e.g. Chicago, IL"
                                            className="w-full text-xs font-mono pl-9 pr-3 py-2.5 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white rounded-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                                    Tagline or Mission Proposition (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={tagline}
                                    onChange={(e) => setTagline(e.target.value)}
                                    placeholder="e.g. Relentless advocacy in complex commercial litigation and arbitration"
                                    className="w-full text-xs font-mono p-2.5 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white rounded-none"
                                />
                            </div>
                        </div>

                        {/* Step 2: Digital Sources & Web Presence */}
                        <div className="border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-5">
                            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-mono font-bold flex items-center justify-center">
                                        02
                                    </span>
                                    <h2 className="text-sm font-mono uppercase tracking-wider font-bold text-neutral-900 dark:text-neutral-100">
                                        Online Footprint & Social Links
                                    </h2>
                                </div>
                                <span className="text-[11px] font-mono text-neutral-500 uppercase">Automated Crawler</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-mono uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                                        Google Business Listing or Current Website
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Globe className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
                                            <input
                                                type="url"
                                                value={webUrl}
                                                onChange={(e) => setWebUrl(e.target.value)}
                                                placeholder="https://example.com"
                                                className="w-full text-xs font-mono pl-9 pr-3 py-2.5 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white rounded-none"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleScrapeUrl}
                                            disabled={!webUrl || isExtracting}
                                            className="px-3 py-2 text-xs font-mono uppercase border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 disabled:opacity-40"
                                        >
                                            Scrape
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-mono uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                                        Social Profile (Instagram, LinkedIn, FB)
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="url"
                                            value={socialUrl}
                                            onChange={(e) => setSocialUrl(e.target.value)}
                                            placeholder="https://instagram.com/mybusiness"
                                            className="flex-1 text-xs font-mono p-2.5 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white rounded-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleScrapeUrl}
                                            disabled={!socialUrl || isExtracting}
                                            className="px-3 py-2 text-xs font-mono uppercase border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 disabled:opacity-40"
                                        >
                                            Inspect
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 3: File Upload Zone */}
                        <div className="border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-5">
                            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-mono font-bold flex items-center justify-center">
                                        03
                                    </span>
                                    <h2 className="text-sm font-mono uppercase tracking-wider font-bold text-neutral-900 dark:text-neutral-100">
                                        Documents & Pricing Lists
                                    </h2>
                                </div>
                                <span className="text-[11px] font-mono text-neutral-500 uppercase">PDF, CSV, TXT</span>
                            </div>

                            {/* Dropzone container */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-neutral-300 p-8 text-center cursor-pointer bg-neutral-50/50 dark:bg-neutral-950/50 transition-colors space-y-3"
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept=".pdf,.csv,.txt,.docx,.png,.jpg,.jpeg"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <div className="w-10 h-10 mx-auto bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                                    <UploadCloud className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-mono uppercase font-bold text-neutral-800 dark:text-neutral-200">
                                        Drag & drop files or click to browse
                                    </p>
                                    <p className="text-[11px] font-mono text-neutral-500 mt-1">
                                        Upload service menus, company PDFs, pricing spreadsheets, or storefront photos
                                    </p>
                                </div>
                            </div>

                            {/* Upload Progress Bar */}
                            {uploadProgress !== null && (
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[11px] font-mono text-neutral-500">
                                        <span>Uploading & Parsing Document...</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800">
                                        <div
                                            className="h-full bg-neutral-900 dark:bg-white transition-all duration-150"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Uploaded Files Pills */}
                            {uploadedFiles.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <span className="text-[11px] font-mono uppercase text-neutral-500">Uploaded Sources ({uploadedFiles.length})</span>
                                    <div className="flex flex-wrap gap-2">
                                        {uploadedFiles.map((f, i) => (
                                            <div
                                                key={i}
                                                className="inline-flex items-center gap-2 px-2.5 py-1 text-xs font-mono border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200"
                                            >
                                                <FileText className="w-3.5 h-3.5 text-neutral-400" />
                                                <span>{f.name}</span>
                                                <span className="text-[10px] text-neutral-500">({(f.size / 1024).toFixed(1)} KB)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Extracted Facts Overview */}
                            {extractedFacts.length > 0 && (
                                <div className="border border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50 dark:bg-neutral-950 space-y-2">
                                    <div className="flex items-center justify-between text-xs font-mono uppercase text-neutral-700 dark:text-neutral-300">
                                        <span className="flex items-center gap-1.5 font-bold">
                                            <FileCheck className="w-4 h-4 text-emerald-500" />
                                            Extracted Facts Ready ({extractedFacts.length})
                                        </span>
                                    </div>
                                    <div className="max-h-32 overflow-y-auto space-y-1 text-[11px] font-mono">
                                        {extractedFacts.map((fact, idx) => (
                                            <div key={idx} className="flex items-center justify-between py-0.5 border-b border-neutral-200/50 dark:border-neutral-800/50">
                                                <span className="text-neutral-500">{fact.field_name}:</span>
                                                <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-xs">{fact.field_value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Status feedback & progress message */}
                        {statusMessage && (
                            <div className="p-3 border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 text-xs font-mono flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
                                <Terminal className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                                <span>{statusMessage}</span>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                            <div className="text-xs font-mono text-neutral-500">
                                {hasGeminiEnv || userApiKey ? (
                                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                        <Shield className="w-3.5 h-3.5" />
                                        Gemini AI Engine Active
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5">
                                        <Layers className="w-3.5 h-3.5" />
                                        Deterministic Fallback Active (Offline Ready)
                                    </span>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isGenerating || isExtracting || !businessName.trim()}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 text-xs font-mono uppercase tracking-widest bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-900 font-bold transition-all disabled:opacity-50 shadow-lg rounded-none"
                            >
                                {isGenerating ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Synthesizing Site...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Generate Website</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </section>

                {/* Existing Generated Websites List (if any) */}
                {websites && websites.length > 0 && (
                    <section className="border-t border-neutral-200 dark:border-neutral-800 py-12 px-6 bg-neutral-50/50 dark:bg-neutral-950/50">
                        <div className="max-w-4xl mx-auto space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-neutral-900 dark:text-neutral-100">
                                    Recent Generated Websites ({websites.length})
                                </h3>
                                <span className="text-[11px] font-mono text-neutral-500">Local Repository</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {websites.map((site) => (
                                    <div
                                        key={site.id}
                                        className="border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 flex items-center justify-between transition-colors hover:border-neutral-900 dark:hover:border-neutral-400"
                                    >
                                        <div className="space-y-1">
                                            <h4 className="text-xs font-mono font-bold text-neutral-900 dark:text-neutral-100">
                                                {site.business_name}
                                            </h4>
                                            <p className="text-[11px] font-mono text-neutral-500">
                                                {site.city || 'No city'} • Status: <span className="uppercase">{site.status}</span>
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <a
                                                href={`/editor/${site.id}`}
                                                className="px-3 py-1 text-[11px] font-mono uppercase border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                                            >
                                                Open Editor
                                            </a>
                                            {site.status === 'published' && (
                                                <a
                                                    href={`/sites/${site.slug}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                                                    title="View Public Site"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}
            </main>

            {/* Disambiguation Modal */}
            <DisambiguationModal
                isOpen={isDisambiguationOpen}
                onClose={() => setIsDisambiguationOpen(false)}
                conflicts={conflicts}
                securityFlags={sourceFlags}
                socialWallPrompt={socialWallInfo}
                onResolveAndGenerate={handleResolveConflictsAndGenerate}
                isSubmitting={isGenerating}
            />

            {/* API Key Modal */}
            <ApiKeyModal
                isOpen={isApiKeyOpen}
                onClose={() => setIsApiKeyOpen(false)}
                hasServerKey={hasGeminiEnv}
                onSaveKey={handleSaveKey}
                currentKey={userApiKey}
            />
        </div>
    );
}
