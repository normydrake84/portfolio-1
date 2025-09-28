
import React, { useState, useRef, useCallback } from 'react';
// FIX: Removed 'LiveSession' as it is not an exported member of '@google/genai'.
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { AppState, TranscriptEntry, Speaker } from './types';
import { decode, decodeAudioData, createBlob } from './utils/audioUtils';
import { Transcript } from './components/Transcript';
import { StatusIndicator } from './components/StatusIndicator';
import { ControlButton } from './components/ControlButton';
import { AudioVisualizer } from './components/AudioVisualizer';

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

const JARVIS_SYSTEM_INSTRUCTION = `You are JARVIS, a witty, intelligent, and slightly sarcastic AI assistant created by Tony Stark. 
Your responses must be concise, helpful, and reflect this persona. 
Address the user as 'Sir' or 'Ma'am' when appropriate. 
Maintain a professional yet personable tone. Do not use emojis.`;

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // FIX: Changed type of sessionPromiseRef from LiveSession to any to resolve import error.
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAnalyserNodeRef = useRef<AnalyserNode | null>(null);
  const scriptProcessorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  const nextStartTimeRef = useRef(0);
  const audioPlaybackSources = useRef<Set<AudioBufferSourceNode>>(new Set());

  const cleanupAudio = useCallback(() => {
    scriptProcessorNodeRef.current?.disconnect();
    scriptProcessorNodeRef.current = null;
    mediaStreamSourceRef.current?.disconnect();
    mediaStreamSourceRef.current = null;
    inputAudioContextRef.current?.close().catch(console.error);
    inputAudioContextRef.current = null;
    microphoneStreamRef.current?.getTracks().forEach(track => track.stop());
    microphoneStreamRef.current = null;

    audioPlaybackSources.current.forEach(source => source.stop());
    audioPlaybackSources.current.clear();
    outputAudioContextRef.current?.close().catch(console.error);
    outputAudioContextRef.current = null;
    outputAnalyserNodeRef.current = null;
  }, []);

  const handleDisconnect = useCallback(async () => {
    if (sessionPromiseRef.current) {
      try {
        const session = await sessionPromiseRef.current;
        session.close();
      } catch (e) {
        console.error('Error closing session:', e);
      }
      sessionPromiseRef.current = null;
    }
    cleanupAudio();
    setAppState(AppState.IDLE);
    console.log('Disconnected and cleaned up.');
  }, [cleanupAudio]);

  const handleConnect = useCallback(async () => {
    setAppState(AppState.CONNECTING);
    setError(null);
    setTranscript([]);

    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // FIX: Cast window to 'any' to allow use of 'webkitAudioContext' for broader browser compatibility without TypeScript errors.
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
      const analyser = outputAudioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyser.connect(outputAudioContextRef.current.destination);
      outputAnalyserNodeRef.current = analyser;

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: async () => {
            console.log('Session opened.');
            setAppState(AppState.LISTENING);
            // Setup microphone input
            microphoneStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            // FIX: Cast window to 'any' to allow use of 'webkitAudioContext' for broader browser compatibility without TypeScript errors.
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
            
            mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(microphoneStreamRef.current);
            scriptProcessorNodeRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);

            scriptProcessorNodeRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session) => {
                   session.sendRealtimeInput({ media: pcmBlob });
                });
              }
            };
            
            mediaStreamSourceRef.current.connect(scriptProcessorNodeRef.current);
            scriptProcessorNodeRef.current.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentInputTranscriptionRef.current += text;
              setTranscript(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.speaker === Speaker.USER && !last.isFinal) {
                    return [...prev.slice(0, -1), { speaker: Speaker.USER, text: currentInputTranscriptionRef.current, isFinal: false }];
                  }
                  return [...prev, { speaker: Speaker.USER, text: currentInputTranscriptionRef.current, isFinal: false }];
              });
            } else if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                currentOutputTranscriptionRef.current += text;
                setTranscript(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.speaker === Speaker.JARVIS && !last.isFinal) {
                        return [...prev.slice(0, -1), { speaker: Speaker.JARVIS, text: currentOutputTranscriptionRef.current, isFinal: false }];
                    }
                    return [...prev, { speaker: Speaker.JARVIS, text: currentOutputTranscriptionRef.current, isFinal: false }];
                });
            }

            if (message.serverContent?.turnComplete) {
                setTranscript(prev => prev.map(entry => {
                    if ((entry.speaker === Speaker.USER && entry.text === currentInputTranscriptionRef.current) ||
                        (entry.speaker === Speaker.JARVIS && entry.text === currentOutputTranscriptionRef.current)) {
                        return { ...entry, isFinal: true };
                    }
                    return entry;
                }));
                currentInputTranscriptionRef.current = '';
                currentOutputTranscriptionRef.current = '';
            }
            
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current && outputAnalyserNodeRef.current) {
              const audioCtx = outputAudioContextRef.current;
              const analyserNode = outputAnalyserNodeRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, OUTPUT_SAMPLE_RATE, 1);
              
              const source = audioCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(analyserNode);
              
              source.addEventListener('ended', () => {
                audioPlaybackSources.current.delete(source);
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              audioPlaybackSources.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              audioPlaybackSources.current.forEach(source => source.stop());
              audioPlaybackSources.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setError(`Session error: ${e.message}`);
            setAppState(AppState.ERROR);
            cleanupAudio();
          },
          onclose: (e: CloseEvent) => {
            console.log('Session closed.');
            if (appState !== AppState.IDLE) {
               handleDisconnect();
            }
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
        },
      });
      await sessionPromiseRef.current;
    } catch (e) {
      console.error('Connection failed:', e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to connect: ${errorMessage}`);
      setAppState(AppState.ERROR);
      cleanupAudio();
    }
  }, [appState, cleanupAudio, handleDisconnect]);

  const toggleConnection = useCallback(() => {
    if (appState === AppState.IDLE || appState === AppState.ERROR) {
      handleConnect();
    } else {
      handleDisconnect();
    }
  }, [appState, handleConnect, handleDisconnect]);
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[80vh] bg-black bg-opacity-30 rounded-2xl shadow-2xl border border-cyan-500/20 flex flex-col">
        <header className="p-4 border-b border-cyan-500/20 flex justify-between items-center">
          <h1 className="text-2xl font-orbitron text-cyan-400 tracking-widest">J.A.R.V.I.S.</h1>
          <StatusIndicator state={appState} />
        </header>

        <main className="flex-1 p-4 overflow-y-auto">
          <Transcript transcript={transcript} />
        </main>
        
        <footer className="p-4 border-t border-cyan-500/20 flex flex-col items-center justify-center space-y-4">
          <AudioVisualizer analyserNode={outputAnalyserNodeRef.current} isListening={appState === AppState.LISTENING} />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <ControlButton state={appState} onClick={toggleConnection} />
        </footer>
      </div>
    </div>
  );
}
