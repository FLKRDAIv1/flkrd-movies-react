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

        const isBadini = target === 'badini' || target === 'kmr' || target === 'ku';
        // Google Translate language codes:
        //   'ckb' = Central Kurdish / Sorani (Arabic script) ✅
        //   'ku'  = Northern Kurdish / Kurmanji / Badini (Latin script) ✅
        const actualTarget =
            (target === 'ckb' || target === 'sorani') ? 'ckb' :   // Kurdish Sorani
            (target === 'badini' || target === 'ku' || target === 'kmr') ? 'ku' : // Kurdish Badini/Kurmanji
            target; // pass-through for all other languages (en, ar, tr, etc.)

        const isArray = Array.isArray(text);
        const textArray = isArray ? text : [text];

        const LINGVA_INSTANCES = [
            "https://translate.plausibility.cloud",
            "https://lingva.ml",
            "https://lingva.garudalinux.org",
            "https://lingva.lunar.icu",
            "https://lingva.recepty.it"
        ];

        // ⚡ Multi-Q Google GTX POST Array Translator (100% index accuracy, 8s timeout)
        const translateArrayWithGoogleGTX = async (chunkItems, src, tgt) => {
            if (!chunkItems || chunkItems.length === 0) return [];
            try {
                const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(src)}&tl=${encodeURIComponent(tgt)}&dt=t`;
                const bodyParams = chunkItems.map(t => {
                    const clean = (t || '').replace(/\r\n/g, ' ').replace(/\n/g, ' ');
                    return `q=${encodeURIComponent(clean || ' ')}`;
                }).join('&');

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    },
                    body: bodyParams,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        return chunkItems.map((item, idx) => {
                            const resItem = data[idx];
                            if (Array.isArray(resItem)) {
                                const translated = resItem.map(subItem => (Array.isArray(subItem) ? (subItem[0] || '') : '')).join('').trim();
                                return translated || item;
                            }
                            return item;
                        });
                    }
                }
            } catch (err) {
                // Silent fallback on abort/fetch failure
            }
            return null;
        };

        // Primary single string Google Translate API fetcher (POST with GET fallback, 8s timeout)
        const translateWithGoogleAPI = async (t, src, tgt) => {
            if (!t || !t.trim()) return t || '';

            // 1. Try POST first
            try {
                const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(src)}&tl=${encodeURIComponent(tgt)}&dt=t`;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    },
                    body: `q=${encodeURIComponent(t)}`,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data && data[0]) {
                        return data[0].map(x => x[0] || '').join('');
                    }
                }
            } catch (err) {}

            // 2. Try GET fallback if text is under 1500 chars
            if (t.length < 1500) {
                try {
                    const getUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(src)}&tl=${encodeURIComponent(tgt)}&dt=t&q=${encodeURIComponent(t)}`;
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);
                    const response = await fetch(getUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        },
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    if (response.ok) {
                        const data = await response.json();
                        if (data && data[0]) {
                            return data[0].map(x => x[0] || '').join('');
                        }
                    }
                } catch (err) {}
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

            return t; // Return original text if all translation engines fail
        };

        // Helper: call Google Apps Script with 5s timeout (non-blocking fallback only)
        const gasUrl = process.env.GOOGLE_TRANSLATE_GAS_URL || 
                       process.env.VITE_GOOGLE_TRANSLATE_GAS_URL || 
                       "https://script.google.com/macros/s/AKfycbz8iIzETpuRSOfxET24WLlvVTXHGJsWWVWhyVqGhY62fu_SDl4-J3PN2cqUMWO30cHRLQ/exec";

        const callGAS = async (payload) => {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 6000);
            try {
                const response = await fetch(gasUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(payload),
                    redirect: 'follow',
                    signal: ctrl.signal
                });
                clearTimeout(timer);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.status === 'success') {
                        return data.translations || data.translation || null;
                    }
                    return data ? (data.translations || data.translation || null) : null;
                }
            } catch (err) {
                clearTimeout(timer);
            }
            return null;
        };

        const applyBadiniTransliteration = (t) => {
            if (!isBadini) return t;
            if (Array.isArray(t)) {
                return t.map(item => transliterateHawarToArabic(item));
            }
            return transliterateHawarToArabic(t);
        };

        // ⚡ Gemini High-Intelligence Context-Aware Kurdish Translation Engine
        const translateWithGeminiAPI = async (chunkItems) => {
            const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
            if (!apiKey || !chunkItems || chunkItems.length === 0) return null;

            const isBadiniTarget = target === 'badini' || target === 'kmr' || target === 'ku';
            const targetLangDescription = isBadiniTarget 
                ? "Kurdish Badini (Kurmanji dialect, written in Kurdish Arabic script)" 
                : "Kurdish Sorani (Central Kurdish dialect, written in Kurdish Arabic script)";

            const systemPrompt = `You are a professional movie & TV dialogue translator specializing in fluent, natural, idiomatic ${targetLangDescription}.
CRITICAL TRANSLATION INSTRUCTIONS:
1. Translate each subtitle line into ${targetLangDescription}.
2. DO NOT translate word-by-word literally! Produce natural, fluent, spoken Kurdish dialogue that flows logically and sounds authentic.
3. Automatically correct any typos, spelling mistakes, or broken grammatical structures present in the source subtitle line.
4. Output MUST be a strict JSON array of strings containing EXACTLY ${chunkItems.length} elements (matching 1-to-1 with the input array).
5. Do NOT include markdown codeblocks (\`\`\`json), index numbers, or explanation text. Return ONLY the raw JSON array of strings.`;

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 12000);

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            {
                                role: 'user',
                                parts: [
                                    { text: systemPrompt },
                                    { text: JSON.stringify(chunkItems) }
                                ]
                            }
                        ],
                        generationConfig: {
                            temperature: 0.2,
                            responseMimeType: "application/json"
                        }
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (textResult) {
                        const parsed = JSON.parse(textResult);
                        if (Array.isArray(parsed) && parsed.length === chunkItems.length) {
                            return parsed;
                        }
                    }
                }
            } catch (err) {
                console.warn('[TRANSLATE] Gemini translation engine notice:', err.message);
            }
            return null;
        };

        // Helper to translate a chunk of text items
        const translateChunk = async (chunkItems) => {
            if (!chunkItems || chunkItems.length === 0) return [];

            // 0. High-Intelligence Primary Path: Try Gemini AI for natural fluent Kurdish (Sorani/Badini)
            try {
                const geminiRes = await translateWithGeminiAPI(chunkItems);
                if (Array.isArray(geminiRes) && geminiRes.length === chunkItems.length) {
                    return geminiRes;
                }
            } catch (err) {}

            // 1. Primary Fallback Path: Try Google Apps Script Array POST
            try {
                const gasArrayRes = await callGAS({ texts: chunkItems, source, target: actualTarget });
                if (Array.isArray(gasArrayRes) && gasArrayRes.length === chunkItems.length) {
                    const validCount = gasArrayRes.filter((t, i) => t && t !== chunkItems[i]).length;
                    if (validCount > 0) {
                        return gasArrayRes;
                    }
                }
            } catch (err) {}

            // 1. Secondary Fast Path: Clean Delimiter-Based Joined Google Translate API POST
            try {
                const delimiter = '\n\n:::\n\n';
                const joinedText = chunkItems.map((t) => (t || '').replace(/\n/g, ' {n} ')).join(delimiter);
                const translatedJoined = await translateWithGoogleAPI(joinedText, source, actualTarget);

                if (translatedJoined) {
                    const splitResults = translatedJoined.split(/[\r\n]*:::[\r\n]*/);
                    if (splitResults.length === chunkItems.length) {
                        return splitResults.map((item, idx) => {
                            const cleaned = item.replace(/\{n\}/gi, '\n').trim();
                            return cleaned || chunkItems[idx];
                        });
                    }
                }
            } catch (err) {}

            // 2. Tertiary Path: Index-Based Joined Text Google Translate API POST with digit normalization
            try {
                const joinedText = chunkItems.map((t, idx) => `[${idx}] ${t.replace(/\n/g, ' {n} ')}`).join('\n');
                const translatedJoined = await translateWithGoogleAPI(joinedText, source, actualTarget);

                if (translatedJoined) {
                    const rawLines = translatedJoined.split('\n').map(l => l.trim()).filter(Boolean);
                    const results = new Array(chunkItems.length);
                    let matchedCount = 0;

                    const normalizeDigits = (str) => {
                        if (!str) return '';
                        return str
                            .replace(/٠/g, '0').replace(/١/g, '1').replace(/٢/g, '2').replace(/٣/g, '3').replace(/٤/g, '4')
                            .replace(/٥/g, '5').replace(/٦/g, '6').replace(/٧/g, '7').replace(/٨/g, '8').replace(/٩/g, '9');
                    };

                    for (const line of rawLines) {
                        const normLine = normalizeDigits(line);
                        const match = normLine.match(/^[\[\(\s]*(\d+)[\]\)\s.:\-]*\s*(.*)$/);
                        if (match) {
                            const idx = parseInt(match[1], 10);
                            if (idx >= 0 && idx < chunkItems.length && !results[idx]) {
                                const cleanText = match[2].replace(/^[:.\-\s]+/, '').replace(/\{n\}/gi, '\n').trim();
                                results[idx] = cleanText;
                                matchedCount++;
                            }
                        }
                    }

                    if (matchedCount >= Math.floor(chunkItems.length * 0.5)) {
                        for (let i = 0; i < chunkItems.length; i++) {
                            if (!results[i]) results[i] = chunkItems[i];
                        }
                        return results;
                    }
                }
            } catch (err) {}

            // 3. Fallback: Item-by-item translation with small concurrency batches to respect rate limits
            const fallbackResults = [];
            const BATCH_SIZE = 5;
            for (let i = 0; i < chunkItems.length; i += BATCH_SIZE) {
                const miniBatch = chunkItems.slice(i, i + BATCH_SIZE);
                const miniResults = await Promise.all(miniBatch.map(item => translateSingle(item)));
                fallbackResults.push(...miniResults.map((res, idx) => res || miniBatch[idx]));
                if (i + BATCH_SIZE < chunkItems.length) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }
            return fallbackResults;
        };


        // 1. Array batch translation with sub-chunking (40 items per chunk for 100ms response)
        if (isArray) {
            const CHUNK_SIZE = 40;
            const chunks = [];
            for (let i = 0; i < textArray.length; i += CHUNK_SIZE) {
                chunks.push(textArray.slice(i, i + CHUNK_SIZE));
            }

            const chunkResults = await Promise.all(chunks.map(chunk => translateChunk(chunk)));
            const finalResults = chunkResults.flat();

            return res.status(200).json({ translation: applyBadiniTransliteration(finalResults) });
        } else {
            // Single translation — try Google Translate POST first, then fall back
            const geminiSingle = await translateWithGeminiAPI([textArray[0]]);
            const singleTranslation = (geminiSingle && geminiSingle[0]) ||
                                      await translateWithGoogleAPI(textArray[0], source, actualTarget) ||
                                      await callGAS({ text: textArray[0], source, target: actualTarget }) ||
                                      await translateSingle(textArray[0]);
            return res.status(200).json({ translation: applyBadiniTransliteration(singleTranslation) });
        }

    } catch (globalError) {
        console.error("[SERVER TRANSLATE] Global handler error:", globalError.message);
        return res.status(500).json({ error: globalError.message || 'Internal translation recovery triggered' });
    }
}
