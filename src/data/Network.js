import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, URLSearchParams } from 'url';

const SERVICE_URL =
  'https://mdgeodata.md.gov/imap/rest/services/Structure/MD_CampusFacilities/FeatureServer/2/query';
const OUTPUT_FILE = join(dirname(fileURLToPath(import.meta.url)), 'buildings.json');
const MAX_RECORDS = 2000;

async function request(offset) {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: '*',
    returnGeometry: 'true',
    f: 'json',
    resultOffset: String(offset),
    resultRecordCount: String(MAX_RECORDS),
  });

  const url = `${SERVICE_URL}?${params.toString()}`;
  console.log(`Fetching offset ${offset}...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

async function main() {
  let offset = 0;
  const allFeatures = [];
  for (;;) {
    const data = await request(offset);
    const feats = data.features ?? [];
    allFeatures.push(...feats);
    const exceeded = data.exceededTransferLimit === true;
    if (!exceeded || feats.length === 0) {
      break;
    }
    offset += feats.length;
  }

  const out = {
    type: 'FeatureCollection',
    features: allFeatures,
  };
  writeFileSync(OUTPUT_FILE, JSON.stringify(out, null, 2));
  console.log(`Wrote ${allFeatures.length} features to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
