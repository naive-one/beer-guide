"""Read public Untappd product headers; save numerical evidence, never reviews.
Usage: python3 collect-evidence.py candidates.json
Input: [{"beerId": "...", "url": "https://untappd.com/b/..."}]
Only public, unauthenticated HTML is requested. No API, cookies, or login bypass.
"""
import concurrent.futures
import datetime
import hashlib
import html
import json
import pathlib
import re
import sys
import subprocess
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent

def text(fragment):
    return html.unescape(re.sub(r'<[^>]+>', ' ', fragment)).strip()

def extract(body, pattern, required=True):
    m = re.search(pattern, body, re.S)
    if not m:
        if required:
            raise ValueError('Missing public header field: ' + pattern)
        return None
    return ' '.join(text(m.group(1)).split())

def collect(candidate):
    url = candidate['url']
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != 'https' or parsed.hostname not in ('untappd.com', 'www.untappd.com') or not parsed.path.startswith('/b/'):
        raise ValueError('Only public Untappd beer pages are accepted')
    result = {'beerId': candidate['beerId'], 'requestedUrl': url,
              'checkedAt': datetime.datetime.now().astimezone().date().isoformat()}
    try:
        response = subprocess.run(['curl', '--fail', '--silent', '--show-error',
                                   '--location', '--max-time', '35', url,
                                   '--write-out', '\n%{url_effective}'],
                                  check=True, capture_output=True, text=True)
        body, result['url'] = response.stdout.rsplit('\n', 1)
        # Restrict parsing to the beer header, before individual check-ins.
        start = body.index('<div class="name">')
        end = body.index('<div class="bottom">', start)
        header = body[start:end]
        score = extract(header, r'<span class="num">\(([^<]+)\)</span>')
        count = extract(header, r'<p class="raters">\s*([\d,]+)\s+Ratings?')
        assert score is not None and count is not None
        abv = extract(header, r'<p class="abv">\s*([\d.]+)% ABV', required=False)
        result.update({
            'status': 'read',
            'title': extract(body, r'<title>(.*?)</title>'),
            'beerName': extract(header, r'<h1[^>]*>(.*?)</h1>'),
            'brewery': extract(header, r'<p class="brewery">(.*?)</p>'),
            'style': extract(header, r'<p class="style">(.*?)</p>'),
            'abv': float(abv) if abv is not None else None,
            'platform': 'Untappd', 'scale': 5,
            'value': float(score) if score != 'N/A' else None,
            'count': int(count.replace(',', '')), 'countType': 'ratings',
            'countLabel': 'Ratings',
            'retrieval': 'public-page-header',
            'rawPageSha256': hashlib.sha256(body.encode()).hexdigest(),
        })
    except (ValueError, urllib.error.URLError, TimeoutError, subprocess.CalledProcessError) as error:
        result.update(status='unavailable', error=str(error)[:250])
    key = hashlib.sha256(url.encode()).hexdigest()[:16]
    evidence = ROOT / 'evidence' / (key + '.json')
    evidence.parent.mkdir(exist_ok=True)
    evidence.write_text(json.dumps({k:v for k,v in result.items() if k != 'beerId'}, ensure_ascii=False, indent=2) + '\n')
    result['evidenceFile'] = str(evidence.relative_to(ROOT.parent.parent))
    return result

def main():
    candidates = json.loads(pathlib.Path(sys.argv[1]).read_text())
    unique = list({c['url']: c for c in candidates}.values())
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(collect, unique))
    by_url = {r['requestedUrl']: r for r in results}
    rows = [{**by_url[c['url']], 'beerId': c['beerId']} for c in candidates]
    (ROOT / 'observations.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
    for row in rows:
        print(json.dumps({k: row.get(k) for k in ('beerId', 'status', 'beerName', 'brewery', 'abv', 'value', 'count', 'url', 'error')}, ensure_ascii=False))

if __name__ == '__main__':
    main()
