import { Framing } from '../types/gptTypes';

export const FRAMING_COLORS = {
  Respectful: '#4a8c3c',
  Neutral: '#f0b840',
  Contemptuous: '#d04545'
} as const;

export const EMOTION_CATEGORIES = {
  positive: ['admiration', 'amusement', 'approval', 'caring', 'excitement', 'gratitude', 'joy', 'love', 'optimism', 'pride', 'relief'],
  negative: ['anger', 'annoyance', 'disappointment', 'disapproval', 'disgust', 'embarrassment', 'fear', 'grief', 'nervousness', 'remorse', 'sadness'],
  neutral: ['confusion', 'curiosity', 'desire', 'realization', 'surprise', 'neutral']
} as const;

export const getFramingColor = (framing: Framing): string => {
  return FRAMING_COLORS[framing];
};

export const getEmotionCategory = (emotion: string): keyof typeof EMOTION_CATEGORIES => {
  for (const [category, emotions] of Object.entries(EMOTION_CATEGORIES)) {
    if (emotions.includes(emotion)) {
      return category as keyof typeof EMOTION_CATEGORIES;
    }
  }
  return 'neutral';
};
