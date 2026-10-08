# zmm-matmass – Material master mass upload (Allseas DS4)

Loads the SAP Migration Cockpit (LTMC) product template (XML Spreadsheet 2003) into S/4HANA through the released OData V4 Product API.
Same engine as the STIHL task list upload (parser, $metadata validation, $batch with continue-on-error, parallel workers, results CSV and resume),
hosted as BSP `ZMMMATMASS` in the Fiori launchpad instead of the console loader.

- Package `ZMM_MATMASS`, transport `DS4K915674`, build in DS4/400, test in DS4/410
- Design: `docs/design.html`
- Deploy: `npm install` then `npm run deploy` (or `deploy.cmd`; logon from `.env`: `FIORI_TOOLS_USER` / `FIORI_TOOLS_PASSWORD`)
- Test variant next to the productive app: `deploy-test.cmd` deploys BSP `ZMMMATMASST` (app id `com.allseas.zmmmatmasst`,
  intent `Material-massUploadTest`, built with `ui5-test.yaml` / `ui5-deploy-test.yaml` after `scripts/variant.js apply`);
  direct URL `/sap/bc/ui5_ui5/sap/zmmmatmasst/tool.html?sap-client=410`. Both variants share the browser storage
  (last run, unit translation) because they run on the same origin.
- Commodity code (MARC-STAWN): not in the Product API; column `STAWN` on Plant Data is written as trade classification
  (/SAPSLL/MARITC) through the RAP service `ZMM_MATMASS_STAWN_O2` (sources and ADT steps in `abap/`), read with V2
  `A_ProductPlant-Commodity`.
- The test variant BSP `ZMMMATMASST` is in package `ZMM_MATMASS` / transport `DS4K915674` as well: remove it from the
  transport (or delete the BSP) before the transport goes to production.
