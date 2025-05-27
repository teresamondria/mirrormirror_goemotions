import { TranscriptCache } from './types';
import dotenv from 'dotenv';

dotenv.config();

let transcriptCache: TranscriptCache = {};

/**
 * Generates a transcript using OpenAI's Whisper model
 */
export async function generateTranscript(videoId: string): Promise<string> {
  try {
    const apiKey = process.env.OPENAI_API_KEY_NEW;
    if (!apiKey) throw new Error('OPENAI_API_KEY_NEW missing');

    // Use OpenAI to generate a transcript from the video
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'whisper-1',
        url: `https://www.youtube.com/watch?v=${videoId}`
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate transcript');
    }

    const data = await response.json();
    const transcript = data.text;

    // Cache the generated transcript
    transcriptCache[videoId] = {
      transcript,
      timestamp: Date.now()
    };

    return transcript;
  } catch (error) {
    console.error('Error generating transcript:', error);
    throw error;
  }
} 