import { readFile, writeFile } from 'node:fs/promises';
for (const testPath of ['tests/e2e.py','tests/candidate_dist_e2e.py']) {
  let test = await readFile(testPath,'utf8');
  test = test.replaceAll('text=EMPLOYEE','text=СОТРУДНИК');
  test = test.replaceAll('text=OWNER','text=ВЛАДЕЛЕЦ');
  await writeFile(testPath,test,'utf8');
}
console.log('Browser tests aligned with final Russian role labels');
