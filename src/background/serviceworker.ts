import { EmotionResult, AnalysisResult } from '../types/gptTypes';
import { fetchBalanced } from './sonarClient';
import { fetchTranscript } from './youtubeCaptions';
import { generateTranscript } from './transcriptGenerator';
import { analyzeWithOpenAI } from './openaiClient';
import { getFromCache, setInCache, clearCache } from './cache';

// API key handling with better security
let OPENAI_API_KEY: string | null = null;
let PERPLEXITY_API_KEY: string | null = null;

// Initialize cache for storing API results
interface CacheStore {
  emotionResults: Record<string, EmotionResult>;
  recommendations: Record<string, AnalysisResult>;
}

let resultsCache: CacheStore = {
  emotionResults: {},
  recommendations: {}
};

// Load cache from storage
function loadCache(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['emotionCache', 'recommendationsCache'], function(result: {emotionCache?: Record<string, EmotionResult>, recommendationsCache?: Record<string, AnalysisResult>}) {
      if (result.emotionCache) resultsCache.emotionResults = result.emotionCache;
      if (result.recommendationsCache) resultsCache.recommendations = result.recommendationsCache;
      console.log('Cache loaded from storage');
      resolve();
    });
  });
}

// Simple encryption function to add a basic layer of protection
function encrypt(text: string, salt: string): string {
  const textToChars = (text: string) => text.split('').map(c => c.charCodeAt(0));
  const byteHex = (n: number) => ("0" + Number(n).toString(16)).substr(-2);
  const applySalt = (code: number) => textToChars(salt).reduce((a,b) => a ^ b, code);

  return text.split('')
    .map(c => c.charCodeAt(0))
    .map(applySalt)
    .map(byteHex)
    .join('');
}

// Simple decryption function
function decrypt(encoded: string, salt: string): string {
  const textToChars = (text: string) => text.split('').map(c => c.charCodeAt(0));
  const applySalt = (code: number) => textToChars(salt).reduce((a,b) => a ^ b, code);
  
  return encoded.match(/.{1,2}/g)!
    .map(hex => parseInt(hex, 16))
    .map(applySalt)
    .map(charCode => String.fromCharCode(charCode))
    .join('');
}

// Initialize API keys from storage
async function initializeApiKeys(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['encryptedOpenAIKey', 'encryptedPerplexityKey'], function(result: {encryptedOpenAIKey?: string, encryptedPerplexityKey?: string}) {
      const salt = 'tone-scope-salt';
      
      if (result.encryptedOpenAIKey) {
        OPENAI_API_KEY = decrypt(result.encryptedOpenAIKey, salt);
      }
      
      if (result.encryptedPerplexityKey) {
        PERPLEXITY_API_KEY = decrypt(result.encryptedPerplexityKey, salt);
      }
      
      resolve();
    });
  });
}

// Initialize when the extension loads
initializeApiKeys();
loadCache();

interface Message {
  type: 'ANALYZE_TEXT' | 'CLEAR_CACHE' | 'STORE_API_KEYS';
  payload?: {
    url?: string;
    text?: string;
    videoId?: string;
    cacheKey?: string;
    openaiKey?: string;
    perplexityKey?: string;
  };
}

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message: Message, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  if (message.type === 'ANALYZE_TEXT' && message.payload?.url && message.payload?.videoId) {
    analyzeYouTubeContent({
      url: message.payload.url,
      videoId: message.payload.videoId
    })
      .then(result => {
        sendResponse({ ok: true, data: result });
      })
      .catch((error: Error) => {
        console.error('Analysis error:', error);
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }
  
  if (message.type === 'ANALYZE_TEXT' && message.payload?.url && message.payload?.text) {
    analyzeContent({
      url: message.payload.url,
      text: message.payload.text
    })
      .then(result => {
        sendResponse({ ok: true, data: result });
      })
      .catch(error => {
        console.error('Analysis error:', error);
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }
  
  if (message.type === 'STORE_API_KEYS' && message.payload?.openaiKey && message.payload?.perplexityKey) {
    storeApiKeys(message.payload.openaiKey, message.payload.perplexityKey)
      .then(() => sendResponse({ ok: true }))
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  
  if (message.type === 'CLEAR_CACHE') {
    const cacheKey = message.payload?.cacheKey;
    if (cacheKey) {
      clearCache(cacheKey)
        .then(() => sendResponse({ ok: true }))
        .catch(error => sendResponse({ ok: false, error: error.message }));
    } else {
      sendResponse({ ok: false, error: 'No cache key provided' });
    }
    return true;
  }
});

async function analyzeYouTubeContent(payload: { url: string; videoId: string }): Promise<AnalysisResult> {
  const { videoId } = payload;
  
  // Check cache first
  const cachedResult = await getFromCache(videoId);
  if (cachedResult) {
    console.log('Using cached analysis for:', videoId);
    return cachedResult;
  }
  
  // Ensure API keys are initialized
  if (!OPENAI_API_KEY || !PERPLEXITY_API_KEY) {
    await initializeApiKeys();
    if (!OPENAI_API_KEY || !PERPLEXITY_API_KEY) {
      throw new Error('API keys not found. Please set your API keys in the extension options.');
    }
  }
  
  try {
    // Get or generate transcript
    let transcript = await fetchTranscript(videoId);
    if (!transcript) {
      transcript = await generateTranscript(videoId);
    }
    
    // Get emotion analysis from OpenAI
    const emotionResult = await analyzeWithOpenAI(transcript);
    
    // Get balanced recommendations from SONAR
    const recommendations = await fetchBalanced(transcript, emotionResult.framing);
    
    // Combine results
    const result: AnalysisResult = {
      ...emotionResult,
      recommendations
    };
    
    // Cache the results
    await setInCache(videoId, result);
    
    return result;
  } catch (error) {
    console.error('Error analyzing YouTube content:', error);
    throw error;
  }
}

async function analyzeContent(payload: { url: string; text: string }): Promise<AnalysisResult> {
  const { text } = payload;
  
  // Check cache first
  const cachedResult = await getFromCache(payload.url);
  if (cachedResult) {
    console.log('Using cached analysis for:', payload.url);
    return cachedResult;
  }
  
  // Ensure API keys are initialized
  if (!OPENAI_API_KEY || !PERPLEXITY_API_KEY) {
    await initializeApiKeys();
    if (!OPENAI_API_KEY || !PERPLEXITY_API_KEY) {
      throw new Error('API keys not found. Please set your API keys in the extension options.');
    }
  }
  
  try {
    // Get emotion analysis from OpenAI
    const emotionResult = await analyzeWithOpenAI(text);
    
    // Get balanced recommendations from SONAR
    const recommendations = await fetchBalanced(text, emotionResult.framing);
    
    // Combine results
    const result: AnalysisResult = {
      ...emotionResult,
      recommendations
    };
    
    // Cache the results
    await setInCache(payload.url, result);
    
    return result;
  } catch (error) {
    console.error('Error analyzing content:', error);
    throw error;
  }
}

// Store API keys with encryption
async function storeApiKeys(openaiKey: string, perplexityKey: string): Promise<void> {
  const salt = 'tone-scope-salt';
  
  const encryptedOpenAIKey = encrypt(openaiKey, salt);
  const encryptedPerplexityKey = encrypt(perplexityKey, salt);
  
  await chrome.storage.local.set({
    'encryptedOpenAIKey': encryptedOpenAIKey,
    'encryptedPerplexityKey': encryptedPerplexityKey
  });
  
  OPENAI_API_KEY = openaiKey;
  PERPLEXITY_API_KEY = perplexityKey;
}
