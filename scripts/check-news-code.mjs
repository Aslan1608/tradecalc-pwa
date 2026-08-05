import fs from 'node:fs';
import assert from 'node:assert/strict';

const code = fs.readFileSync('news-intelligence-recall-patch.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

assert.match(code, /const SOFT_TIMEOUT=2800;/);
assert.match(code, /const HARD_TIMEOUT=6000;/);
assert.match(code, /GDELT_ESCALATION_DELAY=600/);
assert.match(code, /gdeltQuery\(exactQuery\(i\),'30d'/);
assert.match(code, /gdeltQuery\(fallbackQuery\(i\),'90d'/);
assert.doesNotMatch(code, /gdeltQuery\([^\n]*'1y'/);
assert.doesNotMatch(code, /gdeltQuery\([^\n]*'180d'/);
assert.match(code, /company-news\?symbol=/);
assert.match(code, /data-show-rejected/);
assert.match(code, /Keine Meldungen zu \$\{i\.name\}/);
assert.match(code, /Quelle antwortet gerade nicht/);
assert.doesNotMatch(index, /<script src="\.\/news-intelligence\.js/);

const cleanCompany = value => String(value || '')
  .replace(/\b(class\s+[a-c]|ordinary shares?|common stock|registered shares?|adr|ads)\b/ig, ' ')
  .replace(/\b(incorporated|corporation|corp\.?|company|co\.?|plc|ltd\.?|limited|ag|se|s\.?a\.?|n\.?v\.?|group|holding|holdings)\b/ig, ' ')
  .replace(/[(),]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

assert.equal(cleanCompany('Siemens Energy AG'), 'Siemens Energy');
assert.equal(cleanCompany('ASML Holding N.V.'), 'ASML');
assert.equal(cleanCompany('Alphabet Inc. Class A'), 'Alphabet');

console.log('static architecture checks: PASS');
