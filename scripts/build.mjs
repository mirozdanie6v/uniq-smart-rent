import { execFileSync } from 'node:child_process';
import { cp, mkdir, rm, copyFile, readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await rm(path.join(root, 'dist'), { recursive: true, force: true });
await rm(path.join(root, '.build'), { recursive: true, force: true });
execFileSync('tsc', ['-p', path.join(root, 'tsconfig.json')], { cwd: root, stdio: 'inherit' });
await mkdir(path.join(root, 'dist/assets'), { recursive: true });
await copyFile(path.join(root, 'index.html'), path.join(root, 'dist/index.html'));
await copyFile(path.join(root, 'styles.css'), path.join(root, 'dist/styles.css'));
await cp(path.join(root, '.build'), path.join(root, 'dist/assets/modules'), { recursive: true });
try {
  await access(path.join(root, 'public'));
  await cp(path.join(root, 'public'), path.join(root, 'dist'), { recursive: true });
} catch {}
const order = ['domain/catalog.js','domain/booking.js','domain/i18n.js','ui/icons.js','app.js'];
let bundle = '"use strict";\n';
for (const rel of order) {
  let code = await readFile(path.join(root,'.build',rel),'utf8');
  code = code.replace(/^import .*;\s*$/gm,'').replace(/\bexport\s+/g,'');
  bundle += `\n/* ${rel} */\n${code}\n`;
}
await writeFile(path.join(root,'dist/assets/app.bundle.js'),bundle,'utf8');
console.log('Built dist/ with modular sources + browser bundle');
