const SHEET_ID = '1W-Nfv54mLy8Dmgaf3kGoYWqRR_J8VUUxYsiAIqYwlpM';
const SHEET_NAME = 'Quotes';
const SEC_USER_AGENT = 'SenSeiS Terminal https://github.com/Aslan1608/tradecalc-pwa';
const DAX_TICKERS = new Set([
  'ADS','AIR','ALV','BAS','BAYN','BEI','BMW','BNR','CBK','CON',
  'DTG','DBK','DB1','DHL','DTE','EOAN','FRE','FME','G1A','HNR1',
  'HEI','HEN3','HOT','IFX','MBG','MRK','MTX','MUV2','QIA','RHM',
  'RWE','SAP','G24','SIE','ENR','SHL','SY1','VOW3','VNA','ZAL'
]);

function doGet(e) {
  const params = (e && e.parameter) || {};
  try {
    const action = String(params.action || 'health').toLowerCase();
    const symbol = cleanSymbol_(params.symbol || '');
    let payload;

    if (action === 'health') {
      payload = {
        ok: true,
        service: 'SenSeiS Market Intelligence Feed',
        symbols: DAX_TICKERS.size,
        fundamentals: true,
        secFinancials: true,
        news: true,
        time: new Date().toISOString()
      };
    } else if (action === 'quote') {
      if (!symbol) throw new Error('SYMBOL_REQUIRED');
      payload = getGermanQuote_(symbol);
    } else if (action === 'fundamentals') {
      if (!symbol) throw new Error('SYMBOL_REQUIRED');
      payload = getGermanFundamentals_(symbol);
    } else if (action === 'us-financials') {
      if (!symbol) throw new Error('SYMBOL_REQUIRED');
      payload = getUsFinancials_(symbol);
    } else if (action === 'news') {
      if (!symbol) throw new Error('SYMBOL_REQUIRED');
      payload = getCompanyNews_(symbol, params.name || '');
    } else if (action === 'market-status') {
      payload = getGermanMarketStatus_();
    } else {
      throw new Error('UNKNOWN_ACTION');
    }

    return output_(payload, params.callback);
  } catch (error) {
    return output_({
      ok: false,
      error: String(error && error.message ? error.message : error),
      time: new Date().toISOString()
    }, params.callback);
  }
}

function getSheetRow_(symbol) {
  if (!DAX_TICKERS.has(symbol)) throw new Error('DAX_SYMBOL_NOT_ALLOWED');
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('QUOTE_SHEET_NOT_FOUND');
  const rowCount = Math.max(1, sheet.getLastRow() - 1);
  const rows = sheet.getRange(2, 1, rowCount, 19).getDisplayValues();
  const row = rows.find(function (item) {
    return String(item[0]).trim().toUpperCase() === symbol;
  });
  if (!row) throw new Error('DAX_SYMBOL_NOT_FOUND');
  return row;
}

function getGermanQuote_(symbol) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'dax:' + symbol;
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const row = getSheetRow_(symbol);
  const price = numberDE_(row[3]);
  const high = numberDE_(row[6]);
  const low = numberDE_(row[7]);
  const changePct = numberDE_(row[8]);
  const previousClose = numberDE_(row[9]);
  const delay = numberDE_(row[5]);
  if (!(price > 0)) throw new Error('DAX_PRICE_NOT_AVAILABLE');

  const payload = {
    ok: true,
    symbol: symbol,
    c: price,
    d: Number.isFinite(previousClose) ? price - previousClose : null,
    dp: finiteOrNull_(changePct),
    h: finiteOrNull_(high),
    l: finiteOrNull_(low),
    o: null,
    pc: finiteOrNull_(previousClose),
    t: Math.floor(Date.now() / 1000),
    tradeTime: row[4] || null,
    delayMinutes: Number.isFinite(delay) ? delay : 15,
    source: symbol === 'QIA' ? 'Google Finance · Frankfurt' : 'Google Finance · Xetra',
    market: 'DE',
    currency: row[18] || 'EUR',
    stale: false
  };

  cache.put(cacheKey, JSON.stringify(payload), 180);
  return payload;
}

