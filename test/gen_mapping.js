// Generates the mapping chapter of docs/design.html from the TREE table in tool.html
const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync(__dirname + '/../webapp/tool.html', 'utf8');
const TREE = vm.runInNewContext('(' + html.split('const TREE = ')[1].split('\n];')[0] + '\n])');
const NS = vm.runInNewContext('(' + html.split('const NOT_SUPPORTED = ')[1].split('};')[0] + '})');
const tpl = JSON.parse(fs.readFileSync(__dirname + '/template_fields.json', 'utf8'));
const desc = {}; tpl.forEach(s => (s.fields || []).forEach(([f, t, d]) => desc[s.struct + '.' + f] = (d || '').split('\n')[0].replace(/\*$/, '')));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
let out = '';
const bySheet = {};
TREE.forEach(n => (bySheet[n.sheet] = bySheet[n.sheet] || []).push(n));
for (const [sheet, nodes] of Object.entries(bySheet)) {
  const s = tpl.find(x => x.struct === sheet);
  out += `<h4>${esc(s ? s.sheet : sheet)} (<code>${sheet}</code>)</h4><table><tr><th>Template field</th><th>Description</th><th>API entity / navigation</th><th>API property</th></tr>`;
  const mapped = new Set();
  for (const n of nodes) for (const [f, p] of Object.entries(Object.assign({}, n.fields, n.carry || {}))) {
    mapped.add(f);
    out += `<tr><td><code>${f}</code></td><td>${esc(desc[sheet + '.' + f] || '')}</td><td>${n.id === 'Product' ? 'Product' : esc(n.nav)}</td><td>${esc(p)}</td></tr>`;
  }
  out += '</table>';
  const un = (s ? s.fields : []).map(x => x[0]).filter(f => !mapped.has(f));
  if (un.length) out += `<p class="muted">Not in the API (not sent): ${un.map(f => `<code>${f}</code>`).join(' ')}</p>`;
}
out += '<h4>Sheets without API entity</h4><table><tr><th>Structure</th><th>Content</th></tr>' + Object.entries(NS).map(([k, v]) => `<tr><td><code>${k}</code></td><td>${esc(v)}</td></tr>`).join('') + '</table>';
fs.writeFileSync(__dirname + '/mapping.html', out);
console.log('mapping rows', (out.match(/<tr>/g) || []).length);
