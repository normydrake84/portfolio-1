
import React, { useEffect, useRef } from 'react';
import { TranscriptEntry, Speaker } from '../types';

interface TranscriptProps {
  transcript: TranscriptEntry[];
}

export const Transcript: React.FC<TranscriptProps> = ({ transcript }) => {
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  if (transcript.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400 font-orbitron">Awaiting connection...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {transcript.map((entry, index) => (
        <div
          key={index}
          className={`flex items-start gap-3 ${
            entry.speaker === Speaker.USER ? 'justify-end' : 'justify-start'
          }`}
        >
          {entry.speaker === Speaker.JARVIS && (
            <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
              J
            </div>
          )}
          <div
            className={`max-w-xl rounded-lg px-4 py-2 ${
              entry.speaker === Speaker.USER
                ? 'bg-blue-600/50 rounded-br-none'
                : 'bg-gray-700/50 rounded-bl-none'
            } ${entry.isFinal ? 'opacity-100' : 'opacity-60'}`}
          >
            <p className="text-base">{entry.text}</p>
          </div>
           {entry.speaker === Speaker.USER && (
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              U
            </div>
          )}
        </div>
      ))}
      <div ref={endOfMessagesRef} />
    </div>
  );
};
