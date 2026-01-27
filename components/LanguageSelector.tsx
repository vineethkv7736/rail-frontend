'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Languages, ChevronDown, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/lib/translation';

interface LanguageSelectorProps {
    selectedLanguage: string;
    onLanguageChange: (languageCode: string) => void;
}

export default function LanguageSelector({ selectedLanguage, onLanguageChange }: LanguageSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.language-selector')) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('click', handleClickOutside);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [isOpen]);

    const currentLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === selectedLanguage);
    const displayName = selectedLanguage === 'auto' 
        ? 'Auto Detect' 
        : currentLanguage?.nativeName || 'English';

    return (
        <div className="relative language-selector">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-sm"
                title="Select Language"
            >
                <Languages className="w-4 h-4 text-railway-blue" />
                <span className="hidden sm:inline">{displayName}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-64 glass-card p-2 z-50 max-h-96 overflow-y-auto hide-scrollbar"
                    >
                        {/* Auto Detect Option */}
                        <button
                            onClick={() => {
                                onLanguageChange('auto');
                                setIsOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                                selectedLanguage === 'auto'
                                    ? 'bg-railway-blue/20 text-railway-blue'
                                    : 'hover:bg-white/5 text-gray-300'
                            }`}
                        >
                            <div className="flex flex-col items-start">
                                <span className="font-medium">Auto Detect</span>
                                <span className="text-xs opacity-60">Detect language automatically</span>
                            </div>
                            {selectedLanguage === 'auto' && <Check className="w-4 h-4" />}
                        </button>

                        <div className="h-px bg-white/10 my-2" />

                        {/* Language Options */}
                        {SUPPORTED_LANGUAGES.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => {
                                    onLanguageChange(lang.code);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                                    selectedLanguage === lang.code
                                        ? 'bg-railway-blue/20 text-railway-blue'
                                        : 'hover:bg-white/5 text-gray-300'
                                }`}
                            >
                                <div className="flex flex-col items-start">
                                    <span className="font-medium">{lang.nativeName}</span>
                                    <span className="text-xs opacity-60">{lang.name}</span>
                                </div>
                                {selectedLanguage === lang.code && <Check className="w-4 h-4" />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
