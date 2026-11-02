# Payphone log explorer

Standalone, dependency-free dashboard for `Logs/SessionLog_*.csv`. Open `index.html` directly to use it offline, or publish this folder on GitHub Pages. No build tools, server, CDN, or external fonts are required.

## GitHub Pages

1. Commit and push these changes to `main`.
2. In repository **Settings → Pages → Build and deployment**, select **GitHub Actions**.
3. Run **Publish log dashboard** in the Actions tab (or push a dashboard/log change).
4. Visit **https://kent12t.github.io/ncos-payphone-v1.1/** after deployment completes.

The workflow publishes only `docs/`, not the Unity application. It refreshes bundled data from `Logs/*.csv` on each deployment. **Bundled logs are downloadable by anyone who can access the published site**; do not publish sensitive logs. For a local-only dataset, use Import CSV logs; imported files are processed in memory and never uploaded or persisted.

## Refresh offline data

Run `python scripts/build-dashboard.py` from the repository root after changing logs. Keep `docs/data.js` with the HTML, CSS, and JavaScript for offline use.

## Data interpretation

- Expected header: `StartTime,EndTime,Videos Started`. Each remaining column is a video start; repeats count individually. Quoted CSV fields and UTF-8 BOMs are supported.
- Dates filter session **start** dates, inclusive. Times use the log's clock with no timezone conversion; duration is end minus start, not time watched.
- Topic/language filters must match the same video start. Metrics and charts then include **all** starts in those matching sessions.
- Invalid dates, end-before-start rows, and unsupported files are reported and skipped. Header-only files are valid. Zero-second sessions are retained.
- Import replaces the current dataset; select multiple files to combine them. Rows are not deduplicated: separate files may represent distinct devices, and the logs do not contain device IDs.
- Export includes every matching session, not just the visible page, with source and duration columns. It is an analysis export, not the original import schema.

Run basic checks with `node --test tests/dashboard.test.cjs` from the repository root.
