// src/background/openaiClient.ts
//-----------------------------------------------------
// Returns EmotionResult with 27 scores 0-1 + framing.
//-----------------------------------------------------
import { EmotionResult } from '../types/gptTypes';

import dotenv from 'dotenv';

console.log('Current working directory:', process.cwd());
console.log('Looking for .env in:', process.cwd());
dotenv.config();
console.log('Actual OPENAI_API_KEY_NEW:', process.env.OPENAI_API_KEY_NEW);

// Define emotion categories
const POSITIVE_EMOTIONS = [
  'admiration', 'amusement', 'approval', 'caring', 'desire',
  'excitement', 'gratitude', 'joy', 'love', 'optimism',
  'pride', 'relief'
];

const NEGATIVE_EMOTIONS = [
  'anger', 'annoyance', 'disappointment', 'disapproval',
  'disgust', 'embarrassment', 'fear', 'grief', 'nervousness',
  'remorse', 'sadness'
];


function calculateFramingScore(emotionScores: Record<string, number>): number {
  let positiveSum = 0;
  let negativeSum = 0;
  
  // Sum positive emotions
  for (const emotion of POSITIVE_EMOTIONS) {
    positiveSum += emotionScores[emotion] || 0;
  }
  
  // Sum negative emotions
  for (const emotion of NEGATIVE_EMOTIONS) {
    negativeSum += emotionScores[emotion] || 0;
  }
  
  // Calculate raw score (positive - negative)
  const rawScore = positiveSum - negativeSum;
  
  // Normalize to -1 to 1
  // We use the maximum possible sum (number of emotions) as the denominator
  const maxPossibleSum = Math.max(POSITIVE_EMOTIONS.length, NEGATIVE_EMOTIONS.length);
  const normalizedScore = rawScore / maxPossibleSum;
  
  // Clamp to -1 to 1
  return Math.max(-1, Math.min(1, normalizedScore));
}

function getFramingLabel(score: number): string {
  if (score > 0.1) return 'Respectful';
  if (score < -0.1) return 'Contemptuous';
  return 'Neutral';
}

export async function analyzeWithOpenAI(text: string): Promise<EmotionResult> {
  const apiKey = process.env.OPENAI_API_KEY_NEW;
  if (!apiKey) throw new Error('OPENAI_API_KEY_NEW missing');

  /* --- STRICT JSON-ONLY PROMPT --------------------- */
  const systemPrompt = `
You are "GoEmotions-RoBERTa-Sim", a JSON-only emotion classifier.
Output exactly one JSON object with keys:
  "emotion_scores" → object with 27 fixed keys (alphabetical) each 0.000-1.000
  "explanation"    → 2-3 sentences (≤ 45 words) giving the dominant feelings & why
No markdown, no extra keys.`;

  const userPrompt = `
Analyze the following text for emotions.

Emotion categories (27, alphabetical):
["admiration","amusement","anger","annoyance","approval","caring","confusion","curiosity","desire","disappointment","disapproval","disgust","embarrassment","excitement","fear","gratitude","grief","joy","love","nervousness","optimism","pride","realization","relief","remorse","sadness","surprise","neutral"].

Return JSON ONLY in the schema shown below (values are examples):

{
  "emotion_scores":{
    "admiration":0.012,"amusement":0.105,"anger":0.000, /* … */ "surprise":0.034,"neutral":0.711
  },
  "explanation":"Two sentences here explaining the high neutral score and mild amusement."
}

Here is the text:
"""${text}"""`;

  const body = {
    model: 'gpt-4o-mini',
    temperature: 0.2,
    response_format: { type: 'json_object' }, // force raw JSON
    messages: [
      { role: 'system', content: systemPrompt.trim() },
      { role: 'user',   content: userPrompt.trim() }
    ]
  };

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`OpenAI error: ${err.error?.message || resp.statusText}`);
  }

  const raw = (await resp.json()).choices[0].message.content;

  try {
    const parsed = JSON.parse(raw);
    const framingScore = calculateFramingScore(parsed.emotion_scores);
    
    return {
      ...parsed,
      framing: getFramingLabel(framingScore),
      framing_score: framingScore
    } as EmotionResult;
  } catch (e) {
    console.error('OpenAI output was not valid JSON:', raw);
    throw new Error('Invalid JSON from OpenAI');
  }
}

export async function summarizeTranscript(transcript: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY_NEW;
  if (!apiKey) throw new Error('OPENAI_API_KEY_NEW missing');

  const systemPrompt = `You are a helpful assistant. Summarize the following transcript in 1-2 sentences (max 50 words).`;
  const userPrompt = `Transcript:\n"""${transcript.slice(0, 3000)}"""`;

  const body = {
    model: 'gpt-4o-mini',
    temperature: 0.2,
    response_format: { type: 'text' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  };

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`OpenAI error: ${err.error?.message || resp.statusText}`);
  }

  const raw = (await resp.json()).choices[0].message.content;
  return raw.trim();
}
