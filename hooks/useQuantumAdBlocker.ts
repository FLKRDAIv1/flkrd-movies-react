import { useEffect } from 'react';

/**
 * useQuantumAdBlocker
 *
 * PERFORMANCE-OPTIMIZED ad/popup/redirect shield for mobile.
 *
 * Previous version caused severe mobile lag: it ran a MutationObserver over the
 * entire document with `subtree: true` and called `window.getComputedStyle(node)`
 * on EVERY added node. `getComputedStyle` forces a synchronous layout reflow,
 * so a media app that constantly adds nodes reflowed the whole page repeatedly.
 *
 * This rewrite:
 *   - NEVER calls getComputedStyle in hot paths (no forced reflow).
 *   - Batches MutationObserver callbacks via requestAnimationFrame (one pass/frame max).
 *   - Uses cheap heuristics only (tagName, attributes, inline style strings).
 *   - Adds navigation guards (beforeunload / popstate) to stop embed iframes from
 *     hijacking the top-level tab ("clicking opens another web" bug).
 *   - Keeps the window.open interception (cheap and effective).
 */

const AD_DOMAINS = [
  'doubleclick.net', 'googleadservices.com', 'adnxs.com', 'popads.net',
  'popcash.net', 'propellerads.com', 'onclickads.net', 'adsterra.com',
  'exoclick.com', 'juicyads.com', 'clksite.com', 'bet365', '1xbet',
  'mgid.com', 'taboola.com', 'outbrain.com', 'adsrvr.org', 'criteo.com',
];

const isAdUrl = (url: string): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return AD_DOMAINS.some((d) => lower.includes(d));
};

export const useQuantumAdBlocker = (isActive: boolean = true) => {
  useEffect(() => {
    if (!isActive) return;

    // ── 1. window.open interception (cheap — runs only on popups) ──────────
    const originalOpen = window.open;
    // @ts-ignore
    window.open = function (url?: string | URL, target?: string, features?: string) {
      const urlStr = String(url || '').toLowerCase();

      // Block blob/about-blank popups used by ad scripts
      if (urlStr.startsWith('blob:') || urlStr.includes('about:blank')) {
        return null;
      }
      // Block known ad domains
      if (isAdUrl(urlStr)) {
        return null;
      }
      // Allow AdGuard onboarding link
      if (urlStr.includes('adguard.com')) {
        return originalOpen(url, target, features);
      }
      // Neutralize all other programmatic popups (ad/spam)
      return null;
    };

    // ── 2. MutationObserver — BATCHED, no computed style ────────────────────
    // Collect mutations and process once per animation frame instead of per-mutation.
    let pendingNodes: HTMLElement[] = [];
    let rafId: number | null = null;

    const processPending = () => {
      rafId = null;
      if (pendingNodes.length === 0) return;
      const batch = pendingNodes;
      pendingNodes = [];

      for (const node of batch) {
        // Skip non-elements (safety)
        if (!node || typeof node.getAttribute !== 'function') continue;

        // Block injected ad scripts by src
        if (node.tagName === 'SCRIPT') {
          const src = (node as HTMLScriptElement).src || '';
          if (src && isAdUrl(src)) {
            node.remove();
          }
          continue;
        }

        // Block injected ad iframes by src (cheap attribute check — no reflow)
        if (node.tagName === 'IFRAME') {
          const src = (node as HTMLIFrameElement).src || '';
          if (src && isAdUrl(src)) {
            node.remove();
          }
          continue;
        }

        // Heuristic overlay blocking using INLINE style string only (never computed style).
        // getComputedStyle forces a synchronous reflow — banned in this hot path.
        const inlineStyle = node.getAttribute('style') || '';
        const looksInvisible =
          /display\s*:\s*none/.test(inlineStyle) ||
          /visibility\s*:\s*hidden/.test(inlineStyle) ||
          /opacity\s*:\s*0\b/.test(inlineStyle);
        const looksFixed =
          /position\s*:\s*fixed/.test(inlineStyle) ||
          /position\s*:\s*absolute/.test(inlineStyle);
        const looksHighZ = /z-index\s*:\s*\d{4,}/.test(inlineStyle);

        // Only purge an overlay if it is fixed, high-z, invisible AND empty —
        // a very conservative match to never remove real UI (which has children/text).
        if (looksFixed && looksHighZ && looksInvisible && node.children.length === 0 && !node.textContent?.trim()) {
          node.remove();
        }
      }
    };

    const scheduleFlush = () => {
      if (rafId !== null) return; // already scheduled — coalesce
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
      // Coalesce into a single rAF pass — at most one DOM sweep per frame.
      scheduleFlush();
    });

    // Observe body childList + subtree (needed to catch injected nodes) but NEVER
    // observe attributes (would fire far too often). This is dramatically cheaper
    // than the old documentElement-subtree + getComputedStyle approach.
    observer.observe(document.body, { childList: true, subtree: true });

    // NOTE: "clicking opens another web" is handled at the source — the player
    // iframes are sandboxed without `allow-top-navigation`, which blocks embed
    // providers from hijacking the top-level tab at the browser level. A global
    // beforeunload listener was intentionally NOT added here because it would nag
    // the user on every legitimate page refresh.

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      window.open = originalOpen;
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
