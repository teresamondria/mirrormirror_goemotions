// Gauge.tsx — D3 semicircle gauge for framing score (Respect–Contempt)
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import type { Framing } from '../types/gptTypes';

interface GaugeProps {
  framing: Framing;
  score: number; // -1 (Respectful) to 1 (Contemptuous)
}

const WIDTH = 260;
const HEIGHT = 140;
const RADIUS = 120;
const ARC_WIDTH = 18;

const COLORS = {
  Respectful: '#4a8c3c',
  Neutral: '#f0b840',
  Contemptuous: '#d04545',
};

const getArcColor = (start: number) => {
  if (start < 60) return COLORS.Respectful;
  if (start < 120) return COLORS.Neutral;
  return COLORS.Contemptuous;
};

const getFramingColor = (framing: Framing) => COLORS[framing];

export const Gauge: React.FC<GaugeProps> = ({ framing, score }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Map score (-1 to 1) to angle (0 to 180)
  const angle = ((score + 1) / 2) * 180;

  // Arc segments: [startAngle, endAngle]
  const arcs = [
    [0, 60], // Respect
    [60, 120], // Neutral
    [120, 180], // Contempt
  ];

  // Needle position
  const needleAngle = (angle - 90) * (Math.PI / 180); // SVG: 0° is at 12 o'clock
  const needleLen = RADIUS - ARC_WIDTH;
  const needleX = WIDTH / 2 + needleLen * Math.cos(needleAngle);
  const needleY = HEIGHT - 20 + needleLen * Math.sin(needleAngle);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('.gauge-arc').remove();

    arcs.forEach(([start, end], i) => {
      const arc = d3.arc()
        .innerRadius(RADIUS - ARC_WIDTH)
        .outerRadius(RADIUS)
        .startAngle((Math.PI * start) / 180)
        .endAngle((Math.PI * end) / 180);
      svg.append('path')
        .attr('class', 'gauge-arc')
        .attr('d', arc as any)
        .attr('fill', getArcColor(start))
        .attr('transform', `translate(${WIDTH / 2},${HEIGHT - 20})`);
    });
  }, []);

  return (
    <div className="flex flex-col items-center" aria-label="Framing gauge: shows overall tone as Respectful, Neutral, or Contemptuous">
      <svg ref={svgRef} width={WIDTH} height={HEIGHT} role="img" aria-label={`Gauge showing ${framing} framing`}>
        {/* Needle */}
        <line
          x1={WIDTH / 2}
          y1={HEIGHT - 20}
          x2={needleX}
          y2={needleY}
          stroke="#222"
          strokeWidth={4}
          strokeLinecap="round"
        />
        {/* Needle base circle */}
        <circle
          cx={WIDTH / 2}
          cy={HEIGHT - 20}
          r={8}
          fill="#fff"
          stroke="#222"
          strokeWidth={2}
        />
      </svg>
      <span
        className="mt-2 px-3 py-1 rounded text-white text-sm font-semibold"
        style={{ background: getFramingColor(framing), color: framing === 'Neutral' ? '#222' : '#fff' }}
      >
        {framing}
      </span>
    </div>
  );
}; 