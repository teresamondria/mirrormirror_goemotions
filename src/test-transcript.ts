import 'dotenv/config';
import { getTranscriptFromUrl } from './background/youtubeCaptions.ts';

// Check for YouTube API key
if (!process.env.YOUTUBE_API_KEY) {
  console.error('Error: YOUTUBE_API_KEY not found in .env file');
  process.exit(1);
}

async function main() {
  try {
    const url = 'https://www.youtube.com/watch?v=ArFQdvF8vDE';
    console.log('Fetching transcript for:', url);
    
    const transcript = await getTranscriptFromUrl(url);
    
    if (transcript) {
      console.log('Transcript found:');
      console.log(transcript);
    } else {
      console.log('No transcript available. This video might not have captions.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 