import { writeFileSync } from 'fs';
import { URLSearchParams } from 'url';

const URL = 'https://mdgeodata.md.gov/imap/rest/services/Structure/MD_CampusFacilities/FeatureServer/2/query';
const OUTPUT_FILE = 'buildings.json';

async function request(offset) {
    const params = new URLSearchParams({
        where: '1=1',
        outFields: '*',
        returnGeometry: 'true',
        f: 'json',
        resultOffet: 'true',
        resultRecordCount: MAX_RECORDS
    });

    const url = `${SERVICE_URL}?${params.toString()}`;
    console.log(`Fetching offset ${offset}...`);

    const response = await fetch(url);
    if (!response.ok)
        


}