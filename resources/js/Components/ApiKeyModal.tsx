import React, { useState, useEffect } from 'react';
import { Key, Shield, Check, X } from 'lucide-react';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    hasServerKey: boolean;
    onSaveKey: (key: string) => void;
    currentKey: string;
}

export default function ApiKeyModal({
    isOpen,
    onClose,
    hasServerKey,
    onSaveKey,
    currentKey,
}: ApiKeyModalProps) {
    const [apiKey, setApiKey] = useState(currentKey);

    useEffect(() => {
        setApiKey(currentKey);
    }, [currentKey]);

    if (!isOpen) return null;

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSaveKey(apiKey.trim());
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-none shadow-2xl p-6">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />
                        <h3 className="text-sm font-mono uppercase tracking-wider font-bold text-neutral-900 dark:text-neutral-100">
                            Gemini API Settings
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

                <form onSubmit={handleSave} className="mt-4 space-y-4">
                    <div className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">
                        {hasServerKey ? (
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-neutral-100 dark:bg-neutral-950 p-2 border border-neutral-200 dark:border-neutral-800">
                                <Check className="w-3.5 h-3.5" />
                                <span>Default server API key is active. Override below if desired.</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-neutral-500 bg-neutral-100 dark:bg-neutral-950 p-2 border border-neutral-200 dark:border-neutral-800">
                                <Shield className="w-3.5 h-3.5 text-neutral-400" />
                                <span>No server key configured. Provide an API key or use deterministic offline generator.</span>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                            Custom Gemini API Key
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="w-full text-xs font-mono p-2.5 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white rounded-none"
                        />
                        <p className="mt-1 text-[11px] text-neutral-500 font-mono">
                            Key is stored only in local session memory and sent securely via headers.
                        </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 text-xs font-mono uppercase border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-none"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-1.5 text-xs font-mono uppercase font-bold bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-900 rounded-none transition-colors"
                        >
                            Save Key
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
