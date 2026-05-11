import { readFileSync, writeFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const versionFile = new URL('../src/version.ts', import.meta.url);
const content = `export const sdkVersion = '${packageJson.version}';\n`;

writeFileSync(versionFile, content);
