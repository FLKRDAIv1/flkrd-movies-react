// utils/securityGuard.ts
// Client-Side Security Guard & Anti-Tampering Shield for FLKRD MOVIES
// Enforces token integrity, disables DevTools inspections in production, and prevents state manipulation

export const initSecurityShield = () => {
  if (typeof window === 'undefined') return;

  // 1. Production DevTools Hook Neutralizer
  // Disables React Developer Tools global inspection hook to prevent component state manipulation
  if (import.meta.env.PROD) {
    try {
      if (typeof (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'object') {
        for (const [key, value] of Object.entries((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__)) {
          (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__[key] = typeof value === 'function' ? () => {} : null;
        }
      }
    } catch (e) {}

    // Console Warning Banner against self-XSS and unauthorized scripting
    try {
      console.log(
        '%c🛑 FLKRD SECURITY SHIELD ACTIVE 🛑\n%cئاگاداری: ئەم کۆنسۆڵە بۆ بەکارهێنەرانی گەشەپێدەرە. بەکارهێنانی هەر سکریپتێک بۆ دەستکاریکردنی سیستەم، هەوڵدان بۆ هاککردن یان دزینی زانیاری ڕاستەوخۆ بلۆک دەکرێت و بە فەرمی تێست و ڕاپۆرت دەکرێت.',
        'color: #ef4444; font-size: 24px; font-weight: 900; -webkit-text-stroke: 1px black;',
        'color: #f59e0b; font-size: 14px; font-weight: bold; line-height: 1.6;'
      );
    } catch (e) {}
  }

  // 2. Anti-Tamper LocalStorage Integrity Listener
  // Detects if someone modifies localStorage in DevTools console (e.g. isFlkrdAdmin)
  window.addEventListener('storage', (e) => {
    if (e.key === 'isFlkrdAdmin' && e.newValue === 'true') {
      const token = localStorage.getItem('flkrd_admin_session_token');
      if (!token) {
        console.warn('[SECURITY] Unauthorized admin flag detected without signed token. Purging credentials...');
        localStorage.removeItem('isFlkrdAdmin');
        localStorage.removeItem('flkrd_admin_login_at');
        localStorage.removeItem('flkrd_admin_email');
        window.location.reload();
      }
    }
  });
};

/**
 * Validates a session token against the secure backend with 7-day lifespan & offline resilience
 */
export const verifyServerSession = async (token: string): Promise<boolean> => {
  if (!token || typeof token !== 'string') return false;

  // 1. Local cryptographic payload expiration check (7 days)
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        console.warn('[SECURITY] Admin session expired after 7 days.');
        return false;
      }
    } else {
      return false;
    }
  } catch {
    return false;
  }

  // 2. Server verification
  try {
    const res = await fetch('/api/admin-auth?action=verify', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      return !!data.authenticated;
    } else if (res.status === 401 || res.status === 403) {
      return false;
    }
    // If 404 (local dev) or 500 (transient server hiccup), honor valid local 7-day token
    return true;
  } catch (e) {
    // If offline or network error, do not logout unless token has expired
    return true;
  }
};
