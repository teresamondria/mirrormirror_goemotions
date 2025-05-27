// popupComponent.tsx — React component for the Tone-Scope popup UI
import React, { useEffect, useState } from 'react';
import type { AnalysisResult } from '../types/gptTypes';
import { Gauge } from './Gauge';
import { EmotionBarChart } from './EmotionBarChart';

export const Popup: React.FC = () => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_LAST' }, (res: { data?: AnalysisResult }) => {
      if (res && res.data) setAnalysis(res.data);
    });
  }, []);

  if (!analysis) {
    return (
      <div className="p-6 min-w-[350px] text-gray-700">Loading…</div>
    );
  }

  return (
    <div className="p-6 min-w-[350px] text-gray-900 bg-white">
      <h2 className="font-bold text-lg mb-2">MirrorMirror Analysis</h2>
      <Gauge framing={analysis.framing} score={analysis.framing_score} />
      <div className="mt-4 mb-2 text-sm font-semibold">Reasoning</div>
      <div className="mb-4 text-sm bg-gray-50 rounded p-2">{analysis.explanation}</div>
      <div className="mb-2 text-sm font-semibold">Emotion Breakdown</div>
      <EmotionBarChart scores={analysis.emotion_scores} />
      <div className="mt-4 mb-2 text-sm font-semibold">Recommendations</div>
      <ul className="space-y-2">
        {analysis.recommendations.map((rec, i) => (
          <li key={i} className="rounded border p-2">
            <a href={rec.url} target="_blank" className="font-medium underline">{rec.title}</a>
            <div className="text-xs text-gray-500">{rec.summary}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}; 