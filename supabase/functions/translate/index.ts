import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LINGVA_INSTANCES = [
  "https://translate.plausibility.cloud",
  "https://lingva.ml",
  "https://lingva.garudalinux.org",
  "https://lingva.lunar.icu",
  "https://lingva.recepty.it"
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, source = 'en', target = 'ckb' } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Missing text in body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isArray = Array.isArray(text);
    const textArray: string[] = isArray ? text : [text];

    // Helper: translate a single string with all fallback engines
    const translateSingle = async (t: string): Promise<string> => {
      if (!t || !t.trim()) return t || '';
      
      // 1. Try Lingva POST
      for (const instance of LINGVA_INSTANCES) {
        try {
          const res = await fetch(`${instance}/api/v1/${source}/${target}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ text: t }),
            signal: AbortSignal.timeout(6000)
          });
          if (res.ok) {
            const d = await res.json();
            if (d && d.translation) return d.translation;
          }
        } catch (e) {}
      }

      // 2. Try MyMemory
      try {
        const mymemoryTarget = target === 'ckb' ? 'ku' : target;
        const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(t)}&langpair=${source}|${mymemoryTarget}`;
        const res = await fetch(myMemoryUrl);
        if (res.ok) {
          const d = await res.json();
          if (d && d.responseData && d.responseData.translatedText) {
            return d.responseData.translatedText;
          }
        }
      } catch (e) {}

      // 3. Try Lingva GET
      for (const instance of LINGVA_INSTANCES) {
        try {
          const res = await fetch(`${instance}/api/v1/${source}/${target}/${encodeURIComponent(t)}`, {
            signal: AbortSignal.timeout(6000)
          });
          if (res.ok) {
            const d = await res.json();
            if (d && d.translation) return d.translation;
          }
        } catch (e) {}
      }

      return t; // Fallback to original text if everything fails
    };

    // 1. Try Google Apps Script (GAS) Web App if configured (Official Google Translate engine)
    const gasUrl = Deno.env.get('GOOGLE_TRANSLATE_GAS_URL');
    if (gasUrl) {
      try {
        const response = await fetch(gasUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify({ text, source, target }),
          signal: AbortSignal.timeout(12000)
        });

        if (response.ok) {
          const data = await response.json();
          if (data && (data.translation || data.success)) {
            return new Response(
              JSON.stringify({ translation: data.translation }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch (err: any) {
        console.warn("Google Apps Script failed in Edge Function:", err.message);
      }
    }

    // 2. Fallback to Lingva / MyMemory / Lingva GET
    // If it was an array, we can translate each element using translateSingle helper
    if (isArray) {
      const results: string[] = [];
      for (const item of textArray) {
        results.push(await translateSingle(item));
      }
      return new Response(
        JSON.stringify({ translation: results }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const singleTranslation = await translateSingle(textArray[0]);
      return new Response(
        JSON.stringify({ translation: singleTranslation }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
