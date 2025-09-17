# Changelog

## [2025-09-17]

### Fixed

- Updated `fetch_data.js` to use the `excludeKeywords` list from `config.js` for filtering articles. This ensures that all defined keywords are used for exclusion, fixing a bug where some articles were not being filtered correctly.
