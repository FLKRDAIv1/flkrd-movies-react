import { useEffect, useRef } from 'react';
import { useGamepad, GamepadAction } from '../contexts/GamepadContext';
import { useUI } from '../contexts/UIContext';
import { soundManager } from '../utils/SoundManager';

/**
 * Spatial Navigation Engine
 * Automatically moves browser focus based on geometric proximity of focusable elements
 */
export const useSpatialNavigation = () => {
  const { lastAction, isConnected } = useGamepad();
  const { isConsoleMode, setIsConsoleMode } = useUI();
  const lastProcessedAction = useRef<string | null>(null);

  useEffect(() => {
    if (!isConnected || !lastAction) return;
    
    // De-bounce hardware repeat
    if (lastAction === lastProcessedAction.current) return;
    lastProcessedAction.current = lastAction;
    setTimeout(() => { lastProcessedAction.current = null; }, 150);

    // Initial activation trigger (Any button triggers Console Mode if not active)
    if (!isConsoleMode) {
      if (lastAction === 'HOME' || lastAction === 'SELECT') {
          setIsConsoleMode(true);
      }
      return;
    }

    // ── Semantic Action Handling ──
    if (lastAction === 'SELECT') {
      const active = document.activeElement as HTMLElement;
      if (active) {
        soundManager.playSelect();
        active.click();
      }
      return;
    }

    if (lastAction === 'BACK') {
      soundManager.playBack();
      window.history.back();
      return;
    }

    // ── Directional Navigation ──
    if (['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(lastAction)) {
      moveFocus(lastAction);
    }

  }, [lastAction, isConnected, isConsoleMode]);

  const moveFocus = (direction: GamepadAction) => {
    const active = document.activeElement as HTMLElement;
    const allFocusable = Array.from(
      document.querySelectorAll('button, a, input, [tabindex="0"]')
    ) as HTMLElement[];

    if (!active || active === document.body) {
      allFocusable[0]?.focus();
      return;
    }

    const rect = active?.getBoundingClientRect?.() || { left: 0, top: 0, width: 0, height: 0 };
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let bestElement: HTMLElement | null = null;
    let minDistance = Infinity;

    allFocusable.forEach(el => {
      if (el === active) return;
      
      const elRect = el.getBoundingClientRect();
      const elCenterX = elRect.left + elRect.width / 2;
      const elCenterY = elRect.top + elRect.height / 2;

      const dx = elCenterX - centerX;
      const dy = elCenterY - centerY;

      let isCandidate = false;

      // Geometric Direction Check (with tolerance for alignment)
      if (direction === 'UP' && dy < -5) isCandidate = true;
      if (direction === 'DOWN' && dy > 5) isCandidate = true;
      if (direction === 'LEFT' && dx < -5) isCandidate = true;
      if (direction === 'RIGHT' && dx > 5) isCandidate = true;

      if (isCandidate) {
        // Weighted Manhattan: Elements directly in line are preferred
        const weightX = direction === 'UP' || direction === 'DOWN' ? 2 : 1;
        const weightY = direction === 'UP' || direction === 'DOWN' ? 1 : 2;
        const distance = Math.abs(dx) * weightX + Math.abs(dy) * weightY;
        
        if (distance < minDistance) {
          minDistance = distance;
          bestElement = el;
        }
      }
    });

    if (bestElement) {
      soundManager.playNav();
      (bestElement as HTMLElement).focus();
      bestElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  };
};
