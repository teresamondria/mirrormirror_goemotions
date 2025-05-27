// EmotionBarChart.tsx — Chart.js horizontal bar chart for 27 emotion scores
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import type { EmotionScores } from '../types/gptTypes';
import { getEmotionCategory } from '../utils/emotionMap';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const COLORS = {
  positive: '#4a8c3c', // Respect
  neutral: '#f0b840', // Neutral
  negative: '#d04545', // Contempt
};

interface EmotionBarChartProps {
  scores: EmotionScores;
}

export const EmotionBarChart: React.FC<EmotionBarChartProps> = ({ scores }) => {
  // Prepare data for Chart.js
  const data = useMemo(() => {
    const labels = Object.keys(scores);
    const values = labels.map((k) => scores[k as keyof EmotionScores] * 100);
    const bgColors = labels.map((k) => {
      const cat = getEmotionCategory(k);
      return COLORS[cat as keyof typeof COLORS] || COLORS.neutral;
    });
    return {
      labels: labels.map((l) => l.charAt(0).toUpperCase() + l.slice(1)),
      datasets: [
        {
          label: 'Score (%)',
          data: values,
          backgroundColor: bgColors,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: '#222',
        },
      ],
    };
  }, [scores]);

  const options = useMemo(() => ({
    indexAxis: 'y' as const,
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        min: 0,
        max: 100,
        grid: { color: '#eee' },
        ticks: { color: '#222', font: { size: 12 } },
      },
      y: {
        grid: { display: false },
        ticks: { color: '#222', font: { size: 12 } },
      },
    },
  }), []);

  return (
    <div className="w-full">
      <Bar data={data} options={options} height={420} />
    </div>
  );
}; 