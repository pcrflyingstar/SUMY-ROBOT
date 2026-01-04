/* @jsx React.createElement */
/* @jsxFrag React.Fragment */
import React, { useMemo } from 'react';
import { RobotState } from '../types';

interface GridMapProps {
  robotState: RobotState;
}

// Fixed dimensions for the tactical map
const VIEW_SIZE = 1000;
const HALF_VIEW = VIEW_SIZE / 2;

// Generate deterministic random terrain features
const generateTerrain = () => {
  const mountains = [
    { points: "200,200 350,100 500,250 400,400 250,350", height: 3 },
    { points: "600,600 750,550 900,650 800,800 650,750", height: 2 },
    { points: "-200,-200 -50,-300 100,-150 -100,50", height: 3 }, // NW Mountain
  ];

  const forests = [
    { x: -300, y: 300, r: 150 },
    { x: 400, y: -200, r: 120 },
    { x: -100, y: -400, r: 100 },
    { x: 600, y: 200, r: 180 },
  ];

  // Random static soldiers patrolling
  const soldiers = Array.from({ length: 8 }).map((_, i) => ({
    x: Math.cos(i * 0.7) * 300 + (Math.random() * 100),
    y: Math.sin(i * 0.7) * 300 + (Math.random() * 100),
    angle: Math.random() * 360,
    name: `UNIT-${101 + i}`
  }));

  return { mountains, forests, soldiers };
};

