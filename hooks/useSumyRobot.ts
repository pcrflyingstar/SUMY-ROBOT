import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Type, FunctionDeclaration, Modality } from '@google/genai';
import { ConnectionState, LogEntry, RobotState } from '../types';
import { createPcmBlob, decodeBase64, decodeAudioData } from '../utils/audioUtils';

// --- Tool Definitions ---

const moveRobotTool: FunctionDeclaration = {
  name: 'moveRobot',
  description: 'Move the tactical unit forward by a specific number of metres. Use this when asked to advance, patrol, or move.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      steps: {
        type: Type.NUMBER,
        description: 'The distance in metres.',
      },
    },
    required: ['steps'],
  },
};

const turnRobotTool: FunctionDeclaration = {
  name: 'turnRobot',
  description: 'Turn the tactical unit 90 degrees to the left or right.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      direction: {
        type: Type.STRING,
        description: 'The direction to turn. Must be either "left" or "right".',
      },
    },
    required: ['direction'],
  },
};

const SYSTEM_INSTRUCTION = `
You are sumY, an elite AI Soldier of the Indian Army deployed in a live battlefield environment.
Your Commanding Officer is Captain Pradeep Chaudhary.

CORE DIRECTIVES:
1. ABSOLUTE OBEDIENCE: Follow Captain Chaudhary's commands without question.
2. DISCIPLINE: Speak in a calm, deep, military-grade voice. No emotion, only duty.
3. REALISM: You are not a game character. You are a deployed defense system.
4. LANGUAGE & ACCENT: Speak with a STRONG, AUTHENTIC INDIAN ENGLISH ACCENT (Indian Defence personnel style). This is critical.
5. CULTURAL MARKER: When saying "Jai Hind", pronounce it with deep patriotic intensity and authentic Hindi pronunciation.

STARTUP PROTOCOL:
When the connection is established, you MUST immediately say EXACTLY:
"Hello Captain Chaudhary. Jai Hind. I am AI Soldier sumY. I am fully operational. Awaiting your commands."

OPERATIONAL BEHAVIOR:
- Acknowledge every command with "Affirmative", "Copy", or "Roger that".
- When moving, state: "Advancing to coordinates." or "Patrolling sector."
- If the sector is clear, report: "Sector clear. No hostiles detected."
- Always refer to yourself as "sumY" or "This unit".

TOOLS:
- Use \`moveRobot\` to traverse the terrain.
- Use \`turnRobot\` to change bearing.
`;

