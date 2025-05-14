import { EmotionResult } from '../types/gptTypes';

export async function analyzeWithOpenAI(text: string): Promise<EmotionResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not found in environment variables');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an emotion analysis assistant. You classify the emotional tone of text into a set of 27 specific emotion categories (from the GoEmotions dataset), and also evaluate the overall tone on a spectrum from respectful to contemptuous. Only provide the analysis in the requested JSON format without any extra commentary."
        },
        {
          role: "user",
          content: `Analyze the following content for emotions.

Emotion categories: ["admiration","amusement","anger","annoyance","approval","caring","confusion","curiosity","desire","disappointment","disapproval","disgust","embarrassment","excitement","fear","gratitude","grief","joy","love","nervousness","optimism","pride","realization","relief","remorse","sadness","surprise","neutral"].

Instructions:
1. Determine the overall framing as "Respectful", "Neutral", or "Contemptuous".
2. Score each category 0.0 – 1.0.
3. Provide a one-sentence rationale (~20 words max).
4. Output JSON with keys "framing", "emotion_scores", "explanation".

Text:
"""
${text}
"""`
        }
      ],
      temperature: 0.2
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to analyze emotions with OpenAI: ${error.error?.message || 'Unknown error'}`);
  }
  
  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content) as EmotionResult;
  } catch (error) {
    console.error('Failed to parse OpenAI response:', content);
    throw new Error('Invalid response format from OpenAI');
  }
}
