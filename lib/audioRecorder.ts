// Audio recording utility for capturing microphone input
// Handles browser compatibility and audio format conversion

export interface AudioRecorderConfig {
    mimeType?: string;
    audioBitsPerSecond?: number;
}

export class AudioRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private stream: MediaStream | null = null;

    /**
     * Request microphone permission and initialize
     */
    async initialize(): Promise<void> {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    channelCount: 1,
                    sampleRate: 48000,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });
        } catch (error) {
            console.error('Microphone access error:', error);
            throw new Error('Microphone access denied. Please allow microphone permissions.');
        }
    }

    /**
     * Start recording audio
     */
    startRecording(config: AudioRecorderConfig = {}): void {
        if (!this.stream) {
            throw new Error('AudioRecorder not initialized. Call initialize() first.');
        }

        this.audioChunks = [];

        // Determine best supported mime type
        const mimeType = config.mimeType || this.getBestMimeType();

        this.mediaRecorder = new MediaRecorder(this.stream, {
            mimeType,
            audioBitsPerSecond: config.audioBitsPerSecond || 128000,
        });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.audioChunks.push(event.data);
            }
        };

        this.mediaRecorder.start(100); // Collect data every 100ms
        console.log('Recording started with mime type:', mimeType);
    }

    /**
     * Stop recording and return audio blob
     */
    async stopRecording(): Promise<Blob> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject(new Error('No active recording'));
                return;
            }

            this.mediaRecorder.onstop = () => {
                const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
                const audioBlob = new Blob(this.audioChunks, { type: mimeType });
                console.log('Recording stopped. Blob size:', audioBlob.size, 'bytes');
                resolve(audioBlob);
            };

            this.mediaRecorder.stop();
        });
    }

    /**
     * Check if currently recording
     */
    isRecording(): boolean {
        return this.mediaRecorder?.state === 'recording';
    }

    /**
     * Clean up resources
     */
    cleanup(): void {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        this.mediaRecorder = null;
        this.audioChunks = [];
    }

    /**
     * Get best supported mime type for recording
     */
    private getBestMimeType(): string {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4',
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return 'audio/webm'; // Fallback
    }

    /**
     * Convert blob to base64 string
     */
    static async blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                // Remove data URL prefix
                const base64Data = base64.split(',')[1];
                resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Check if microphone is available
     */
    static async isMicrophoneAvailable(): Promise<boolean> {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.some(device => device.kind === 'audioinput');
        } catch {
            return false;
        }
    }
}