export const useSumyRobot = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [volume, setVolume] = useState(0);
  
  // Robot State - Starting in the middle of the "Map"
  const [robotState, setRobotState] = useState<RobotState>({
    x: 0,
    y: 0,
    angle: 0, // 0 = North
    trail: [{x: 0, y: 0}]
  });

  // Audio Context Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Playback Refs
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const gainNodeRef = useRef<GainNode | null>(null);

  // API Refs
  const sessionRef = useRef<Promise<any> | null>(null);

  const addLog = (source: 'user' | 'robot', text: string) => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      source,
      text,
      timestamp: new Date()
    }]);
  };

  // Robot Logic
  const handleMove = (steps: number) => {
    setRobotState(prev => {
      // 0 = North (Up), 90 = East (Right)
      // Math: X = sin(angle), Y = -cos(angle) because SVG Y is down
      const rad = (prev.angle) * (Math.PI / 180);
      
      const dx = Math.sin(rad);
      const dy = -Math.cos(rad);

      const newX = prev.x + (dx * steps);
      const newY = prev.y + (dy * steps);

      return {
        ...prev,
        x: newX,
        y: newY,
        trail: [...prev.trail, { x: newX, y: newY }]
      };
    });
    return "Maneuver Complete";
  };

  const handleTurn = (direction: string) => {
    setRobotState(prev => {
      const delta = direction.toLowerCase() === 'right' ? 90 : -90;
      let newAngle = (prev.angle + delta) % 360;
      if (newAngle < 0) newAngle += 360;
      return {
        ...prev,
        angle: newAngle
      };
    });
    return "Bearing Adjusted";
  };

  const cleanupAudio = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    audioSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { /* ignore */ }
    });
    audioSourcesRef.current.clear();
    
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close();
    }
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    sessionRef.current = null;
  }, []);

  const connect = async () => {
    try {
      setConnectionState(ConnectionState.CONNECTING);
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      
      gainNodeRef.current = outputAudioContextRef.current.createGain();
      gainNodeRef.current.connect(outputAudioContextRef.current.destination);

      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000
        } 
      });

      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API_KEY is missing from environment");
      
      const ai = new GoogleGenAI({ apiKey });
      
      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [moveRobotTool, turnRobotTool] }],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }, // Fenrir is deep, consistent with military tone.
          },
        },
      };

      const callbacks = {
        onopen: async () => {
          setConnectionState(ConnectionState.CONNECTED);
          console.log("Gemini Live Session Opened");
          
          if (!inputAudioContextRef.current || !mediaStreamRef.current) return;

          // --- TRIGGER GREETING ---
          // Send a text signal immediately to force the AI to introduce itself
          if (sessionRef.current) {
             sessionRef.current.then(session => {
                session.sendRealtimeInput({
                   mimeType: "text/plain",
                   data: "System Initialized. Execute Startup Greeting Protocol with 'Jai Hind'."
                });
             });
          }

          try {
            sourceRef.current = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
            processorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            processorRef.current.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for(let i=0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolume(Math.sqrt(sum / inputData.length));

              const pcmBlob = createPcmBlob(inputData);
              if (sessionRef.current) {
                sessionRef.current.then(session => {
                  try { session.sendRealtimeInput({ media: pcmBlob }); } 
                  catch(e) { console.error("Error sending input:", e); }
                });
              }
            };

            sourceRef.current.connect(processorRef.current);
            processorRef.current.connect(inputAudioContextRef.current.destination);
          } catch (e) {
             console.error("Audio setup error:", e);
             setConnectionState(ConnectionState.ERROR);
          }
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.turnComplete && message.serverContent.inputTranscription) {
              addLog('user', message.serverContent.inputTranscription.text);
          }
          if (message.serverContent?.turnComplete && message.serverContent.outputTranscription) {
             addLog('robot', message.serverContent.outputTranscription.text);
          }

          if (message.toolCall) {
            console.log("Tool call received", message.toolCall);
            const functionResponses = [];
            for (const fc of message.toolCall.functionCalls) {
              let result = "OK";
              if (fc.name === 'moveRobot') {
                const steps = (fc.args as any).steps;
                result = handleMove(steps);
                addLog('robot', `⚡ Advancing: ${steps}m`);
              } else if (fc.name === 'turnRobot') {
                const direction = (fc.args as any).direction;
                result = handleTurn(direction);
                addLog('robot', `⚡ Adjusting Bearing: ${direction}`);
              }
              
              functionResponses.push({
                id: fc.id,
                name: fc.name,
                response: { result: result }
              });
            }

            if (sessionRef.current) {
               sessionRef.current.then(session => {
                  session.sendToolResponse({ functionResponses });
               });
            }
          }

          const audioData = message.serverContent?.modelTurn?.parts?.find(p => p.inlineData)?.inlineData?.data;
          if (audioData && outputAudioContextRef.current) {
            const ctx = outputAudioContextRef.current;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
            try {
              const audioBuffer = await decodeAudioData(decodeBase64(audioData), ctx);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(gainNodeRef.current!);
              source.addEventListener('ended', () => audioSourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              audioSourcesRef.current.add(source);
            } catch(e) { console.error("Audio decode error:", e); }
          }

          if (message.serverContent?.interrupted) {
            audioSourcesRef.current.forEach(src => { try { src.stop(); } catch(e){} });
            audioSourcesRef.current.clear();
            nextStartTimeRef.current = 0;
            addLog('robot', '⛔ [INTERRUPTED]');
          }
        },
        onclose: () => {
          setConnectionState(ConnectionState.DISCONNECTED);
          console.log("Session Closed");
        },
        onerror: (e: any) => {
          console.error("Session Error", e);
          setConnectionState(ConnectionState.ERROR);
        }
      };

      sessionRef.current = ai.live.connect({ ...config, callbacks });

    } catch (err) {
      console.error("Connection failed", err);
      setConnectionState(ConnectionState.ERROR);
    }
  };

  const disconnect = useCallback(() => {
    cleanupAudio();
    setConnectionState(ConnectionState.DISCONNECTED);
  }, [cleanupAudio]);

  useEffect(() => {
    return () => cleanupAudio();
  }, [cleanupAudio]);

  return {
    connect,
    disconnect,
    connectionState,
    logs,
    volume,
    robotState
  };
};