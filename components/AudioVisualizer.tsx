
import React, { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  analyserNode: AnalyserNode | null;
  isListening: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ analyserNode, isListening }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // FIX: Initialized useRef with null to provide an explicit initial value, resolving a potential argument error.
  const animationFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      animationFrameIdRef.current = requestAnimationFrame(draw);

      analyserNode.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];

        const r = 0;
        const g = barHeight + 100;
        const b = 255;
        
        canvasCtx.fillStyle = `rgb(${r},${g},${b})`;
        const y = canvas.height - barHeight / 2;
        canvasCtx.fillRect(x, y, barWidth, barHeight / 2);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      // FIX: Added a strict null check to prevent bugs where a valid animation frame ID of 0 could be missed.
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [analyserNode]);
  
  // Static visualizer for listening state
  useEffect(() => {
    const canvas = canvasRef.current;
     if (!canvas || !isListening || analyserNode) return;

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    let time = 0;
    const drawListening = () => {
        animationFrameIdRef.current = requestAnimationFrame(drawListening);
        const width = canvas.width;
        const height = canvas.height;
        
        canvasCtx.clearRect(0, 0, width, height);

        const amplitude = height / 4;
        const frequency = 0.05;
        
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = 'rgba(0, 255, 255, 0.7)';

        canvasCtx.beginPath();
        for(let x=0; x<width; x++) {
            const y = height/2 + amplitude * Math.sin(x * frequency + time);
            canvasCtx.lineTo(x, y);
        }
        canvasCtx.stroke();
        time += 0.1;
    }

    drawListening();

     return () => {
      // FIX: Added a strict null check to prevent bugs where a valid animation frame ID of 0 could be missed.
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };

  }, [isListening, analyserNode]);


  return <canvas ref={canvasRef} width="300" height="50" className="transition-opacity duration-300" style={{ opacity: isListening || analyserNode ? 1 : 0.2 }}/>;
};
