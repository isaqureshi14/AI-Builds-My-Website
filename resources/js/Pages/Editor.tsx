import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowLeft,
    Monitor,
    Smartphone,
    Eye,
    EyeOff,
    ArrowUp,
    ArrowDown,
    Trash2,
    Edit3,
    Plus,
    Download,
    Share2,
    Check,
    Globe,
    Layers,
    ExternalLink,
    Sparkles,
    RefreshCw,
    Sliders,
    Palette
} from 'lucide-react';
import ThemeToggle from '@/Components/ThemeToggle';
import SectionRenderer from '@/Components/SectionRenderer';
import SectionEditModal from '@/Components/SectionEditModal';
import { Website, Section, ThemeSettings } from '@/types';

interface EditorProps {
    website: Website;
}

const SECTION_TEMPLATES = [
    { type: 'hero', title: 'Hero Banner', desc: 'Prominent headline, tagline, and call-to-actions' },
    { type: 'about', title: 'About Section', desc: 'Company history, mission statement, and core values' },
    { type: 'services', title: 'Services & Offerings', desc: 'Grid of specialized services with descriptions and pricing' },
    { type: 'pricing', title: 'Pricing Plans', desc: 'Multi-tier pricing comparison with feature checklists' },
    { type: 'testimonials', title: 'Client Reviews', desc: 'Customer testimonials with star ratings and attributions' },
    { type: 'faq', title: 'Frequently Asked Questions', desc: 'Interactive accordion answering common queries' },
    { type: 'gallery', title: 'Visual Portfolio', desc: 'Asset gallery showcasing work and products' },
    { type: 'contact', title: 'Contact & Location', desc: 'Address, hours, phone, email, and interactive inquiry form' },
];

