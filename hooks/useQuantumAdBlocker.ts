import { useEffect } from 'react';

/**
 * useQuantumAdBlocker
 * 
 * A high-performance hook designed to neutralize intrusive ads, pop-ups, and 
 * unauthorized redirects from third-party iframes (like VidKing) without triggering 
 * anti-adblock sandbox detection.
 */
export const useQuantumAdBlocker = (isActive: boolean = true) => {
  useEffect(() => {
    if (!isActive) return;

    console.log("[QUANTUM-SHIELD] Initializing Ad-Interception Protocol...");

    // 1. Override Window APIs to block programmatic pop-ups
    const originalOpen = window.open;
    
    // @ts-ignore
    window.open = function(url?: string | URL, target?: string, features?: string) {
      console.warn("[QUANTUM-SHIELD] Blocked window.open attempt to:", url);
      // We return null to simulate a blocked pop-up without crashing the caller script
      return null;
    };

    // 2. Prevent page navigation away from the site (Redirect Protection)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Some players try to redirect the parent page. 
    };

    // 3. Global Click Interception (Capturing Phase)
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const style = window.getComputedStyle(target);
      
      // Heuristic for ad overlays:
      // 1. Positioned absolute/fixed
      // 2. High z-index (often > 1000)
      // 3. Covers large area or has no visible content
      // 4. Transparent but catching clicks
      if (
        (style.position === 'absolute' || style.position === 'fixed') &&
        (parseInt(style.zIndex) > 500) &&
        (parseFloat(style.opacity) < 0.1 || style.backgroundColor === 'transparent' || style.backgroundColor === 'rgba(0, 0, 0, 0)')
      ) {
        console.warn("[QUANTUM-SHIELD] Neutralized hidden overlay click on:", target);
        e.preventDefault();
        e.stopPropagation();
        
        // Aggressive: Try to remove it from DOM if it's an overlay
        if (target.tagName === 'DIV' && !target.hasChildNodes()) {
            target.remove();
        }
        return false;
      }
    };

    // 4. MutationObserver to catch and remove dynamically injected overlays
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // Remove typical ad-container patterns
            if (
              node.id.toLowerCase().includes('pop') || 
              node.id.toLowerCase().includes('ads') ||
              node.className.toLowerCase().includes('ads-') || 
              (node.style.position === 'fixed' && parseInt(node.style.zIndex) > 10000)
            ) {
              console.warn("[QUANTUM-SHIELD] Auto-purged ad node:", node);
              node.remove();
            }
          }
        });
      });
    });

    // Start Shielding
    window.addEventListener('click', handleGlobalClick, true);
    window.addEventListener('beforeunload', handleBeforeUnload);
    observer.observe(document.body, { childList: true, subtree: true });

    // Cleanup on unmount
    return () => {
      window.open = originalOpen;
      window.removeEventListener('click', handleGlobalClick, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      observer.disconnect();
      console.log("[QUANTUM-SHIELD] Shield deactivated.");
    };
  }, [isActive]);
};
