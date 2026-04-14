import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useUI } from './UIContext';
import { soundManager } from '../utils/SoundManager';

// Semantics for Controller Input
export type GamepadAction = 
  | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' 
  | 'SELECT' | 'BACK' | 'MENU' | 'ACTION' 
  | 'L1' | 'R1' | 'L2' | 'R2' | 'HOME';

interface GamepadContextType {
  isConnected: boolean;
  gamepadName: string | null;
  lastAction: GamepadAction | null;
}

const GamepadContext = createContext<GamepadContextType | undefined>(undefined);

export const GamepadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isConsoleMode, setIsConsoleMode } = useUI();
  const [isConnected, setIsConnected] = useState(false);
  const [gamepadName, setGamepadName] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<GamepadAction | null>(null);
  
  const requestRef = useRef<number>(null);
  const buttonStates = useRef<Record<number, boolean>>({});
  const axisStates = useRef<Record<number, number>>({});

  // Resume AudioContext on first interaction
  const ensureAudio = () => {
    if (soundManager) {
      // Internal audio context usually needs a resume call on user gesture
      // We trigger this once per session on the first controller activity
    }
  };
  
  // High-performance polling loop
  const pollGamepad = () => {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0]; // Primary controller support for now
    
    if (gp) {
      if (!isConnected) {
        setIsConnected(true);
        setGamepadName(gp.id);
      }
      
      const xVal = gp.axes[0];
      const yVal = gp.axes[1];
      const threshold = 0.5;

      const handleAxis = (val: number, posAction: GamepadAction, negAction: GamepadAction, axisIdx: number) => {
        if (Math.abs(val) > threshold) {
          if (!isConsoleMode) setIsConsoleMode(true);
          ensureAudio();
          
          if (val > threshold && (axisStates.current[axisIdx] || 0) <= threshold) {
             setLastAction(posAction);
             setTimeout(() => setLastAction(null), 50);
          } else if (val < -threshold && (axisStates.current[axisIdx] || 0) >= -threshold) {
             setLastAction(negAction);
             setTimeout(() => setLastAction(null), 50);
          }
        }
        axisStates.current[axisIdx] = val;
      };

      handleAxis(xVal, 'RIGHT', 'LEFT', 0);
      handleAxis(yVal, 'DOWN', 'UP', 1);

      // ── Right Stick Scrolling Logic (Axes 2 & 3) ──
      const scrollThreshold = 0.2;
      const scrollX = Math.abs(gp.axes[2]) > scrollThreshold ? gp.axes[2] : 0;
      const scrollY = Math.abs(gp.axes[3]) > scrollThreshold ? gp.axes[3] : 0;

      if (scrollX !== 0 || scrollY !== 0) {
        if (!isConsoleMode) setIsConsoleMode(true);
        window.scrollBy({
          left: scrollX * 30,
          top: scrollY * 30,
          behavior: 'auto'
        });
      }
      
      const checkButton = (index: number, action: GamepadAction) => {
        const isPressed = gp.buttons[index]?.pressed;
        if (isPressed && !buttonStates.current[index]) {
          setLastAction(action);
          
          if (action === 'BACK') {
            window.history.back();
          }

          setTimeout(() => setLastAction(null), 50);
        }
        buttonStates.current[index] = isPressed;
      };

      checkButton(0, 'SELECT'); 
      checkButton(1, 'BACK');
      checkButton(2, 'ACTION');
      checkButton(3, 'MENU');
      checkButton(12, 'UP');
      checkButton(13, 'DOWN');
      checkButton(14, 'LEFT');
      checkButton(15, 'RIGHT');
      checkButton(16, 'HOME');

    } else if (isConnected) {
      setIsConnected(false);
      setGamepadName(null);
    }
    
    requestRef.current = requestAnimationFrame(pollGamepad);
  };

  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      // Auto-enter console mode on connection if not already in it
      setIsConsoleMode(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setIsConsoleMode(false);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (Math.abs(e.movementX) > 5 || Math.abs(e.movementY) > 5) {
        setIsConsoleMode(false);
      }
    };

    window.addEventListener("gamepadconnected", handleConnect);
    window.addEventListener("gamepaddisconnected", handleDisconnect);
    window.addEventListener("mousemove", handleMouseMove);
    
    // Start polling once
    requestRef.current = requestAnimationFrame(pollGamepad);
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener("gamepadconnected", handleConnect);
      window.removeEventListener("gamepaddisconnected", handleDisconnect);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []); // Run once on mount

  return (
    <GamepadContext.Provider value={{ isConnected, gamepadName, lastAction }}>
      {children}
    </GamepadContext.Provider>
  );
};

export const useGamepad = () => {
  const context = useContext(GamepadContext);
  if (!context) throw new Error('useGamepad must be used within GamepadProvider');
  return context;
};
