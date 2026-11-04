"""The pages and screen sizes the verify_*.py checks share.
pages(base): every address in the served sitemap.xml ('/' for home), then /soon and an address that gets the 404 page.
Stops with an error if the sitemap lists fewer than the five static pages, so a broken sitemap can't pass a check
by leaving pages out. SIZES: phone, tablet, 1440 x 900 and 3440 x 1440 (verify_footer.py, verify_spacing.py)."""
import re, sys, urllib.request

MISSING = 'no-such-page'   # any missing address gets the 404 page
# Cloudflare refuses Python's default user agent on a workers.dev address (403), so fetches name themselves
UA = {'User-Agent': 'uplink-site checks'}
SIZES = [('phone', 390, 844), ('tablet', 820, 1180), ('1440', 1440, 900), ('3440', 3440, 1440)]


def pages(base):
    sitemap = urllib.request.urlopen(urllib.request.Request(base + '/sitemap.xml', headers=UA)).read().decode()
    found = [re.sub(r'^https?://[^/]+', '', u) or '/' for u in re.findall(r'<loc>([^<]+)</loc>', sitemap)]
    if len(found) < 5:
        sys.exit(f'sitemap.xml lists {len(found)} page(s): expected at least the five static pages')
    return found + ['/soon', '/' + MISSING]