function getGermanFundamentals_(symbol) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'fundamentals:' + symbol;
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const row = getSheetRow_(symbol);
  const price = numberDE_(row[3]);
  const high52 = numberDE_(row[14]);
  const low52 = numberDE_(row[15]);
  let rangePosition = null;
  if (Number.isFinite(price) && Number.isFinite(high52) && Number.isFinite(low52) && high52 > low52) {
    rangePosition = Math.max(0, Math.min(100, ((price - low52) / (high52 - low52)) * 100));
  }

  const payload = {
    ok: true,
    symbol: symbol,
    companyName: row[1] || symbol,
    googleSymbol: row[2] || null,
    market: 'DE',
    index: 'DAX',
    country: 'Deutschland',
    price: finiteOrNull_(price),
    marketCap: finiteOrNull_(numberDE_(row[10])),
    pe: finiteOrNull_(numberDE_(row[11])),
    eps: finiteOrNull_(numberDE_(row[12])),
    beta: finiteOrNull_(numberDE_(row[13])),
    high52: finiteOrNull_(high52),
    low52: finiteOrNull_(low52),
    averageVolume: finiteOrNull_(numberDE_(row[16])),
    shares: finiteOrNull_(numberDE_(row[17])),
    currency: row[18] || 'EUR',
    rangePosition: rangePosition,
    delayMinutes: finiteOrDefault_(numberDE_(row[5]), 15),
    source: 'Google Finance',
    updatedAt: new Date().toISOString()
  };

  cache.put(cacheKey, JSON.stringify(payload), 900);
  return payload;
}

function getUsFinancials_(symbol) {
  if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(symbol)) throw new Error('US_SYMBOL_INVALID');
  const cache = CacheService.getScriptCache();
  const cacheKey = 'sec-financials:' + symbol;
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const tickers = fetchJson_('https://www.sec.gov/files/company_tickers.json', true);
  const record = Object.keys(tickers).map(function (key) { return tickers[key]; }).find(function (item) {
    return String(item.ticker || '').toUpperCase() === symbol;
  });
  if (!record) throw new Error('SEC_TICKER_NOT_FOUND');

  const cik = String(record.cik_str).padStart(10, '0');
  const facts = fetchJson_('https://data.sec.gov/api/xbrl/companyfacts/CIK' + cik + '.json', true);
  const gaap = (facts.facts && facts.facts['us-gaap']) || {};

  const revenue = annualSeries_(gaap, [
    'RevenueFromContractWithCustomerExcludingAssessedTax',
    'Revenues',
    'SalesRevenueNet',
    'SalesRevenueGoodsNet'
  ]);
  const operatingIncome = annualSeries_(gaap, ['OperatingIncomeLoss']);
  const netIncome = annualSeries_(gaap, ['NetIncomeLoss', 'ProfitLoss']);
  const depreciation = annualSeries_(gaap, [
    'DepreciationDepletionAndAmortization',
    'DepreciationDepletionAndAmortizationPropertyPlantAndEquipment',
    'Depreciation'
  ]);

  const years = Array.from(new Set(
    revenue.concat(operatingIncome, netIncome, depreciation).map(function (x) { return x.year; })
  )).sort().slice(-5);
  const byYear = function (series, year) {
    const item = series.find(function (x) { return x.year === year; });
    return item ? item.value : null;
  };

  const annual = years.map(function (year) {
    const op = byYear(operatingIncome, year);
    const da = byYear(depreciation, year);
    return {
      year: year,
      revenue: byYear(revenue, year),
      operatingIncome: op,
      depreciationAmortization: da,
      ebitdaApprox: Number.isFinite(op) && Number.isFinite(da) ? op + da : null,
      netIncome: byYear(netIncome, year)
    };
  });

  const payload = {
    ok: true,
    symbol: symbol,
    companyName: facts.entityName || record.title || symbol,
    cik: cik,
    currency: 'USD',
    annual: annual,
    source: 'SEC EDGAR / Company Facts',
    ebitdaNote: 'EBITDA-Näherung = operatives Ergebnis + Abschreibungen, sofern beide SEC-Werte verfügbar sind.',
    updatedAt: new Date().toISOString()
  };
  cache.put(cacheKey, JSON.stringify(payload), 21600);
  return payload;
}

