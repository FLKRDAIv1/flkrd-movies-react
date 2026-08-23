import crypto from 'crypto';

interface AdminAuthRequest {
  query: Record<string, string | string[] | undefined>;
  body?: any;
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  socket: { remoteAddress?: string };
}

interface AdminAuthResponse {
  setHeader(name: string, value: string): void;
  status(code: number): AdminAuthResponse;
  json(body: any): void;
  end(): void;
}

// Secret key for HMAC token signing (server-side only, never exposed to client)
const JWT_SECRET = process.env.FLKRD_ADMIN_SECRET || 'flkrd_quantum_security_master_key_2026_x89_sign';

// Master Admin Password Hash (SHA-256 with salt) for Pirasali1919@01
const MASTER_EMAIL = 'flkrdstudio@gmail.com';
const MASTER_HASH = crypto.createHmac('sha256', JWT_SECRET).update('Pirasali1919@01').digest('hex');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ofddaeofptotnxeoxfko.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZGRhZW9mcHRvdG54ZW94ZmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NDk1NDIsImV4cCI6MjEwMDMyNTU0Mn0.Y502Vk2zlev9d4Hbkjt6VniV_xFXjl41YW4EE26wCNc';

// In-Memory Sliding Window Rate Limiter for DDoS & Brute-Force Protection
interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
const LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes lockout after exceeding max attempts

function getClientIp(req: AdminAuthRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown-ip';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry) {
    rateLimitStore.set(ip, { attempts: 0, firstAttempt: now });
    return { allowed: true };
  }

  // Check if locked out
  if (entry.lockedUntil && now < entry.lockedUntil) {
    const retryAfter = Math.ceil((entry.lockedUntil - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Reset window if expired
  if (now - entry.firstAttempt > WINDOW_MS) {
    rateLimitStore.set(ip, { attempts: 0, firstAttempt: now });
    return { allowed: true };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
    const retryAfter = Math.ceil(LOCKOUT_MS / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip) || { attempts: 0, firstAttempt: now };
  entry.attempts += 1;
  rateLimitStore.set(ip, entry);
}

function recordSuccessfulAttempt(ip: string) {
  rateLimitStore.delete(ip);
}

// Token generation and verification using cryptographic HMAC-SHA256
function createSessionToken(email: string, role: string, permissions?: any): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 24 * 60 * 60; // 24 hours validity

  const payload = Buffer.from(JSON.stringify({
    email,
    role,
    permissions,
    iat,
    exp,
    issuer: 'flkrd-secure-auth'
  })).toString('base64url');

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

function verifySessionToken(token: string): { valid: boolean; payload?: any; error?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token missing' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed token' };
  }

  const [header, payload, signature] = parts;

  // Verify HMAC signature
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  // Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature);
  const expBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    return { valid: false, error: 'Invalid cryptographic signature' };
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);

    if (decoded.exp && decoded.exp < now) {
      return { valid: false, error: 'Session token expired' };
    }

    return { valid: true, payload: decoded };
  } catch (e) {
    return { valid: false, error: 'Failed to decode payload' };
  }
}

// Fetch Sub-Admins from Supabase server_config securely
async function fetchSubAdminsFromSupabase(): Promise<any[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/server_config?select=id,server_name,priority`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });
    if (!res.ok) return [];
    const rows: any[] = await res.json();
    const subAdmins: any[] = [];
    for (const row of rows) {
      if (row.server_name && row.server_name.startsWith('subadmin:')) {
        try {
          const parsed = JSON.parse(row.server_name.replace(/^subadmin:/, ''));
          subAdmins.push(parsed);
        } catch {}
      }
    }
    return subAdmins;
  } catch (e) {
    return [];
  }
}

export default async function handler(req: AdminAuthRequest, res: AdminAuthResponse) {
  // Set hardened security and CORS headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const ip = getClientIp(req);
  const action = req.query.action || (req.body && req.body.action);

  // 1. Session Token Verification Action
  if (action === 'verify' || req.method === 'GET') {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

    const verification = verifySessionToken(token);
    if (!verification.valid) {
      return res.status(403).json({
        success: false,
        authenticated: false,
        error: verification.error || 'Unauthorized'
      });
    }

    return res.status(200).json({
      success: true,
      authenticated: true,
      user: {
        email: verification.payload.email,
        role: verification.payload.role,
        permissions: verification.payload.permissions
      }
    });
  }

  // 2. Admin Login Action (POST)
  if (req.method === 'POST') {
    // Check Rate Limiting for DDoS / Brute-force protection
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: `ژمارەی هەوڵەکان زۆر بووە! تکایە دوای ${Math.ceil((rateCheck.retryAfter || 60) / 60)} خولەک هەوڵ بدەرەوە.`,
        retryAfter: rateCheck.retryAfter
      });
    }

    const { email, password } = req.body || {};

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      recordFailedAttempt(ip);
      return res.status(400).json({
        success: false,
        message: 'ئیمەیڵ و پاسپۆرد داواکراوە!'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check Master Admin Credentials
    if (cleanEmail === MASTER_EMAIL) {
      const providedHash = crypto.createHmac('sha256', JWT_SECRET).update(password).digest('hex');

      const hashBuffer = Buffer.from(providedHash);
      const masterBuffer = Buffer.from(MASTER_HASH);

      if (hashBuffer.length === masterBuffer.length && crypto.timingSafeEqual(hashBuffer, masterBuffer)) {
        recordSuccessfulAttempt(ip);
        const token = createSessionToken(cleanEmail, 'owner');

        return res.status(200).json({
          success: true,
          token,
          admin: {
            id: 'admin_master_001',
            email: MASTER_EMAIL,
            username: 'FLKRD Owner (CEO)',
            role: 'owner',
            isActive: true
          }
        });
      } else {
        recordFailedAttempt(ip);
        return res.status(401).json({
          success: false,
          message: 'پاسپۆردەکەت هەڵەیە!'
        });
      }
    }

    // Check Sub-Admin Credentials securely from Supabase
    const subAdmins = await fetchSubAdminsFromSupabase();
    const match = subAdmins.find((a: any) => a.email && a.email.toLowerCase() === cleanEmail);

    if (match) {
      if (!match.isActive) {
        recordFailedAttempt(ip);
        return res.status(403).json({
          success: false,
          message: 'ئەم ئەکاونتەی ئادمن ناچالاک کراوە!'
        });
      }

      // Timing safe password comparison
      const matchPass = match.password || '';
      const providedBuffer = Buffer.from(password);
      const targetBuffer = Buffer.from(matchPass);

      if (providedBuffer.length === targetBuffer.length && crypto.timingSafeEqual(providedBuffer, targetBuffer)) {
        recordSuccessfulAttempt(ip);
        const token = createSessionToken(cleanEmail, match.role || 'manager', match.permissions);

        return res.status(200).json({
          success: true,
          token,
          admin: {
            id: match.id,
            email: match.email,
            username: match.username || 'Sub Admin',
            role: match.role || 'manager',
            permissions: match.permissions,
            isActive: true
          }
        });
      } else {
        recordFailedAttempt(ip);
        return res.status(401).json({
          success: false,
          message: 'پاسپۆردەکەت هەڵەیە!'
        });
      }
    }

    // Unrecognized Admin
    recordFailedAttempt(ip);
    return res.status(401).json({
      success: false,
      message: 'ئەم ئیمەیڵە وەک ئادمن تۆمارنەکراوە!'
    });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
