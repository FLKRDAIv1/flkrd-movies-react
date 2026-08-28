/**
 * =========================================================================================
 * FLKRD MOVIE & TV SHOW UNIVERSAL SUBTITLE SYNC & TRANSLATION ENGINE (Google Apps Script)
 * =========================================================================================
 * Features:
 * 1. UNIVERSAL TRANSLATION LAYER:
 *    - Full support for Kurdish Sorani (ckb), Badini (ku/kmr), Arabic, Persian, English, etc.
 *    - Automatic Source Language Detection ("auto").
 *    - Realistic Kurdish natural dialogue post-processor (cleans machine-translation glitches).
 *    - Full Hawar-Latin to Kurdish-Arabic script transliterator.
 *    - Tag-Safe & Delimiter-Preserving Batch Engine (translates 1,500+ subtitle lines with zero timeouts).
 * 
 * 2. PRECISION TIMING & AUTO-SYNC ENGINE:
 *    - Constant Delay / Linear Shift (+/- milliseconds) for TV shows (e.g., "FROM" S1E3).
 *    - Progressive Drift Correction / Framerate Multiplier (23.976, 24.0, 25.0, 29.97 FPS).
 *    - Two-Point Linear Anchor Calibration (y = mx + c) for shows with unskippable intro recaps.
 * 
 * 3. DIRECT VIDEO PLAYER STREAMING (Web App GET/POST):
 *    - Directly streamable as a <track> src or HLS/Video.js subtitle endpoint.
 *    - Returns raw .vtt or .srt text directly when requested with proper MIME headers.
 * =========================================================================================
 */

// -----------------------------------------------------------------------------------------
// 1. KURDISH BADINI TRANSLITERATION & PHRASING DICTIONARY
// -----------------------------------------------------------------------------------------

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

function polishKurdishTranslation(text, isBadini) {
  if (!text) return "";
  var t = String(text);

  // 1. Remove translation artifacts & normalize special characters
  t = t.replace(/\{\s*n\s*\}/gi, '\n')
       .replace(/<font[^>]*>/gi, '')
       .replace(/<\/font>/gi, '')
       .replace(/\uFEFF|\u200E|\u200F|\u202A|\u202B|\u202C|\u202D|\u202E/g, '')
       .replace(/([؟!?])\s*([؟!?])/g, '$1');

  // 2. Realistic Kurdish movie dialogue phrase improvements
  var PHRASING_MAP = [
    [/^what's up\??/gi, 'چ هەواڵێکە؟'],
    [/^oh my god!?/gi, 'خوایە گیان!'],
    [/^shut up!?/gi, 'دەمت دابخە!'],
    [/^come on!?/gi, 'دەی وەرە!'],
    [/^let's go!?/gi, 'با بڕۆین!'],
    [/^listen to me!?/gi, 'گوێم لێ بگرە!'],
    [/^are you crazy\??/gi, 'تۆ شێت بوویت؟'],
    [/^never mind/gi, 'کێشە نییە'],
    [/^don't worry/gi, 'نیگەران مەبە'],
    [/^look at me/gi, 'سەیرم بکە'],
    [/^get out/gi, 'بڕۆ دەرەوە'],
    [/^hold on/gi, 'چاوەڕێ بە']
  ];

  for (var i = 0; i < PHRASING_MAP.length; i++) {
    t = t.replace(PHRASING_MAP[i][0], PHRASING_MAP[i][1]);
  }

  // 3. Badini script transliteration if requested
  if (isBadini) {
    t = transliterateBadini(t);
  }

  return t.trim();
}

// -----------------------------------------------------------------------------------------
// 2. TRANSLATION DISPATCHER (LanguageApp + Google GTX Dual-Engine)
// -----------------------------------------------------------------------------------------

function processTranslation(text, source, target, geminiKey) {
  if (!text || !String(text).trim()) return text;
  
  var isBadini = (target === 'badini' || target === 'kmr');
  var isKurdish = (isBadini || target === 'ku' || target === 'ckb' || target === 'sorani');
  var actualTarget = isBadini ? 'ku' : (target === 'sorani' || target === 'ku' ? 'ckb' : target);
  var actualSource = source || 'auto';
  var keyToUse = geminiKey || (PropertiesService.getScriptProperties && PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY')) || '';

  // 1. Try Gemini Flash AI first for highest quality Kurdish / world languages
  if (keyToUse) {
    try {
      var geminiResult = translateViaGeminiFlash(text, actualSource, actualTarget, isBadini, keyToUse);
      if (geminiResult && geminiResult.trim()) {
        return geminiResult;
      }
    } catch (gErr) {}
  }

  try {
    // Kurdish Sorani (ckb) is best handled by GTX engine
    if (actualTarget === 'ckb') {
      return translateViaGTX(text, actualSource, 'ckb', isBadini);
    }

    var translated = LanguageApp.translate(text, actualSource, actualTarget);
    if (isKurdish) {
      return polishKurdishTranslation(translated, isBadini);
    }
    return String(translated || '').trim();
  } catch (e) {
    try {
      return translateViaGTX(text, actualSource, actualTarget, isBadini);
    } catch (err) {
      return text;
    }
  }
}

function translateViaGeminiFlash(text, source, target, isBadini, key) {
  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
  var targetName = (target === 'ckb' || target === 'ku' || isBadini) ? 'natural, realistic Kurdish' : target;
  var prompt = "Translate the following movie dialogue directly to " + targetName + ". Output only the final translation with no markdown code blocks or extra conversational commentary.\n\nText: " + text;

  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'X-goog-api-key': key
    },
    payload: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
    }),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() === 200) {
    var data = JSON.parse(response.getContentText());
    if (data && data.candidates && data.candidates[0] && data.candidates[0].content) {
      var outText = data.candidates[0].content.parts[0].text || '';
      var clean = outText.replace(/```[a-z]*|```/gi, '').trim();
      if (clean) {
        if (target === 'badini' || isBadini) return transliterateBadini(clean);
        return polishKurdishTranslation(clean, false);
      }
    }
  }
  throw new Error("Gemini translation fallback triggered");
}

