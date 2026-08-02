function authorizeExternalData() {
  const checks = [];

  const secResponse = UrlFetchApp.fetch(
    'https://www.sec.gov/files/company_tickers.json',
    {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'SenSeiS Terminal https://github.com/Aslan1608/tradecalc-pwa',
        'Accept-Encoding': 'gzip, deflate'
      }
    }
  );
  checks.push('SEC: HTTP ' + secResponse.getResponseCode());

  const newsResponse = UrlFetchApp.fetch(
    'https://news.google.com/rss/search?q=Amazon%20Stock%20when%3A14d&hl=de&gl=DE&ceid=DE%3Ade',
    {muteHttpExceptions: true, followRedirects: true}
  );
  checks.push('News: HTTP ' + newsResponse.getResponseCode());

  const result = checks.join(' | ');
  Logger.log(result);
  return result;
}
