'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Bot, Loader2, Volume2, VolumeX, Code } from 'lucide-react';
import { api, ChatResponse } from '@/lib/api';
import LiveStatusCard from './LiveStatusCard';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    data?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'assistant', content: 'Welcome to RailPro! How can I help you with your journey today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const isMutedRef = useRef(isMuted); // Track latest state for async callbacks
    const [showDebug, setShowDebug] = useState(false);
    const [sessionId] = useState(() => {
        if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
        }
        return Date.now().toString(); // Fallback
    });
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
        } else {
            api.resumeAudio();
        }
    }, [isMuted]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await api.chat({
                message: userMessage.content,
                session_id: sessionId
            });

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.response,
                data: response.debug_info?.raw_api_response
            };

            setMessages(prev => [...prev, assistantMessage]);

            // Always load audio, but only play if not muted
            if (response.audio_url) {
                api.playAudio(response.audio_url, !isMutedRef.current);
            }
        } catch (error) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I'm sorry, I'm having trouble connecting to the server. Please try again."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen max-w-4xl mx-auto p-4 md:p-6">

            {/* Header / Brand */}
            <div className="flex items-center justify-between p-4 mb-4 glass rounded-full px-6">
                <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-railway-orange to-railway-blue">
                    RailPro AI
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowDebug(!showDebug)}
                        className={`p-2 rounded-full transition-colors ${showDebug ? 'bg-railway-blue/20 text-railway-blue' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Toggle Debug View"
                    >
                        <Code className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className={`p-2 rounded-full transition-colors ${isMuted ? 'text-gray-400' : 'text-railway-blue'}`}
                        title={isMuted ? "Unmute TTS" : "Mute TTS"}
                    >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 hide-scrollbar pb-20">
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
                                    className={`max-w-[85%] p-4 rounded-2xl shadow-lg relative ${msg.role === 'user'
                                        ? 'bg-railway-blue text-white rounded-br-none'
                                        : 'glass-card text-gray-100 rounded-bl-none'
                                        }`}
                                >
                                    {msg.role === 'assistant' && (
                                        <Bot className="w-5 h-5 absolute -left-8 top-2 text-railway-blue opacity-80" />
                                    )}
                                    <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>

                                    {/* Render Rich Content if available */}
                                    {msg.data && (
                                        <div className="mt-4">
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
                                    className="max-w-[85%] w-full mt-2"
                                >
                                    <div className="glass-card p-3 rounded-xl text-xs font-mono text-gray-300 overflow-x-auto border border-white/10">
                                        <div className="flex items-center gap-2 mb-2 text-railway-orange opacity-80">
                                            <Code className="w-3 h-3" />
                                            <span className="font-bold">API Response</span>
                                        </div>
                                        <pre>{JSON.stringify(msg.data, null, 2)}</pre>
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
                            <span className="text-sm text-gray-400">Processing...</span>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="mt-4 relative">
                <div className="glass p-2 rounded-full flex items-center gap-2 px-4 shadow-2xl">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask about trains, live status, or seats..."
                        className="flex-1 bg-transparent border-none outline-none text-white p-2 placeholder-gray-500"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className={`p-3 rounded-full transition-all ${input.trim() ? 'bg-railway-orange text-white shadow-lg' : 'bg-white/5 text-gray-500'
                            }`}
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
