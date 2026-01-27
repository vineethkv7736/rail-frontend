// Google Cloud Translation API integration
// Uses REST API for client-side translation

const GOOGLE_TRANSLATE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY;
const TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2';

export interface SupportedLanguage {
    code: string;
    name: string;
    nativeName: string;
}

// Major Indian languages supported
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
    { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
    { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
    { code: 'en', name: 'English', nativeName: 'English' },
];

export interface DetectLanguageResponse {
    language: string;
    confidence: number;
}

export interface TranslateResponse {
    translatedText: string;
    detectedSourceLanguage?: string;
}

/**
 * Detect the language of the given text
 */
export async function detectLanguage(text: string): Promise<DetectLanguageResponse> {
    if (!GOOGLE_TRANSLATE_API_KEY) {
        console.warn('Google Translate API key not configured');
        return { language: 'en', confidence: 0 };
    }

    try {
        const response = await fetch(`${TRANSLATE_API_URL}/detect?key=${GOOGLE_TRANSLATE_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: text,
            }),
        });

        if (!response.ok) {
            throw new Error(`Translation API error: ${response.statusText}`);
        }

        const data = await response.json();
        const detection = data.data.detections[0][0];

        return {
            language: detection.language,
            confidence: detection.confidence,
        };
    } catch (error) {
        console.error('Language detection error:', error);
        return { language: 'en', confidence: 0 };
    }
}

/**
 * Translate text to English
 */
export async function translateToEnglish(
    text: string,
    sourceLanguage?: string
): Promise<TranslateResponse> {
    if (!GOOGLE_TRANSLATE_API_KEY) {
        console.warn('Google Translate API key not configured');
        return { translatedText: text };
    }

    // If already English, return as-is
    if (sourceLanguage === 'en') {
        return { translatedText: text };
    }

    try {
        const params: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
            q: text,
            target: 'en',
            format: 'text',
        };

        if (sourceLanguage) {
            params.source = sourceLanguage;
        }

        const response = await fetch(`${TRANSLATE_API_URL}?key=${GOOGLE_TRANSLATE_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        });

        if (!response.ok) {
            throw new Error(`Translation API error: ${response.statusText}`);
        }

        const data = await response.json();
        const translation = data.data.translations[0];

        return {
            translatedText: translation.translatedText,
            detectedSourceLanguage: translation.detectedSourceLanguage,
        };
    } catch (error) {
        console.error('Translation to English error:', error);
        return { translatedText: text };
    }
}

/**
 * Translate text from English to target language
 */
export async function translateFromEnglish(
    text: string,
    targetLanguage: string
): Promise<string> {
    if (!GOOGLE_TRANSLATE_API_KEY) {
        console.warn('Google Translate API key not configured');
        return text;
    }

    // If target is English, return as-is
    if (targetLanguage === 'en') {
        return text;
    }

    try {
        const response = await fetch(`${TRANSLATE_API_URL}?key=${GOOGLE_TRANSLATE_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: text,
                source: 'en',
                target: targetLanguage,
                format: 'text',
            }),
        });

        if (!response.ok) {
            throw new Error(`Translation API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.data.translations[0].translatedText;
    } catch (error) {
        console.error('Translation from English error:', error);
        return text;
    }
}

/**
 * Get language name by code
 */
export function getLanguageName(code: string): string {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    return lang ? lang.name : code.toUpperCase();
}

/**
 * Get native language name by code
 */
export function getNativeLanguageName(code: string): string {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    return lang ? lang.nativeName : code.toUpperCase();
}

/**
 * Check if translation API is configured
 */
export function isTranslationConfigured(): boolean {
    return !!GOOGLE_TRANSLATE_API_KEY;
}