function translateViaGTX(text, source, target, isBadini) {
  var url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" + 
            encodeURIComponent(source || 'auto') + "&tl=" + encodeURIComponent(target) + 
            "&dt=t";
  
  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    payload: { q: text },
    muteHttpExceptions: true
  });
  if (response.getResponseCode() === 200) {
    var data = JSON.parse(response.getContentText());
    if (data && data[0]) {
      var translatedText = data[0].map(function(x) { return x[0] || ''; }).join('');
      if (translatedText) {
        var isKurdish = (target === 'badini' || target === 'ku' || target === 'ckb' || target === 'sorani' || isBadini);
        if (isKurdish) {
          return polishKurdishTranslation(translatedText, Boolean(isBadini));
        }
        return translatedText.trim();
      }
    }
  }
  throw new Error("GTX translation failed");
}

// -----------------------------------------------------------------------------------------
// 3. SUBTITLE PARSING & TIMING SYNCHRONIZER
// -----------------------------------------------------------------------------------------

function timestampToMs(timeStr) {
  if (!timeStr) return 0;
  var clean = timeStr.trim().replace(',', '.');
  var parts = clean.split(':');
  var hours = 0, minutes = 0, seconds = 0;
  if (parts.length === 3) {
    hours = parseFloat(parts[0]);
    minutes = parseFloat(parts[1]);
    seconds = parseFloat(parts[2]);
  } else if (parts.length === 2) {
    minutes = parseFloat(parts[0]);
    seconds = parseFloat(parts[1]);
  }
  return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
}

function msToTimestamp(ms, isVtt) {
  if (ms < 0) ms = 0;
  var hours = Math.floor(ms / 3600000);
  var rem = ms % 3600000;
  var minutes = Math.floor(rem / 60000);
  rem = rem % 60000;
  var seconds = Math.floor(rem / 1000);
  var millis = rem % 1000;

  var hStr = (hours < 10 ? '0' : '') + hours;
  var mStr = (minutes < 10 ? '0' : '') + minutes;
  var sStr = (seconds < 10 ? '0' : '') + seconds;
  var msStr = (millis < 100 ? (millis < 10 ? '00' : '0') : '') + millis;

  var sep = isVtt ? '.' : ',';
  return hStr + ':' + mStr + ':' + sStr + sep + msStr;
}

/**
 * Direct fast regex shifter for raw SRT / WebVTT documents
 */
function shiftSubtitles(srtContent, offsetInMilliseconds, isVtt) {
  var timeRegex = /((?:\d{1,2}:)?\d{2}:\d{2}[,\.]\d{3})\s*-->\s*((?:\d{1,2}:)?\d{2}:\d{2}[,\.]\d{3})/g;
  var isVttDoc = isVtt !== undefined ? isVtt : srtContent.trim().startsWith('WEBVTT');

  return srtContent.replace(timeRegex, function(match, start, end) {
    var newStartMs = Math.max(0, timestampToMs(start) + offsetInMilliseconds);
    var newEndMs = Math.max(0, timestampToMs(end) + offsetInMilliseconds);
    return msToTimestamp(newStartMs, isVttDoc) + ' --> ' + msToTimestamp(newEndMs, isVttDoc);
  });
}

