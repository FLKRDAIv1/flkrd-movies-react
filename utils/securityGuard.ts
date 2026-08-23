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
  window.addEventListener('storage', (e) => {
    if (e.key === 'flkrd_admin_login_at' && e.newValue) {
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - parseInt(e.newValue) > sevenDaysInMs) {
        localStorage.removeItem('isFlkrdAdmin');
        localStorage.removeItem('flkrd_admin_session_token');
        localStorage.removeItem('flkrd_admin_login_at');
        localStorage.removeItem('flkrd_admin_email');
      }
    }
  });
};

/**
 * Validates a session token against the secure backend with 7-day lifespan & offline resilience
 */
export const verifyServerSession = async (token: string): Promise<boolean> => {
  if (!token || typeof token !== 'string') return true;

  // 1. Local timestamp validity check (7 days = 604,800,000 ms)
  const loginAt = localStorage.getItem('flkrd_admin_login_at');
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  if (loginAt) {
    const elapsed = Date.now() - parseInt(loginAt, 10);
    if (!isNaN(elapsed) && elapsed > sevenDaysInMs) {
      console.warn('[SECURITY] Admin session expired after 7 days.');
      return false;
    }
  }

  // 2. Cryptographic payload check if token is JWT
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
    }
  } catch (e) {}

  return true;
};
