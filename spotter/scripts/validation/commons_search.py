"""Search Wikimedia Commons for openly licensed exercise videos and print title, size, duration and licence."""
import json, subprocess, sys, time, urllib.parse

UA = "CadenceTests/0.1 (open-source fitness coach test suite; contact via github.com/Nidhish-Senthilkumar/Pushup_Ai)"

def get(params):
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({**params, "format": "json"})
    # curl, not urllib: python.org builds of Python ship without CA certificates.
    for attempt in range(5):
        try:
            out = subprocess.run(["curl", "-sS", "-A", UA, url], capture_output=True, text=True, timeout=60).stdout
            return json.loads(out)
        except Exception:
            time.sleep(5 * (attempt + 1))
    return {}

for q in sys.argv[1:]:
    d = get({"action": "query", "generator": "search", "gsrsearch": q + " filetype:video", "gsrnamespace": 6, "gsrlimit": 20,
             "prop": "imageinfo", "iiprop": "size|url|extmetadata|mediatype", "iiextmetadatafilter": "LicenseShortName|Artist"})
    print(f"## {q}")
    for p in sorted((d.get("query") or {}).get("pages", {}).values(), key=lambda p: p.get("index", 0)):
        ii = (p.get("imageinfo") or [{}])[0]
        md = ii.get("extmetadata", {})
        print(f"  {p['title']} | {ii.get('width')}x{ii.get('height')} | {round(float(ii.get('duration') or 0))}s | {md.get('LicenseShortName', {}).get('value')} | {ii.get('url')}")
    sys.stdout.flush()
    time.sleep(3)
