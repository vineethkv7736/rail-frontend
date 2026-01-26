import axios from 'axios';

const API_URL = 'https://railpro-backend-c5hg2weg6q-uc.a.run.app/api/v1';

export interface ChatRequest {
    message: string;
    session_id?: string;
    language?: string;
}

export interface ChatResponse {
    response: string;
    audio_url?: string | null;
    debug_info?: {
        tools_used?: { name: string; args: any }[]; // eslint-disable-line @typescript-eslint/no-explicit-any
        raw_api_response?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    };
}

export const api = {
    chat: async (data: ChatRequest): Promise<ChatResponse> => {
        try {
            const response = await axios.post<ChatResponse>(`${API_URL}/chat/text`, data);
            return response.data;
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    },

    // Audio management
    currentAudio: null as HTMLAudioElement | null,

    stopAudio: () => {
        if (api.currentAudio) {
            api.currentAudio.pause();
            api.currentAudio.currentTime = 0;
            api.currentAudio = null;
        }
    },

    pauseAudio: () => {
        if (api.currentAudio) {
            api.currentAudio.pause();
        }
    },

    resumeAudio: () => {
        if (api.currentAudio) {
            api.currentAudio.play().catch(e => console.error("Resume error:", e));
        }
    },

    playAudio: (url: string, shouldPlay: boolean = true) => {
        // Stop any currently playing audio
        api.stopAudio();

        const audio = new Audio(url);
        api.currentAudio = audio;

        // Cleanup on end
        audio.onended = () => {
            if (api.currentAudio === audio) {
                api.currentAudio = null;
            }
        };

        if (shouldPlay) {
            audio.play().catch(e => console.error("Audio playback error:", e));
        }
    }
};
