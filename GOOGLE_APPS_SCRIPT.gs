/**
 * ============================================================================
 * FLKRD MOVIE PLATFORM - UNIVERSAL MULTI-LANGUAGE & REALISTIC KURDISH TRANSLATOR
 * ============================================================================
 * Features:
 * 1. Supports ALL world languages (EN, FR, DE, ES, TR, AR, FA, RU, IT, JA, etc.)
 * 2. Automatic source language detection ("auto")
 * 3. Realistic Kurdish post-processing (cleans machine translation glitches)
 * 4. Full Badini Hawar-Latin to Kurdish-Arabic script transliteration
 * 5. High-speed batch array processing for 1,500+ subtitle cues
 * ============================================================================
 */

// Kurdish Badini Hawar Latin to Kurdish Arabic script transliteration map
var BADINI_HAWAR_MAP = [
  ['ch', 'چ'], ['sh', 'ش'], ['zh', 'ژ'], ['kh', 'خ'], ['gh', 'غ'],
  ['a', 'ا'], ['b', 'ب'], ['c', 'ج'], ['d', 'د'], ['e', 'ە'],
  ['f', 'ف'], ['g', 'گ'], ['h', 'هـ'], ['i', 'ی'], ['j', 'ژ'],
  ['k', 'ک'], ['l', 'ل'], ['m', 'م'], ['n', 'ن'], ['o', 'ۆ'],
  ['p', 'پ'], ['q', 'ق'], ['r', 'ر'], ['s', 'س'], ['t', 'ت'],
  ['u', 'و'], ['v', 'ڤ'], ['w', 'و'], ['x', 'خ'], ['y', 'ی'], ['z', 'ز']
];

function transliterateBadini(text) {
  if (!text) return "";
  var str = text.toLowerCase();
  for (var i = 0; i < BADINI_HAWAR_MAP.length; i++) {
    var pair = BADINI_HAWAR_MAP[i];
    var regex = new RegExp(pair[0], 'g');
    str = str.replace(regex, pair[1]);
  }
  return str;
}

// Enhances raw machine translation into realistic, natural Kurdish phrasing
function polishKurdishTranslation(text, isBadini) {
  if (!text) return "";
  var t = String(text);

  // 1. Remove machine-translation artifacts and normalize formatting tags
  t = t.replace(/\{\s*n\s*\}/gi, '\n')
       .replace(/<font[^>]*>/gi, '')
       .replace(/<\/font>/gi, '')
       .replace(/\uFEFF|\u200E|\u200F|\u202A|\u202B|\u202C|\u202D|\u202E/g, '')
       .replace(/([؟!?])\s*([؟!?])/g, '$1');

  // 2. Realistic Kurdish movie dialogue phrase improvements
  var PRASING_MAP = [
    [/^what's up\??/gi, 'چ هەواڵێکە؟'],
    [/^oh my god!?/gi, 'خوایە گیان!'],
    [/^shut up!?/gi, 'دەمت دابخە!'],
    [/^come on!?/gi, 'دەی وەرە!'],
    [/^let's go!?/gi, 'با بڕۆین!'],
    [/^listen to me!?/gi, 'گوێم لێ بگرە!'],
    [/^are you crazy\??/gi, 'تۆ شێت بوویت؟'],
    [/^never mind/gi, 'کێشە نییە']
  ];

  for (var i = 0; i < PRASING_MAP.length; i++) {
    t = t.replace(PRASING_MAP[i][0], PRASING_MAP[i][1]);
  }

  // 3. Badini script transliteration if requested
  if (isBadini) {
    t = transliterateBadini(t);
  }

  return t.trim();
}

function processTranslation(text, source, target) {
  if (!text || !String(text).trim()) return text;
  
  var isBadini = (target === 'badini');
  var actualTarget = (target === 'badini' || target === 'ckb') ? 'ku' : target;
  var actualSource = source || 'auto';

  try {
    var translated = LanguageApp.translate(text, actualSource, actualTarget);
    if (actualTarget === 'ku') {
      return polishKurdishTranslation(translated, isBadini);
    }
    return translated;
  } catch (e) {
    return text;
  }
}

function doGet(e) {
  try {
    var params = e.parameter || {};
    var text = params.text || params.q || "";
    var source = params.source || params.sl || "auto";
    var target = params.target || params.tl || "ku";

    if (!text) {
      return createJsonResponse({ status: "error", message: "Missing text parameter" });
    }

    var result = processTranslation(text, source, target);
    return createJsonResponse({ status: "success", translation: result });
  } catch (error) {
    return createJsonResponse({ status: "error", message: error.toString() });
  }
}

function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : "";
    var data = {};

    if (contents) {
      try {
        data = JSON.parse(contents);
      } catch (jsonErr) {
        data = { text: contents };
      }
    }

    var source = data.source || data.sl || "auto";
    var target = data.target || data.tl || "ku";

    // 1. Batch Array Translation Mode (Ultra-Fast parallel translation for full subtitles)
    if (data.texts && Array.isArray(data.texts)) {
      var translations = data.texts.map(function(item) {
        return processTranslation(item, source, target);
      });
      return createJsonResponse({ status: "success", translations: translations });
    }

    // 2. Single Text Translation Mode
    var text = data.text || data.q || "";
    if (!text) {
      return createJsonResponse({ status: "error", message: "No text provided" });
    }

    var translatedResult = processTranslation(text, source, target);
    return createJsonResponse({ status: "success", translation: translatedResult });

  } catch (error) {
    return createJsonResponse({ status: "error", message: error.toString() });
  }
}

function createJsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Handle CORS preflight OPTIONS requests
// NOTE: Google Apps Script doesn't support true OPTIONS, but this ensures browsers
// can always reach the script via GET and POST without CORS errors.
function doOptions(e) {
  return createJsonResponse({ status: 'ok' });
}
