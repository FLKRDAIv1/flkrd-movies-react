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

    let lastError = null;

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
          signal: AbortSignal.timeout(10000)
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
        lastError = err;
      }
    }

    // 2. Try Lingva POST requests
    for (const instance of LINGVA_INSTANCES) {
      try {
        const response = await fetch(`${instance}/api/v1/${source}/${target}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ text }),
          signal: AbortSignal.timeout(8000)
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.translation) {
            return new Response(
              JSON.stringify({ translation: data.translation }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch (err: any) {
        console.warn(`Lingva POST failed for ${instance}:`, err.message);
        lastError = err;
      }
    }

    // 2. Fallback to MyMemory
    try {
      const mymemoryTarget = target === 'ckb' ? 'ku' : target;
      const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${mymemoryTarget}`;
      const response = await fetch(myMemoryUrl);
      if (response.ok) {
        const data = await response.json();
        if (data && data.responseData && data.responseData.translatedText) {
          return new Response(
            JSON.stringify({ translation: data.responseData.translatedText }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } catch (err: any) {
      console.warn(`MyMemory fallback failed:`, err.message);
      lastError = err;
    }

    // 3. Last resort: GET
    for (const instance of LINGVA_INSTANCES) {
      try {
        const url = `${instance}/api/v1/${source}/${target}/${encodeURIComponent(text)}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data && data.translation) {
            return new Response(
              JSON.stringify({ translation: data.translation }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch (err: any) {
        console.warn(`Lingva GET failed for ${instance}:`, err.message);
        lastError = err;
      }
    }

    return new Response(
      JSON.stringify({ error: lastError ? lastError.message : "All translation routes failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
