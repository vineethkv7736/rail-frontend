// Web Speech API wrapper for speech recognition and synthesis
// Browser compatibility: Chrome, Edge (best support), Safari (limited), Firefox (varies)

export interface SpeechRecognitionConfig {
    language?: string;
    continuous?: boolean;
    interimResults?: boolean;
    maxAlternatives?: number;
}

export interface SpeechRecognitionResult {
    transcript: string;
    confidence: number;
    isFinal: boolean;
}

// Type declarations for Web Speech API
declare global {
    interface Window {
        SpeechRecognition: any; // eslint-disable-line @typescript-eslint/no-explicit-any
        webkitSpeechRecognition: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    }
}

/**
 * Check if speech recognition is supported
 */
export function isSpeechRecognitionSupported(): boolean {
    return typeof window !== 'undefined' && 
           ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

/**
 * Check if speech synthesis is supported
 */
export function isSpeechSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Create a speech recognition instance
 */
export function createSpeechRecognition(
    config: SpeechRecognitionConfig = {}
): any | null { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!isSpeechRecognitionSupported()) {
        console.warn('Speech recognition not supported in this browser');
        return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // Configure recognition
    recognition.lang = config.language || 'en-US';
    recognition.continuous = config.continuous ?? false;
    recognition.interimResults = config.interimResults ?? true;
    recognition.maxAlternatives = config.maxAlternatives ?? 1;

    return recognition;
}

/**
 * Get language code for speech recognition
 * Converts ISO 639-1 to BCP 47 format (e.g., 'hi' -> 'hi-IN')
 */
export function getSpeechRecognitionLanguage(languageCode: string): string {
    const languageMap: Record<string, string> = {
        'hi': 'hi-IN',
        'bn': 'bn-IN',
        'ta': 'ta-IN',
        'te': 'te-IN',
        'mr': 'mr-IN',
        'gu': 'gu-IN',
        'kn': 'kn-IN',
        'ml': 'ml-IN',
        'pa': 'pa-IN',
        'ur': 'ur-IN',
        'en': 'en-US',
    };

    return languageMap[languageCode] || 'en-US';
}

/**
 * Get available voices for a language
 */
export function getVoicesForLanguage(languageCode: string): SpeechSynthesisVoice[] {
    if (!isSpeechSynthesisSupported()) {
        return [];
    }

    const voices = window.speechSynthesis.getVoices();
    const speechLang = getSpeechRecognitionLanguage(languageCode);
    
    // Match by language code (e.g., 'hi-IN' or 'hi')
    return voices.filter(voice => 
        voice.lang.startsWith(languageCode) || 
        voice.lang === speechLang
    );
}

/**
 * Speak text using speech synthesis
 */
export function speakText(
    text: string,
    languageCode: string = 'en',
    onEnd?: () => void,
    onError?: (error: Error) => void
): void {
    if (!isSpeechSynthesisSupported()) {
        console.warn('Speech synthesis not supported');
        onError?.(new Error('Speech synthesis not supported'));
        return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getSpeechRecognitionLanguage(languageCode);

    // Try to find a voice for the language
    const voices = getVoicesForLanguage(languageCode);
    if (voices.length > 0) {
        // Prefer local voices, then remote
        const localVoice = voices.find(v => v.localService);
        utterance.voice = localVoice || voices[0];
    }

    // Set speech parameters
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Event handlers
    utterance.onend = () => {
        onEnd?.();
    };

    utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        onError?.(new Error(event.error));
    };

    window.speechSynthesis.speak(utterance);
}

/**
 * Stop current speech synthesis
 */
export function stopSpeaking(): void {
    if (isSpeechSynthesisSupported()) {
        window.speechSynthesis.cancel();
    }
}

/**
 * Pause current speech synthesis
 */
export function pauseSpeaking(): void {
    if (isSpeechSynthesisSupported()) {
        window.speechSynthesis.pause();
    }
}

/**
 * Resume paused speech synthesis
 */
export function resumeSpeaking(): void {
    if (isSpeechSynthesisSupported()) {
        window.speechSynthesis.resume();
    }
}

/**
 * Load voices (needed for some browsers)
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
        if (!isSpeechSynthesisSupported()) {
            resolve([]);
            return;
        }

        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            resolve(voices);
            return;
        }

        // Some browsers load voices asynchronously
        window.speechSynthesis.onvoiceschanged = () => {
            resolve(window.speechSynthesis.getVoices());
        };
    });
}
