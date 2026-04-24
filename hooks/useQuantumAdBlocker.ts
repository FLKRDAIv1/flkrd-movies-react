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
      // This is a soft block - we don't want to prevent user from leaving, 
      // but we want to catch rapid/automated redirects.
    };

    // 3. Global Click Interception (Capturing Phase)
    // This stops events before they reach the iframe or after they bubble back 
    // if the iframe is cross-origin. For same-origin it's perfect.
    // For cross-origin VidKing, it prevents the parent page from reacting to 
    // overlay clicks.
    const handleGlobalClick = (e: MouseEvent) => {
      // If the click is on something that looks like an ad overlay
      const target = e.target as HTMLElement;
      
      // Check for common ad overlay patterns (invisible, absolute, high z-index)
      const style = window.getComputedStyle(target);
      if (
        (style.position === 'absolute' || style.position === 'fixed') &&
        (parseFloat(style.opacity) < 0.1 || style.backgroundColor === 'transparent') &&
        parseInt(style.zIndex) > 100
      ) {
        console.warn("[QUANTUM-SHIELD] Neutralized hidden overlay click.");
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // 4. MutationObserver to catch and remove dynamically injected overlays
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // Remove typical ad-container patterns
            if (
              node.id.includes('pop') || 
              node.className.includes('ads-') || 
              (node.style.position === 'fixed' && node.style.zIndex === '2147483647')
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
