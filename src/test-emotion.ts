import 'dotenv/config';
import { analyzeWithOpenAI } from './background/openaiClient';

async function main() {
  try {
    // Test text with clear emotional content
    const testText = `I am absolutely furious about this situation! The way they've handled it is completely unacceptable. 
    I can't believe they would treat people this way. This is outrageous and I demand an immediate explanation.`;

    console.log('Analyzing emotions for test text...');
    const result = await analyzeWithOpenAI(testText);
    
    console.log('\nAnalysis Results:');
    console.log('----------------');
    console.log('Overall Framing:', result.framing);
    console.log('\nTop Emotions:');
    
    // Sort emotions by score and show top 5
    const sortedEmotions = Object.entries(result.emotion_scores)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    sortedEmotions.forEach(([emotion, score]) => {
      console.log(`${emotion}: ${(score * 100).toFixed(1)}%`);
    });
    
    console.log('\nExplanation:', result.explanation);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 