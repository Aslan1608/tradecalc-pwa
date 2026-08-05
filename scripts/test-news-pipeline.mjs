import fs from 'node:fs';

const TESTS = [
  ['AAPL', 'Apple'], ['MSFT', 'Microsoft'], ['NVDA', 'Nvidia'], ['AMZN', 'Amazon'],
  ['GOOGL', 'Alphabet'], ['META', 'Meta Platforms'], ['TSLA', 'Tesla'], ['AMD', 'Advanced Micro Devices'],
  ['JPM', 'JPMorgan Chase'], ['XOM', 'Exxon Mobil'],
  ['SAP', 'SAP'], ['SIE', 'Siemens'], ['ENR', 'Siemens Energy'], ['DTE', 'Deutsche Telekom'],
  ['RHM', 'Rheinmetall'], ['ALV', 'Allianz'], ['BAYN', 'Bayer'], ['MBG', 'Mercedes-Benz'],
  ['BMW', 'BMW'], ['DBK', 'Deutsche Bank']
];

const AMBIGUOUS = new Set(['A','C','F','K','O','T','IT','ON','ALL','ARE','NOW','KEY','LOW','CAT','GPS','DE','DOW','AIR']);
const ALIASES = {
  GOOGL: ['Alphabet', 'Google'], META: ['Meta Platforms', 'Facebook'], AMD: ['Advanced Micro Devices'],
  DTE: ['Deutsche Telekom'], RHM: ['Rheinmetall'], MBG: ['Mercedes-Benz', 'Mercedes Benz'],
  BAYN: ['Bayer'], DBK: ['Deutsche Bank'], ENR: ['Siemens Energy'], SIE: ['Siemens']
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = v => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
const cleanCompany = value => String(value || '')
  .replace(/\b(class\s+[a-c]|ordinary shares?|common stock|registered shares?|adr|ads)\b/ig, ' ')
  .replace(/\b(incorporated|corporation|corp\.?|company|co\.?|plc|ltd\.?|limited|ag|se|s\.?a\.?|n\.?v\.?|group|holding|holdings)\b/ig, ' ')
  .replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim();

function info(ticker, name) {
  const cleaned = cleanCompany(name) || name;
  const names = [...new Set([cleaned, name, ...(ALIASES[ticker] || [])].map(cleanCompany).filter(Boolean))];
  return { ticker, name, queryName: cleaned, names };
}
function exactQuery(i) {
  const name = i.queryName || i.ticker;
  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length === 1 && name.length < 5) return `("${name}" AND ("${i.ticker} stock" OR "${i.ticker} shares"))`;
  return `"${name}"`;
}
function fallbackQuery(i) {
  const names = [i.queryName, ...i.names].map(cleanCompany).filter(Boolean).filter((x,n,a)=>a.indexOf(x)===n).slice(0,4).map(x=>`"${x}"`);
  if (!AMBIGUOUS.has(i.ticker) && i.ticker.length > 1) names.push(`"${i.ticker} stock"`, `"${i.ticker} shares"`, `"${i.ticker} earnings"`);
  return `(${names.join(' OR ')})`;
}
function relevant(article, i) {
  const title = norm(article.title);
  if (i.names.some(name => title.includes(norm(name)))) return true;
  const tokens = i.names.flatMap(name => norm(name).replace(/[^a-z0-9äöüß]+/g, ' ').split(' ')).filter(t => t.length >= 4 && !/^(group|holding|company|corp|class|stock|shares)$/.test(t));
  if (tokens.some(t => title.includes(t))) return true;
  return !AMBIGUOUS.has(i.ticker) && new RegExp(`(^|[^a-z0-9])${i.ticker.replace(/[^A-Z0-9]/g,'')}([^a-z0-9]|$)`, 'i').test(article.title);
}
async function query(query, timespan) {
  const params = new URLSearchParams({query, mode:'artlist', format:'json', maxrecords:'100', timespan, sort:'datedesc'});
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${params}`, {signal: controller.signal, headers:{'User-Agent':'SenSeiS-Terminal-CI/1.0'}});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return Array.isArray(data.articles) ? data.articles : [];
  } finally { clearTimeout(timeout); }
}

const report = [];
for (const [ticker, name] of TESTS) {
  const i = info(ticker, name);
  let requests = 0;
  let rows = [];
  let error = '';
  try {
    requests++;
    rows.push(...await query(exactQuery(i), '30d'));
    let accepted = rows.filter(row => relevant(row, i));
    if (accepted.length < 5) {
      await sleep(600);
      requests++;
      rows.push(...await query(fallbackQuery(i), '90d'));
      const seen = new Set();
      accepted = rows.filter(row => relevant(row, i)).filter(row => {
        const key = norm(row.title).replace(/[^a-z0-9äöüß]+/g, ' ');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    report.push({ticker, name, requests, count: accepted.length, pass: accepted.length >= 5});
  } catch (e) {
    error = String(e?.message || e);
    report.push({ticker, name, requests, count: 0, pass: false, error});
  }
  console.log(`${ticker.padEnd(5)} ${report.at(-1).count.toString().padStart(3)} news · ${requests} request(s)${error ? ' · '+error : ''}`);
  await sleep(900);
}

const passed = report.filter(x => x.pass).length;
const summary = {tested: report.length, passed, failed: report.length - passed, criterion:'at least 18 of 20 tickers return at least 5 relevant headlines', report};
fs.mkdirSync('test-results', {recursive:true});
fs.writeFileSync('test-results/news-source-coverage.json', JSON.stringify(summary, null, 2));
console.log(`\ncoverage: ${passed}/${report.length}`);
if (passed < 18) process.exitCode = 1;
