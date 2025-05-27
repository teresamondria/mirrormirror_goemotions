import 'dotenv/config';
import { fetchBalanced } from './background/sonarClient.js';

interface Recommendation {
  title: string;
  url: string;
  summary: string;
}

// Sample emotion scores that match the EmotionScores type
const sampleEmotionScores = {
  admiration: 0.1,
  amusement: 0.2,
  anger: 0.8,
  annoyance: 0.7,
  approval: 0.1,
  caring: 0.2,
  confusion: 0.1,
  curiosity: 0.3,
  desire: 0.1,
  disappointment: 0.6,
  disapproval: 0.7,
  disgust: 0.5,
  embarrassment: 0.1,
  excitement: 0.2,
  fear: 0.4,
  gratitude: 0.1,
  grief: 0.3,
  joy: 0.1,
  love: 0.1,
  nervousness: 0.2,
  optimism: 0.1,
  pride: 0.1,
  realization: 0.2,
  relief: 0.1,
  remorse: 0.1,
  sadness: 0.3,
  surprise: 0.1,
  neutral: 0.2
};

async function main() {
  try {
    console.log('Testing Sonar client...');
    console.log('Current working directory:', process.cwd());
    console.log('Looking for .env in:', process.cwd());
    console.log('SONAR_KEY loaded:', process.env.VITE_SONAR_KEY ? 'Yes' : 'No');

    // Test text with clear emotional content
    const testText = `I am absolutely furious about this situation! The way they've handled it is completely unacceptable. 
    I can't believe they would treat people this way. This is outrageous and I demand an immediate explanation.`;

    console.log('\nFetching balanced recommendations...');
    const recommendations = await fetchBalanced(testText, 'Contemptuous', sampleEmotionScores);
    
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