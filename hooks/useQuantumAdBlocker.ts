import { useEffect } from 'react';

/**
 * useQuantumAdBlocker
 * 
 * A high-performance hook designed to neutralize intrusive ads, pop-ups, and 
 * unauthorized redirects. Includes a "DNS-level" simulation to block requests 
 * to known ad domains.
 */
export const useQuantumAdBlocker = (isActive: boolean = true) => {
  useEffect(() => {
    if (!isActive) return;

    console.log("[QUANTUM-SHIELD] Active: DNS Simulation & Protocol Interception Engaged.");

    // 1. High-Priority Window Open Interception
    const originalOpen = window.open;
    // @ts-ignore
    window.open = function(url?: string | URL, target?: string, features?: string) {
      const urlStr = String(url || '').toLowerCase();
      
      // Block blob URLs and suspicious ad patterns that bypass CSP
      if (urlStr.startsWith('blob:') || urlStr.includes('about:blank')) {
        console.warn("[QUANTUM-SHIELD] Blocked suspicious blob/blank popup.");
        return null;
      }

      console.warn("[QUANTUM-SHIELD] Neutralized programmatic popup to:", url);
      return null;
    };

    // 2. DNS-Level Simulation (Domain Blocking)
    // We intercept attempts to create elements that might load ad scripts
    const adDomains = [
      'doubleclick.net', 'googleadservices.com', 'adnxs.com', 'popads.net', 
      'popcash.net', 'propellerads.com', 'onclickads.net', 'adsterra.com',
      'exoclick.com', 'juicyads.com', 'clksite.com', 'bet365', '1xbet'
    ];

    const isAdUrl = (url: string) => {
      return adDomains.some(domain => url.toLowerCase().includes(domain));
    };

    // 3. MutationObserver for invisible overlays and ad-injection
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // Check for ad-like script tags
            if (node.tagName === 'SCRIPT') {
              const src = (node as HTMLScriptElement).src;
              if (src && isAdUrl(src)) {
                console.warn("[QUANTUM-SHIELD] Blocked Ad-Script Injection:", src);
                node.remove();
                return;
              }
            }

            // Heuristic Overlay Blocking — refined to avoid legitimate UI
            const style = window.getComputedStyle(node);
            const isHighZ = parseInt(style.zIndex) > 1000;
            const isFixed = style.position === 'fixed' || style.position === 'absolute';
            const isTransparent = parseFloat(style.opacity) < 0.05; // More strict on transparency
            const isFullScreen = node.offsetWidth > window.innerWidth * 0.9 && node.offsetHeight > window.innerHeight * 0.9;
            
            if (isHighZ && isFixed && (isTransparent || isFullScreen) && !node.innerText) {
                // Potential invisible click-catcher or forced ad-overlay
                console.warn("[QUANTUM-SHIELD] Purged suspicious ad-overlay.");
                node.remove();
            }
          }
        });
      });
    });

    // 4. Global Click Interception (Capturing Phase)
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // If we are clicking on something that looks like a hidden overlay, block it
      const style = window.getComputedStyle(target);
      if (parseInt(style.zIndex) > 500 && (style.position === 'fixed' || style.position === 'absolute')) {
          if (target.tagName === 'DIV' && !target.hasChildNodes() && parseFloat(style.opacity) < 0.1) {
              console.warn("[QUANTUM-SHIELD] Blocked click on suspicious overlay.");
              e.preventDefault();
              e.stopPropagation();
              target.remove();
              return false;
          }
      }
    };

    // Start Protection
    window.addEventListener('click', handleGlobalClick, true);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // Cleanup Protocol
    return () => {
      window.open = originalOpen;
      window.removeEventListener('click', handleGlobalClick, true);
      observer.disconnect();
      console.log("[QUANTUM-SHIELD] Protocol Disengaged. DNS Cache Restored.");
    };
  }, [isActive]);
};
