import json
from pathlib import Path

data = json.load(open(Path(__file__).parent.parent / 'data' / 'buildings_gis.json'))
ids = [
    "B432","B226","B147","B035","B163","B091","B039","B429","B115","B406",
    "B082","B225","B386","B360","B068","B046","B077","B034","B144","B048",
    "B042","B415","B255","B407","B083","B073","B038","B141","B080","B004",
    "B232","B417","B386","B296","B413",
]
lookup = {b["acronym"]: b for b in data}
for bid in ids:
    b = lookup.get(bid)
    if b:
        print(bid, b["latitude"], b["longitude"], "|", b["full_name"])
