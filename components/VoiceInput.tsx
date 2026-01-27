         'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import { 
    createSpeechRecognition, 
    isSpeechRecognitionSupported,
    getSpeechRecognitionLanguage,
    type SpeechRecognitionResult 
} from '@/lib/speech';

interface VoiceInputProps {
    language: string;
    onTranscript: (transcript: string, language: string) => void;
    onError?: (error: string) => void;
    disabled?: boolean;
}

export default function VoiceInput({ language, onTranscript, onError, disabled }: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [isSupported] = useState(isSpeechRecognitionSupported());
    const recognitionRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    const shouldAutoStartRef = useRef(true);

    // Auto-start listening when component mounts or when re-enabled
    useEffect(() => {
        if (!disabled && isSupported && shouldAutoStartRef.current) {
            // Small delay to ensure component is ready
            const timer = setTimeout(() => {
                startListening();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [disabled, isSupported]);

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            shouldAutoStartRef.current = false;
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const startListening = () => {
        if (!isSupported) {
            onError?.('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
            return;
        }

        // Determine language for recognition
        const recognitionLanguage = language === 'auto' 
            ? 'hi-IN' // Default to Hindi for auto-detect
            : getSpeechRecognitionLanguage(language);

        const recognition = createSpeechRecognition({
            language: recognitionLanguage,
            continuous: true, // Enable continuous listening
            interimResults: true,
            maxAlternatives: 1,
        });

        if (!recognition) {
            onError?.('Failed to initialize speech recognition');
            return;
        }

        recognitionRef.current = recognition;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            const result = event.results[event.results.length - 1];
            const transcript = result[0].transcript;
            const isFinal = result.isFinal;

            if (isFinal && transcript.trim()) {
                onTranscript(transcript, language);
                // Don't stop - keep listening continuously
            }
        };

        recognition.onerror = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
            
            let errorMessage = 'Speech recognition error';
            switch (event.error) {
                case 'no-speech':
                    errorMessage = 'No speech detected. Please try again.';
                    break;
                case 'audio-capture':
                    errorMessage = 'Microphone not accessible. Please check permissions.';
                    break;
                case 'not-allowed':
                    errorMessage = 'Microphone permission denied. Please allow microphone access.';
                    break;
                case 'network':
                    errorMessage = 'Network error. Please check your connection.';
                    break;
                default:
                    errorMessage = `Speech recognition error: ${event.error}`;
            }
            
            onError?.(errorMessage);
        };

        recognition.onend = () => {
            setIsListening(false);
            // Auto-restart if not disabled and component is still mounted
            if (!disabled && shouldAutoStartRef.current) {
                setTimeout(() => {
                    if (!disabled && shouldAutoStartRef.current) {
                        startListening();
                    }
                }, 500);
            }
        };

        try {
            recognition.start();
        } catch (error) {
            console.error('Failed to start recognition:', error);
            setIsListening(false);
            onError?.('Failed to start speech recognition');
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsListening(false);
    };

    const handleClick = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    if (!isSupported) {
        return (
            <button
                disabled
                className="p-2 rounded-full bg-white/5 text-gray-600 cursor-not-allowed"
                title="Speech recognition not supported"
            >
                <MicOff className="w-5 h-5" />
            </button>
        );
    }

    return (
        <motion.button
            onClick={handleClick}
            disabled={disabled}
            className={`relative p-2 rounded-full transition-all ${
                isListening
                    ? 'bg-red-500 text-white'
                    : disabled
                    ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                    : 'bg-white/5 hover:bg-white/10 text-railway-blue'
            }`}
            title={isListening ? 'Listening... (click to stop)' : 'Click to start listening'}
            whileTap={{ scale: 0.95 }}
        >
            {isListening ? (
                <>
                    <Mic className="w-5 h-5" />
                    {/* Pulsing animation */}
                    <motion.span
                        className="absolute inset-0 rounded-full bg-red-500"
                        animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.5, 0, 0.5],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                </>
            ) : (
                <Mic className="w-5 h-5" />
            )}
        </motion.button>
    );
}
