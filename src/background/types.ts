export interface TranscriptCache {
  [videoId: string]: {
    transcript: string;
    timestamp: number;
  };
} 