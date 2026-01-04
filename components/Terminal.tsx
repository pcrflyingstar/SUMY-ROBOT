/* @jsx React.createElement */
/* @jsxFrag React.Fragment */
import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface TerminalProps {
  logs: LogEntry[];
}

export const Terminal: React.FC<TerminalProps> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-4 relative custom-scrollbar">
      {logs.length === 0 && (
        <div className="text-gray-600 italic text-center mt-10 opacity-50">
          Awaiting system activation...
        </div>
      )}
      {logs.map((log) => (
        <div 
          key={log.id} 
          className={`flex flex-col ${log.source === 'user' ? 'items-end' : 'items-start'}`}
        >
          <div className={`
            max-w-[80%] rounded p-3 border
            ${log.source === 'user' 
              ? 'bg-gray-900 border-gray-700 text-gray-300 rounded-br-none' 
              : 'bg-sumy-dim/20 border-sumy-primary/30 text-sumy-primary rounded-bl-none shadow-[0_0_10px_rgba(0,255,157,0.1)]'
            }
          `}>
            <div className="flex items-center gap-2 mb-1 opacity-70 text-xs uppercase tracking-wider">
              <span>{log.source === 'user' ? '🎙️ HUMAN' : '🤖 SUMY SYSTEM'}</span>
              <span>{log.timestamp.toLocaleTimeString([], { hour12: false })}</span>
            </div>
            <div className="whitespace-pre-wrap leading-relaxed">
              {log.text}
            </div>
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
};