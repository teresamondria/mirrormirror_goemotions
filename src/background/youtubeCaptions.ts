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
      console.log('[extractVideoId] Matched video ID:', match[1]);
      return match[1];
    }
  }
  console.log('[extractVideoId] No video ID found in URL:', url);
  return null;
}

/**
 * Fetches transcript using youtube-transcript package
 */
export async function fetchTranscriptTimedText(videoId: string, lang = 'en'): Promise<string | null> {
  try {
    console.log('[fetchTranscriptTimedText] Fetching transcript for video:', videoId, 'lang:', lang);
    // Try to fetch transcript with the requested language
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang });
      if (transcript && transcript.length > 0) {
        console.log('[fetchTranscriptTimedText] Successfully fetched transcript, segments:', transcript.length);
        return transcript
          .map((segment: { text: string }) => segment.text)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      } else {
        console.log('[fetchTranscriptTimedText] No transcript segments found for lang:', lang);
      }
    } catch (error) {
      console.log(`[fetchTranscriptTimedText] No transcript found for language ${lang}, error:`, error);
    }

    // If the requested language failed, try English
    if (lang !== 'en') {
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
        if (transcript && transcript.length > 0) {
          console.log('[fetchTranscriptTimedText] Successfully fetched English transcript, segments:', transcript.length);
          return transcript
            .map((segment: { text: string }) => segment.text)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        } else {
          console.log('[fetchTranscriptTimedText] No English transcript segments found.');
        }
      } catch (error) {
        console.log('[fetchTranscriptTimedText] No English transcript found, error:', error);
      }
    }

    console.log('[fetchTranscriptTimedText] No transcripts available for video:', videoId);
    return null;
  } catch (error) {
    console.error('[fetchTranscriptTimedText] Error fetching transcript:', error);
    return null;
  }
}

/**
 * Fetches transcript from YouTube
 */
export async function fetchTranscript(videoId: string): Promise<string | null> {
  // Check cache first
  if (transcriptCache[videoId] && Date.now() - transcriptCache[videoId].timestamp < 30 * 24 * 60 * 60 * 1000) {
    console.log('[fetchTranscript] Returning transcript from cache for video:', videoId);
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
      console.log('[fetchTranscript] Transcript cached for video:', videoId);
    } else {
      console.log('[fetchTranscript] No transcript fetched for video:', videoId);
    }
    return transcript;
  } catch (error) {
    console.error('[fetchTranscript] Error fetching transcript:', error);
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
