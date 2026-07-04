// api/translate.js
// A Vercel Serverless Function to proxy subtitle translation requests to Google Apps Script, Lingva, and MyMemory.
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

        const isArray = Array.isArray(text);
        const textArray = isArray ? text : [text];

        const LINGVA_INSTANCES = [
            "https://translate.plausibility.cloud",
            "https://lingva.ml",
            "https://lingva.garudalinux.org",
            "https://lingva.lunar.icu",
            "https://lingva.recepty.it"
        ];

        // Helper: translate a single string with all fallback engines
        const translateSingle = async (t) => {
            if (!t || !t.trim()) return t || '';
            
            // 1. Try Lingva POST
            for (const instance of LINGVA_INSTANCES) {
                try {
                    const response = await fetch(`${instance}/api/v1/${source}/${target}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({ text: t })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data && data.translation) return data.translation;
                    }
                } catch (err) {}
            }

            // 2. Try MyMemory
            try {
                const mymemoryTarget = target === 'ckb' ? 'ku' : target;
                const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(t)}&langpair=${source}|${mymemoryTarget}`;
                const response = await fetch(myMemoryUrl);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.responseData && data.responseData.translatedText) {
                        return data.responseData.translatedText;
                    }
                }
            } catch (err) {}

            // 3. Try Lingva GET
            for (const instance of LINGVA_INSTANCES) {
                try {
                    const url = `${instance}/api/v1/${source}/${target}/${encodeURIComponent(t)}`;
                    const response = await fetch(url);
                    if (response.ok) {
                        const data = await response.json();
                        if (data && data.translation) return data.translation;
                    }
                } catch (err) {}
            }

            return t; // Fallback to original text if everything fails
        };

        // 1. Try Google Apps Script (GAS) Web App if configured (Official Google Translate engine)
        const gasUrl = process.env.GOOGLE_TRANSLATE_GAS_URL || process.env.VITE_GOOGLE_TRANSLATE_GAS_URL || "";
        if (gasUrl) {
            try {
                const response = await fetch(gasUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8'
                    },
                    body: JSON.stringify({ text, source, target })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data && (data.translation || data.success)) {
                        return res.status(200).json({ translation: data.translation });
                    }
                }
            } catch (err) {
                console.warn(`[SERVER TRANSLATE] Google Apps Script failed:`, err.message);
            }
        }

        // 2. Fallback to Lingva / MyMemory / Lingva GET
        if (isArray) {
            const results = [];
            for (const item of textArray) {
                results.push(await translateSingle(item));
            }
            return res.status(200).json({ translation: results });
        } else {
            const singleTranslation = await translateSingle(textArray[0]);
            return res.status(200).json({ translation: singleTranslation });
        }

    } catch (globalError) {
        console.error("[SERVER TRANSLATE] Global handler error:", globalError.message);
        return res.status(500).json({ error: globalError.message || 'Internal translation recovery triggered' });
    }
}
