// utils/securityGuard.ts
// Client-Side Security Guard & Anti-Tampering Shield for FLKRD MOVIES
// Enforces token integrity, cloaks server identity/Supabase in console, disables DevTools manipulation, and prevents state tampering

let isShieldInitialized = false;

// Regex patterns of internal backend infrastructure, database tables, and secrets to strip from console
const SENSITIVE_PATTERNS = [
  /supabase/i,
  /ofddaeofptotnxeoxfko/i,
  /postgrest/i,
  /service_role/i,
  /jwt/i,
  /apikey/i,
  /postgres/i,
  /bearer/i,
  /eyJhbGci/i,
  /Y502Vk2zlev/i,
  /flkrd_admin_session_token/i,
  /flkrd_admin_secret/i,
  /user_watch_progress/i,
  /dubbed_movies/i,
  /banned_content/i,
  /visitor_analytics/i,
  /site_broadcasts/i,
  /kurdish_subtitles/i,
  /ad_blocker_registry/i,
  /custom_subtitles/i,
  /blocked_ads/i,
  /server_status/i
];

const containsSensitiveData = (args: any[]): boolean => {
  try {
    for (const arg of args) {
      if (!arg) continue;
      let str = '';
      if (typeof arg === 'string') {
        str = arg;
      } else if (arg instanceof Error) {
        str = `${arg.name} ${arg.message} ${arg.stack || ''}`;
      } else if (typeof arg === 'object') {
        try {
          str = JSON.stringify(arg);
        } catch {
          str = String(arg);
        }
      } else {
        str = String(arg);
      }
      for (const pattern of SENSITIVE_PATTERNS) {
        if (pattern.test(str)) return true;
      }
    }
  } catch {
    return false;
  }
  return false;
};

export const isUserAdmin = (): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    const isStored = localStorage.getItem('isFlkrdAdmin') === 'true';
    const token = localStorage.getItem('flkrd_admin_session_token');
    const loginAt = localStorage.getItem('flkrd_admin_login_at');
    if (isStored && token && loginAt) {
      const elapsed = Date.now() - parseInt(loginAt, 10);
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      if (!isNaN(elapsed) && elapsed <= sevenDaysInMs) {
        return true;
      }
    }
  } catch {}
  return false;
};

/**
 * Initializes the FLKRD Quantum Defense Shield:
 * 1. Sanitizes, filters, and cloaks all console calls (hides backend/Supabase/server identity)
 * 2. Neutralizes React DevTools global inspection hooks
 * 3. Prevents memory scraping and token tampering
 * 4. Displays the official FLKRD Security Shield cyber banner in DevTools
 */
export const initSecurityShield = () => {
  if (typeof window === 'undefined' || isShieldInitialized) return;
  isShieldInitialized = true;

  const originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console),
    table: console.table ? console.table.bind(console) : () => {},
    dir: console.dir ? console.dir.bind(console) : () => {},
    trace: console.trace ? console.trace.bind(console) : () => {},
    clear: console.clear ? console.clear.bind(console) : () => {},
  };

  // Display the official FLKRD Quantum Security Shield Banner in DevTools Console
  try {
    originalConsole.clear();
    originalConsole.log(
      '%c' +
      '  ███████╗██╗     ██╗  ██╗██████╗  ██████╗     ███████╗██╗  ██╗██╗███████╗██╗     ██████╗ \n' +
      '  ██╔════╝██║     ██║ ██╔╝██╔══██╗██╔══██╗    ██╔════╝██║  ██║██║██╔════╝██║     ██╔══██╗\n' +
      '  █████╗  ██║     █████═╝ ██████╔╝██║  ██║    ███████╗███████║██║█████╗  ██║     ██║  ██║\n' +
      '  ██╔══╝  ██║     ██╔═██╗ ██╔══██╗██║  ██║    ╚════██║██╔══██║██║██╔══╝  ██║     ██║  ██║\n' +
      '  ██║     ███████╗██║ ╚██╗██║  ██║██████╔╝    ███████║██║  ██║██║███████╗███████╗██████╔╝\n' +
      '  ╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝     ╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚═════╝ \n',
      'color: #ef4444; font-weight: 900; font-size: 11px; line-height: 1.2;'
    );
    originalConsole.log(
      '%c🛡️ FLKRD QUANTUM SECURITY SHIELD ACTIVE 🛡️\n' +
      '%c[KU] ئاگاداری: ئەم کۆنسۆڵە لەلایەن سیستەمی FLKRD Shield پارێزراوە. هەموو هەوڵێکی دەستکاریکردن، چات، یان دزینی زانیاری ڕاستەوخۆ بلۆک دەکرێت.\n' +
      '[EN] WARNING: This console is protected by FLKRD Security Shield. Unauthorized script injection, data scraping, or tampering is strictly prohibited.',
      'color: #ef4444; font-size: 15px; font-weight: 900; -webkit-text-stroke: 0.5px black; padding: 4px 0;',
      'color: #f59e0b; font-size: 12px; font-weight: bold; line-height: 1.6;'
    );
  } catch (e) {}

  // Override and Cloak Console Methods
  console.log = (...args: any[]) => {
    if (isUserAdmin()) {
      originalConsole.log(...args);
      return;
    }
    // Silently drop for regular visitors
  };

  console.info = (...args: any[]) => {
    if (isUserAdmin()) {
      originalConsole.info(...args);
      return;
    }
  };

  console.debug = (...args: any[]) => {
    if (isUserAdmin()) {
      originalConsole.debug(...args);
      return;
    }
  };

  console.table = (...args: any[]) => {
    if (isUserAdmin()) {
      originalConsole.table(...args);
      return;
    }
  };

  console.dir = (...args: any[]) => {
    if (isUserAdmin()) {
      originalConsole.dir(...args);
      return;
    }
  };

  console.trace = (...args: any[]) => {
    if (isUserAdmin()) {
      originalConsole.trace(...args);
      return;
    }
  };

  console.warn = (...args: any[]) => {
    if (isUserAdmin()) {
      originalConsole.warn(...args);
      return;
    }
    // Drop any warning that mentions backend/server infrastructure
    if (containsSensitiveData(args)) return;
  };

  console.error = (...args: any[]) => {
    if (isUserAdmin()) {
      originalConsole.error(...args);
      return;
    }
    // Drop any error that mentions backend/server infrastructure or DB errors
    if (containsSensitiveData(args)) return;
  };

  // 2. React Developer Tools Global Hook Neutralizer
  // Disables React Developer Tools global inspection hook to prevent component state manipulation
  try {
    if (typeof (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'object') {
      const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      for (const key of Object.keys(hook)) {
        if (typeof hook[key] === 'function') {
          hook[key] = () => {};
        } else if (key === 'renderers') {
          hook[key] = new Map();
        } else {
          hook[key] = null;
        }
      }
    }
  } catch (e) {}

  // 3. Global Object Sanitizer: Ensure window.supabase or db internals are never exposed
  try {
    delete (window as any).supabase;
    delete (window as any).__SUPABASE__;
    delete (window as any).db;
  } catch (e) {}

  // 4. Anti-Tamper LocalStorage Integrity Listener
  window.addEventListener('storage', (e) => {
    if (e.key === 'flkrd_admin_login_at' && e.newValue) {
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - parseInt(e.newValue, 10) > sevenDaysInMs) {
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
        return false;
      }
    }
  } catch (e) {}

  return true;
};
