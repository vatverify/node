import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_API_URL = 'https://vatverify-api-production.up.railway.app';

async function main() {
  const baseUrl = process.env.VATVERIFY_API_URL ?? DEFAULT_API_URL;
  const url = `${baseUrl.replace(/\/$/, '')}/openapi.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  const spec = await res.json();
  const out = resolve('openapi.json');
  writeFileSync(out, JSON.stringify(spec, null, 2) + '\n');
  console.log(`sync-openapi: wrote ${out} from ${url}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
