# Unit test

- `mock.js` – test double of API_PRODUCT_2 (OData V4) on port 8099: `node mock.js`
- `gen_testfile.py` – inserts 3 test materials into the original SAP template → `test_products.xml`
- `unit_test.js` – drives `webapp/tool.html` end-to-end with Playwright/Chromium against the mock: `node unit_test.js`
- `gen_mapping.js` – generates the mapping chapter of `docs/design.html` from the TREE table in the tool
- `unit_test_results.json`, `screenshot.png` – evidence of the last run
