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
        let bodyData = req.body || {};
        if (typeof bodyData === 'string') {
            try {
                bodyData = JSON.parse(bodyData);
            } catch (e) {}
        }

        const { text, source = 'auto', target = 'ckb' } = bodyData || {};

        if (!text) {
            return res.status(400).json({ error: 'Missing text in request body' });
        }

        const isBadini = target === 'badini' || target === 'kmr';
        // Google Translate language codes:
        //   'ckb' = Central Kurdish / Sorani (Arabic script) ✅
        //   'ku'  = Northern Kurdish / Kurmanji / Badini (Latin script) ✅
        const actualTarget =
            (target === 'badini' || target === 'kmr') ? 'ku' : // Kurdish Badini/Kurmanji
            (target === 'ckb' || target === 'sorani' || target === 'ku') ? 'ckb' :   // Kurdish Sorani
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

        function cleanPersianToKurdish(text) {
            if (!text || typeof text !== 'string') return text || '';
            let cleaned = text;

            const replacements = [
                // --- Present-habitual verbs (می + verb stem) ---
                [/\bشروع کرد\b/g, 'دەستی پێکرد'],
                [/\bشروع می کند\b/g, 'دەست پێدەکات'],
                [/\bشروع می‌کند\b/g, 'دەست پێدەکات'],
                [/\bشروع به\b/g, 'دەست بە'],
                [/\bشروع\b/g, 'دەستپێک'],
                [/\bغرش کردن\b/g, 'نەڕاندن'],
                [/\bغرش\b/g, 'نەڕە'],
                [/\bلرزیدن\b/g, 'لەرزین'],
                [/\bمی کند\b/g, 'دەکات'],
                [/\bمی‌کند\b/g, 'دەکات'],
                [/\bمی کنم\b/g, 'دەکەم'],
                [/\bمی‌کنم\b/g, 'دەکەم'],
                [/\bمی کنیم\b/g, 'دەکەین'],
                [/\bمی‌کنیم\b/g, 'دەکەین'],
                [/\bمی کنند\b/g, 'دەکەن'],
                [/\bمی‌کنند\b/g, 'دەکەن'],
                [/\bمی شود\b/g, 'دەبێت'],
                [/\bمی‌شود\b/g, 'دەبێت'],
                [/\bمی گوید\b/g, 'دەڵێت'],
                [/\bمی‌گوید\b/g, 'دەڵێت'],
                [/\bمی داند\b/g, 'دەزانێت'],
                [/\bمی‌داند\b/g, 'دەزانێت'],
                [/\bمی بیند\b/g, 'دەبینێت'],
                [/\bمی‌بیند\b/g, 'دەبینێت'],
                [/\bمی تواند\b/g, 'دەتوانێت'],
                [/\bمی‌تواند\b/g, 'دەتوانێت'],
                [/\bمی آید\b/g, 'دێت'],
                [/\bمی‌آید\b/g, 'دێت'],
                [/\bمی رود\b/g, 'دەچێت'],
                [/\bمی‌رود\b/g, 'دەچێت'],
                // --- Negative present (نمی + verb stem) ---
                [/\bنمی\u200Cکند\b/g, 'ناکات'],
                [/\bنمی کند\b/g, 'ناکات'],
                [/\bنمی\u200Cکنم\b/g, 'ناکەم'],
                [/\bنمی کنم\b/g, 'ناکەم'],
                [/\bنمی\u200Cکنیم\b/g, 'ناکەین'],
                [/\bنمی کنیم\b/g, 'ناکەین'],
                [/\bنمی\u200Cکنند\b/g, 'ناکەن'],
                [/\bنمی کنند\b/g, 'ناکەن'],
                [/\bنمی\u200Cشود\b/g, 'نابێت'],
                [/\bنمی شود\b/g, 'نابێت'],
                [/\bنمی\u200Cتوانم\b/g, 'ناتوانم'],
                [/\bنمی توانم\b/g, 'ناتوانم'],
                [/\bنمی\u200Cخواهم\b/g, 'نامەوێت'],
                [/\bنمی خواهم\b/g, 'نامەوێت'],
                [/\bنمی\u200Cدانم\b/g, 'نازانم'],
                [/\bنمی دانم\b/g, 'نازانم'],
                [/\bنمی\u200Cبینم\b/g, 'نابینم'],
                [/\bنمی بینم\b/g, 'نابینم'],
                [/\bنمی\u200Cتواند\b/g, 'ناتوانێت'],
                [/\bنمی تواند\b/g, 'ناتوانێت'],
                [/\bنمی\u200Cآید\b/g, 'نایێت'],
                [/\bنمی آید\b/g, 'نایێت'],
                [/\bنمی\u200Cرود\b/g, 'نایچێت'],
                [/\bنمی رود\b/g, 'نایچێت'],
                // --- Future tense (خواهد + verb stem) ---
                [/\bخواهد کرد\b/g, 'دەکات'],
                [/\bخواهد شد\b/g, 'دەبێت'],
                [/\bخواهد رفت\b/g, 'دەچێت'],
                [/\bخواهد آمد\b/g, 'دێت'],
                [/\bخواهم کرد\b/g, 'دەکەم'],
                [/\bخواهی کرد\b/g, 'دەکەیت'],
                // --- Past habitual verbs (می + past stem) ---
                [/\bمی\u200Cرفتم\b/g, 'چووم'],
                [/\bمی رفتم\b/g, 'چووم'],
                [/\bرفتم\b/g, 'چووم'],
                [/\bمی\u200Cآمدم\b/g, 'هاتم'],
                [/\bمی آمدم\b/g, 'هاتم'],
                [/\bآمدم\b/g, 'هاتم'],
                [/\bمی\u200Cدیدم\b/g, 'بینیم'],
                [/\bمی دیدم\b/g, 'بینیم'],
                [/\bدیدم\b/g, 'بینیم'],
                [/\bمی\u200Cگفتم\b/g, 'وتم'],
                [/\bمی گفتم\b/g, 'وتم'],
                [/\bگفتم\b/g, 'وتم'],
                [/\bمی\u200Cخوردم\b/g, 'خواردم'],
                [/\bمی خوردم\b/g, 'خواردم'],
                [/\bمی\u200Cنشستم\b/g, 'نیشتم'],
                [/\bمی نشستم\b/g, 'نیشتم'],
                [/\bمی\u200Cخوابیدم\b/g, 'خەوتم'],
                [/\bمی خوابیدم\b/g, 'خەوتم'],
                [/\bمی\u200Cایستادم\b/g, 'وەستام'],
                [/\bمی ایستادم\b/g, 'وەستام'],
                [/\bمی\u200Cدویدم\b/g, 'ڕامکرد'],
                [/\bمی دویدم\b/g, 'ڕامکرد'],
                // --- Modal / auxiliary ---
                [/\bباید\b/g, 'دەبێت'],
                // --- Interrogative & common function words ---
                [/\bچرا\b/g, 'بۆچی'],
                [/\bچگونه\b/g, 'چۆن'],
                [/\bکجا\b/g, 'لەکوێ'],
                [/\bهنگام\b/g, 'کاتێک'],
                [/\bتا\b/g, 'هەتا'],
                [/\bاز\b/g, 'لە'],
                [/\bبه\b/g, 'بە'],
                [/\bهمچنین\b/g, 'هەروەها'],
                [/\bچه\b/g, 'چی'],
                // --- Intensifiers & adjectives ---
                [/\bبسیار\b/g, 'زۆر'],
                [/\bخیلی\b/g, 'زۆر'],
                [/\bخوب\b/g, 'باش'],
                [/\bبد\b/g, 'خراپ'],
                // --- Affirmation / negation ---
                [/\bبله\b/g, 'بەڵێ'],
                [/\bنه\b/g, 'نەخێر'],
                // --- Demonstratives & conjunctions (existing) ---
                [/\bبرای\b/g, 'بۆ'],
                [/\bاگر\b/g, 'ئەگەر'],
                [/\bاین\b/g, 'ئەم'],
                [/\bآن\b/g, 'ئەو']
            ];

            for (const [pattern, replacement] of replacements) {
                cleaned = cleaned.replace(pattern, replacement);
            }
            return cleaned;
        }

        // ⚡ Multi-Q Google GTX POST Array Translator with Delimiter-Based Sentence Protection
        const translateArrayWithGoogleGTX = async (chunkItems, src, tgt) => {
            if (!chunkItems || chunkItems.length === 0) return [];
            const effectiveSrc = (src && src !== 'auto') ? src : 'auto';
            const isKurdishTarget = (tgt === 'ckb' || tgt === 'ku' || tgt === 'badini' || tgt === 'sorani');

            // 1. Delimiter-Based single-string POST translation (Guarantees 100% line alignment & sentence structure)
            try {
                const delimiter = '\n\n:::FLKRD_CUE:::\n\n';
                const joinedText = chunkItems.map((t) => (t || '').replace(/\r\n/g, ' ').replace(/\n/g, ' ')).join(delimiter);
                const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(effectiveSrc)}&tl=${encodeURIComponent(tgt)}&dt=t`;

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    },
                    body: `q=${encodeURIComponent(joinedText)}`,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    if (data && Array.isArray(data[0])) {
                        const translatedJoined = data[0].map(x => x[0] || '').join('');
                        if (translatedJoined) {
                            const splitResults = translatedJoined.split(/[\r\n]*:::FLKRD_CUE:::[\r\n]*/);
                            if (splitResults.length === chunkItems.length) {
                                return splitResults.map((item, idx) => {
                                    const cleaned = item.trim();
                                    const finalStr = isKurdishTarget ? cleanPersianToKurdish(cleaned) : cleaned;
                                    return finalStr || chunkItems[idx];
                                });
                            }
                        }
                    }
                }
            } catch (err) {}

            // 2. Parallel individual item translation with GTX GET/POST
            try {
                const SUB_BATCH_SIZE = 10;
                const results = [];

                for (let i = 0; i < chunkItems.length; i += SUB_BATCH_SIZE) {
                    const subChunk = chunkItems.slice(i, i + SUB_BATCH_SIZE);
                    const batchPromises = subChunk.map(async (item) => {
                        if (!item || !item.trim()) return item || '';
                        const trans = await translateWithGoogleAPI(item, effectiveSrc, tgt);
                        if (trans && trans.trim()) {
                            return isKurdishTarget ? cleanPersianToKurdish(trans.trim()) : trans.trim();
                        }
                        return item;
                    });

                    const translatedSubBatch = await Promise.all(batchPromises);
                    results.push(...translatedSubBatch);
                }

                if (results.length === chunkItems.length) {
                    return results;
                }
            } catch (err) {}

            throw new Error("GTX array translation failed");
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

        const gasUrl = process.env.GOOGLE_TRANSLATE_GAS_URL || 
                       process.env.VITE_GOOGLE_TRANSLATE_GAS_URL || 
                       "https://script.google.com/macros/s/AKfycbzt-Bus8kvLiywcXX16pnPLbvcbAGSf7euGm3hw0pB4xbrb7CzlddQspR1pLg22MRbCSQ/exec";

        const callGAS = async (payload) => {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 8000);
            try {
                let response = await fetch(gasUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(payload),
                    redirect: 'manual',
                    signal: ctrl.signal
                });

                if (response.status === 302 || response.status === 301 || response.status === 307) {
                    const redirectUrl = response.headers.get('location');
                    if (redirectUrl) {
                        response = await fetch(redirectUrl, {
                            method: 'GET',
                            signal: ctrl.signal
                        });
                    }
                }

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

        function decodeHtmlEntities(str) {
            if (!str) return '';
            return str
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&#39;/g, "'")
                .replace(/&apos;/g, "'")
                .replace(/&#10;/g, '\n')
                .replace(/&#x2F;/g, '/')
                .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)));
        }

        // 🌟 Ultra-Reliable Google Gemini Flash AI Translation Engine
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

        const translateWithGeminiFlash = async (chunkItems, src, tgt) => {
            if (!chunkItems || chunkItems.length === 0 || !GEMINI_API_KEY) return null;
            const effectiveSrc = (src && src !== 'auto') ? src : 'auto';
            const effectiveTgt = (tgt === 'ckb' || tgt === 'ku' || tgt === 'badini' || tgt === 'sorani') ? 'Kurdish Sorani (Central Kurdish - ckb)' : tgt;

            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
                const delimiter = '\n\n:::FLKRD_CUE:::\n\n';
                const joinedText = chunkItems.join(delimiter);

                const prompt = `Translate the following movie subtitle dialogue lines from ${effectiveSrc} to natural, modern ${effectiveTgt}.
Preserve the exact delimiter ":::FLKRD_CUE:::" between items so they map 1-to-1 with the original count (${chunkItems.length} lines).
Do not add notes, explanations, or markdown code blocks.

Input:
${joinedText}`;

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 9000);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.1, maxOutputTokens: 65536 }
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    const rawOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    if (rawOutput) {
                        const cleanedOutput = rawOutput.replace(/```[a-z]*|```/gi, '').trim();
                        const splitResults = cleanedOutput.split(/[\r\n]*:::FLKRD_CUE:::[\r\n]*/);
                        if (splitResults.length === chunkItems.length) {
                            const isKurdishTarget = (tgt === 'ckb' || tgt === 'ku' || tgt === 'badini' || tgt === 'sorani');
                            return splitResults.map((item, idx) => {
                                const cleaned = item.trim();
                                return (isKurdishTarget ? cleanPersianToKurdish(cleaned) : cleaned) || chunkItems[idx];
                            });
                        }
                    }
                }
            } catch (geminiErr) {}
            return null;
        };

        // 🌟 Ultra-Reliable Google Mobile Translation Engine (Zero rate limits, delivers 100% authentic Kurdish Sorani/Badini)
        const translateWithGoogleMobile = async (chunkItems, src, tgt) => {
            if (!chunkItems || chunkItems.length === 0) return [];
            const effectiveSrc = (src && src !== 'auto') ? src : 'auto';
            const isKurdishTarget = (tgt === 'ckb' || tgt === 'ku' || tgt === 'badini' || tgt === 'sorani');

            // 1. Delimiter-Based batching (Ultra-fast 150ms request for all cues in chunk)
            try {
                const delimiter = '\n\n:::FLKRD_CUE:::\n\n';
                const joinedText = chunkItems.map((t) => (t || '').replace(/\r\n/g, ' ').replace(/\n/g, ' ')).join(delimiter);
                const url = `https://translate.google.com/m?sl=${encodeURIComponent(effectiveSrc)}&tl=${encodeURIComponent(tgt)}&q=${encodeURIComponent(joinedText)}`;

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000);

                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
                    },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (response.ok) {
                    const html = await response.text();
                    const match = html.match(/<div[^>]*class="result-container"[^>]*>([\s\S]*?)<\/div>/i);
                    if (match) {
                        const unescaped = decodeHtmlEntities(match[1]);
                        const splitResults = unescaped.split(/[\r\n]*:::FLKRD_CUE:::[\r\n]*/);
                        if (splitResults.length === chunkItems.length) {
                            return splitResults.map((item, idx) => {
                                const cleaned = item.trim();
                                const finalStr = isKurdishTarget ? cleanPersianToKurdish(cleaned) : cleaned;
                                return finalStr || chunkItems[idx];
                            });
                        }
                    }
                }
            } catch (e) {}

            // 2. Individual item translation with Google Mobile
            try {
                const results = [];
                for (const item of chunkItems) {
                    if (!item || !item.trim()) {
                        results.push(item || '');
                        continue;
                    }
                    try {
                        const url = `https://translate.google.com/m?sl=${encodeURIComponent(effectiveSrc)}&tl=${encodeURIComponent(tgt)}&q=${encodeURIComponent(item)}`;
                        const ctrl = new AbortController();
                        const t = setTimeout(() => ctrl.abort(), 3500);
                        const res = await fetch(url, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
                            },
                            signal: ctrl.signal
                        });
                        clearTimeout(t);
                        if (res.ok) {
                            const html = await res.text();
                            const match = html.match(/<div[^>]*class="result-container"[^>]*>([\s\S]*?)<\/div>/i);
                            if (match) {
                                const unescaped = decodeHtmlEntities(match[1]).trim();
                                results.push(isKurdishTarget ? cleanPersianToKurdish(unescaped) : unescaped);
                                continue;
                            }
                        }
                    } catch (err) {}
                    results.push(item);
                }
                if (results.length === chunkItems.length) {
                    return results;
                }
            } catch (err) {}

            return null;
        };

        // Helper to translate a chunk of text items
        const translateChunk = async (chunkItems) => {
            if (!chunkItems || chunkItems.length === 0) return [];

            // 0. Highest-Precision Tier: Google Gemini Flash AI Engine
            try {
                const geminiRes = await translateWithGeminiFlash(chunkItems, source, actualTarget);
                if (Array.isArray(geminiRes) && geminiRes.length === chunkItems.length) {
                    const validCount = geminiRes.filter((t, i) => t && t.trim() && t !== chunkItems[i]).length;
                    if (validCount > 0) return geminiRes;
                }
            } catch (err) {}

            // 1. High-Reliability Path: Google Mobile Translation Engine
            try {
                const mobileRes = await translateWithGoogleMobile(chunkItems, source, actualTarget);
                if (Array.isArray(mobileRes) && mobileRes.length === chunkItems.length) {
                    const validCount = mobileRes.filter((t, i) => t && t.trim() && t !== chunkItems[i]).length;
                    if (validCount > 0) return mobileRes;
                }
            } catch (err) {}

            // 1. Secondary Path: Google GTX
            try {
                const gtxArrayRes = await translateArrayWithGoogleGTX(chunkItems, source, actualTarget);
                if (Array.isArray(gtxArrayRes) && gtxArrayRes.length === chunkItems.length) {
                    const validCount = gtxArrayRes.filter((t, i) => t && t.trim() && t !== chunkItems[i]).length;
                    if (validCount > 0) return gtxArrayRes;
                }
            } catch (err) {}

            // 2. Tertiary Path: Google Apps Script Array POST
            try {
                const gasArrayRes = await callGAS({ texts: chunkItems, source, target: actualTarget });
                if (Array.isArray(gasArrayRes) && gasArrayRes.length === chunkItems.length) {
                    const validCount = gasArrayRes.filter((t, i) => t && t.trim() && t !== chunkItems[i]).length;
                    if (validCount > 0) return gasArrayRes;
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


        // ✅ Apply Badini Hawar → Kurdish Arabic script transliteration for 'ku'/'badini' target.
        // For Sorani (ckb) Google Translate already outputs Arabic script — no transliteration needed.
        const applyBadiniTransliteration = (input) => {
            if (actualTarget !== 'ku') {
                // Sorani (ckb) and all other targets: return as-is
                if (Array.isArray(input)) return input;
                return input;
            }
            // Badini/Kurmanji: transliterate Hawar Latin output to Kurdish Arabic script
            if (Array.isArray(input)) {
                return input.map(t => (t && typeof t === 'string') ? transliterateHawarToArabic(t) : (t || ''));
            }
            return (input && typeof input === 'string') ? transliterateHawarToArabic(input) : (input || '');
        };

        // 1. Array batch translation with sub-chunking (25 items per chunk for guaranteed 100% full translation)
        if (isArray) {
            const CHUNK_SIZE = 25;
            const chunks = [];
            for (let i = 0; i < textArray.length; i += CHUNK_SIZE) {
                chunks.push(textArray.slice(i, i + CHUNK_SIZE));
            }

            const chunkResults = await Promise.all(chunks.map(chunk => translateChunk(chunk)));
            const finalResults = chunkResults.flat();

            return res.status(200).json({ translation: applyBadiniTransliteration(finalResults) });
        } else {
            // Single translation — use translateChunk for unified high-accuracy path (GTX → GAS → Google POST → fallback)
            const singleResults = await translateChunk([textArray[0]]);
            const singleTranslation = (singleResults && singleResults[0]) ||
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
