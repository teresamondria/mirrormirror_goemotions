import 'dotenv/config';
console.log('DEBUG: OPENAI_API_KEY_NEW:', process.env.OPENAI_API_KEY_NEW);
console.log('Current working directory:', process.cwd());

import { fetchTranscriptTimedText } from './background/youtubeCaptions.js';
import { analyzeWithOpenAI, summarizeTranscript } from './background/openaiClient.js';
import { fetchBalanced } from './background/sonarClient.js';

interface Recommendation {
  title: string;
  url: string;
  summary: string;
}

async function main() {
  try {
    console.log('Starting full process test...');
    
    // Extract video ID from URL
    const url = 'https://www.youtube.com/watch?v=AJvZIpdzN3M';
    const videoId = 'AJvZIpdzN3M';
    const videoTitle = 'Rachel Zegler on Bringing a Modern Edge to Snow White'; // Optionally set manually for now
    
    console.log('\n1. Fetching transcript from YouTube (bypassing cache)...');
    const transcript = await fetchTranscriptTimedText(videoId);
    if (!transcript) {
      throw new Error('Failed to fetch transcript from YouTube');
    }
    console.log('Transcript length:', transcript.length);
    console.log('First 300 characters:', transcript.slice(0, 300));
    
    console.log('\n2. Summarizing transcript with OpenAI...');
    const summary = await summarizeTranscript(transcript);
    console.log('Transcript summary:', summary);
    
    console.log('\n3. Analyzing emotions with OpenAI...');
    const emotionResult = await analyzeWithOpenAI(transcript);
    console.log('Framing:', emotionResult.framing);
    console.log('Framing Score:', emotionResult.framing_score.toFixed(3));
    console.log('Top emotions:', Object.entries(emotionResult.emotion_scores)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([emotion, score]) => `${emotion}: ${(score * 100).toFixed(1)}%`)
      .join(', '));
    
    console.log('\n4. Getting balanced recommendations...');
    const recommendations = await fetchBalanced(
      transcript,
      emotionResult.framing,
      emotionResult.emotion_scores,
      { title: videoTitle, summary }
    );
    
    console.log('\nRecommendations:');
    console.log('----------------');
    recommendations.forEach((rec: Recommendation, index: number) => {
      console.log(`\n${index + 1}. ${rec.title}`);
      console.log(`   URL: ${rec.url}`);
      console.log(`   Summary: ${rec.summary}`);
    });
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main(); 