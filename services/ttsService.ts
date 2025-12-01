
import { CustomTTSSettings } from '../types';

export const generateSpeech = async (text: string, settings: CustomTTSSettings): Promise<Blob> => {
    const baseUrl = `http://${settings.host}:${settings.port}`;
    const url = new URL(`${baseUrl}/forward`);
    
    url.searchParams.append("text", text);
    if (settings.voice) url.searchParams.append("voice", settings.voice);
    if (settings.speed) url.searchParams.append("speed", settings.speed.toString());
    if (settings.volume) url.searchParams.append("volume", settings.volume.toString());
    if (settings.pitch) url.searchParams.append("pitch", settings.pitch.toString());

    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`TTS Error: ${response.statusText}`);
        }

        return await response.blob();
    } catch (error: any) {
        console.error("Custom TTS Request Failed:", error);
        throw new Error("Could not connect to TTS Server. Ensure it is running.");
    }
};
