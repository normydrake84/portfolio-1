
import React from 'react';
import { AppState } from '../types';

interface ControlButtonProps {
  state: AppState;
  onClick: () => void;
}

const MicIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3ZM17 11a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />
  </svg>
);

const StopIcon: React.FC<{className?: string}> = ({ className }) => (
 <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 6.5a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-.5.5h-12a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h12Z" />
  </svg>
);


export const ControlButton: React.FC<ControlButtonProps> = ({ state, onClick }) => {
  const getButtonState = () => {
    switch (state) {
      case AppState.IDLE:
      case AppState.ERROR:
        return { text: 'Activate', icon: <MicIcon className="w-8 h-8" />, color: 'cyan', enabled: true };
      case AppState.CONNECTING:
        return { text: 'Connecting...', icon: <div className="w-6 h-6 border-2 border-t-transparent border-white rounded-full animate-spin"></div>, color: 'gray', enabled: false };
      case AppState.LISTENING:
        return { text: 'Deactivate', icon: <StopIcon className="w-8 h-8" />, color: 'red', enabled: true };
      default:
        return { text: 'Activate', icon: <MicIcon className="w-8 h-8" />, color: 'gray', enabled: false };
    }
  };

  const { text, icon, color, enabled } = getButtonState();
  const colorClasses = {
    cyan: 'bg-cyan-500 hover:bg-cyan-600 text-black',
    red: 'bg-red-500 hover:bg-red-600 text-white',
    gray: 'bg-gray-600 cursor-not-allowed',
  }[color];

  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out shadow-lg focus:outline-none focus:ring-4 focus:ring-${color}-500/50 ${colorClasses}`}
    >
      <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse" style={{ animationDuration: '3s' }}></div>
      {icon}
    </button>
  );
};
