export interface LogEntry {
  id: string;
  source: 'user' | 'robot';
  text: string;
  timestamp: Date;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface AudioVisualizerData {
  volume: number;
}

export interface RobotState {
  x: number;
  y: number;
  z?: number; // Altitude/Height
  angle: number; // 0 = North
  trail: Array<{x: number, y: number}>;
}