export default function Editor({ website: initialWebsite }: EditorProps) {
    const [website, setWebsite] = useState<Website>(initialWebsite);
    const [sections, setSections] = useState<Section[]>(initialWebsite.sections || []);
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [activeSectionId, setActiveSectionId] = useState<number | null>(null);
    const [editingSection, setEditingSection] = useState<Section | null>(null);
    const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
    
    // Status states
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');
    const [publishStatus, setPublishStatus] = useState<string>(initialWebsite.status || 'draft');
    const [publicUrl, setPublicUrl] = useState<string>(
        initialWebsite.status === 'published' ? `/sites/${initialWebsite.slug}` : ''
    );
    const [copiedUrl, setCopiedUrl] = useState(false);

    // Re-fetch website if initial props update
    useEffect(() => {
        setWebsite(initialWebsite);
        setSections(initialWebsite.sections || []);
    }, [initialWebsite]);

    // Move Section Up
    const handleMoveUp = async (index: number) => {
        if (index <= 0) return;
        const newSections = [...sections];
        const temp = newSections[index - 1];
        newSections[index - 1] = newSections[index];
        newSections[index] = temp;
        setSections(newSections);
        await persistReorder(newSections);
    };

    // Move Section Down
    const handleMoveDown = async (index: number) => {
        if (index >= sections.length - 1) return;
        const newSections = [...sections];
        const temp = newSections[index + 1];
        newSections[index + 1] = newSections[index];
        newSections[index] = temp;
        setSections(newSections);
        await persistReorder(newSections);
    };

    // Persist reordered array
    const persistReorder = async (orderedSections: Section[]) => {
        setSaveStatus('saving');
        try {
            await axios.post(`/api/websites/${website.id}/sections/reorder`, {
                section_ids: orderedSections.map((s) => s.id),
            });
            setSaveStatus('saved');
        } catch (err) {
            console.error('Reorder error:', err);
            setSaveStatus('error');
        }
    };

    // Toggle Section Visibility
    const handleToggleVisibility = async (section: Section) => {
        const nextVal = !section.is_visible;
        setSections((prev) =>
            prev.map((s) => (s.id === section.id ? { ...s, is_visible: nextVal } : s))
        );

        setSaveStatus('saving');
        try {
            await axios.put(`/api/sections/${section.id}`, {
                is_visible: nextVal,
            });
            setSaveStatus('saved');
        } catch (err) {
            console.error('Visibility update error:', err);
            setSaveStatus('error');
        }
    };

    // Delete Section
    const handleDeleteSection = async (sectionId: number) => {
        if (!confirm('Are you sure you want to remove this section?')) return;

        setSections((prev) => prev.filter((s) => s.id !== sectionId));
        setSaveStatus('saving');
        try {
            await axios.delete(`/api/sections/${sectionId}`);
            setSaveStatus('saved');
        } catch (err) {
            console.error('Delete section error:', err);
            setSaveStatus('error');
        }
    };

    // Add New Section
    const handleAddSection = async (type: string) => {
        setSaveStatus('saving');
        setIsAddSectionOpen(false);

        try {
            const nextOrder = sections.length + 1;
            const res = await axios.post(`/api/websites/${website.id}/sections`, {
                type,
                title: type.toUpperCase(),
                subtitle: `High-quality ${type} details tailored for ${website.business_name}.`,
                order: nextOrder,
                is_visible: true,
                content: {
                    headline: `${website.business_name} ${type}`,
                    description: `Detailed description for this ${type} section.`,
                    items: [
                        { title: 'Standard Feature', description: 'Comprehensive quality and execution.' }
                    ]
                }
            });

            if (res.data.success && res.data.section) {
                setSections((prev) => [...prev, res.data.section]);
                setSaveStatus('saved');
                setEditingSection(res.data.section);
            }
        } catch (err) {
            console.error('Add section error:', err);
            setSaveStatus('error');
        }
    };

    // Callback when section updated from modal
    const handleSectionUpdated = (updatedSection: Section) => {
        setSections((prev) =>
            prev.map((s) => (s.id === updatedSection.id ? updatedSection : s))
        );
        setSaveStatus('saved');
    };

    // Publish website live
    const handlePublish = async () => {
        setSaveStatus('saving');
        try {
            const res = await axios.post(`/api/websites/${website.id}/publish`);
            if (res.data.success) {
                setPublishStatus('published');
                setPublicUrl(res.data.public_url || `/sites/${website.slug}`);
                setSaveStatus('saved');
            }
        } catch (err) {
            console.error('Publish error:', err);
            setSaveStatus('error');
        }
    };

    // Copy public link
    const handleCopyUrl = () => {
        const fullUrl = window.location.origin + publicUrl;
        navigator.clipboard.writeText(fullUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    // Download static ZIP
    const handleExportZip = () => {
        window.location.href = `/api/websites/${website.id}/export`;
    };

    return (
        <div className="h-screen flex flex-col bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans overflow-hidden">
            <Head title={`Editor: ${website.business_name} | AI Builds My Website`} />

            {/* Top Editor Header */}
            <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 flex items-center justify-between shrink-0 z-30">
                {/* Left: Brand & Back */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/"
                        className="p-1.5 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
                        title="Back to Studio Home"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Link>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                            {website.business_name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 border border-neutral-300 dark:border-neutral-700 text-neutral-500 uppercase">
                            /{website.slug}
                        </span>
                    </div>

                    {/* Save indicator */}
                    <div className="ml-3 text-[11px] font-mono text-neutral-500 flex items-center gap-1.5">
                        <span
                            className={`w-2 h-2 rounded-full ${
                                saveStatus === 'saving'
                                    ? 'bg-amber-500 animate-pulse'
                                    : saveStatus === 'error'
                                    ? 'bg-red-500'
                                    : 'bg-emerald-500'
                            }`}
                        />
                        <span className="capitalize">{saveStatus === 'saved' ? 'Saved' : saveStatus}</span>
                    </div>
                </div>

                {/* Center: Viewport Controls */}
                <div className="hidden sm:flex items-center border border-neutral-300 dark:border-neutral-700 p-0.5 bg-neutral-100 dark:bg-neutral-950">
                    <button
                        type="button"
                        onClick={() => setViewMode('desktop')}
                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono uppercase transition-colors ${
                            viewMode === 'desktop'
                                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold shadow-xs'
                                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
                        }`}
                    >
                        <Monitor className="w-3.5 h-3.5" />
                        <span>Desktop</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('mobile')}
                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono uppercase transition-colors ${
                            viewMode === 'mobile'
                                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold shadow-xs'
                                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
                        }`}
                    >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Mobile</span>
                    </button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    <ThemeToggle />

                    {/* Download ZIP */}
                    <button
                        type="button"
                        onClick={handleExportZip}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider border border-neutral-300 dark:border-neutral-700 bg-white hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors"
                        title="Download Standalone Static HTML ZIP"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Download ZIP</span>
                    </button>

                    {/* Publish Button / Live Link */}
                    {publishStatus === 'published' ? (
                        <div className="flex items-center gap-1">
                            <a
                                href={publicUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors"
                            >
                                <Globe className="w-3.5 h-3.5" />
                                <span>Live Site</span>
                                <ExternalLink className="w-3 h-3 ml-0.5" />
                            </a>
                            <button
                                type="button"
                                onClick={handleCopyUrl}
                                className="p-1.5 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                                title="Copy Public URL"
                            >
                                {copiedUrl ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={handlePublish}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-mono uppercase tracking-wider bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-900 font-bold transition-colors"
                        >
                            <Globe className="w-3.5 h-3.5" />
                            <span>Publish Live</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Main Studio Workspace: Split-Pane Editor */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Pane: Section Management Drawer */}
                <aside className="w-80 md:w-96 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col shrink-0 z-20 overflow-hidden">
                    <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950">
                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-neutral-500" />
                            <h2 className="text-xs font-mono uppercase tracking-wider font-bold text-neutral-900 dark:text-neutral-100">
                                Section Hierarchy ({sections.length})
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsAddSectionOpen(true)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono uppercase border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white"
                        >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                        </button>
                    </div>

                    {/* Section items list */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {sections.map((section, idx) => {
                            const isSelected = activeSectionId === section.id;
                            return (
                                <div
                                    key={section.id}
                                    className={`p-3 border transition-colors flex flex-col gap-2 rounded-none ${
                                        isSelected
                                            ? 'border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-800'
                                            : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-neutral-400 dark:hover:border-neutral-600'
                                    } ${!section.is_visible ? 'opacity-50' : ''}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div
                                            className="flex items-center gap-2 cursor-pointer flex-1"
                                            onClick={() => setActiveSectionId(section.id)}
                                        >
                                            <span className="text-[10px] font-mono text-neutral-400">
                                                {(idx + 1).toString().padStart(2, '0')}
                                            </span>
                                            <span className="text-xs font-mono uppercase font-bold tracking-wider text-neutral-900 dark:text-neutral-100">
                                                {section.type}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {/* Visibility Toggle */}
                                            <button
                                                type="button"
                                                onClick={() => handleToggleVisibility(section)}
                                                className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                                                title={section.is_visible ? 'Hide Section' : 'Show Section'}
                                            >
                                                {section.is_visible ? (
                                                    <Eye className="w-3.5 h-3.5" />
                                                ) : (
                                                    <EyeOff className="w-3.5 h-3.5 text-neutral-500" />
                                                )}
                                            </button>

                                            {/* Move Up */}
                                            <button
                                                type="button"
                                                onClick={() => handleMoveUp(idx)}
                                                disabled={idx === 0}
                                                className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white disabled:opacity-20"
                                                title="Move Up"
                                            >
                                                <ArrowUp className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Move Down */}
                                            <button
                                                type="button"
                                                onClick={() => handleMoveDown(idx)}
                                                disabled={idx === sections.length - 1}
                                                className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white disabled:opacity-20"
                                                title="Move Down"
                                            >
                                                <ArrowDown className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Edit */}
                                            <button
                                                type="button"
                                                onClick={() => setEditingSection(section)}
                                                className="p-1 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
                                                title="Edit Section Content"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Delete */}
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteSection(section.id)}
                                                className="p-1 text-neutral-400 hover:text-red-500"
                                                title="Delete Section"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {section.title && (
                                        <p className="text-[11px] font-sans text-neutral-600 dark:text-neutral-400 truncate">
                                            {section.title}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Bottom Drawer Info */}
                    <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-[11px] font-mono text-neutral-500 space-y-1">
                        <div>Website ID: #{website.id}</div>
                        <div>Public Route: /sites/{website.slug}</div>
                    </div>
                </aside>

                {/* Right Pane: Live Website Preview */}
                <main className="flex-1 bg-neutral-200/50 dark:bg-neutral-950/80 p-4 md:p-8 overflow-y-auto flex justify-center">
                    <div
                        className={`transition-all duration-200 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 shadow-xl overflow-y-auto min-h-full ${
                            viewMode === 'mobile'
                                ? 'w-[375px] max-w-full rounded-2xl border-4 border-neutral-800 my-4'
                                : 'w-full max-w-6xl'
                        }`}
                    >
                        {/* Live Rendered Sections */}
                        {sections
                            .filter((s) => s.is_visible)
                            .map((section) => (
                                <SectionRenderer
                                    key={section.id}
                                    section={section}
                                    themeSettings={website.theme_settings}
                                    businessName={website.business_name}
                                />
                            ))}

                        {sections.filter((s) => s.is_visible).length === 0 && (
                            <div className="text-center py-20 text-neutral-500 font-mono text-xs">
                                All sections hidden or removed. Add a section from the left panel.
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Add Section Modal */}
            {isAddSectionOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 p-6 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
                            <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-neutral-900 dark:text-neutral-100">
                                Add Section
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsAddSectionOpen(false)}
                                className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-xs font-mono"
                            >
                                Close
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                            {SECTION_TEMPLATES.map((tmpl) => (
                                <button
                                    key={tmpl.type}
                                    type="button"
                                    onClick={() => handleAddSection(tmpl.type)}
                                    className="p-3 text-left border border-neutral-200 dark:border-neutral-800 hover:border-neutral-900 dark:hover:border-neutral-400 bg-neutral-50 dark:bg-neutral-950 transition-colors flex items-center justify-between"
                                >
                                    <div>
                                        <div className="text-xs font-mono font-bold uppercase text-neutral-900 dark:text-neutral-100">
                                            {tmpl.title}
                                        </div>
                                        <div className="text-[11px] text-neutral-500 font-sans">
                                            {tmpl.desc}
                                        </div>
                                    </div>
                                    <Plus className="w-4 h-4 text-neutral-400 shrink-0" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Section Modal */}
            <SectionEditModal
                isOpen={!!editingSection}
                onClose={() => setEditingSection(null)}
                section={editingSection}
                onSectionUpdated={handleSectionUpdated}
            />
        </div>
    );
}
