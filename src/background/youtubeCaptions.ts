import { TranscriptCache } from './types';
import { YoutubeTranscript } from 'youtube-transcript';

let transcriptCache: TranscriptCache = {};

/**
 * Extracts video ID from a YouTube URL
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Fetches transcript using youtube-transcript package
 */
async function fetchTranscriptTimedText(videoId: string, lang = 'en'): Promise<string | null> {
  try {
    console.log('Fetching transcript...');
    
    // Try to fetch transcript with the requested language
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang });
      if (transcript && transcript.length > 0) {
        console.log('Successfully fetched transcript');
        return transcript
          .map((segment: { text: string }) => segment.text)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    } catch (error) {
      console.log(`No transcript found for language ${lang}, trying English...`);
    }

    // If the requested language failed, try English
    if (lang !== 'en') {
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
        if (transcript && transcript.length > 0) {
          console.log('Successfully fetched English transcript');
          return transcript
            .map((segment: { text: string }) => segment.text)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
      } catch (error) {
        console.log('No English transcript found');
      }
    }

    console.log('No transcripts available');
    return null;
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return null;
  }
}

/**
 * Fetches transcript from YouTube
 */
export async function fetchTranscript(videoId: string): Promise<string | null> {
  // Check cache first
  if (transcriptCache[videoId] && Date.now() - transcriptCache[videoId].timestamp < 30 * 24 * 60 * 60 * 1000) {
    return transcriptCache[videoId].transcript;
  }

  try {
    const transcript = await fetchTranscriptTimedText(videoId);
    if (transcript) {
      // Cache the transcript
      transcriptCache[videoId] = {
        transcript,
        timestamp: Date.now()
      };
    }
    return transcript;
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return null;
  }
}

/**
 * Main function to get transcript from a YouTube URL
 */
export async function getTranscriptFromUrl(url: string): Promise<string | null> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  return fetchTranscript(videoId);
}
