// YouTubePanel.tsx — Embedded analysis panel for YouTube videos
// Purpose: React component for the interactive analysis UI injected into YouTube's sidebar.
// NOTE: Requires --jsx and React types. Intended to be rendered via a React root injected by the content script.

import * as React from 'react';
import { useEffect, useState } from 'react';
import type { AnalysisResult } from '../types/gptTypes';

// TODO: Implement Gauge and EmotionBarChart as D3/Chart.js React components
// import { Gauge } from './GaugeComponent';
// import { EmotionBarChart } from './EmotionBarChart';

const INFO_TEXT = `MirrorMirror analyzes video transcripts to detect emotional tone and bias. The analysis is based on the GoEmotions dataset, which includes 27 emotions categorized into respect, contempt, and other categories.\n\nMetrics Explained:\n- The main gauge shows whether the content leans more toward respect or contempt.\n- The emotion bars show the top three emotions detected.\n- Color coding: Green = Respect (#4a8c3c), Amber = Neutral (#f0b840), Crimson = Contempt (#d04545).`;

function getTopEmotions(scores: Record<string, number>) {
  return Object.entries(scores)
    .filter(([k]) => k !== 'neutral')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
}

export const YouTubePanel: React.FC = () => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [view, setView] = useState<'main' | 'reasoning' | 'detailed' | 'recs' | 'info'>('main');

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_LAST' }, (res: { data?: AnalysisResult }) => {
      if (res && res.data) setAnalysis(res.data);
    });
  }, []);

  if (!analysis) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 w-[370px] mt-4 mr-4">
        <div className="animate-pulse text-gray-400">Loading analysis…</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 w-[370px] mt-4 mr-4 text-gray-900 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-lg">MirrorMirror Analysis</span>
        <button
          aria-label="About MirrorMirror"
          className="ml-2 text-xs px-2 py-1 rounded bg-[#6a3a8c] text-white hover:bg-[#57306e]"
          onClick={() => setView('info')}
        >
          i
        </button>
      </div>

      {/* Gauge (placeholder) */}
      <div className="flex flex-col items-center mb-4">
        {/* <Gauge framing={analysis.framing} score={analysis.framing_score} /> */}
        <div className="w-40 h-24 bg-gray-100 flex items-center justify-center rounded mb-2">
          <span className="text-xl font-semibold">{analysis.framing}</span>
        </div>
        <span className={`mt-1 px-3 py-1 rounded text-white text-sm ${
          analysis.framing === 'Respectful' ? 'bg-[#4a8c3c]' :
          analysis.framing === 'Neutral' ? 'bg-[#f0b840] text-gray-900' :
          'bg-[#d04545]'
        }`}>
          {analysis.framing}
        </span>
      </div>

      {/* Main controls */}
      {view === 'main' && (
        <>
          <div className="flex gap-2 mb-3">
            <button
              className="flex-1 border rounded py-2 font-medium hover:bg-gray-50"
              onClick={() => setView('reasoning')}
            >
              Analysis reasoning
            </button>
            <button
              className="flex-1 border rounded py-2 font-medium hover:bg-gray-50"
              onClick={() => setView('recs')}
            >
              Balanced alternatives
            </button>
          </div>
          <button
            className="w-full border rounded py-2 font-medium hover:bg-gray-50 mb-2"
            onClick={() => setView('detailed')}
          >
            Show detailed analysis
          </button>
        </>
      )}

      {/* Reasoning view */}
      {view === 'reasoning' && (
        <div>
          <div className="mb-2 text-sm font-semibold">Analysis Reasoning:</div>
          <div className="mb-3 text-sm bg-gray-50 rounded p-2">{analysis.explanation}</div>
          <div className="mb-2 text-xs font-semibold">Top Emotions</div>
          <ul className="mb-3">
            {getTopEmotions(analysis.emotion_scores).map(([k, v]) => (
              <li key={k} className="flex justify-between text-xs">
                <span>{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                <span>{(v * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
          <button className="text-sm underline" onClick={() => setView('main')}>Back</button>
        </div>
      )}

      {/* Detailed analysis view */}
      {view === 'detailed' && (
        <div>
          <div className="mb-2 text-sm font-semibold">All 27 Emotions</div>
          {/* <EmotionBarChart scores={analysis.emotion_scores} /> */}
          <div className="h-48 bg-gray-50 rounded flex items-center justify-center mb-2 text-gray-400">
            [Bar chart here]
          </div>
          <button className="text-sm underline" onClick={() => setView('main')}>Back</button>
        </div>
      )}

      {/* Recommendations view */}
      {view === 'recs' && (
        <div>
          <div className="mb-2 text-sm font-semibold">Emotionally Balanced Alternatives:</div>
          <ul className="mb-3">
            {analysis.recommendations.map((rec, i) => (
              <li key={i} className="mb-2 border rounded p-2">
                <a href={rec.url} target="_blank" className="font-medium underline">{rec.title}</a>
                <div className="text-xs text-gray-500">{rec.summary}</div>
              </li>
            ))}
          </ul>
          <button className="text-sm underline" onClick={() => setView('main')}>Back</button>
        </div>
      )}

      {/* Info view */}
      {view === 'info' && (
        <div>
          <div className="mb-2 text-sm font-semibold">About MirrorMirror</div>
          <div className="text-xs whitespace-pre-line bg-gray-50 rounded p-2 mb-2">{INFO_TEXT}</div>
          <button className="text-sm underline" onClick={() => setView('main')}>Back</button>
        </div>
      )}
    </div>
  );
};

// Dummy export for isolatedModules
export default YouTubePanel; 