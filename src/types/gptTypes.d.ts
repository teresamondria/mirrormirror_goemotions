export interface EmotionScores {
  admiration: number;
  amusement: number;
  anger: number;
  annoyance: number;
  approval: number;
  caring: number;
  confusion: number;
  curiosity: number;
  desire: number;
  disappointment: number;
  disapproval: number;
  disgust: number;
  embarrassment: number;
  excitement: number;
  fear: number;
  gratitude: number;
  grief: number;
  joy: number;
  love: number;
  nervousness: number;
  optimism: number;
  pride: number;
  realization: number;
  relief: number;
  remorse: number;
  sadness: number;
  surprise: number;
  neutral: number;
}

export type Framing = 'Respectful' | 'Neutral' | 'Contemptuous';

export interface EmotionResult {
  framing: Framing;
  emotion_scores: EmotionScores;
  explanation: string;
}

export interface Recommendation {
  title: string;
  url: string;
  summary: string;
  tone: string;
}

export interface AnalysisResult extends EmotionResult {
  recommendations: Recommendation[];
} 