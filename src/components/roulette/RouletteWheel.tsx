'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { EUROPEAN_WHEEL_ORDER, getNumberColor } from '@/lib/game/roulette/wheel';

interface RouletteWheelProps {
  winningNumber?: number;
  isSpinning: boolean;
  onSpinComplete?: () => void;
  className?: string;
}

export function RouletteWheel({
  winningNumber,
  isSpinning,
  onSpinComplete,
  className,
}: RouletteWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [ballRotation, setBallRotation] = useState(0);
  const [hasSpun, setHasSpun] = useState(false);

  useEffect(() => {
    if (isSpinning && winningNumber !== undefined) {
      setHasSpun(true);

      // Calculate target angle for winning number
      const wheelOrder = [...EUROPEAN_WHEEL_ORDER] as number[];
      const winningIndex = wheelOrder.indexOf(winningNumber);
      const segmentAngle = 360 / 37;
      const targetAngle = winningIndex * segmentAngle;

      // Add multiple full rotations for dramatic effect
      const spins = 5 + Math.random() * 2; // 5-7 full rotations
      const finalRotation = spins * 360 + targetAngle;

      // Wheel rotates clockwise
      setRotation(finalRotation);

      // Ball rotates counter-clockwise (opposite direction)
      const ballSpins = 7 + Math.random() * 3; // 7-10 full rotations
      const finalBallRotation = -(ballSpins * 360 + targetAngle);
      setBallRotation(finalBallRotation);

      // Complete animation after 4 seconds
      const timeout = setTimeout(() => {
        onSpinComplete?.();
      }, 4000);

      return () => clearTimeout(timeout);
    }
  }, [isSpinning, winningNumber, onSpinComplete]);

  // Reset when not spinning
  useEffect(() => {
    if (!isSpinning && hasSpun) {
      // Keep final position
      setHasSpun(false);
    }
  }, [isSpinning, hasSpun]);

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {/* Outer wheel rim */}
      <div className="absolute inset-0 rounded-full border-8 border-amber-900 shadow-2xl bg-gradient-to-br from-amber-800 to-amber-950" />

      {/* Wheel with numbers */}
      <svg
        viewBox="0 0 400 400"
        className="w-full h-full"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
        }}
      >
        {EUROPEAN_WHEEL_ORDER.map((num, index) => {
          const angle = (index * 360) / 37 - 90; // Start at top
          const nextAngle = ((index + 1) * 360) / 37 - 90;

          const x1 = 200 + 200 * Math.cos((angle * Math.PI) / 180);
          const y1 = 200 + 200 * Math.sin((angle * Math.PI) / 180);
          const x2 = 200 + 200 * Math.cos((nextAngle * Math.PI) / 180);
          const y2 = 200 + 200 * Math.sin((nextAngle * Math.PI) / 180);

          const color = getNumberColor(num);
          const fillColor =
            color === 'green' ? '#10b981' : color === 'red' ? '#dc2626' : '#000000';

          // Text position (80% radius)
          const textAngle = (angle + nextAngle) / 2;
          const textX = 200 + 140 * Math.cos((textAngle * Math.PI) / 180);
          const textY = 200 + 140 * Math.sin((textAngle * Math.PI) / 180);

          return (
            <g key={num}>
              {/* Segment */}
              <path
                d={`M 200 200 L ${x1} ${y1} A 200 200 0 0 1 ${x2} ${y2} Z`}
                fill={fillColor}
                stroke="#d97706"
                strokeWidth="1"
              />
              {/* Number */}
              <text
                x={textX}
                y={textY}
                fill="white"
                fontSize="14"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  transform: `rotate(${-rotation}deg)`,
                  transformOrigin: `${textX}px ${textY}px`,
                }}
              >
                {num}
              </text>
            </g>
          );
        })}

        {/* Center hub */}
        <circle cx="200" cy="200" r="40" fill="#fbbf24" stroke="#d97706" strokeWidth="4" />
      </svg>

      {/* Ball */}
      <div
        className="absolute top-[15%] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow-lg border-2 border-gray-300"
        style={{
          transform: `rotate(${ballRotation}deg) translateY(-120px)`,
          transformOrigin: 'center 120px',
          transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
        }}
      />

      {/* Center marker */}
      {!isSpinning && winningNumber !== undefined && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-yellow-400 text-gray-900 font-bold text-2xl w-16 h-16 rounded-full flex items-center justify-center shadow-2xl border-4 border-yellow-600 animate-pulse">
            {winningNumber}
          </div>
        </div>
      )}
    </div>
  );
}
