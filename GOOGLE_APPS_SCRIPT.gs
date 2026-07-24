/**
 * ============================================================================
 * FLKRD MOVIE STREAMING PLATFORM - ULTRA-FAST GOOGLE APPS SCRIPT TRANSLATOR
 * ============================================================================
 * Instructions:
 * 1. Open https://script.google.com and create a New Project.
 * 2. Delete any code in Code.gs and paste this entire code.
 * 3. Click "Deploy" -> "New deployment".
 * 4. Select Type: "Web app".
 * 5. Set "Execute as": "Me".
 * 6. Set "Who has access": "Anyone".
 * 7. Click "Deploy" and copy the Web App URL.
 * ============================================================================
 */

function doGet(e) {
  try {
    var params = e.parameter || {};
    var text = params.text || params.q || "";
    var source = params.source || params.sl || "auto";
    var target = params.target || params.tl || "ku";

    if (!text) {
      return createJsonResponse({ status: "error", message: "Missing text parameter" });
    }

    var translated = LanguageApp.translate(text, source, target);
    return createJsonResponse({ status: "success", translation: translated });
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

    // 1. Batch Array Translation Mode (Ultra-Fast parallel array translation for full movie subtitles)
    if (data.texts && Array.isArray(data.texts)) {
      var translations = data.texts.map(function(item) {
        if (!item || !String(item).trim()) return item;
        try {
          return LanguageApp.translate(item, source, target);
        } catch (err) {
          return item;
        }
      });
      return createJsonResponse({ status: "success", translations: translations });
    }

    // 2. Single Text Translation Mode
    var text = data.text || data.q || "";
    if (!text) {
      return createJsonResponse({ status: "error", message: "No text provided" });
    }

    var translatedText = LanguageApp.translate(text, source, target);
    return createJsonResponse({ status: "success", translation: translatedText });

  } catch (error) {
    return createJsonResponse({ status: "error", message: error.toString() });
  }
}

function createJsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