function annualSeries_(taxonomy, candidateTags) {
  for (let i = 0; i < candidateTags.length; i++) {
    const concept = taxonomy[candidateTags[i]];
    if (!concept || !concept.units) continue;
    const units = concept.units.USD || concept.units['USD'];
    if (!Array.isArray(units)) continue;
    const byYear = {};
    units.forEach(function (fact) {
      const form = String(fact.form || '');
      const year = Number(fact.fy);
      const value = Number(fact.val);
      if (!Number.isFinite(year) || !Number.isFinite(value)) return;
      if (form !== '10-K' && form !== '10-K/A') return;
      if (String(fact.fp || '') !== 'FY') return;
      const filed = String(fact.filed || '');
      if (!byYear[year] || filed > byYear[year].filed) byYear[year] = {year: year, value: value, filed: filed};
    });
    const series = Object.keys(byYear).map(function (year) { return byYear[year]; }).sort(function (a, b) { return a.year - b.year; });
    if (series.length) return series;
  }
  return [];
}

function getCompanyNews_(symbol, suppliedName) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'news:' + symbol;
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  let companyName = sanitizeName_(suppliedName);
  if (DAX_TICKERS.has(symbol)) companyName = getSheetRow_(symbol)[1] || symbol;
  if (!companyName) companyName = symbol;

  const query = '"' + companyName + '" Aktie OR Stock when:14d';
  const url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(query) + '&hl=de&gl=DE&ceid=DE:de';
  const response = UrlFetchApp.fetch(url, {muteHttpExceptions: true, followRedirects: true});
  if (response.getResponseCode() >= 400) throw new Error('NEWS_HTTP_' + response.getResponseCode());

  const doc = XmlService.parse(response.getContentText());
  const channel = doc.getRootElement().getChild('channel');
  const items = channel ? channel.getChildren('item') : [];
  const news = items.slice(0, 6).map(function (item) {
    const sourceNode = item.getChild('source');
    return {
      title: childText_(item, 'title'),
      url: childText_(item, 'link'),
      publishedAt: childText_(item, 'pubDate'),
      source: sourceNode ? sourceNode.getText() : ''
    };
  }).filter(function (item) { return item.title && item.url; });

  const payload = {
    ok: true,
    symbol: symbol,
    companyName: companyName,
    news: news,
    source: 'Google News RSS',
    updatedAt: new Date().toISOString()
  };
  cache.put(cacheKey, JSON.stringify(payload), 900);
  return payload;
}

function childText_(node, name) {
  const child = node.getChild(name);
  return child ? child.getText() : '';
}

function sanitizeName_(value) {
  return String(value || '').replace(/[^A-Za-zÀ-ž0-9 .,&'\-]/g, '').trim().slice(0, 100);
}

function fetchJson_(url, secHeaders) {
  const options = {muteHttpExceptions: true, followRedirects: true};
  if (secHeaders) options.headers = {'User-Agent': SEC_USER_AGENT, 'Accept-Encoding': 'gzip, deflate'};
  const response = UrlFetchApp.fetch(url, options);
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) throw new Error('HTTP_' + status);
  return JSON.parse(response.getContentText());
}

function getGermanMarketStatus_() {
  const timezone = 'Europe/Berlin';
  const now = new Date();
  const weekday = Number(Utilities.formatDate(now, timezone, 'u'));
  const hhmm = Number(Utilities.formatDate(now, timezone, 'HHmm'));
  const isOpen = weekday <= 5 && hhmm >= 900 && hhmm <= 1730;
  return {
    ok: true,
    isOpen: isOpen,
    session: isOpen ? 'regular' : null,
    holiday: null,
    market: 'DE',
    timezone: timezone,
    checkedAt: now.toISOString()
  };
}

function cleanSymbol_(value) {
  const symbol = String(value || '').trim().toUpperCase();
  return /^[A-Z0-9.\-]{1,15}$/.test(symbol) ? symbol : '';
}

function numberDE_(value) {
  const text = String(value == null ? '' : value).trim();
  if (!text || text === '#N/A' || text === '—') return NaN;
  const normalized = text.indexOf(',') >= 0
    ? text.replace(/\./g, '').replace(',', '.')
    : text;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : NaN;
}

function finiteOrNull_(value) {
  return Number.isFinite(value) ? value : null;
}

function finiteOrDefault_(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function output_(data, callback) {
  const json = JSON.stringify(data);
  const callbackName = String(callback || '');
  const safeCallback = /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(callbackName) ? callbackName : '';
  return ContentService
    .createTextOutput(safeCallback ? safeCallback + '(' + json + ');' : json)
    .setMimeType(safeCallback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}