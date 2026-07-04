// api/translate.js
// A Vercel Serverless Function to proxy subtitle translation requests to Lingva Translate and MyMemory Translate.
// This executes on the server backend (Node.js), bypassing browser CORS policies and GET URL character limits completely.

export default async function handler(req, res) {
    // Enable CORS for development/production
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { text, source = 'en', target = 'ckb' } = req.body || {};

        if (!text) {
            return res.status(400).json({ error: 'Missing text in request body' });
        }

        // 1. Try Lingva POST requests (Direct from server, no CORS or URL limits)
        const LINGVA_INSTANCES = [
            "https://translate.plausibility.cloud",
            "https://lingva.ml",
            "https://lingva.garudalinux.org",
            "https://lingva.lunar.icu",
            "https://lingva.recepty.it"
        ];

        let lastError = null;

        for (const instance of LINGVA_INSTANCES) {
            try {
                const response = await fetch(`${instance}/api/v1/${source}/${target}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ text })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data && data.translation) {
                        return res.status(200).json({ translation: data.translation });
                    }
                }
            } catch (err) {
                console.warn(`[SERVER TRANSLATE] Lingva POST failed for ${instance}:`, err.message);
                lastError = err;
            }
        }

        // 2. Fallback to MyMemory API (English to Kurdish)
        try {
            const mymemoryTarget = target === 'ckb' ? 'ku' : target;
            const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${mymemoryTarget}`;
            const response = await fetch(myMemoryUrl);
            if (response.ok) {
                const data = await response.json();
                if (data && data.responseData && data.responseData.translatedText) {
                    return res.status(200).json({ translation: data.responseData.translatedText });
                }
            }
        } catch (err) {
            console.warn(`[SERVER TRANSLATE] MyMemory API fallback failed:`, err.message);
            lastError = err;
        }

        // 3. Fallback to Lingva GET requests
        for (const instance of LINGVA_INSTANCES) {
            try {
                const url = `${instance}/api/v1/${source}/${target}/${encodeURIComponent(text)}`;
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.translation) {
                        return res.status(200).json({ translation: data.translation });
                    }
                }
            } catch (err) {
                console.warn(`[SERVER TRANSLATE] Lingva GET failed for ${instance}:`, err.message);
                lastError = err;
            }
        }

        return res.status(500).json({ error: lastError ? lastError.message : 'All translation routes exhausted' });

    } catch (globalError) {
        console.error("[SERVER TRANSLATE] Global handler error:", globalError.message);
        return res.status(500).json({ error: globalError.message || 'Internal translation recovery triggered' });
    }
}
