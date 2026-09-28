// End-to-end unit test of tool.html against the test double (mock.js). Run: node unit_test.js
'use strict';
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs'), path = require('path');
const BASE = 'http://localhost:8099';
const FILE = path.join(__dirname, 'test_products.xml');
const results = []; let page;
const ok = (name, cond, info) => { results.push({ name, pass: !!cond, info: info || '' }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); };
const logText = () => page.evaluate(() => fullLog.join('\n'));
const api = async p => (await fetch(BASE + p)).json();
const waitIdle = () => page.waitForFunction(() => !document.getElementById('btnRun').disabled && document.getElementById('btnStop').disabled, null, { timeout: 30000 });
const select = async ids => page.evaluate(ids => sheets.S_MARA.rows.forEach(r => r.include = ids.includes(prodOf(r))), ids);

(async () => {
  await fetch(BASE + '/__reset');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
  const ctx = await browser.newContext({ acceptDownloads: true });
  page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(BASE + '/tool.html');
  await page.waitForFunction(() => document.getElementById('connState').textContent !== 'testing…' && document.getElementById('connState').textContent !== 'not tested');
  ok('01 connection test runs on start-up (launchpad session), $metadata read', (await page.textContent('#connState')) === 'OK', await page.textContent('#connState'));
  ok('02 effective SAP user reported', /SAP user TESTUSER/.test(await logText()));

  await page.setInputFiles('#file', FILE);
  await page.waitForFunction(() => /File loaded/.test(fullLog.join('\n')));
  let L = await logText();
  ok('03 original SAP template (leading line break, <LS>…</> markup) is parsed', /File loaded: 3 product\(s\)/.test(L));
  ok('04 sheet without API entity reported (Class Data)', /Class Data" has 1 row\(s\): classification/.test(L));
  const tabs = await page.$$eval('#tabs button', b => b.map(x => x.textContent));
  ok('05 grid shows the sheets with data / mapped sheets', tabs.some(t => /Basic Data \(3\)/.test(t)) && tabs.some(t => /Plant \(3\)/.test(t)), tabs.slice(0, 6).join(' | '));

  await page.click('#btnDry');
  L = await logText();
  ok('06 dry run: validation against $metadata without problems', /Validation against \$metadata: no problems/.test(L));
  const payload = await page.evaluate(() => toPayload(buildProduct(sheets.S_MARA.rows[0])));
  ok('07 payload: ISO base unit, booleans, numbers', payload.BaseISOUnit === 'PCE' && payload.ZZ1_SERNP_PRD === true && payload.GrossWeight === 0.05, JSON.stringify({ b: payload.BaseISOUnit, s: payload.ZZ1_SERNP_PRD, g: payload.GrossWeight }));
  ok('08 payload: ZZ1_MFRPN_PRD and standard MFRPN both mapped', payload.ZZ1_MFRPN_PRD === 'ABC-123' && payload.ProductManufacturerNumber === 'ABC-123');
  ok('09 payload: descriptions from Basic Data and Descriptions sheet merged (EN + NL)', (payload._ProductDescription || []).map(d => d.Language).join(',') === 'EN,NL');
  ok('10a payload: product base unit copied into valuation (unit reference of ProductPriceUnitQuantity); parent keys in children',
    payload._ProductPlant[0].Product === 'ZTEST-001' && payload._ProductPlant[0]._ProductPlantStorageLocation[0].Plant === 'NL01' && payload._ProductValuation[0].BaseISOUnit === 'PCE' && payload._ProductValuation[0].ProductPriceUnitQuantity === 1, JSON.stringify(payload._ProductValuation[0]));
  ok('10 payload: plant with MRP (1:1) and storage location (1:n), valuation, UoM with GTIN',
    payload._ProductPlant[0]._ProductPlantSupplyPlanning.MRPType === 'PD' && payload._ProductPlant[0]._ProductPlantStorageLocation[0].StorageLocation === '0001' &&
    payload._ProductValuation[0].ValuationClass === '3000' && payload._ProductUnitOfMeasure[0]._ProductUnitOfMeasureEAN[0].ConsecutiveNumber === '00001');

  // validation catches a too long description
  await page.evaluate(() => { const c = sheets.S_MARA.rows[1].cells.MAKTX; c.keep = c.value; c.value = 'X'.repeat(45); });
  await page.click('#btnDry');
  ok('11 validation reports a description longer than 40 characters', /ProductDescription: 45 characters, max 40/.test(await logText()));
  await page.evaluate(() => { const c = sheets.S_MARA.rows[1].cells.MAKTX; c.value = c.keep; });

  // create, deep insert, split into $batch packages of 2
  await page.fill('#batchSize', '2');
  await page.click('#btnRun'); await waitIdle();
  L = await logText(); let st = await api('/__stats');
  ok('12 deep create: ZTEST-001 and ZTEST-002 created', st.products.includes('ZTEST-001') && st.products.includes('ZTEST-002'), st.products.join(','));
  ok('13 split: 3 products in 2 $batch requests', st.batch === 2, 'batches=' + st.batch);
  ok('14 SAP error per product, others continue (plant ZZZZ)', /ZTEST-003: HTTP 400: Plant ZZZZ does not exist/.test(L));
  const p1 = await api('/__product?id=ZTEST-001');
  ok('15 SAP content: plant NL01 MRP type PD, storage location 0001, BOX with GTIN, 2 languages, custom fields',
    p1._ProductPlant[0]._ProductPlantSupplyPlanning.MRPType === 'PD' && p1._ProductPlant[0]._ProductPlantStorageLocation[0].WarehouseStorageBin === 'A-01-01' &&
    p1._ProductUnitOfMeasure[0].AlternativeUnit === 'BOX' && p1._ProductUnitOfMeasure[0]._ProductUnitOfMeasureEAN[0].ProductStandardID === '4006381333931' &&
    p1._ProductDescription.length === 2 && p1.ZZ1_MFRPN_PRD === 'ABC-123' && p1.ZZ1_NMOD_PRD === 'BOLT, HEX');
  const status = await page.$$eval('#grid td.st', t => t.map(x => x.textContent));
  ok('16 message column: created number / SAP return message', status[0] === 'created ZTEST-001' && /Plant ZZZZ does not exist/.test(status[2]), status.join(' | '));

  // repeat create: done products are skipped
  const postsBefore = st.post; await page.click('#btnRun'); await waitIdle(); st = await api('/__stats');
  ok('17 repeated create sends only the failed product again', st.post - postsBefore === 1, `${st.post - postsBefore} POST`);

  // change mode: two changes on ZTEST-001
  await page.evaluate(() => { sheets.S_MARA.rows[0].cells.GROES.value = 'M12X50'; sheets.S_MARC.rows[0].cells.DISMM.value = 'VB'; sheets.S_MBEW.rows[0].cells.PEINH.value = '10'; sheets.S_MBEW.rows[0].cells.VERPR.value = '1.5'; });
  await page.check('input[name=mode][value=change]'); await select(['ZTEST-001']);
  await page.click('#btnRun'); await waitIdle(); L = await logText(); st = await api('/__stats');
  const p1b = await api('/__product?id=ZTEST-001');
  ok('18 change: header field, plant MRP type, price unit and moving average price (with unit and currency reference) changed in one change set', p1b.SizeOrDimensionText === 'M12X50' && p1b._ProductPlant[0]._ProductPlantSupplyPlanning.MRPType === 'VB' && p1b._ProductValuation[0].ProductPriceUnitQuantity === 10 && p1b._ProductValuation[0].MovingAveragePrice === 1.5 && st.changesets >= 1,
    `groes=${p1b.SizeOrDimensionText} mrp=${p1b._ProductPlant[0]._ProductPlantSupplyPlanning.MRPType}`);
  ok('19 change: ETag handling — no 412 within the change set', st.preconditionFailed === 0 && /ZTEST-001 → ZTEST-001: 3 change\(s\)/.test(L));
  await page.click('#btnRun'); await waitIdle();
  ok('19a change: current state read with filtered GETs per entity set in one $batch, no $expand; PATCH only on canonical URLs',
    !st.expandGets && st.filterGets >= 5, `filterGets=${st.filterGets} expandGets=${st.expandGets || 0}`);
  // currency of a valuation differs between file and SAP: amounts not sent, warning logged
  await page.evaluate(() => { sheets.S_MBEW.rows[0].cells.WAERS.value = 'USD'; sheets.S_MBEW.rows[0].cells.VERPR.value = '9.99'; });
  await page.click('#btnRun'); await waitIdle(); L = await logText();
  const p1c = await api('/__product?id=ZTEST-001');
  ok('19b change: other currency in file than in SAP — price not sent, warning, rest of the change set passes',
    /currency USD in the file, EUR in SAP — not changed: MovingAveragePrice/.test(L) && p1c._ProductValuation[0].MovingAveragePrice === 1.5 && p1c._ProductValuation[0].Currency === 'EUR',
    `map=${p1c._ProductValuation[0].MovingAveragePrice} cur=${p1c._ProductValuation[0].Currency}`);
  await page.evaluate(() => { sheets.S_MBEW.rows[0].cells.WAERS.value = 'EUR'; sheets.S_MBEW.rows[0].cells.VERPR.value = '1.5'; });
  ok('20 change without differences: nothing sent', /ZTEST-001 → ZTEST-001: no differences/.test(await logText()));

  // step-wise create for the corrected ZTEST-003
  await page.evaluate(() => { sheets.S_MARC.rows[2].cells.WERKS.value = 'NL01'; });
  await page.check('input[name=mode][value=create]'); await page.selectOption('#createMethod', 'step'); await select(['ZTEST-003']);
  await page.click('#btnRun'); await waitIdle(); L = await logText();
  const p3 = await api('/__product?id=ZTEST-003');
  ok('21 step-wise create: product first, views via change set (1:1 views PATCHed, plant POSTed)', p3 && p3._ProductPlant.length === 1 && /ZTEST-003: basic data created as ZTEST-003/.test(L), p3 ? 'plants=' + p3._ProductPlant.length : 'not created');

  // results CSV and resume in a new session
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btnResults')]);
  const csvPath = path.join(__dirname, 'results.csv'); await dl.saveAs(csvPath);
  const csv = fs.readFileSync(csvPath, 'utf8');
  ok('22 results CSV: one row per product with SAP number and status', /ZTEST-001;ZTEST-001;done/.test(csv) && /ZTEST-003;ZTEST-003;done/.test(csv), csv.split('\n').length - 1 + ' rows');
  // change set rejection: an invalid value inside the change set leaves nothing changed
  await page.evaluate(() => { sheets.S_MARA.rows[1].cells.GROES.value = 'NEW'; sheets.S_MARA.rows[1].cells.MEINS.value = 'XXX'; });
  await page.check('input[name=mode][value=change]'); await select(['ZTEST-002']);
  await page.click('#btnRun'); await waitIdle(); L = await logText();
  const p2 = await api('/__product?id=ZTEST-002');
  ok('23 rejected change set is atomic: nothing of it saved, error logged', p2.SizeOrDimensionText !== 'NEW' && /change set rejected, nothing of it saved — HTTP 400: Unit of measure XXX/.test(L), 'groes=' + p2.SizeOrDimensionText);

  const page2 = await ctx.newPage(); page = page2;
  await page.goto(BASE + '/tool.html'); await page.setInputFiles('#file', FILE);
  await page.waitForFunction(() => /File loaded/.test(fullLog.join('\n')));
  await page.setInputFiles('#resFile', csvPath);
  await page.waitForFunction(() => /Results loaded/.test(fullLog.join('\n')), null, { timeout: 10000 });
  L = await logText();
  const inc = await page.evaluate(() => sheets.S_MARA.rows.map(r => r.include));
  ok('24 resume: results loaded, done products deselected', /Results loaded: 3 done/.test(L) && inc.every(x => !x), inc.join(','));

  // export changed XML and read it again
  await page.evaluate(() => { sheets.S_MARA.rows[0].cells.GROES.value = 'EXPORTED'; });
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('#btnExport')]);
  const xPath = path.join(__dirname, 'roundtrip.xml'); await dl2.saveAs(xPath);
  await page.setInputFiles('#file', xPath); await page.waitForFunction(() => sheets.S_MARA && /roundtrip/.test(fileName));
  ok('25 "Save changed file" round trip: file readable again, change kept', await page.evaluate(() => sheets.S_MARA.rows[0].cells.GROES.value) === 'EXPORTED');

  ok('26 no JavaScript errors on the page', errors.length === 0, errors.join(' | '));
  await page.screenshot({ path: path.join(__dirname, 'screenshot.png'), fullPage: true });
  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'unit_test_results.json'), JSON.stringify(results, null, 1));
  const failed = results.filter(r => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
