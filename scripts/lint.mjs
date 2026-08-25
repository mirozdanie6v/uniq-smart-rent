import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(new URL('..',import.meta.url).pathname);
async function files(dir){const out=[];for(const name of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,name.name);if(name.isDirectory())out.push(...await files(p));else if(/\.(ts|mjs|css|html)$/.test(name.name))out.push(p);}return out;}
const checks=[
  {pattern:/\bdemoVisual\b/,message:'legacy demoVisual must not return'},
  {pattern:/\bpricePerDayVnd\b/,message:'legacy flat-price field must not return'},
  {pattern:/localStorage\.setItem\(['"]uniq-bookings/,message:'business bookings must not persist in localStorage'},
  {pattern:/status\s*:\s*['"]available['"]/,message:'do not claim live vehicle availability without backend'}
];
const problems=[];
for(const file of await files(path.join(root,'src'))){const content=await readFile(file,'utf8');for(const check of checks){if(check.pattern.test(content))problems.push(`${path.relative(root,file)}: ${check.message}`);}}
if(problems.length){console.error(problems.join('\n'));process.exit(1);}console.log('Project lint passed');
