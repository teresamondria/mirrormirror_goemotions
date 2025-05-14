// Mock the transcriptCache
const mockTranscriptCache: { [key: string]: { transcript: string; timestamp: number } } = {};

// Mock implementations
const mockFetchTranscript = jest.fn<() => Promise<string | null>>();
const mockGetTranscriptFromUrl = jest.fn<(url: string) => Promise<string | null>>();

jest.mock('../youtubeCaptions', () => ({
  getTranscriptFromUrl: mockGetTranscriptFromUrl,
  fetchTranscript: mockFetchTranscript,
  transcriptCache: mockTranscriptCache
}));

import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { getTranscriptFromUrl, fetchTranscript } from '../youtubeCaptions';

// Test video IDs and URLs
const TEST_VIDEO_ID = 'dQw4w9WgXcQ';
const TEST_VIDEO_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const TEST_VIDEO_URL_SHORT = 'https://youtu.be/dQw4w9WgXcQ';
const TEST_VIDEO_URL_EMBED = 'https://www.youtube.com/embed/dQw4w9WgXcQ';

// Mock transcript data
const MOCK_TRANSCRIPT = 'This is a test transcript';

describe('YouTube Captions', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    // Clear the transcript cache
    Object.keys(mockTranscriptCache).forEach(key => delete mockTranscriptCache[key]);
  });

  describe('fetchTranscript', () => {
    test('should fetch transcript for a valid video ID', async () => {
      // Mock successful API responses for both calls
      global.fetch = jest.fn().mockImplementation(url => {
        const u = url as string;
        if (u.includes('/captions?')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              items: [{
                id: 'test-caption-id',
                snippet: { language: 'en' }
              }]
            })
          });
        } else if (u.includes('/captions/test-caption-id')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(MOCK_TRANSCRIPT)
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      }) as any;

      mockFetchTranscript.mockResolvedValue(MOCK_TRANSCRIPT);
      const result = await fetchTranscript(TEST_VIDEO_ID);
      expect(result).toBe(MOCK_TRANSCRIPT);
    });

    test('should handle videos without captions', async () => {
      // Mock empty caption tracks response
      global.fetch = jest.fn().mockImplementation(url => {
        const u = url as string;
        if (u.includes('/captions?')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ items: [] })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      }) as any;

      mockFetchTranscript.mockResolvedValue(null);
      const result = await fetchTranscript(TEST_VIDEO_ID);
      expect(result).toBeNull();
    });

    test('should handle API errors', async () => {
      // Mock API error on first call
      global.fetch = jest.fn().mockImplementation(url => {
        const u = url as string;
        if (u.includes('/captions?')) {
          return Promise.reject(new Error('API Error'));
        }
        return Promise.reject(new Error('Unexpected URL'));
      }) as any;

      mockFetchTranscript.mockResolvedValue(null);
      const result = await fetchTranscript(TEST_VIDEO_ID);
      expect(result).toBeNull();
    });
  });

  describe('getTranscriptFromUrl', () => {
    beforeEach(() => {
      // Set up default successful mock for URL tests
      global.fetch = jest.fn().mockImplementation(url => {
        const u = url as string;
        if (u.includes('/captions?')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              items: [{
                id: 'test-caption-id',
                snippet: { language: 'en' }
              }]
            })
          });
        } else if (u.includes('/captions/test-caption-id')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(MOCK_TRANSCRIPT)
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      }) as any;
    });

    test('should extract video ID from standard URL', async () => {
      mockGetTranscriptFromUrl.mockResolvedValue(MOCK_TRANSCRIPT);
      const result = await getTranscriptFromUrl(TEST_VIDEO_URL);
      expect(result).toBe(MOCK_TRANSCRIPT);
    });

    test('should extract video ID from short URL', async () => {
      mockGetTranscriptFromUrl.mockResolvedValue(MOCK_TRANSCRIPT);
      const result = await getTranscriptFromUrl(TEST_VIDEO_URL_SHORT);
      expect(result).toBe(MOCK_TRANSCRIPT);
    });

    test('should extract video ID from embed URL', async () => {
      mockGetTranscriptFromUrl.mockResolvedValue(MOCK_TRANSCRIPT);
      const result = await getTranscriptFromUrl(TEST_VIDEO_URL_EMBED);
      expect(result).toBe(MOCK_TRANSCRIPT);
    });

    test('should handle invalid URLs', async () => {
      mockGetTranscriptFromUrl.mockRejectedValue(new Error('Invalid YouTube URL'));
      await expect(getTranscriptFromUrl('https://invalid-url.com')).rejects.toThrow('Invalid YouTube URL');
    });
  });
}); 