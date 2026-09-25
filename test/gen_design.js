// Builds docs/design.html from docs/design_src.html: mapping chapter, screenshot and unit test results
const fs = require('fs'), path = require('path');
require('./gen_mapping.js');
const d = p => path.join(__dirname, p);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const res = JSON.parse(fs.readFileSync(d('unit_test_results.json'), 'utf8'));
const passed = res.filter(r => r.pass).length;
const tests = '<table><tr><th>Test</th><th>Result</th><th>Detail</th></tr>' +
  res.map(r => `<tr><td>${esc(r.name)}</td><td class="${r.pass ? 'pass' : 'fail'}">${r.pass ? 'pass' : 'fail'}</td><td>${esc(r.info)}</td></tr>`).join('') +
  `</table><p>Result ${new Date().toISOString().substring(0, 10)}: <b>${passed}/${res.length} passed</b>.</p>`;
const shot = `<img alt="Tool after a test run" src="data:image/png;base64,${fs.readFileSync(d('screenshot.png')).toString('base64')}">`;
const out = fs.readFileSync(d('../docs/design_src.html'), 'utf8')
  .replace('__MAPPING__', () => fs.readFileSync(d('mapping.html'), 'utf8'))
  .replace('__SCREENSHOT__', () => shot).replace('__TESTS__', () => tests);
fs.writeFileSync(d('../docs/design.html'), out);
console.log('design.html', out.length, 'bytes;', `${passed}/${res.length}`);
