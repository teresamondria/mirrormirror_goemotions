import { AnalysisResult } from '../types/gptTypes';

// Cache duration constants (in milliseconds)
const CACHE_DURATION = {
  SHORT: 24 * 60 * 60 * 1000,      // 1 day
  MEDIUM: 7 * 24 * 60 * 60 * 1000,  // 1 week
  LONG: 30 * 24 * 60 * 60 * 1000,   // 30 days
  DEFAULT: 30 * 24 * 60 * 60 * 1000 // Default to 30 days
};

interface CacheStore {
  [key: string]: {
    data: AnalysisResult;
    timestamp: number;
    duration?: number;  // Optional custom duration for specific entries
  };
}

let cache: CacheStore = {};

// Load cache from storage
export async function loadCache(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['analysisCache'], function(result: {analysisCache?: CacheStore}) {
      if (result.analysisCache) {
        cache = result.analysisCache;
      }
      resolve();
    });
  });
}

// Get data from cache
export async function getFromCache(key: string): Promise<AnalysisResult | null> {
  const entry = cache[key];
  if (!entry) return null;

  const duration = entry.duration || CACHE_DURATION.DEFAULT;
  if (Date.now() - entry.timestamp < duration) {
    return entry.data;
  }
  
  // If expired, remove from cache
  await clearCache(key);
  return null;
}

// Set data in cache
export async function setInCache(key: string, data: AnalysisResult, duration?: number): Promise<void> {
  cache[key] = {
    data,
    timestamp: Date.now(),
    duration: duration || CACHE_DURATION.DEFAULT
  };
  
  await chrome.storage.local.set({
    'analysisCache': cache
  });
}

// Clear specific cache entry
export async function clearCache(key: string): Promise<void> {
  if (cache[key]) {
    delete cache[key];
    await chrome.storage.local.set({
      'analysisCache': cache
    });
  }
}

// Clear all cache entries
export async function clearAllCache(): Promise<void> {
  cache = {};
  await chrome.storage.local.set({
    'analysisCache': cache
  });
}

// Initialize cache when module loads
loadCache();
