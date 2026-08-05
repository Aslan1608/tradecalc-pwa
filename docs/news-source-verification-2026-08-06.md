# News source verification — 2026-08-06

This note records the checks required before the News Pipeline refactor. It separates documented source capabilities from our own engineering choices.

## 1. GDELT DOC 2.0

- Official GDELT material documents JSONP support and a default three-month search window.
- An official 2018 update documents `timespan=1y` support. A later 2018 update describes search coverage extending back to January 2017.
- Therefore `1y` is not treated as syntactically invalid. For the mobile live path we will nevertheless cap escalation at 90 days because shorter queries are faster and sufficient for current-news coverage. This is an engineering latency budget, not a claimed hard API maximum.
- No current official request-per-second recommendation could be located. We will not encode the unverified “one request every five seconds” claim as a source rule. Instead the client uses a conservative sequential cascade and no more than two GDELT requests per symbol load.

Official references:
- https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
- https://blog.gdeltproject.org/doc-geo-2-0-api-updates-full-year-searching-and-more/
- https://blog.gdeltproject.org/doc-2-0-updates-1-5-year-searching-and-updated-mobile-interface/

## 2. Finnhub company news

- Finnhub’s current pricing page lists Company News in the free plan for US coverage, with one year of history and real-time updates.
- The free plan is labelled “Personal Use” and currently lists 60 API calls per minute.
- Integration is allowed only through the Finnhub key already stored by the current app. No additional user key is introduced.
- A future commercial/public product requires a separate licence review; the free personal-use licence must not be assumed to permit redistribution.

Official references:
- https://finnhub.io/pricing
- https://finnhub.io/register

## 3. Google Apps Script quotas

- Current official quota for URL Fetch calls is 20,000 per day for consumer accounts and 100,000 per day for Google Workspace accounts.
- Quotas are per user, reset 24 hours after the first request, and may change without notice.
- Any shared Google News RSS proxy must cache results per ticker. The implementation target is at least 15 minutes.

Official reference:
- https://developers.google.com/apps-script/guides/services/quotas

## 4. Google News RSS search

- The `/rss/search` route is in active use, but Google does not publish it as a stable public search API with a supported schema or SLA.
- Google’s official Publisher Center documentation discusses publisher feeds and the 2025 transition to automatically generated publication pages, but it does not provide a supported contract for third-party reuse of Google News search RSS.
- Therefore it is treated as a best-effort fallback behind our own Apps Script proxy, never as the only source and never as a guaranteed source.

Official context:
- https://support.google.com/news/publisher-center/answer/15898024
- https://support.google.com/news/publisher-center/answer/9607025

## 5. iOS Safari / WebKit storage and service workers

- WebKit documents origin and overall quotas based on available disk space starting in Safari 17, plus best-effort eviction under storage pressure or inactivity.
- Home Screen web apps use the same origin/overall quota class as browser apps, but cache persistence is still not guaranteed.
- The app must tolerate full origin eviction. Offline support is a convenience layer, not durable storage.
- `navigator.storage.estimate()`, `persisted()` and `persist()` should be used where available, and every cache read must tolerate a miss.

Official references:
- https://webkit.org/blog/14403/updates-to-storage-policy/
- https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/

## Decisions resulting from verification

1. Remove the competing 18-second legacy GDELT loader from the active script list.
2. Render source results progressively with a 2.8-second soft display deadline and a 6-second hard cleanup deadline.
3. Use a maximum of two sequential GDELT requests per symbol in the final cascade.
4. Add Finnhub Company News only for US symbols and only when the existing key is present.
5. Keep Google News RSS behind Apps Script and mark it best-effort.
6. Build PWA caching to survive cache eviction instead of assuming persistence.
