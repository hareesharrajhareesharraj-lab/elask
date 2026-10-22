import React, { useEffect, useState } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  color?: string;
  barsCount?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isActive,
  color = '#00f0ff',
  barsCount = 28,
}) => {
  const [heights, setHeights] = useState<number[]>([]);

  useEffect(() => {
    if (!isActive) {
      setHeights(new Array(barsCount).fill(4));
      return;
    }

    const interval = setInterval(() => {
      const newHeights = Array.from({ length: barsCount }, (_, idx) => {
        // Curve: higher in middle, subtle randomness
        const distFromCenter = Math.abs(idx - barsCount / 2) / (barsCount / 2);
        const factor = 1 - distFromCenter * 0.6;
        const randomHeight = Math.floor(Math.random() * 28 + 6);
        return Math.max(4, Math.min(36, Math.floor(randomHeight * factor)));
      });
      setHeights(newHeights);
    }, 90);

    return () => clearInterval(interval);
  }, [isActive, barsCount]);

  return (
    <div className="flex items-center justify-center gap-1 h-9 px-4 py-1">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-sm transition-all duration-75"
          style={{
            height: `${h}px`,
            backgroundColor: color,
            opacity: isActive ? 0.85 : 0.25,
            boxShadow: isActive ? `0 0 6px ${color}` : 'none',
          }}
        />
      ))}
    </div>
  );
};