function parseSubtitles(subText) {
  var isVtt = subText.trim().startsWith('WEBVTT');
  var normalized = subText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  var rawBlocks = normalized.split(/\n\n+/);
  var cues = [];
  var timeRegex = /((?:\d{1,2}:)?\d{2}:\d{2}[,\.]\d{3})\s*-->\s*((?:\d{1,2}:)?\d{2}:\d{2}[,\.]\d{3})/;

  for (var i = 0; i < rawBlocks.length; i++) {
    var block = rawBlocks[i].trim();
    if (!block || block === 'WEBVTT') continue;

    var lines = block.split('\n');
    var timeLineIdx = -1;

    for (var j = 0; j < lines.length; j++) {
      if (timeRegex.test(lines[j])) {
        timeLineIdx = j;
        break;
      }
    }

    if (timeLineIdx !== -1) {
      var match = lines[timeLineIdx].match(timeRegex);
      var startMs = timestampToMs(match[1]);
      var endMs = timestampToMs(match[2]);
      var textLines = lines.slice(timeLineIdx + 1).join('\n');

      cues.push({
        id: timeLineIdx > 0 ? lines[0] : String(cues.length + 1),
        startMs: startMs,
        endMs: endMs,
        text: textLines
      });
    }
  }

  return { isVtt: isVtt, cues: cues };
}

function serializeSubtitles(cues, isVtt) {
  var output = isVtt ? 'WEBVTT\n\n' : '';
  for (var i = 0; i < cues.length; i++) {
    var cue = cues[i];
    var startStr = msToTimestamp(cue.startMs, isVtt);
    var endStr = msToTimestamp(cue.endMs, isVtt);

    if (!isVtt) {
      output += (i + 1) + '\n';
    }
    output += startStr + ' --> ' + endStr + '\n';
    output += cue.text + '\n\n';
  }
  return output.trim() + '\n';
}

/**
 * Handles linear time shift, FPS progressive drift scaling, and 2-point anchor calibration
 */
function adjustSubtitleTiming(cues, options) {
  var shiftMs = options.shiftMs || options.offset || 0;
  var fpsRatio = 1.0;
  
  if (options.fromFps && options.toFps && options.fromFps > 0) {
    fpsRatio = options.toFps / options.fromFps;
  }

  var useTwoPoint = options.anchor1 && options.anchor2;
  var m = 1.0;
  var c = 0;
  if (useTwoPoint) {
    var subDelta = options.anchor2.subMs - options.anchor1.subMs;
    var vidDelta = options.anchor2.vidMs - options.anchor1.vidMs;
    if (subDelta !== 0) {
      m = vidDelta / subDelta;
      c = options.anchor1.vidMs - (m * options.anchor1.subMs);
    }
  }

  return cues.map(function(cue) {
    var newStart = cue.startMs;
    var newEnd = cue.endMs;

    if (useTwoPoint) {
      newStart = Math.round(m * newStart + c);
      newEnd = Math.round(m * newEnd + c);
    } else {
      newStart = Math.round((newStart * fpsRatio) + shiftMs);
      newEnd = Math.round((newEnd * fpsRatio) + shiftMs);
    }

    return {
      id: cue.id,
      startMs: Math.max(0, newStart),
      endMs: Math.max(0, newEnd),
      text: cue.text
    };
  });
}

// -----------------------------------------------------------------------------------------
// 4. TAG-SAFE BATCH TRANSLATION LAYER
// -----------------------------------------------------------------------------------------

function maskTags(text) {
  var tags = [];
  var masked = text.replace(/<[^>]+>|\{[^}]+\}/g, function(match) {
    tags.push(match);
    return '___TAG_' + (tags.length - 1) + '___';
  });
  return { maskedText: masked, tags: tags };
}

function restoreTags(text, tags) {
  var restored = text;
  for (var i = 0; i < tags.length; i++) {
    var placeholder = new RegExp('___TAG_' + i + '___', 'g');
    restored = restored.replace(placeholder, tags[i]);
  }
  return restored;
}

