/* @jsx React.createElement */
/* @jsxFrag React.Fragment */
import React from 'react';

interface VisualizerProps {
  volume: number; // 0 to 1
  active: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ volume, active }) => {
  const circles = [1, 2, 3];
  
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      {/* Base Core (Ashoka Chakra Blue Hint) */}
      <div className={`w-8 h-8 rounded-full border-2 border-india-blue transition-all duration-300 ${active ? 'bg-india-blue/20 shadow-[0_0_20px_#000080]' : 'bg-transparent opacity-30'}`}></div>
      
      {/* Pulsing Rings - Tricolor */}
      {active && circles.map((c, i) => {
        // 0: Saffron, 1: White, 2: Green
        const color = i === 0 ? 'border-india-saffron' : i === 1 ? 'border-white' : 'border-india-green';
        return (
            <div
            key={c}
            className={`absolute rounded-full border ${color} opacity-40`}
            style={{
                width: `${100 + (volume * 100 * c)}%`,
                height: `${100 + (volume * 100 * c)}%`,
                transition: 'width 0.1s, height 0.1s',
                opacity: Math.max(0, 0.6 - (volume * 0.5 * c))
            }}
            />
        );
      })}
      
      {/* Neural Lines */}
      {active && <svg className="absolute inset-0 w-full h-full animate-spin-slow opacity-60">
        <circle cx="50%" cy="50%" r="48%" stroke="#000080" strokeWidth="1" strokeDasharray="2 4" fill="none" />
      </svg>}
    </div>
  );
};