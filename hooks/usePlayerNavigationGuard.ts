import { useEffect } from 'react';

/**
 * Blocks embed providers from hijacking the top-level tab via history.pushState
 * while a player is mounted. Does NOT use beforeunload (that causes navigation lag
 * and annoying "leave page?" prompts on every route change).
 */
export const usePlayerNavigationGuard = () => {
  useEffect(() => {
    const onPopState = () => {
      try {
        window.history.pushState(null, '', window.location.href);
      } catch {
        // ignore
      }
    };

    try {
      window.history.pushState(null, '', window.location.href);
    } catch {
      // ignore
    }

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
};
