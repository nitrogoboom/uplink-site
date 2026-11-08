"""Run every drawing generator, then (with --check) every drawing check.

    python tools/regen.py            # rewrite the 33 SVGs from their gen_*.py, then their 16 light copies (gen_light.py)
    python tools/regen.py --check    # then check.py and painter.py, as each rules_NAME.py lists them
    python tools/regen.py --checks-only

Run it from the project root. Generators that run with nothing changed write the same bytes, so on a clean tree
`git diff --exit-code public/assets/img src/components/home` afterwards lists any drawing that no longer matches its
script. CI's drawings job does exactly that (.github/workflows/site.yml).
gen_og.py is left out: it screenshots a page through Chromium and Google Fonts, so its PNGs depend on the machine.
"""
import concurrent.futures
import os
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TOOLS = ROOT / 'tools'
SCENES = ['backup', 'cloud', 'helpdesk', 'hq', 'network', 'security', 'strategy', 'voip']
GENERATORS = ([[f'tools/gen_{s}.py', f'public/assets/img/{s}.svg'] for s in SCENES]
              + [['tools/gen_office.py', 'public'], ['tools/gen_grow.py'], ['tools/gen_campus.py'],
                 ['tools/gen_light.py']])   # last: the light copies are made from the SVGs above


def commands():
    """The checks the rules files name: their docstring lines that start usage:, check: or also:."""
    for rules in sorted(TOOLS.glob('rules_*.py')):
        for line in rules.read_text(encoding='utf-8').split('"""')[1].splitlines():
            m = re.match(r'\s*(?:usage|check|also):\s*python (tools/\S+\.py .*?)(?:\s{2,}\(.*)?$', line)
            if m:
                yield m[1].split()


def run(args):
    """(args, exit code, what it printed)"""
    r = subprocess.run([sys.executable, *args], cwd=ROOT, capture_output=True, text=True)
    return args, r.returncode, (r.stdout + r.stderr).strip()


def report(results):
    failed = []
    for args, code, out in results:
        last = out.splitlines()[-1] if out else ''
        print(f'{"FAIL" if code else "ok  "} python {" ".join(args)}  {last}', flush=True)
        if code:
            print(out, flush=True)
            failed.append(' '.join(args))
    return failed


if __name__ == '__main__':
    args = sys.argv[1:]
    failed = [] if '--checks-only' in args else report(map(run, GENERATORS))   # one at a time: simple to read
    if {'--check', '--checks-only'} & set(args):
        with concurrent.futures.ThreadPoolExecutor(os.cpu_count()) as pool:   # the checks only read
            failed += report(pool.map(run, list(commands())))
    if failed:
        sys.exit('failed: ' + ', '.join(failed))
