import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, Plus, Trash2, Sparkles, Check } from 'lucide-react';
import axios from 'axios';
import { Section } from '@/types';

interface SectionEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    section: Section | null;
    onSectionUpdated: (updatedSection: Section) => void;
}

export default function SectionEditModal({
    isOpen,
    onClose,
    section,
    onSectionUpdated,
}: SectionEditModalProps) {
    if (!isOpen || !section) return null;

    const [title, setTitle] = useState(section.title || '');
    const [subtitle, setSubtitle] = useState(section.subtitle || '');
    const [content, setContent] = useState<any>(section.content || {});
    const [isSaving, setIsSaving] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [regenPrompt, setRegenPrompt] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        setTitle(section.title || '');
        setSubtitle(section.subtitle || '');
        setContent(section.content || {});
        setMessage('');
    }, [section]);

    const handleContentFieldChange = (key: string, value: any) => {
        setContent((prev: any) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage('');

        try {
            const res = await axios.put(`/api/sections/${section.id}`, {
                title,
                subtitle,
                content,
                is_visible: section.is_visible,
            });

            if (res.data.success && res.data.section) {
                onSectionUpdated(res.data.section);
                setMessage('Section saved successfully.');
                setTimeout(() => {
                    onClose();
                }, 400);
            }
        } catch (err: any) {
            console.error('Error saving section:', err);
            setMessage('Failed to save section changes.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRegenerate = async () => {
        setIsRegenerating(true);
        setMessage('Regenerating section content with AI / template...');

        try {
            const customKey = localStorage.getItem('gemini_custom_key') || undefined;
            const res = await axios.post(`/api/sections/${section.id}/regenerate`, {
                prompt: regenPrompt || undefined,
                api_key: customKey,
            });

            if (res.data.success && res.data.section) {
                const refreshed = res.data.section;
                setTitle(refreshed.title || '');
                setSubtitle(refreshed.subtitle || '');
                setContent(refreshed.content || {});
                onSectionUpdated(refreshed);
                setMessage('Section refreshed with newly generated copy!');
            }
        } catch (err: any) {
            console.error('Regenerate error:', err);
            setMessage('Error regenerating section.');
        } finally {
            setIsRegenerating(false);
        }
    };

    // Item management helpers for services/plans/items
    const itemsKey = content.services ? 'services' : content.plans ? 'plans' : content.testimonials ? 'testimonials' : content.items ? 'items' : null;
    const currentItems: any[] = itemsKey ? content[itemsKey] || [] : [];

    const handleUpdateItem = (index: number, field: string, val: any) => {
        if (!itemsKey) return;
        const updated = [...currentItems];
        updated[index] = { ...updated[index], [field]: val };
        handleContentFieldChange(itemsKey, updated);
    };

    const handleAddItem = () => {
        if (!itemsKey) return;
        const newItem = {
            title: 'New Service Item',
            name: 'New Tier Plan',
            description: 'Item description detailing capabilities and offerings.',
            price: '$99',
            features: ['Dedicated support', 'Quality guarantee']
        };
        handleContentFieldChange(itemsKey, [...currentItems, newItem]);
    };

    const handleRemoveItem = (index: number) => {
        if (!itemsKey) return;
        const updated = currentItems.filter((_, i) => i !== index);
        handleContentFieldChange(itemsKey, updated);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 shadow-2xl rounded-none flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-neutral-900 dark:bg-white inline-block" />
                        <h3 className="text-sm font-mono uppercase tracking-wider font-bold text-neutral-900 dark:text-neutral-100">
                            Edit Section: <span className="underline">{section.type}</span>
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body Form */}
                <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-mono">
                    {/* AI Regenerate Prompt Bar */}
                    <div className="border border-neutral-300 dark:border-neutral-700 p-3 bg-neutral-100/60 dark:bg-neutral-950/60 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-bold flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200 uppercase">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                Single-Section AI Regeneration
                            </span>
                            <button
                                type="button"
                                onClick={handleRegenerate}
                                disabled={isRegenerating}
                                className="px-3 py-1 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 uppercase font-bold hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5 rounded-none"
                            >
                                <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                                <span>{isRegenerating ? 'Regenerating...' : 'Regenerate Section'}</span>
                            </button>
                        </div>
                        <input
                            type="text"
                            value={regenPrompt}
                            onChange={(e) => setRegenPrompt(e.target.value)}
                            placeholder="Optional instructions: e.g. Make it more concise, emphasize boutique experience..."
                            className="w-full p-2 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white rounded-none"
                        />
                    </div>

                    {message && (
                        <div className="p-2.5 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{message}</span>
                        </div>
                    )}

                    {/* Standard Title & Subtitle */}
                    <div className="space-y-4">
                        <div>
                            <label className="block uppercase text-neutral-600 dark:text-neutral-400 mb-1">
                                Section Title / Header
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full p-2.5 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white rounded-none"
                            />
                        </div>

                        <div>
                            <label className="block uppercase text-neutral-600 dark:text-neutral-400 mb-1">
                                Subtitle / Supporting Headline
                            </label>
                            <input
                                type="text"
                                value={subtitle}
                                onChange={(e) => setSubtitle(e.target.value)}
                                className="w-full p-2.5 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white rounded-none"
                            />
                        </div>
                    </div>

                    {/* Specific Content Type Inputs */}
                    {section.type === 'hero' && (
                        <div className="space-y-4 border-t border-neutral-200 dark:border-neutral-800 pt-4">
                            <div>
                                <label className="block uppercase text-neutral-600 dark:text-neutral-400 mb-1">Headline</label>
                                <input
                                    type="text"
                                    value={content.headline || ''}
                                    onChange={(e) => handleContentFieldChange('headline', e.target.value)}
                                    className="w-full p-2 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white rounded-none"
                                />
                            </div>
                            <div>
                                <label className="block uppercase text-neutral-600 dark:text-neutral-400 mb-1">Subheadline</label>
                                <textarea
                                    rows={2}
                                    value={content.subheadline || ''}
                                    onChange={(e) => handleContentFieldChange('subheadline', e.target.value)}
                                    className="w-full p-2 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white rounded-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block uppercase text-neutral-600 dark:text-neutral-400 mb-1">Primary CTA</label>
                                    <input
                                        type="text"
                                        value={content.primary_cta || ''}
                                        onChange={(e) => handleContentFieldChange('primary_cta', e.target.value)}
                                        className="w-full p-2 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 rounded-none"
                                    />
                                </div>
                                <div>
                                    <label className="block uppercase text-neutral-600 dark:text-neutral-400 mb-1">Secondary CTA</label>
                                    <input
                                        type="text"
                                        value={content.secondary_cta || ''}
                                        onChange={(e) => handleContentFieldChange('secondary_cta', e.target.value)}
                                        className="w-full p-2 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 rounded-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {section.type === 'about' && (
                        <div className="space-y-4 border-t border-neutral-200 dark:border-neutral-800 pt-4">
                            <div>
                                <label className="block uppercase text-neutral-600 dark:text-neutral-400 mb-1">Our Story</label>
                                <textarea
                                    rows={4}
                                    value={content.story || ''}
                                    onChange={(e) => handleContentFieldChange('story', e.target.value)}
                                    className="w-full p-2 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 rounded-none"
                                />
                            </div>
                            <div>
                                <label className="block uppercase text-neutral-600 dark:text-neutral-400 mb-1">Mission Statement</label>
                                <input
                                    type="text"
                                    value={content.mission || ''}
                                    onChange={(e) => handleContentFieldChange('mission', e.target.value)}
                                    className="w-full p-2 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 rounded-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Array Items Editor (Services / Plans / Cards) */}
                    {itemsKey && (
                        <div className="space-y-4 border-t border-neutral-200 dark:border-neutral-800 pt-4">
                            <div className="flex items-center justify-between">
                                <span className="uppercase font-bold text-neutral-800 dark:text-neutral-200">
                                    Section Items ({currentItems.length})
                                </span>
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono uppercase border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-none"
                                >
                                    <Plus className="w-3 h-3" />
                                    <span>Add Item</span>
                                </button>
                            </div>

                            <div className="space-y-3">
                                {currentItems.map((item, i) => (
                                    <div
                                        key={i}
                                        className="p-3 border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 space-y-2 relative"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-neutral-400">#{(i + 1).toString().padStart(2, '0')}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(i)}
                                                className="text-neutral-400 hover:text-red-500 p-0.5"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                type="text"
                                                value={item.title || item.name || item.question || ''}
                                                onChange={(e) => handleUpdateItem(i, item.title !== undefined ? 'title' : item.name !== undefined ? 'name' : 'question', e.target.value)}
                                                placeholder="Title / Name / Question"
                                                className="p-1.5 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-none"
                                            />
                                            <input
                                                type="text"
                                                value={item.price || item.author || ''}
                                                onChange={(e) => handleUpdateItem(i, item.price !== undefined ? 'price' : 'author', e.target.value)}
                                                placeholder="Price or Author"
                                                className="p-1.5 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-none"
                                            />
                                        </div>

                                        <textarea
                                            rows={2}
                                            value={item.description || item.quote || item.answer || ''}
                                            onChange={(e) => handleUpdateItem(i, item.description !== undefined ? 'description' : item.quote !== undefined ? 'quote' : 'answer', e.target.value)}
                                            placeholder="Description or answer text"
                                            className="w-full p-1.5 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-none"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {section.type === 'contact' && (
                        <div className="space-y-3 border-t border-neutral-200 dark:border-neutral-800 pt-4">
                            <div>
                                <label className="block uppercase text-neutral-600 dark:text-neutral-400 mb-1">Phone</label>
                                <input
                                    type="text"
                                    value={content.phone || ''}
                                    onChange={(e) => handleContentFieldChange('phone', e.target.value)}
                                    className="w-full p-2 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 rounded-none"
                                />
                            </div>
                            <div>
                                <label className="block uppercase text-neutral-600 dark:text-neutral-400 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={content.email || ''}
                                    onChange={(e) => handleContentFieldChange('email', e.target.value)}
                                    className="w-full p-2 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 rounded-none"
                                />
                            </div>
                            <div>
                                <label className="block uppercase text-neutral-600 dark:text-neutral-400 mb-1">Address</label>
                                <input
                                    type="text"
                                    value={content.address || ''}
                                    onChange={(e) => handleContentFieldChange('address', e.target.value)}
                                    className="w-full p-2 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 rounded-none"
                                />
                            </div>
                            <div>
                                <label className="block uppercase text-neutral-600 dark:text-neutral-400 mb-1">Hours</label>
                                <input
                                    type="text"
                                    value={content.hours || ''}
                                    onChange={(e) => handleContentFieldChange('hours', e.target.value)}
                                    className="w-full p-2 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 rounded-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Footer Submit */}
                    <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 uppercase rounded-none"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 px-6 py-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-900 uppercase font-bold transition-colors disabled:opacity-50 rounded-none"
                        >
                            <Save className="w-3.5 h-3.5" />
                            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
