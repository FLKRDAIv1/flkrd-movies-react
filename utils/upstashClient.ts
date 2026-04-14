import { Redis } from '@upstash/redis';

declare global {
    interface ImportMeta {
        env: Record<string, string>;
    }
}

const upstashUrl = import.meta.env.VITE_UPSTASH_REDIS_REST_URL || 'https://picked-sailfish-37556.upstash.io';
const upstashToken = import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN || 'AZK0AAIncDE3Y2VlOTJjODQ0Yjg0NTBiOWY3M2NlODE2MzVhNzEyZXAxMzc1NTY';

export const redis = {
    get: async (key: string) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000); // Increased to 8s
        try {
            const res = await fetch(`${upstashUrl}/get/${key}`, {
                headers: { Authorization: `Bearer ${upstashToken}` },
                signal: controller.signal
            });
            
            if (!res.ok) {
                if (res.status === 429) {
                    console.warn("[UPSTASH] Rate limit exceeded.");
                } else if (res.status === 404) {
                    console.log("[UPSTASH] Key not found:", key);
                }
                return null;
            }

            const text = await res.text();
            if (!text) return null;

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.warn("[UPSTASH] Non-JSON response received.");
                return null;
            }

            if (data.result) {
                try { return JSON.parse(data.result); } catch (e) { return data.result; }
            }
        } catch (e: any) {
            if (e.name === 'AbortError') {
                console.warn("[UPSTASH] GET Timeout (8s). Node unreachable.");
            } else if (e.message?.includes('Failed to fetch')) {
                console.warn("[UPSTASH] Network blocked or offline.");
            } else {
                console.error("Upstash Get Error:", e);
            }
        } finally {
            clearTimeout(timeout);
        }
        return null;
    },
    set: async (key: string, value: any, options?: { ex?: number }) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
            const body = ["SET", key, typeof value === 'string' ? value : JSON.stringify(value)];
            if (options?.ex) {
                body.push("EX", options.ex.toString());
            }
            await fetch(`${upstashUrl}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${upstashToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });
        } catch (e: any) {
            if (e.name === 'AbortError') {
                console.warn("[UPSTASH] SET Timeout (5s). State not persisted.");
            } else if (e.message?.includes('Failed to fetch')) {
                console.warn("[UPSTASH] persistent storage unreachable.");
            } else {
                console.error("Upstash Set Error:", e);
            }
        } finally {
            clearTimeout(timeout);
        }
    },
    del: async (key: string) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
            await fetch(`${upstashUrl}/del/${key}`, { 
                headers: { Authorization: `Bearer ${upstashToken}` },
                signal: controller.signal
            });
        } catch (e: any) {
            if (e.name === 'AbortError') {
                console.warn("[UPSTASH] Request timed out (5s). Silently failing.");
            } else if (e.message?.includes('Failed to fetch')) {
                console.warn("[UPSTASH] Network connectivity issue. Redis features disabled.");
            } else {
                console.error("Upstash Del Error:", e);
            }
        } finally {
            clearTimeout(timeout);
        }
    },
    /**
     * Professional Caching Wrapper
     * Checks Redis first, if miss, runs the fetcher and caches result.
     */
    fetchCached: async <T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> => {
        const cached = await redis.get(key);
        if (cached) return cached as T;

        const fresh = await fetcher();
        if (fresh) {
            await redis.set(key, fresh, { ex: ttlSeconds });
        }
        return fresh;
    }
};
