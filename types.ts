
export enum AppState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  LISTENING = 'LISTENING',
  ERROR = 'ERROR',
}

export enum Speaker {
  USER = 'USER',
  JARVIS = 'JARVIS',
}

export interface TranscriptEntry {
  speaker: Speaker;
  text: string;
  isFinal: boolean;
}
