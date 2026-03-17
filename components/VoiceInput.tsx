'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { AudioRecorder } from '@/lib/audioRecorder';
import { transcribeAudio, getSpeechLanguageCode, isSpeechAPIConfigured } from '@/lib/googleSpeech';

interface VoiceInputProps {
    language: string;
    onTranscript: (transcript: string, language: string) => void;
    onError?: (error: string) => void;
    disabled?: boolean;
    continuousMode?: boolean;
}

export default function VoiceInput({ language, onTranscript, onError, disabled, continuousMode = false }: VoiceInputProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSupported] = useState(() => {
        return typeof window !== 'undefined' && 
               navigator.mediaDevices && 
               navigator.mediaDevices.getUserMedia !== undefined;
    });
    const [isConfigured] = useState(isSpeechAPIConfigured());
    const audioRecorderRef = useRef<AudioRecorder | null>(null);
    const continuousModeRef = useRef(continuousMode);

    // Update ref when continuousMode changes
    useEffect(() => {
        continuousModeRef.current = continuousMode;
    }, [continuousMode]);

    // Auto-start when continuous mode is enabled
    useEffect(() => {
        if (continuousMode && !disabled && isSupported && isConfigured && !isRecording && !isProcessing) {
            const timer = setTimeout(() => {
                startRecording();
            }, 300);
            return () => clearTimeout(timer);
        } else if (!continuousMode && isRecording) {
            // Stop if continuous mode is turned off
            stopRecording();
        }
    }, [continuousMode, disabled]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRecorderRef.current) {
                audioRecorderRef.current.cleanup();
            }
        };
    }, []);

    const startRecording = async () => {
        if (!isSupported) {
            onError?.('Microphone not supported in your browser.');
            return;
        }

        if (!isConfigured) {
            onError?.('Google Speech API not configured. Please add API key to .env.local');
            return;
        }

        if (isRecording || isProcessing) {
            return;
        }

        try {
            // Initialize audio recorder
            if (!audioRecorderRef.current) {
                audioRecorderRef.current = new AudioRecorder();
                await audioRecorderRef.current.initialize();
            }

            // Start recording
            audioRecorderRef.current.startRecording();
            setIsRecording(true);
            console.log('Recording started');

            // In manual mode, auto-stop after 10 seconds
            // In continuous mode, auto-stop after 5 seconds to process
            const maxDuration = continuousModeRef.current ? 5000 : 10000;
            setTimeout(() => {
                if (audioRecorderRef.current?.isRecording()) {
                    stopRecording();
                }
            }, maxDuration);

        } catch (error) {
            console.error('Failed to start recording:', error);
            setIsRecording(false);
            onError?.(error instanceof Error ? error.message : 'Failed to start recording');
        }
    };

    const stopRecording = async () => {
        if (!audioRecorderRef.current || !isRecording) {
            return;
        }

        try {
            setIsRecording(false);
            setIsProcessing(true);

            // Stop recording and get audio blob
            const audioBlob = await audioRecorderRef.current.stopRecording();
            console.log('Recording stopped, processing...');

            // Get language code for Speech API
            // All supported Indian languages for auto-detection
            const allIndianLanguages = [
                'ml-IN', 'hi-IN', 'bn-IN', 'ta-IN', 'te-IN',
                'mr-IN', 'gu-IN', 'kn-IN', 'pa-IN', 'ur-IN',
                'en-IN', 'en-US'
            ];

            let speechLanguageCode: string;
            let altLanguages: string[] | undefined;

            if (language === 'auto') {
                // Use Malayalam as primary, with all others as alternatives
                speechLanguageCode = 'ml-IN';
                altLanguages = allIndianLanguages.filter(l => l !== 'ml-IN');
            } else {
                speechLanguageCode = getSpeechLanguageCode(language);
                altLanguages = undefined;
            }

            // Transcribe audio using Google Speech-to-Text
            const result = await transcribeAudio(audioBlob, speechLanguageCode, altLanguages);
            console.log('Transcription result:', result);

            if (result.transcript) {
                onTranscript(result.transcript, language);
            } else {
                onError?.('No speech detected. Please try again.');
            }

            setIsProcessing(false);

            // In continuous mode, restart recording
            if (continuousModeRef.current && !disabled) {
                setTimeout(() => {
                    if (continuousModeRef.current && !disabled) {
                        startRecording();
                    }
                }, 500);
            }

        } catch (error) {
            console.error('Transcription error:', error);
            setIsProcessing(false);
            
            const errorMessage = error instanceof Error 
                ? error.message 
                : 'Failed to transcribe audio';
            onError?.(errorMessage);

            // In continuous mode, retry after error
            if (continuousModeRef.current && !disabled) {
                setTimeout(() => {
                    if (continuousModeRef.current && !disabled) {
                        startRecording();
                    }
                }, 2000);
            }
        }
    };

    const handleClick = () => {
        if (continuousMode) {
            // In continuous mode, button doesn't do anything
            return;
        }

        if (isRecording) {
            stopRecording();
        } else if (!isProcessing) {
            startRecording();
        }
    };

    if (!isSupported) {
        return (
            <button
                disabled
                className="p-2 rounded-full bg-white/5 text-gray-600 cursor-not-allowed"
                title="Microphone not supported"
            >
                <MicOff className="w-5 h-5" />
            </button>
        );
    }

    if (!isConfigured) {
        return (
            <button
                disabled
                className="p-2 rounded-full bg-white/5 text-gray-600 cursor-not-allowed"
                title="Google Speech API not configured"
            >
                <MicOff className="w-5 h-5" />
            </button>
        );
    }

    return (
        <motion.button
            onClick={handleClick}
            disabled={disabled || continuousMode || isProcessing}
            className={`relative p-2 rounded-full transition-all ${
                isRecording
                    ? 'bg-red-500 text-white'
                    : isProcessing
                    ? 'bg-blue-500 text-white'
                    : disabled
                    ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                    : continuousMode
                    ? 'bg-railway-orange/20 text-railway-orange cursor-default'
                    : 'bg-white/5 hover:bg-white/10 text-railway-blue'
            }`}
            title={
                isProcessing
                    ? 'Processing audio...'
                    : continuousMode 
                    ? 'Continuous mode active (use toggle to disable)' 
                    : isRecording 
                    ? 'Recording... (click to stop)' 
                    : 'Click to start recording'
            }
            whileTap={continuousMode || isProcessing ? {} : { scale: 0.95 }}
        >
            {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : isRecording ? (
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
