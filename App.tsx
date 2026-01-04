/* @jsx React.createElement */
/* @jsxFrag React.Fragment */
import React from 'react';
import { useSumyRobot } from './hooks/useSumyRobot';
import { ConnectionState } from './types';
import { Terminal } from './components/Terminal';
import { Visualizer } from './components/Visualizer';
import { GridMap } from './components/GridMap';

const App: React.FC = () => {
  const { connect, disconnect, connectionState, logs, volume, robotState } = useSumyRobot();

  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;

  const handleToggle = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="relative w-screen h-screen bg-[#050805] overflow-hidden text-[#e0e0e0] font-tactical select-none">
      
      {/* --- LIVE TACTICAL MAP (Full Background) --- */}
      <div className="absolute inset-0 z-0">
        <GridMap robotState={robotState} />
      </div>

      {/* --- VIGNETTE & SCANLINES --- */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]"></div>
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>

      {/* --- HUD HEADER --- */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start pointer-events-none z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex flex-col">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 border-2 border-india-saffron bg-india-saffron/20 flex items-center justify-center animate-pulse-slow">
                <span className="text-xl font-bold text-india-saffron">IA</span>
             </div>
             <div>
                <h1 className="text-2xl font-bold tracking-[0.2em] text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                   sumY <span className="text-india-saffron">COMMAND</span>
                </h1>
                <div className="text-[10px] font-mono text-tac-green tracking-[0.3em] uppercase">
                   TACTICAL OPERATING SYSTEM // V.4.2
                </div>
             </div>
          </div>
          <div className="mt-2 text-[10px] text-gray-400 font-mono pl-14">
             CMD: <span className="text-white font-bold">CPT. PRADEEP CHAUDHARY</span>
          </div>
        </div>

        <div className="text-right">
          <div className={`text-xs font-mono px-3 py-1 border ${isConnected ? 'border-india-green text-india-green bg-india-green/10' : 'border-red-500 text-red-500 bg-red-900/10'}`}>
             {isConnected ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
          </div>
          <div className="text-[10px] text-gray-400 mt-1 font-mono">
            LAT: {(34.0 + robotState.y/1000).toFixed(6)} N <br/>
            LNG: {(74.0 + robotState.x/1000).toFixed(6)} E
          </div>
        </div>
      </div>

      {/* --- LOG PANEL (Left) --- */}
      <div className="absolute top-32 left-6 bottom-32 w-72 pointer-events-none flex flex-col gap-2">
         <div className="bg-black/60 backdrop-blur-sm border-l-2 border-india-saffron p-2">
           <div className="text-[10px] text-india-saffron font-bold mb-1 uppercase tracking-wider">Communication Log</div>
           <div className="h-64 overflow-hidden relative pointer-events-auto">
              <Terminal logs={logs} />
           </div>
         </div>
      </div>

      {/* --- CONTROL DECK (Bottom) --- */}
      <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between pointer-events-none z-20">
         
         {/* Audio Visualizer & Toggle */}
         <div className="pointer-events-auto flex items-center gap-6 bg-black/80 backdrop-blur border border-white/10 px-6 py-4 rounded-lg shadow-2xl">
            <Visualizer volume={volume} active={isConnected} />
            <div className="h-10 w-px bg-white/20"></div>
            <button
              onClick={handleToggle}
              disabled={isConnecting}
              className={`
                h-10 px-8 border font-bold tracking-widest text-sm uppercase transition-all hover:scale-105 active:scale-95
                ${isConnected 
                  ? 'bg-red-900/20 border-red-500 text-red-500 hover:bg-red-900/40' 
                  : 'bg-india-green/20 border-india-green text-india-green hover:bg-india-green/40'
                }
              `}
            >
              {isConnecting ? 'CONNECTING...' : isConnected ? 'ABORT LINK' : 'INITIALIZE'}
            </button>
         </div>

         {/* Credits */}
         <div className="text-center pb-2 opacity-60">
            <div className="text-[9px] font-mono tracking-[0.4em] text-white">DEVELOPED BY PRADEEP CHAUDHARY</div>
         </div>

         {/* Status Array */}
         <div className="flex gap-2 font-mono text-[10px]">
            <div className="bg-black/80 border border-white/10 p-2 min-w-[100px]">
               <div className="text-gray-500">BATTERY</div>
               <div className="text-tac-green">98% STABLE</div>
            </div>
            <div className="bg-black/80 border border-white/10 p-2 min-w-[100px]">
               <div className="text-gray-500">NETWORK</div>
               <div className="text-india-saffron">SECURE (MIL-SPEC)</div>
            </div>
         </div>
      </div>

    </div>
  );
};

export default App;