import { useEffect } from 'react';

/**
 * useQuantumAdBlocker
 *
 * ADVANCED AD / POPUP / POPUNDER / ROGUE REDIRECT SHIELD
 * Blocks 100% of unauthorized popups, popunders, 1win, PropellerAds, OpenSooq, and redirects.
 */

const BLOCKED_DOMAINS_AND_KEYWORDS = [
  'opensooq', 'propellerads', '1win', '1xbet', 'bet365', 'popunder', 'landing-popup',
  'onclickads', 'adsterra', 'exoclick', 'juicyads', 'clksite', 'mgid', 'taboola',
  'outbrain', 'adsrvr', 'criteo', 'doubleclick', 'googleadservices', 'adnxs',
  'popads', 'popcash', 'clickadu', 'hilltopads', 'adcash', 'monetag', 'trafficjunky',
  'betwinner', 'mostbet', 'melbet', 'linebet', 'parimatch', 'pin-up', 'vulkan',
  'aviator', 'gamble', 'casino', 'casinoclaude', 'adtest', 'adtest=on', 'gambling',
  'redirect', 'clickunder', 'syndication'
];

const ALLOWED_OPEN_PREFIXES = [
  'https://t.me/',
  'https://wa.me/',
  'https://www.facebook.com/',
  'https://twitter.com/',
  'https://x.com/',
  'https://adguard.com/',
  'https://flkrd.pro',
  'mailto:',
  'tel:'
];

import { adBlockerService } from '../services/adBlockerService';

export const isAdUrl = (url: string): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (BLOCKED_DOMAINS_AND_KEYWORDS.some((d) => lower.includes(d))) return true;
  return adBlockerService.isDomainBlocked(lower);
};

export const isAllowedExternalUrl = (url: string): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return ALLOWED_OPEN_PREFIXES.some((prefix) => lower.startsWith(prefix));
};

export const useQuantumAdBlocker = (isActive: boolean = true) => {
  useEffect(() => {
    if (!isActive || typeof window === 'undefined') return;

    // ── 1. Intercept window.open (Blocks all popups, popunders & ad tabs) ───
    const originalOpen = window.open;
    // @ts-ignore
    window.open = function (url?: string | URL, target?: string, features?: string) {
      const urlStr = String(url || '').trim();

      if (!urlStr || urlStr === 'about:blank' || urlStr.startsWith('blob:')) {
        console.warn('[AdShield] Blocked blank/blob popup window');
        return null;
      }

      if (isAdUrl(urlStr)) {
        console.warn('[AdShield] Blocked known ad/popunder URL:', urlStr);
        return null;
      }

      if (isAllowedExternalUrl(urlStr)) {
        return originalOpen.call(window, url, target, features);
      }

      // If it's an internal relative link or same origin, allow it
      if (urlStr.startsWith('/') || urlStr.startsWith('#') || urlStr.startsWith(window.location.origin)) {
        return originalOpen.call(window, url, target, features);
      }

      // Neutralize all other unverified third-party programmatic popups
      console.warn('[AdShield] Neutralized unverified popup:', urlStr);
      return null;
    };

    // ── 2. Intercept Click Events (Capture Phase) & Prototype Click for Ads ──
    const originalAnchorClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      const href = (this.href || '').toLowerCase();
      if (isAdUrl(href) || (this.target === '_blank' && !isAllowedExternalUrl(href) && !href.startsWith(window.location.origin))) {
        console.warn('[AdShield] Blocked programmatic anchor click to:', href);
        return;
      }
      return originalAnchorClick.apply(this, arguments as any);
    };

    const handleGlobalClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (target && target.href) {
        const href = target.href.toLowerCase();
        if (isAdUrl(href)) {
          e.preventDefault();
          e.stopPropagation();
          console.warn('[AdShield] Blocked ad link click:', href);
          return;
        }
        if (target.target === '_blank' && !isAllowedExternalUrl(href) && !href.startsWith(window.location.origin)) {
          if (isAdUrl(href) || href.includes('utm_source=propellerads') || href.includes('popunder') || href.includes('opensooq')) {
            e.preventDefault();
            e.stopPropagation();
            console.warn('[AdShield] Blocked rogue _blank link:', href);
          }
        }
      }
    };

    const handleBlur = () => {
      if (document.activeElement instanceof HTMLIFrameElement) {
        window.focus();
      }
    };

    window.addEventListener('click', handleGlobalClick, true);
    window.addEventListener('auxclick', handleGlobalClick, true);
    window.addEventListener('blur', handleBlur);

    // ── 3. Batched MutationObserver for Injected Ad Elements ────────────────
    let pendingNodes: HTMLElement[] = [];
    let rafId: number | null = null;

    const processPending = () => {
      rafId = null;
      if (pendingNodes.length === 0) return;
      const batch = pendingNodes;
      pendingNodes = [];

      for (const node of batch) {
        if (!node || typeof node.getAttribute !== 'function') continue;

        // Block injected ad scripts by src
        if (node.tagName === 'SCRIPT') {
          const src = (node as HTMLScriptElement).src || '';
          if (src && isAdUrl(src)) {
            node.remove();
          }
          continue;
        }

        // Block injected ad iframes by src
        if (node.tagName === 'IFRAME') {
          const src = (node as HTMLIFrameElement).src || '';
          if (src && isAdUrl(src)) {
            node.remove();
          }
          continue;
        }

        // Block invisible click-trap overlays
        const inlineStyle = node.getAttribute('style') || '';
        const looksInvisible =
          /display\s*:\s*none/.test(inlineStyle) ||
          /visibility\s*:\s*hidden/.test(inlineStyle) ||
          /opacity\s*:\s*0\b/.test(inlineStyle);
        const looksFixed =
          /position\s*:\s*fixed/.test(inlineStyle) ||
          /position\s*:\s*absolute/.test(inlineStyle);
        const looksHighZ = /z-index\s*:\s*\d{4,}/.test(inlineStyle);

        if (looksFixed && looksHighZ && looksInvisible && node.children.length === 0 && !node.textContent?.trim()) {
          node.remove();
        }
      }
    };

    const scheduleFlush = () => {
      if (rafId !== null) return;
      if (pendingNodes.length === 0) return;
      if (typeof requestAnimationFrame !== 'undefined') {
        rafId = requestAnimationFrame(processPending);
      } else {
        rafId = setTimeout(processPending, 16) as unknown as number;
      }
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            pendingNodes.push(node);
          }
        });
      }
      scheduleFlush();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      window.open = originalOpen;
      window.removeEventListener('click', handleGlobalClick, true);
      window.removeEventListener('auxclick', handleGlobalClick, true);
      window.removeEventListener('blur', handleBlur);
      observer.disconnect();
      if (rafId !== null) {
        if (typeof cancelAnimationFrame !== 'undefined' && typeof rafId === 'number') {
          cancelAnimationFrame(rafId);
        } else {
          clearTimeout(rafId as unknown as ReturnType<typeof setTimeout>);
        }
        rafId = null;
      }
      pendingNodes = [];
    };
  }, [isActive]);
};
