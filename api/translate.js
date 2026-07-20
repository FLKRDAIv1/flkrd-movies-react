// api/translate.js
// A Vercel Serverless Function to proxy subtitle translation requests to Google Apps Script, Lingva, and MyMemory.
// This executes on the server backend (Node.js), bypassing browser CORS policies and GET URL character limits completely.

function transliterateHawarToArabic(text) {
    if (!text) return text;
    
    // Character map to map Hawar Kurdish Latin to Kurdish Arabic script
    const map = {
        'ç': 'چ', 'Ç': 'چ',
        'ê': 'ێ', 'Ê': 'ێ',
        'î': 'ی', 'Î': 'ی',
        'ş': 'ش', 'Ş': 'ش',
        'û': 'وو', 'Û': 'وو',
        'v': 'ڤ', 'V': 'ڤ',
        'a': 'ا', 'A': 'ا',
        'b': 'ب', 'B': 'ب',
        'c': 'ج', 'C': 'ج',
        'd': 'د', 'D': 'د',
        'e': 'ە', 'E': 'ە',
        'f': 'ف', 'F': 'ف',
        'g': 'گ', 'G': 'گ',
        'h': 'ه', 'H': 'ه',
        'j': 'ژ', 'J': 'ژ',
        'k': 'ک', 'K': 'ک',
        'l': 'ل', 'L': 'ل',
        'm': 'م', 'M': 'م',
        'n': 'ن', 'N': 'ن',
        'o': 'ۆ', 'O': 'ۆ',
        'p': 'پ', 'P': 'پ',
        'q': 'ق', 'Q': 'ق',
        'r': 'ر', 'R': 'ر',
        's': 'س', 'S': 'س',
        't': 'ت', 'T': 'ت',
        'u': 'و', 'U': 'و',
        'w': 'و', 'W': 'و',
        'x': 'خ', 'X': 'خ',
        'y': 'ی', 'Y': 'ی',
        'z': 'ز', 'Z': 'ز',
        'i': '',  'I': ''  // Silent short vowel
    };

    // Replace double consonants and combinations first
    let processed = text;
    processed = processed.replace(/rr/gi, 'ڕ');
    processed = processed.replace(/ll/gi, 'ڵ');
    processed = processed.replace(/xw/gi, 'خو');

    // Split into words to handle word-initial vowels
    const words = processed.split(/(\s+|[,.?!;:()""''])/);
    const mapped = words.map(word => {
        if (/^[\s,.?!;:()""'']*$/.test(word) || !word) return word;

        let w = word;
        let initialVowel = "";
        
        // Handle word-initial vowel replacement (prefixing with Alif-Hamza 'ئ')
        if (w.startsWith('a') || w.startsWith('A')) { initialVowel = "ئا"; w = w.slice(1); }
        else if (w.startsWith('e') || w.startsWith('E')) { initialVowel = "ئە"; w = w.slice(1); }
        else if (w.startsWith('ê') || w.startsWith('Ê')) { initialVowel = "ئێ"; w = w.slice(1); }
        else if (w.startsWith('î') || w.startsWith('Î')) { initialVowel = "ئی"; w = w.slice(1); }
        else if (w.startsWith('o') || w.startsWith('O')) { initialVowel = "ئۆ"; w = w.slice(1); }
        else if (w.startsWith('û') || w.startsWith('Û')) { initialVowel = "ئوو"; w = w.slice(1); }
        else if (w.startsWith('u') || w.startsWith('U')) { initialVowel = "ئو"; w = w.slice(1); }

        let translit = "";
        for (let i = 0; i < w.length; i++) {
            const char = w[i];
            translit += map[char] ?? char;
        }

        return initialVowel + translit;
    });

    return mapped.join('');
}

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

        const isBadini = target === 'badini';
        const actualTarget = isBadini ? 'ku' : target;

        const isArray = Array.isArray(text);
        const textArray = isArray ? text : [text];

        const LINGVA_INSTANCES = [
            "https://translate.plausibility.cloud",
            "https://lingva.ml",
            "https://lingva.garudalinux.org",
            "https://lingva.lunar.icu",
            "https://lingva.recepty.it"
        ];

        // Primary Google Translate Web API fetcher
        const translateWithGoogleAPI = async (t, src, tgt) => {
            try {
                const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(src)}&tl=${encodeURIComponent(tgt)}&dt=t&q=${encodeURIComponent(t)}`;
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data && data[0]) {
                        return data[0].map(x => x[0]).join('');
                    }
                }
            } catch (err) {
                console.warn("[SERVER TRANSLATE] Google Translate API failed:", err.message);
            }
            return null;
        };

        // Helper: translate a single string with all fallback engines
        const translateSingle = async (t) => {
            if (!t || !t.trim()) return t || '';
            
            // 0. Try Google Translate Free API first
            const googleRes = await translateWithGoogleAPI(t, source, actualTarget);
            if (googleRes) return googleRes;

            // 1. Try Lingva POST
            for (const instance of LINGVA_INSTANCES) {
                try {
                    const response = await fetch(`${instance}/api/v1/${source}/${actualTarget}`, {
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
                const mymemoryTarget = actualTarget === 'ckb' ? 'ku' : actualTarget;
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
                    const url = `${instance}/api/v1/${source}/${actualTarget}/${encodeURIComponent(t)}`;
                    const response = await fetch(url);
                    if (response.ok) {
                        const data = await response.json();
                        if (data && data.translation) return data.translation;
                    }
                } catch (err) {}
            }

            return t; // Fallback to original text if everything fails
        };

        const applyBadiniTransliteration = (t) => {
            if (!isBadini) return t;
            if (Array.isArray(t)) {
                return t.map(item => transliterateHawarToArabic(item));
            }
            return transliterateHawarToArabic(t);
        };

        // 1. Try Google Apps Script (GAS) Web App if configured (Official Google Translate engine)
        const gasUrl = process.env.GOOGLE_TRANSLATE_GAS_URL || 
                       process.env.VITE_GOOGLE_TRANSLATE_GAS_URL || 
                       "https://script.google.com/macros/s/AKfycbxde4VzWWNB5_X_3U4e_7604PkI-02xFurowcP0fAqLpyZVzGpBbZN_PSIatZTj6f49nQ/exec";
        if (gasUrl) {
            try {
                const response = await fetch(gasUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8'
                    },
                    body: JSON.stringify({ text, source, target: actualTarget }),
                    redirect: 'follow'
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data && (data.translation || data.success)) {
                        return res.status(200).json({ translation: applyBadiniTransliteration(data.translation) });
                    }
                }
            } catch (err) {
                console.warn(`[SERVER TRANSLATE] Google Apps Script failed:`, err.message);
            }
        }

        // 2. Fallback to Google Translate Web API & Lingva / MyMemory / Lingva GET
        if (isArray) {
            // High-efficiency joined translate
            const joinedText = textArray.join('\n');
            const translatedJoined = await translateWithGoogleAPI(joinedText, source, actualTarget);
            if (translatedJoined) {
                const results = translatedJoined.split('\n');
                if (results.length === textArray.length) {
                    return res.status(200).json({ translation: applyBadiniTransliteration(results) });
                }
            }

            // Fallback: translate one by one
            const results = [];
            for (const item of textArray) {
                results.push(await translateSingle(item));
            }
            return res.status(200).json({ translation: applyBadiniTransliteration(results) });
        } else {
            const singleTranslation = await translateSingle(textArray[0]);
            return res.status(200).json({ translation: applyBadiniTransliteration(singleTranslation) });
        }

    } catch (globalError) {
        console.error("[SERVER TRANSLATE] Global handler error:", globalError.message);
        return res.status(500).json({ error: globalError.message || 'Internal translation recovery triggered' });
    }
}
