# SenSeiS Final Static Workspace

Build: Foundation 2.8

## TradingView

The market workspace is constructed before the calculator document is rendered. The Live Reference card, splitter and TradingView card therefore exist independently from TradingView network speed. A delayed or failed widget request can only affect the chart mount; it cannot restore the legacy layout.

Active files:
- `calculator-events.html`
- `tradingview-workspace-static.js`

Legacy dynamic files are retained only for rollback and are no longer loaded:
- `tradingview-chart-left.js`
- `workspace-stability-fix.js`

## Financial history

`stock-financials-recovery.js` validates the Apps Script SEC response and rejects error payloads or empty series. It then attempts Finnhub Financials as Reported. Errors are displayed explicitly instead of being converted to a generic no-data state.
