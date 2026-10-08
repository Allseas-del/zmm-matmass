// Renames the app for the test variant (BSP ZMMMATMASST) before a build, or restores the productive names.
//   node scripts/variant.js apply    -> id com.allseas.zmmmatmasst, intent Material-massUploadTest, title "(test)"
//   node scripts/variant.js restore  -> git checkout of the three files
// The productive BSP ZMMMATMASS keeps its own id and intent, so both apps can live in the same system.
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..');
const files = ['webapp/manifest.json', 'webapp/Component.js', 'webapp/i18n/i18n.properties'];
const mode = process.argv[2];
if (mode === 'apply') {
  for (const f of files) {
    const p = path.join(root, f); let t = fs.readFileSync(p, 'utf8');
    t = t.replace(/com\.allseas\.zmmmatmass\b/g, 'com.allseas.zmmmatmasst').replace(/com\/allseas\/zmmmatmass\//g, 'com/allseas/zmmmatmasst/');
    if (f.endsWith('manifest.json')) t = t.replace('"action": "massUpload"', '"action": "massUploadTest"');
    if (f.endsWith('i18n.properties')) t = t.replace(/^(appTitle\s*=\s*.*)$/m, '$1 (test)');
    fs.writeFileSync(p, t);
  }
  console.log('variant applied: com.allseas.zmmmatmasst / Material-massUploadTest');
} else if (mode === 'restore') {
  cp.execSync('git checkout -- ' + files.join(' '), { cwd: root, stdio: 'inherit' });
  console.log('productive names restored');
} else { console.error('usage: node scripts/variant.js apply|restore'); process.exit(2); }
