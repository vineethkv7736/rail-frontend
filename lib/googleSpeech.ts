// Google Cloud Speech-to-Text and Text-to-Speech API client

const SPEECH_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_SPEECH_API_KEY;
const SPEECH_TO_TEXT_URL = 'https://speech.googleapis.com/v1/speech:recognize';
const TEXT_TO_SPEECH_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

export interface TranscriptionResult {
    transcript: string;
    confidence: number;
}

export interface Voice {
    languageCodes: string[];
    name: string;
    ssmlGender: 'MALE' | 'FEMALE' | 'NEUTRAL';
    naturalSampleRateHertz: number;
}

/**
 * Convert audio blob to text using Google Cloud Speech-to-Text API
 */
export async function transcribeAudio(
    audioBlob: Blob,
    languageCode: string
): Promise<TranscriptionResult> {
    if (!SPEECH_API_KEY) {
        throw new Error('Google Speech API key not configured');
    }

    try {
        // Convert blob to base64
        const base64Audio = await blobToBase64(audioBlob);

        // Determine audio encoding from mime type
        const encoding = getAudioEncoding(audioBlob.type);

        const response = await fetch(`${SPEECH_TO_TEXT_URL}?key=${SPEECH_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                config: {
                    encoding,
                    sampleRateHertz: 48000,
                    languageCode,
                    enableAutomaticPunctuation: true,
                    model: 'default',
                },
                audio: {
                    content: base64Audio,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Speech-to-Text API error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            throw new Error('No transcription results');
        }

        const result = data.results[0];
        const alternative = result.alternatives[0];

        return {
            transcript: alternative.transcript,
            confidence: alternative.confidence || 0,
        };
    } catch (error) {
        console.error('Transcription error:', error);
        throw error;
    }
}

/**
 * Convert text to speech using Google Cloud Text-to-Speech API
 */
export async function synthesizeSpeech(
    text: string,
    languageCode: string,
    voiceType: 'Standard' | 'WaveNet' | 'Neural2' = 'Standard'
): Promise<string> {
    if (!SPEECH_API_KEY) {
        throw new Error('Google Speech API key not configured');
    }

    try {
        // Get voice name for language
        const voiceName = getVoiceName(languageCode, voiceType);

        const response = await fetch(`${TEXT_TO_SPEECH_URL}?key=${SPEECH_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                input: {
                    text,
                },
                voice: {
                    languageCode,
                    name: voiceName,
                },
                audioConfig: {
                    audioEncoding: 'MP3',
                    speakingRate: 1.0,
                    pitch: 0.0,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Text-to-Speech API error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();

        // Convert base64 audio to blob URL
        const audioContent = data.audioContent;
        const audioBlob = base64ToBlob(audioContent, 'audio/mp3');
        const audioUrl = URL.createObjectURL(audioBlob);

        return audioUrl;
    } catch (error) {
        console.error('Speech synthesis error:', error);
        throw error;
    }
}

/**
 * Get audio encoding from mime type
 */
function getAudioEncoding(mimeType: string): string {
    if (mimeType.includes('webm')) {
        if (mimeType.includes('opus')) {
            return 'WEBM_OPUS';
        }
        return 'WEBM_OPUS'; // Default for webm
    }
    if (mimeType.includes('ogg')) {
        return 'OGG_OPUS';
    }
    if (mimeType.includes('flac')) {
        return 'FLAC';
    }
    if (mimeType.includes('mp3')) {
        return 'MP3';
    }
    
    // Default
    return 'WEBM_OPUS';
}

/**
 * Get voice name for language and type
 */
function getVoiceName(languageCode: string, voiceType: 'Standard' | 'WaveNet' | 'Neural2'): string {
    // Map language codes to voice names
    const voiceMap: Record<string, Record<string, string>> = {
        'hi-IN': {
            Standard: 'hi-IN-Standard-A',
            WaveNet: 'hi-IN-Wavenet-A',
            Neural2: 'hi-IN-Neural2-A',
        },
        'bn-IN': {
            Standard: 'bn-IN-Standard-A',
            WaveNet: 'bn-IN-Wavenet-A',
            Neural2: 'bn-IN-Neural2-A',
        },
        'ta-IN': {
            Standard: 'ta-IN-Standard-A',
            WaveNet: 'ta-IN-Wavenet-A',
            Neural2: 'ta-IN-Neural2-A',
        },
        'te-IN': {
            Standard: 'te-IN-Standard-A',
            WaveNet: 'te-IN-Wavenet-A',
            Neural2: 'te-IN-Neural2-A',
        },
        'mr-IN': {
            Standard: 'mr-IN-Standard-A',
            WaveNet: 'mr-IN-Wavenet-A',
            Neural2: 'mr-IN-Neural2-A',
        },
        'gu-IN': {
            Standard: 'gu-IN-Standard-A',
            WaveNet: 'gu-IN-Wavenet-A',
            Neural2: 'gu-IN-Neural2-A',
        },
        'kn-IN': {
            Standard: 'kn-IN-Standard-A',
            WaveNet: 'kn-IN-Wavenet-A',
            Neural2: 'kn-IN-Neural2-A',
        },
        'ml-IN': {
            Standard: 'ml-IN-Standard-A',
            WaveNet: 'ml-IN-Wavenet-A',
            Neural2: 'ml-IN-Neural2-A',
        },
        'pa-IN': {
            Standard: 'pa-IN-Standard-A',
            WaveNet: 'pa-IN-Wavenet-A',
            Neural2: 'pa-IN-Neural2-A',
        },
        'en-US': {
            Standard: 'en-US-Standard-A',
            WaveNet: 'en-US-Wavenet-A',
            Neural2: 'en-US-Neural2-A',
        },
    };

    const voices = voiceMap[languageCode];
    if (voices && voices[voiceType]) {
        return voices[voiceType];
    }

    // Fallback to standard voice
    return `${languageCode}-Standard-A`;
}

/**
 * Convert blob to base64
 */
async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            const base64Data = base64.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Convert base64 to blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

/**
 * Check if Google Speech API is configured
 */
export function isSpeechAPIConfigured(): boolean {
    return !!SPEECH_API_KEY;
}

/**
 * Get language code in format expected by Speech API (e.g., 'hi' -> 'hi-IN')
 */
export function getSpeechLanguageCode(languageCode: string): string {
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
        'ur': 'ur-PK',
        'en': 'en-US',
    };

    return languageMap[languageCode] || 'en-US';
}