export const GridMap: React.FC<GridMapProps> = ({ robotState }) => {
  const { mountains, forests, soldiers } = useMemo(() => generateTerrain(), []);

  return (
    <div className="absolute inset-0 bg-[#0b100b] overflow-hidden">
      
      {/* --- TERRAIN BACKGROUND --- */}
      <div className="absolute inset-0 bg-[#121812] opacity-100" 
           style={{
             backgroundImage: `radial-gradient(#1a2415 1px, transparent 1px)`,
             backgroundSize: '20px 20px'
           }}>
      </div>

      <svg 
        width="100%" 
        height="100%" 
        viewBox={`${-HALF_VIEW} ${-HALF_VIEW} ${VIEW_SIZE} ${VIEW_SIZE}`} 
        preserveAspectRatio="xMidYMid slice"
        className="relative z-10"
      >
        {/* --- MAP LAYERS --- */}
        
        {/* 1. Contour Lines (Elevation) */}
        <g opacity="0.3">
           {mountains.map((m, i) => (
             <g key={`mtn-${i}`}>
               <polygon points={m.points} fill="#2d3f23" stroke="#3B5323" strokeWidth="2" />
               <polygon points={m.points} transform="scale(0.8)" fill="#3B5323" stroke="none" style={{transformBox: 'fill-box', transformOrigin: 'center'}} />
             </g>
           ))}
        </g>

        {/* 2. Forests (Green Zones) */}
        <g opacity="0.4">
          {forests.map((f, i) => (
            <circle key={`forest-${i}`} cx={f.x} cy={f.y} r={f.r} fill="#138808" filter="url(#rough)" />
          ))}
        </g>

        {/* 3. Roads/Paths */}
        <path 
          d="M-500,0 Q-200,100 0,0 T500,200" 
          fill="none" 
          stroke="#3d3d3d" 
          strokeWidth="15" 
          strokeLinecap="round" 
        />
        <path 
          d="M0,-500 Q100,-200 0,0 T-100,500" 
          fill="none" 
          stroke="#3d3d3d" 
          strokeWidth="15" 
          strokeLinecap="round" 
        />

        {/* 4. Grid Overlay (Tactical) */}
        <g stroke="#4ade80" strokeWidth="0.5" strokeOpacity="0.1">
           {Array.from({ length: 20 }).map((_, i) => {
             const p = (i - 10) * 100;
             return (
               <React.Fragment key={i}>
                 <line x1={-1000} y1={p} x2={1000} y2={p} />
                 <line x1={p} y1={-1000} x2={p} y2={1000} />
               </React.Fragment>
             );
           })}
        </g>

        {/* 5. Static Friendly Units */}
        {soldiers.map((s, i) => (
          <g key={s.name} transform={`translate(${s.x}, ${s.y}) rotate(${s.angle})`}>
            {/* Range Circle */}
            <circle r="15" fill="none" stroke="#3B5323" strokeWidth="1" opacity="0.5" />
            
            {/* Simple Soldier Top-Down */}
            <circle r="6" fill="#2d3f23" stroke="#1f2f16" strokeWidth="1" /> {/* Helmet */}
            <rect x="-8" y="-3" width="16" height="6" rx="2" fill="#3B5323" /> {/* Shoulders */}
            <rect x="-2" y="-12" width="4" height="10" fill="#111" /> {/* Gun */}

            {/* Label */}
            <text y="20" textAnchor="middle" fill="#4ade80" fontSize="8" fontFamily="monospace" opacity="0.7">
              {s.name}
            </text>
          </g>
        ))}

        {/* 6. PRIMARY AI SOLDIER: sumY */}
        <g transform={`translate(${robotState.x * 10}, ${robotState.y * 10})`}>
           {/* Trail */}
           <path 
             d={`M${robotState.trail.map(p => `${(p.x - robotState.x) * 10},${(p.y - robotState.y) * 10}`).join(' L ')}`} 
             fill="none" 
             stroke="#FF9933" 
             strokeWidth="2" 
             opacity="0.3"
             transform={`translate(${-robotState.x * 10}, ${-robotState.y * 10})`} 
           />

           <g transform={`rotate(${robotState.angle})`}>
             {/* Field of View Cone */}
             <path d="M0,0 L-50,-150 L50,-150 Z" fill="url(#vision-grad)" opacity="0.3" />

             {/* --- DETAILED AI SOLDIER SPRITE (Top-Down) --- */}
             <g transform="scale(1.2)">
                {/* Weapon (Holding forward) */}
                <rect x="-2" y="-24" width="4" height="16" fill="#111" /> {/* Barrel */}
                <rect x="-3" y="-12" width="6" height="8" fill="#222" /> {/* Receiver */}
                
                {/* Arms */}
                <path d="M-9,0 Q-10,-6 -4,-10" stroke="#2d3f23" strokeWidth="4" strokeLinecap="round" />
                <path d="M9,0 Q10,-6 4,-10" stroke="#2d3f23" strokeWidth="4" strokeLinecap="round" />

                {/* Body / Backpack */}
                <rect x="-9" y="-4" width="18" height="12" rx="3" fill="#1f2f16" stroke="#0f160f" strokeWidth="1" />
                
                {/* Tricolor Patch on Backpack */}
                <g transform="translate(-4, 3)">
                  <rect y="0" width="8" height="1" fill="#FF9933" />
                  <rect y="1" width="8" height="1" fill="#FFFFFF" />
                  <rect y="2" width="8" height="1" fill="#138808" />
                </g>

                {/* Subtle Energy Lines on Armor (Back) */}
                <path d="M-6,0 L-6,6" stroke="#4ade80" strokeWidth="0.5" opacity="0.4" />
                <path d="M6,0 L6,6" stroke="#4ade80" strokeWidth="0.5" opacity="0.4" />

                {/* Helmet */}
                <circle cx="0" cy="-2" r="6" fill="#151e12" stroke="#2d3f23" strokeWidth="1" />
                
                {/* Visor (Black strip) */}
                <path d="M-5,-5 Q0,-7 5,-5 L5,-3 Q0,-5 -5,-3 Z" fill="#000" />
                
                {/* Animated Visor Light (Scanner) */}
                <rect x="-4" y="-5" width="2" height="1.5" fill="#FF9933" filter="url(#glow)">
                    <animate attributeName="x" values="-4;2;-4" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;1;0.8" dur="0.2s" repeatCount="indefinite" />
                </rect>

                {/* Helmet Energy Nodes */}
                <circle cx="-4" cy="-3" r="0.5" fill="#4ade80" opacity="0.8">
                  <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx="4" cy="-3" r="0.5" fill="#4ade80" opacity="0.8">
                  <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" delay="1s" />
                </circle>
             </g>

             {/* Text Label */}
             <text y="25" textAnchor="middle" fill="#FF9933" fontSize="10" fontWeight="bold" fontFamily="monospace" letterSpacing="1" style={{textShadow: "1px 1px 2px #000"}}>
               sumY
             </text>
           </g>
        </g>

        {/* Definitions */}
        <defs>
          <filter id="rough">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" />
            <feDisplacementMap in="SourceGraphic" scale="10" />
          </filter>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="vision-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#FF9933" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FF9933" stopOpacity="0" />
          </linearGradient>
        </defs>

      </svg>
      
      {/* Compass / Scale Overlay */}
      <div className="absolute top-4 right-4 text-[#4ade80] font-mono text-xs border border-[#4ade80] p-2 bg-black/50">
        <div>LIVE BATTLEFIELD FEED</div>
        <div>SECTOR: 7G</div>
      </div>
    </div>
  );
};
