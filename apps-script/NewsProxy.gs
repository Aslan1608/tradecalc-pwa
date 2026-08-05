/**
 * Standalone Google Apps Script web app for SenSeiS News RSS fallback.
 * Deploy as: Execute as me / Who has access: Anyone.
 * Results are cached for 15 minutes per normalized query.
 */
function doGet(e) {
  var params = (e && e.parameter) || {};
  if (String(params.action || 'news') !== 'news') {
    return senseisOutput_({ok: false, error: 'UNSUPPORTED_ACTION'}, params.callback);
  }

  var name = String(params.name || params.symbol || '').trim();
  var symbol = String(params.symbol || '').trim().toUpperCase();
  if (!name) return senseisOutput_({ok: false, error: 'NAME_REQUIRED', news: []}, params.callback);

  var query = name + ' (Aktie OR stock)';
  var cacheKey = 'news:' + Utilities.base64EncodeWebSafe(query).slice(0, 180);
  var cache = CacheService.getScriptCache();
  var cached = cache.get(cacheKey);
  if (cached) return senseisOutput_(JSON.parse(cached), params.callback);

  var url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(query)
    + '&hl=de&gl=DE&ceid=DE:de';
  var response = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {'User-Agent': 'SenSeiS-Terminal-News/1.0'}
  });
  var code = response.getResponseCode();
  if (code !== 200) {
    return senseisOutput_({ok: false, error: 'RSS_HTTP_' + code, news: []}, params.callback);
  }

  var news = [];
  try {
    var document = XmlService.parse(response.getContentText());
    var channel = document.getRootElement().getChild('channel');
    var items = channel ? channel.getChildren('item') : [];
    for (var i = 0; i < Math.min(items.length, 50); i++) {
      var item = items[i];
      var title = item.getChildText('title') || '';
      var link = item.getChildText('link') || '';
      var pubDate = item.getChildText('pubDate') || '';
      var description = item.getChildText('description') || '';
      var sourceElement = item.getChild('source');
      var source = sourceElement ? sourceElement.getText() : 'Google News';
      var summary = senseisStripHtml_(description).slice(0, 320);
      if (title && link) {
        news.push({
          title: title,
          url: link,
          publishedAt: pubDate,
          source: source,
          summary: summary
        });
      }
    }
  } catch (error) {
    return senseisOutput_({ok: false, error: 'RSS_PARSE_FAILED', detail: String(error), news: []}, params.callback);
  }

  var payload = {
    ok: true,
    symbol: symbol,
    companyName: name,
    source: 'Google News RSS via Apps Script',
    fetchedAt: new Date().toISOString(),
    news: news
  };
  cache.put(cacheKey, JSON.stringify(payload), 900);
  return senseisOutput_(payload, params.callback);
}

function senseisStripHtml_(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function senseisOutput_(payload, callback) {
  var json = JSON.stringify(payload);
  var cb = String(callback || '');
  if (/^[A-Za-z_$][0-9A-Za-z_$.]*$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
