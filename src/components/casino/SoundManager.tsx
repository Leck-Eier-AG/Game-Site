'use client';

import { createContext, useContext, useCallback, useRef, useEffect, useState, type ReactNode } from 'react';

interface CasinoSoundContextValue {
  playCardFlip: () => void;
  playCardDeal: () => void;
  playChipClink: () => void;
  playChipStack: () => void;
  playWheelSpin: () => void;
  playWin: () => void;
  playLose: () => void;
  isMuted: boolean;
  toggleMute: () => void;
}

const CasinoSoundContext = createContext<CasinoSoundContextValue | null>(null);

export function useCasinoSound() {
  const context = useContext(CasinoSoundContext);
  if (!context) {
    throw new Error('useCasinoSound must be used within CasinoSoundProvider');
  }
  return context;
}

interface CasinoSoundProviderProps {
  children: ReactNode;
}

export function CasinoSoundProvider({ children }: CasinoSoundProviderProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  // Initialize audio context on user interaction
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Load mute state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('casino-sound-muted');
    setIsMuted(stored === 'true');
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newValue = !prev;
      localStorage.setItem('casino-sound-muted', String(newValue));
      return newValue;
    });
  }, []);

  // Helper to play a tone
  const playTone = useCallback(
    (frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) => {
      if (isMuted) return;

      try {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
      } catch (error) {
        console.error('Error playing sound:', error);
      }
    },
    [isMuted, getAudioContext]
  );

  // Sound effects using procedural synthesis
  const playCardFlip = useCallback(() => {
    playTone(800, 0.05, 'square', 0.1);
    setTimeout(() => playTone(400, 0.05, 'square', 0.1), 30);
  }, [playTone]);

  const playCardDeal = useCallback(() => {
    playTone(600, 0.08, 'sine', 0.15);
  }, [playTone]);

  const playChipClink = useCallback(() => {
    playTone(1200, 0.1, 'triangle', 0.2);
    setTimeout(() => playTone(1400, 0.08, 'triangle', 0.15), 40);
  }, [playTone]);

  const playChipStack = useCallback(() => {
    const delays = [0, 40, 80, 120];
    delays.forEach((delay, i) => {
      setTimeout(() => playTone(1000 + i * 100, 0.06, 'triangle', 0.15), delay);
    });
  }, [playTone]);

  const playWheelSpin = useCallback(() => {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(100, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 2);

      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 2);
    } catch (error) {
      console.error('Error playing wheel spin:', error);
    }
  }, [isMuted, getAudioContext]);

  const playWin = useCallback(() => {
    const melody = [
      { freq: 523, delay: 0 },    // C5
      { freq: 659, delay: 150 },  // E5
      { freq: 784, delay: 300 },  // G5
      { freq: 1047, delay: 450 }, // C6
    ];
    melody.forEach(({ freq, delay }) => {
      setTimeout(() => playTone(freq, 0.2, 'sine', 0.25), delay);
    });
  }, [playTone]);

  const playLose = useCallback(() => {
    const melody = [
      { freq: 392, delay: 0 },   // G4
      { freq: 349, delay: 150 }, // F4
      { freq: 294, delay: 300 }, // D4
      { freq: 262, delay: 450 }, // C4
    ];
    melody.forEach(({ freq, delay }) => {
      setTimeout(() => playTone(freq, 0.2, 'sine', 0.2), delay);
    });
  }, [playTone]);

  const value: CasinoSoundContextValue = {
    playCardFlip,
    playCardDeal,
    playChipClink,
    playChipStack,
    playWheelSpin,
    playWin,
    playLose,
    isMuted,
    toggleMute,
  };

  return <CasinoSoundContext.Provider value={value}>{children}</CasinoSoundContext.Provider>;
}
