import { rm } from 'node:fs/promises';
for (const dir of ['.build', 'dist']) await rm(new URL(`../${dir}`, import.meta.url), { recursive: true, force: true });
