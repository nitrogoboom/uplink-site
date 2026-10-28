"""Deploy the site live.

    python tools/deploy.py

Steps:
1. build_pages.py --check and stamp.py --check, so site/ matches src/ and every ?v= stamp is current.
2. wrangler pages deploy to "main", the live address.

PageSpeed is a separate tool, not part of the deploy: python tools/pagespeed.py <address>.
"""
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV = dict(os.environ, WRANGLER_SEND_METRICS='false', CI='1')
WIN = sys.platform == 'win32'


def step(args, capture=False):
    print('>', ' '.join(args), flush=True)
    r = subprocess.run(args, cwd=ROOT, env=ENV, shell=WIN, text=True, encoding='utf-8',
                       stdout=subprocess.PIPE if capture else None, stderr=subprocess.STDOUT if capture else None)
    if capture:
        print(r.stdout)
    if r.returncode:
        sys.exit(f'stopped: {args[1] if args[0] == sys.executable else args[0]} failed')
    return r.stdout


def deploy(branch):
    out = step(['npx', 'wrangler', 'pages', 'deploy', '--branch', branch, '--commit-dirty=true'], capture=True)
    urls = re.findall(r'https://[a-z0-9]+\.uplink-site-[a-z0-9]+\.pages\.dev', out)
    if not urls:
        sys.exit('stopped: no deploy address in the wrangler output')
    return urls[-1]


def main():
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')   # wrangler prints emoji; a Windows console can't
    step([sys.executable, 'tools/build_pages.py', '--check'])
    step([sys.executable, 'tools/stamp.py', 'site', '--check'])
    live = deploy('main')
    print(f'live: {live} (and the main address)')


if __name__ == '__main__':
    main()
