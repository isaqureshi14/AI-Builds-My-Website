import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldCheck, CheckCircle2, ArrowRight, X, ExternalLink } from 'lucide-react';
import { ConflictItem } from '@/types';

interface DisambiguationModalProps {
    isOpen: boolean;
    onClose: () => void;
    conflicts: ConflictItem[];
    securityFlags?: { flag?: string; details?: string; blocked?: boolean }[];
    socialWallPrompt?: { platform?: string; url?: string } | null;
    onResolveAndGenerate: (resolutions: Record<string, string>, manualBio?: string) => void;
    isSubmitting?: boolean;
}

export default function DisambiguationModal({
    isOpen,
    onClose,
    conflicts = [],
    securityFlags = [],
    socialWallPrompt = null,
    onResolveAndGenerate,
    isSubmitting = false,
}: DisambiguationModalProps) {
    const [selectedResolutions, setSelectedResolutions] = useState<Record<string, string>>({});
    const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
    const [manualBio, setManualBio] = useState<string>('');

    // Pre-populate with highest confidence or first value
    useEffect(() => {
        const initial: Record<string, string> = {};
        conflicts.forEach((c) => {
            if (c.values && c.values.length > 0) {
                // sort by confidence desc
                const sorted = [...c.values].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
                initial[c.field_name] = sorted[0].field_value;
            }
        });
        setSelectedResolutions(initial);
    }, [conflicts]);

    if (!isOpen) return null;

    const handleSelectOption = (fieldName: string, value: string) => {
        setSelectedResolutions((prev) => ({
            ...prev,
            [fieldName]: value,
        }));
    };

    const handleCustomChange = (fieldName: string, val: string) => {
        setCustomInputs((prev) => ({ ...prev, [fieldName]: val }));
        setSelectedResolutions((prev) => ({
            ...prev,
            [fieldName]: val,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onResolveAndGenerate(selectedResolutions, manualBio);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 shadow-2xl rounded-none">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                            <AlertTriangle className="w-4 h-4 text-amber-400 dark:text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100 font-mono">
                                Fact Disambiguation & Security Check
                            </h2>
                            <p className="text-xs text-neutral-500 font-mono">
                                Resolve multi-source discrepancies before generating your website
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-1"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content body */}
                <div className="overflow-y-auto p-6 space-y-6 flex-1 text-sm font-sans">
                    {/* Security & Sanitization Flags */}
                    {securityFlags && securityFlags.length > 0 && (
                        <div className="border border-neutral-300 dark:border-neutral-800 p-4 bg-neutral-100/50 dark:bg-neutral-950/50 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span>Ingestion Security Flags (Sanitized)</span>
                            </div>
                            <div className="space-y-1.5">
                                {securityFlags.map((flag, idx) => (
                                    <div
                                        key={idx}
                                        className="text-xs font-mono p-2 border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-start gap-2 text-neutral-700 dark:text-neutral-300"
                                    >
                                        <span className="text-amber-600 dark:text-amber-400 font-bold">[{flag.flag || 'DEFENSE'}]</span>
                                        <span>{flag.details || 'Potential malicious input was neutralized before AI ingestion.'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Social Login Wall Prompt */}
                    {socialWallPrompt && (
                        <div className="border border-neutral-300 dark:border-neutral-700 p-4 bg-neutral-50 dark:bg-neutral-950 space-y-2">
                            <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                                <span className="font-bold flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                    Social Profile Walled ({socialWallPrompt.platform || 'Platform'})
                                </span>
                                <span className="text-[10px] text-neutral-500 font-mono">Protected by Login Gate</span>
                            </div>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                The social profile at <span className="font-mono underline">{socialWallPrompt.url}</span> requires authentication to view full bio details. Paste business bio or about text below:
                            </p>
                            <textarea
                                value={manualBio}
                                onChange={(e) => setManualBio(e.target.value)}
                                placeholder="Paste your bio, about summary, or mission statement here..."
                                rows={3}
                                className="w-full text-xs font-mono p-2.5 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white rounded-none"
                            />
                        </div>
                    )}

                    {/* Conflicts list */}
                    {conflicts.length === 0 && !socialWallPrompt ? (
                        <div className="text-center py-6 text-neutral-500 font-mono text-xs">
                            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                            No conflicting facts detected. All sources agree.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                                Disagreeing Fields ({conflicts.length})
                            </div>

                            {conflicts.map((conflict, cIdx) => (
                                <div
                                    key={cIdx}
                                    className="border border-neutral-300 dark:border-neutral-700 p-4 bg-white dark:bg-neutral-950 space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono uppercase font-bold tracking-wider text-neutral-900 dark:text-neutral-100">
                                            Field: <span className="underline">{conflict.field_name}</span>
                                        </span>
                                        <span className="text-[11px] font-mono text-neutral-500">
                                            {conflict.values?.length || 0} conflicting values found
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {conflict.values?.map((val, vIdx) => {
                                            const isSelected = selectedResolutions[conflict.field_name] === val.field_value;
                                            return (
                                                <button
                                                    key={vIdx}
                                                    type="button"
                                                    onClick={() => handleSelectOption(conflict.field_name, val.field_value)}
                                                    className={`p-3 text-left border transition-all flex flex-col justify-between rounded-none ${
                                                        isSelected
                                                            ? 'border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-800'
                                                            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 bg-neutral-50 dark:bg-neutral-900/50'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300">
                                                            {val.source_name || val.source_type}
                                                        </span>
                                                        {val.confidence && (
                                                            <span className="text-[10px] font-mono text-neutral-400">
                                                                {Math.round(val.confidence * 100)}% conf
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="font-mono text-xs font-semibold text-neutral-900 dark:text-neutral-100 break-all mt-1">
                                                        {val.field_value}
                                                    </div>
                                                    <div className="mt-2 text-right">
                                                        <span className={`text-[10px] font-mono uppercase ${isSelected ? 'font-bold text-neutral-900 dark:text-white' : 'text-neutral-400'}`}>
                                                            {isSelected ? '✓ Selected' : 'Click to select'}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Custom fallback input */}
                                    <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                                        <label className="block text-[11px] font-mono text-neutral-500 mb-1">
                                            Or type custom verified value for {conflict.field_name}:
                                        </label>
                                        <input
                                            type="text"
                                            value={customInputs[conflict.field_name] || ''}
                                            onChange={(e) => handleCustomChange(conflict.field_name, e.target.value)}
                                            placeholder={`Enter custom ${conflict.field_name}`}
                                            className="w-full text-xs font-mono p-2 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white rounded-none"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer action */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-mono uppercase tracking-wider border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-none"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 px-6 py-2 text-xs font-mono uppercase tracking-wider bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-900 font-bold transition-colors disabled:opacity-50 rounded-none shadow-sm"
                    >
                        <span>{isSubmitting ? 'Synthesizing...' : 'Resolve & Generate Website'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