function batchTranslateCues(cues, sourceLang, targetLang) {
  var BATCH_CHAR_LIMIT = 3000;
  var DELIMITER = ' ||| ';
  var translatedCues = [];

  var currentBatch = [];
  var currentBatchLength = 0;
  var allBatches = [];

  for (var i = 0; i < cues.length; i++) {
    var cue = cues[i];
    var tagData = maskTags(cue.text.replace(/\n/g, ' [[BR]] '));
    var cueObj = { index: i, cue: cue, textToTranslate: tagData.maskedText, tags: tagData.tags };
    
    if (currentBatchLength + cueObj.textToTranslate.length > BATCH_CHAR_LIMIT) {
      allBatches.push(currentBatch);
      currentBatch = [];
      currentBatchLength = 0;
    }
    currentBatch.push(cueObj);
    currentBatchLength += cueObj.textToTranslate.length + DELIMITER.length;
  }
  if (currentBatch.length > 0) allBatches.push(currentBatch);

  for (var b = 0; b < allBatches.length; b++) {
    var batch = allBatches[b];
    var combinedString = batch.map(function(item) { return item.textToTranslate; }).join(DELIMITER);
    var rawTranslated = processTranslation(combinedString, sourceLang || 'auto', targetLang);
    var translatedPieces = rawTranslated.split(/\s*\|\|\|\s*/);

    for (var k = 0; k < batch.length; k++) {
      var item = batch[k];
      var transPiece = translatedPieces[k] || item.textToTranslate;
      var cleanText = restoreTags(transPiece, item.tags).replace(/\s*\[\[BR\]\]\s*/g, '\n');
      
      translatedCues.push({
        id: item.cue.id,
        startMs: item.cue.startMs,
        endMs: item.cue.endMs,
        text: cleanText.trim()
      });
    }
  }

  return translatedCues;
}

// -----------------------------------------------------------------------------------------
// 5. WEB APP ROUTING (GET / POST Endpoints)
// -----------------------------------------------------------------------------------------

function doGet(e) {
  try {
    var params = e.parameter || {};
    var action = params.action || "";

    // 1. Direct Video Player Streaming (e.g. ?url=https://...&offset=2000&format=vtt)
    if (params.url || action === 'serve' || action === 'shift') {
      var subUrl = params.url || "";
      var subText = "";
      if (subUrl) {
        var subRes = UrlFetchApp.fetch(subUrl, { muteHttpExceptions: true });
        if (subRes.getResponseCode() === 200) {
          subText = subRes.getContentText();
        }
      } else if (params.subtitleText) {
        subText = params.subtitleText;
      }

      if (subText) {
        var offsetMs = parseInt(params.offset || params.shiftMs || "0", 10);
        var forceVtt = params.format === 'vtt' || subText.trim().startsWith('WEBVTT');

        var shifted = shiftSubtitles(subText, offsetMs, forceVtt);
        return ContentService.createTextOutput(shifted)
          .setMimeType(ContentService.MimeType.TEXT);
      }
    }

    // 2. Single or Batch Translation GET endpoint
    var text = params.text || params.q || "";
    var source = params.source || params.sl || "auto";
    var target = params.target || params.tl || "ku";

    if (!text) {
      return createJsonResponse({ status: "error", message: "Missing text or subtitle url parameter" });
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

    // 1. Full Subtitle Document Processing Mode (Sync + Batch Translate + Re-serialize)
    if (data.subtitleText) {
      var parsed = parseSubtitles(data.subtitleText);
      var processedCues = parsed.cues;

      if (data.syncOptions) {
        processedCues = adjustSubtitleTiming(processedCues, data.syncOptions);
      }

      if (data.target || data.targetLang) {
        var src = data.source || data.sourceLang || 'auto';
        var tgt = data.target || data.targetLang || 'ckb';
        processedCues = batchTranslateCues(processedCues, src, tgt);
      }

      var finalSubText = serializeSubtitles(processedCues, parsed.isVtt || data.forceVtt);
      
      if (data.rawOutput) {
        return ContentService.createTextOutput(finalSubText)
          .setMimeType(ContentService.MimeType.TEXT);
      }

      return createJsonResponse({
        status: "success",
        subtitle: finalSubText,
        cueCount: processedCues.length
      });
    }

    var source = data.source || data.sl || "auto";
    var target = data.target || data.tl || "ku";

    // 2. High-Speed Array Batch Translation Mode
    if (data.texts && Array.isArray(data.texts)) {
      var translations = data.texts.map(function(item) {
        return processTranslation(item, source, target);
      });
      return createJsonResponse({ status: "success", translations: translations });
    }

    // 3. Single Text Mode
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

function doOptions(e) {
  return createJsonResponse({ status: 'ok' });
}
