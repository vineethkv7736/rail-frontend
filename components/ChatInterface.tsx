'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Bot, Loader2, Volume2, VolumeX, Code, AlertCircle, Mic } from 'lucide-react';
import { api, ChatResponse } from '@/lib/api';
import LiveStatusCard from './LiveStatusCard';
import LanguageSelector from './LanguageSelector';
import VoiceInput from './VoiceInput';
import { detectLanguage, translateToEnglish, translateFromEnglish, getLanguageName } from '@/lib/translation';
import { synthesizeSpeech, getSpeechLanguageCode } from '@/lib/googleSpeech';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    originalContent?: string; // Content before translation
    language?: string; // Language code
    data?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'assistant', content: 'Welcome to RailPro! How can I help you with your journey today?', language: 'en' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const isMutedRef = useRef(isMuted); // Track latest state for async callbacks
    const [showDebug, setShowDebug] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('auto');
    const [continuousListening, setContinuousListening] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState(() => {
        if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
        }
        return Date.now().toString(); // Fallback
    });
    const [inputMode, setInputMode] = useState<'voice' | 'typing'>('voice'); // Start with voice mode
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Keep ref in sync and handle pause/resume
    useEffect(() => {
        isMutedRef.current = isMuted;
        if (isMuted) {
            api.pauseAudio();
            // Stop Google TTS audio
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }
        } else {
            api.resumeAudio();
        }
    }, [isMuted]);

    // Helper function to check if message is a conversation reset trigger
    const isResetTrigger = (text: string): boolean => {
        const normalizedText = text.toLowerCase().trim();
        const triggers = [
            'hey railpro',
            'hey rail pro',
            'hi railpro',
            'hi rail pro',
            'thank you',
            'thanks',
            'thankyou'
        ];
        return triggers.some(trigger => normalizedText.includes(trigger));
    };

    // Reset conversation - clear messages and generate new session ID
    const resetConversation = () => {
        // Generate new session ID
        const newSessionId = typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID
            ? window.crypto.randomUUID()
            : Date.now().toString();
        
        setSessionId(newSessionId);
        
        // Reset messages to initial welcome message
        setMessages([{
            id: '1',
            role: 'assistant',
            content: 'Welcome to RailPro! How can I help you with your journey today?',
            language: 'en'
        }]);
        
        // Stop any playing audio
        api.stopAudio();
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
        }
    };

    const handleSend = async (textInput?: string, detectedLang?: string) => {
        const messageText = textInput || input.trim();
        if (!messageText || isLoading) return;

        // Check if this is a reset trigger phrase
        if (isResetTrigger(messageText)) {
            setInput('');
            resetConversation();
            return;
        }

        setError(null);
        setIsLoading(true);

        try {
            // Determine the language
            let userLanguage = detectedLang || selectedLanguage;
            let originalText = messageText;
            let englishText = messageText;

            // Auto-detect language if needed
            if (userLanguage === 'auto') {
                const detection = await detectLanguage(messageText);
                userLanguage = detection.language;
            }

            // Translate to English if not already English
            if (userLanguage !== 'en') {
                const translation = await translateToEnglish(messageText, userLanguage);
                englishText = translation.translatedText;
                if (translation.detectedSourceLanguage) {
                    userLanguage = translation.detectedSourceLanguage;
                }
            }

            const userMessage: Message = {
                id: Date.now().toString(),
                role: 'user',
                content: originalText,
                originalContent: userLanguage !== 'en' ? originalText : undefined,
                language: userLanguage
            };

            setMessages(prev => [...prev, userMessage]);
            setInput('');

            // Send English text to API
            const response = await api.chat({
                message: englishText,
                session_id: sessionId
            });

            // Translate response back to user's language
            let responseText = response.response;
            console.log('API Response (English):', response.response);
            console.log('User Language:', userLanguage);
            
            if (userLanguage !== 'en') {
                responseText = await translateFromEnglish(response.response, userLanguage);
                console.log('Translated Response:', responseText);
            }

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responseText,
                originalContent: userLanguage !== 'en' ? response.response : undefined,
                language: userLanguage,
                data: response.debug_info?.raw_api_response
            };

            setMessages(prev => [...prev, assistantMessage]);

            // Use Google Cloud TTS for audio output in user's language
            console.log('Synthesizing speech:', responseText, 'in language:', userLanguage);
            if (!isMutedRef.current) {
                try {
                    const speechLanguageCode = getSpeechLanguageCode(userLanguage);
                    const audioUrl = await synthesizeSpeech(responseText, speechLanguageCode, 'Standard');
                    
                    // Play the audio
                    const audio = new Audio(audioUrl);
                    currentAudioRef.current = audio;
                    audio.play().catch(err => {
                        console.error('Audio playback error:', err);
                    });
                } catch (err) {
                    console.error('Speech synthesis error:', err);
                }
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I'm sorry, I'm having trouble connecting to the server. Please try again.",
                language: 'en'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVoiceInput = (transcript: string, language: string) => {
        setInput(transcript);
        // Auto-send voice input
        handleSend(transcript, language);
        // Stay in voice mode after sending
        setInputMode('voice');
    };

    const handleVoiceError = (errorMessage: string) => {
        setError(errorMessage);
        setTimeout(() => setError(null), 5000);
    };

    return (
        <div className="flex flex-col h-screen w-full mx-auto p-2 sm:p-4 md:p-6 max-w-7xl">

            {/* Header / Brand - Responsive */}
            <div className="flex items-center justify-between p-3 sm:p-4 mb-3 sm:mb-4 glass rounded-2xl sm:rounded-full px-4 sm:px-6 flex-wrap sm:flex-nowrap gap-2">
                <div className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-railway-orange to-railway-blue whitespace-nowrap">
                    RailPro AI
                </div>

                {/* Controls - Responsive */}
                <div className="flex items-center gap-1 sm:gap-2">
                    <LanguageSelector 
                        selectedLanguage={selectedLanguage}
                        onLanguageChange={setSelectedLanguage}
                    />
                    <button
                        onClick={() => setShowDebug(!showDebug)}
                        className={`p-2 rounded-full transition-colors ${showDebug ? 'bg-railway-blue/20 text-railway-blue' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Toggle Debug View"
                    >
                        <Code className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className={`p-2 rounded-full transition-colors ${isMuted ? 'text-gray-400' : 'text-railway-blue'}`}
                        title={isMuted ? "Unmute Audio" : "Mute Audio"}
                    >
                        {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-3 sm:mb-4 p-3 glass-card border-l-4 border-l-red-500 flex items-center gap-2 text-xs sm:text-sm"
                    >
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span className="text-red-200">{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Continuous Listening Toggle */}
            <div className="flex items-center justify-center gap-2 mb-2 sm:mb-3">
                <button
                    onClick={() => setContinuousListening(!continuousListening)}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm transition-all ${
                        continuousListening 
                            ? 'bg-railway-orange/20 text-railway-orange border border-railway-orange/50' 
                            : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                    }`}
                >
                    <Mic className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{continuousListening ? 'Continuous Listening ON' : 'Continuous Listening OFF'}</span>
                    <span className="sm:hidden">{continuousListening ? 'Always ON' : 'Manual'}</span>
                </button>
            </div>

            {/* Chat Area - Improved Mobile Scrolling */}
            <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 pr-1 sm:pr-2 hide-scrollbar pb-4">
                <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                        >
                            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
                                <div
                                    className={`max-w-[90%] sm:max-w-[85%] p-3 sm:p-4 rounded-2xl shadow-lg relative text-sm sm:text-base ${msg.role === 'user'
                                        ? 'bg-railway-blue text-white rounded-br-none'
                                        : 'glass-card text-gray-100 rounded-bl-none'
                                        }`}
                                >
                                    {msg.role === 'assistant' && (
                                        <Bot className="w-4 h-4 sm:w-5 sm:h-5 absolute -left-6 sm:-left-8 top-2 text-railway-blue opacity-80 hidden sm:block" />
                                    )}
                                    
                                    {/* Language indicator */}
                                    {msg.language && msg.language !== 'en' && (
                                        <div className="text-xs opacity-60 mb-2">
                                            {getLanguageName(msg.language)}
                                        </div>
                                    )}
                                    
                                    <div className="prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed prose-p:my-1 prose-headings:my-2">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>

                                    {/* Render Rich Content if available */}
                                    {msg.data && (
                                        <div className="mt-3 sm:mt-4">
                                            <LiveStatusCard data={msg.data} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Debug Info View */}
                            {showDebug && msg.data && msg.role === 'assistant' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="max-w-[90%] sm:max-w-[85%] w-full mt-2"
                                >
                                    <div className="glass-card p-2 sm:p-3 rounded-xl text-xs font-mono text-gray-300 overflow-x-auto border border-white/10">
                                        <div className="flex items-center gap-2 mb-2 text-railway-orange opacity-80">
                                            <Code className="w-3 h-3" />
                                            <span className="font-bold">API Response</span>
                                        </div>
                                        <pre className="text-xs">{JSON.stringify(msg.data, null, 2)}</pre>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                        {isLoading && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex justify-start ml-2"
                            >
                                <div className="glass-card p-3 rounded-2xl flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-railway-blue" />
                                    <span className="text-xs sm:text-sm text-gray-400">Processing...</span>
                                </div>
                            </motion.div>
                        )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Voice-First Design */}
            <div className="mt-3 sm:mt-4 relative">
                {/* Input Mode Indicator */}
                <AnimatePresence>
                    {inputMode === 'voice' && !isLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full bg-railway-blue/20 text-railway-blue text-xs sm:text-sm flex items-center gap-2"
                        >
                            <Mic className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>Voice mode active - Click mic to speak</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="glass p-2 sm:p-2 rounded-2xl sm:rounded-full flex items-center gap-2 px-3 sm:px-4 shadow-2xl">
                    <VoiceInput
                        language={selectedLanguage}
                        onTranscript={handleVoiceInput}
                        onError={handleVoiceError}
                        disabled={isLoading || inputMode === 'typing'}
                        continuousMode={continuousListening}
                    />
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onFocus={() => setInputMode('typing')}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleSend();
                                setInputMode('voice'); // Return to voice mode after sending
                            }
                        }}
                        placeholder={inputMode === 'voice' ? "Click mic to speak or type here..." : "Type your message..."}
                        className="flex-1 bg-transparent border-none outline-none text-white p-2 placeholder-gray-500 text-sm sm:text-base"
                        disabled={isLoading}
                    />
                    <button
                        onClick={() => {
                            handleSend();
                            setInputMode('voice'); // Return to voice mode after sending
                        }}
                        disabled={isLoading || !input.trim()}
                        className={`p-2 sm:p-3 rounded-full transition-all ${input.trim() ? 'bg-railway-orange text-white shadow-lg hover:bg-railway-orange/90' : 'bg-white/5 text-gray-500'
                            }`}
                    >
                        <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
