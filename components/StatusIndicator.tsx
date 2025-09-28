
import React from 'react';
import { AppState } from '../types';

interface StatusIndicatorProps {
  state: AppState;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ state }) => {
  const getStatusInfo = () => {
    switch (state) {
      case AppState.IDLE:
        return { text: 'Offline', color: 'bg-gray-500' };
      case AppState.CONNECTING:
        return { text: 'Connecting...', color: 'bg-yellow-500 animate-pulse' };
      case AppState.LISTENING:
        return { text: 'Online', color: 'bg-green-500' };
      case AppState.ERROR:
        return { text: 'Error', color: 'bg-red-500' };
      default:
        return { text: 'Unknown', color: 'bg-gray-500' };
    }
  };

  const { text, color } = getStatusInfo();

  return (
    <div className="flex items-center space-x-2">
      <span className="relative flex h-3 w-3">
        <span className={`absolute inline-flex h-full w-full rounded-full ${color}`}></span>
      </span>
      <span className="text-sm font-medium text-gray-300">{text}</span>
    </div>
  );
};
