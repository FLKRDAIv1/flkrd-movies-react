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
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
            const res = await fetch(`${upstashUrl}/get/${key}`, {
                headers: { Authorization: `Bearer ${upstashToken}` },
                signal: controller.signal
            });
            const data = await res.json();
            if (data.result) {
                try { return JSON.parse(data.result); } catch (e) { return data.result; }
            }
        } catch (e) {
            console.error("Upstash Get Error:", e);
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
        } catch (e) {
            console.error("Upstash Set Error:", e);
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
        } catch (e) {
            console.error("Upstash Del Error:", e);
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
