const SHEET_ID = '1W-Nfv54mLy8Dmgaf3kGoYWqRR_J8VUUxYsiAIqYwlpM';
const SHEET_NAME = 'Quotes';
const FINNHUB_PROPERTY = 'FINNHUB_API_KEY';
const DAX_TICKERS = new Set([
  'ADS','AIR','ALV','BAS','BAYN','BEI','BMW','BNR','CBK','CON',
  'DTG','DBK','DB1','DHL','DTE','EOAN','FRE','FME','G1A','HNR1',
  'HEI','HEN3','HOT','IFX','MBG','MRK','MTX','MUV2','QIA','RHM',
  'RWE','SAP','G24','SIE','ENR','SHL','SY1','VOW3','VNA','ZAL'
]);

function doGet(e) {
  try {
